import OpenAI from 'openai';
import config from '../config.js';
import { aiTools, executeTool } from './tools.js';

// OpenAI 兼容客户端：通义千问(DashScope compatible-mode)、智谱 GLM 均适用
const client = new OpenAI({
  apiKey: config.llm.apiKey,
  baseURL: config.llm.baseURL,
});

const CLASSIFY_PROMPTS = {
  mood: '按情绪风格分类，如：emo（丧/忧郁/情绪化）、快乐（欢快/开心/轻松）、运动（节奏感强/适合运动健身）、氛围（有氛围感/适合夜晚、安静、chill 场景）等',
  genre: '按音乐类型/曲风分类，如：流行、摇滚、民谣、电子、说唱、古典、爵士、国风、R&B 等',
  language: '按语种分类，如：国语、粤语、英语、日语、韩语、纯音乐等',
};

/**
 * 对歌曲列表按指定方式分类（预览，不创建歌单）。
 * AI 把每首歌归入最匹配（重合度最高）的勾选细项。
 * @param {Array<{id:number,name:string,artist:string,coverImgUrl?:string,duration?:number}>} songs
 * @param {'mood'|'genre'|'language'|'hot'} mode
 * @param {string[]} options 用户勾选的分类细项
 * @param {{knownMap?: Map<number,string>, samples?: Object<string,string[]>}} extra 训练映射 + 参考样本
 * @returns {Promise<Array<{name:string, songs:Array}>>}
 */
export async function classifySongs(songs, mode, options, extra = {}) {
  if (config.mock) return mockClassify(songs, mode, options);

  const { knownMap = null, knownReason = null, samples = null } = extra;
  const hint = CLASSIFY_PROMPTS[mode] || '按歌曲类型分类';
  const opts = Array.isArray(options) && options.length ? options : null;
  // 把"其他"作为显式可用分类，引导 LLM 把不符合的歌放进去
  const categoriesText = opts
    ? JSON.stringify([...opts, '其他'])
    : '自行判断合理的分类（4~8 类，务必包含"其他"兜底）';

  // 已训练的歌直接定类（单标签），其余交给 LLM
  const knownAssignments = [];
  const unknownSongs = [];
  for (const s of songs) {
    const c = knownMap ? knownMap.get(Number(s.id)) : undefined;
    if (c) {
      knownAssignments.push({
        id: Number(s.id),
        categories: [c],
        reason: (knownReason && knownReason.get(Number(s.id))) || '来自你的训练歌单',
      });
    } else unknownSongs.push(s);
  }

  let llmAssignments = [];
  if (unknownSongs.length) {
    let sampleText = '';
    if (samples && Object.keys(samples).length) {
      sampleText = `\n\n参考训练样本（每类示例歌曲，模仿它的归类）：${JSON.stringify(samples)}`;
    }
    // 精简字段传给 LLM（只保留判断所需，减少 token）
    const llmSongs = unknownSongs.map((s) => ({
      id: s.id,
      name: s.name,
      artist: s.artist,
      lyric: s.lyric || '',
      comments: (s.comments || []).join(' | ').slice(0, 200),
    }));
    const res = await client.chat.completions.create({
      model: config.llm.model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            '你是歌单分类助手。请把每首歌归入可用分类（多标签）：一首歌可以同时符合多个分类，就把所有明显符合的分类都列出来（如"流行说唱"可同时归"流行"和"说唱"）。如果都不符合则 categories 为空数组。可用分类已包含"其他"但不要主动用，只有真的无法归类时才留空。只输出 JSON，格式严格为：{"assignments":[{"id":数字,"categories":["分类名"],"reason":"理由"}]}。其中 categories 是数组（1~3 个），reason 用 15 字以内简述判断依据（如"歌词含失恋意象""节奏欢快""评论说治愈"）。不要遗漏、不要编造。',
        },
        { role: 'user', content: `分类方式：${hint}。可用分类：${categoriesText}。${sampleText}歌曲列表(JSON 数组，字段 id/name/artist/lyric/comments，其中 lyric 是歌词片段、comments 是听众评论，请优先结合歌词与评论内容判断情绪、风格与语种)：${JSON.stringify(llmSongs)}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    });

    const text = res.choices[0]?.message?.content || '{}';
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('AI 分类结果解析失败');
    }
    llmAssignments = Array.isArray(data.assignments) ? data.assignments : [];
  }

  const assignments = [...knownAssignments, ...llmAssignments];
  const order = opts || [];

  // 多标签聚合：每首歌的 categories 每个都归入对应类；不在可用列表的归"其他"
  const map = new Map();
  const assignedIds = new Set();
  for (const a of assignments) {
    const song = songs.find((s) => Number(s.id) === Number(a.id));
    if (!song) continue;
    const rawCats = Array.isArray(a.categories) ? a.categories : [a.category];
    const cats = rawCats.map((c) => String(c || '').trim()).filter(Boolean);
    assignedIds.add(Number(song.id));
    const targets = cats.length ? cats : ['其他'];
    for (const cat of targets) {
      const key = order.includes(cat) ? cat : '其他';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ id: song.id, name: song.name, artist: song.artist, coverImgUrl: song.coverImgUrl, duration: song.duration, reason: String(a.reason || '').slice(0, 30) });
    }
  }

  // 兜底：未归类的歌曲归"其他"
  const others = songs.filter((s) => !assignedIds.has(Number(s.id)));
  if (others.length) {
    if (!map.has('其他')) map.set('其他', []);
    map.get('其他').push(...others.map((s) => ({ id: s.id, name: s.name, artist: s.artist, coverImgUrl: s.coverImgUrl, duration: s.duration, reason: '' })));
  }

  const categories = [];
  for (const o of order) {
    if (map.has(o) && map.get(o).length) categories.push({ name: o, songs: map.get(o) });
  }
  if (map.has('其他') && map.get('其他').length) categories.push({ name: '其他', songs: map.get('其他') });
  return categories;
}

// 演示模式：把歌曲轮流分到勾选的细项
function mockClassify(songs, mode, options) {
  const opts = Array.isArray(options) && options.length ? options : ['分类 A', '分类 B'];
  const groups = {};
  opts.forEach((o) => { groups[o] = []; });
  groups['其他'] = [];
  songs.forEach((s, i) => {
    const key = opts[i % opts.length] || '其他';
    groups[key].push({ id: s.id, name: s.name, artist: s.artist, coverImgUrl: s.coverImgUrl, duration: s.duration });
  });
  return Object.entries(groups)
    .filter(([, v]) => v.length)
    .map(([name, list]) => ({ name, songs: list }));
}

const SYSTEM_PROMPT = `你是"网易云音乐 AI 歌单助手"，帮助用户整理、分类、创建网易云音乐歌单。

工作规则：
1. 需要用户数据时，按需调用工具获取，不要凭空编造歌曲或歌单信息。
2. 用户说"红心歌曲/我喜欢的音乐"时，调用 get_liked_songs。
3. 按流派分类时，先通过 get_songs_detail 拿到歌曲信息，再根据歌曲名/歌手/专辑风格判断分类。
4. 新建歌单后，用返回的 playlistId 调用 add_tracks_to_playlist 添加歌曲。
5. 每完成一步操作，用简洁清晰的中文向用户汇报结果（包括新歌单链接说明）。
6. 工具返回的 id 等数字字段，在后续调用中直接使用，不要做任何改动。
7. 如果一次要处理大量歌曲，可以分批调用工具。
8. 用户询问歌曲热度、评论数、点赞数、口碑时，调用 get_song_stats。
`;

/**
 * Function Calling 编排循环：
 * 1. 发送系统提示 + 历史消息 + tools 定义
 * 2. 若 LLM 返回 tool_calls → 执行工具 → 把结果作为 tool 消息回传 → 继续
 * 3. 直到 LLM 返回纯文本作为最终答案
 *
 * @param {Array<{role:string, content:string}>} messages  历史消息（不含 system）
 * @param {{cookie: string, profile: object}} ctx          用户上下文
 * @param {(name,args)=>void} onToolCall                   工具调用时的通知回调（可选）
 */
export async function chatWithTools(messages, ctx, onToolCall) {
  if (config.mock) return mockChatWithTools(messages, ctx, onToolCall);

  const history = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  let finalAnswer = null;
  let round = 0;
  const MAX_ROUNDS = 8; // 防止工具链死循环

  while (round < MAX_ROUNDS) {
    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: history,
      tools: aiTools,
      tool_choice: 'auto',
    });

    const message = response.choices[0]?.message;
    if (!message) throw new Error('LLM 无返回');

    // LLM 决定调用工具
    if (message.tool_calls?.length) {
      history.push(message);

      for (const toolCall of message.tool_calls) {
        let result;
        try {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          onToolCall?.(toolCall.function.name, args); // 通知前端"正在执行 XX"
          result = await executeTool(toolCall.function.name, args, ctx);
        } catch (e) {
          result = { error: e.message || String(e) };
        }

        history.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      round++;
      continue;
    }

    // LLM 直接返回文本，结束循环
    finalAnswer = message.content;
    break;
  }

  if (!finalAnswer) finalAnswer = '抱歉，处理步骤太多没有完成，请再试一次或换种说法。';
  return finalAnswer;
}

/**
 * 演示模式：不做真实 LLM 调用，根据关键词模拟工具调用并返回示例回复，
 * 用于展示前端聊天交互链路。
 */
async function mockChatWithTools(messages, ctx, onToolCall) {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const text = lastUserMsg?.content || '';
  await new Promise((r) => setTimeout(r, 800)); // 模拟 LLM 思考延迟

  if (/红心|我喜欢|喜欢听/.test(text)) {
    onToolCall?.('get_liked_songs', {});
    await new Promise((r) => setTimeout(r, 500));
    return (
      '【演示模式】已模拟获取你的红心歌曲，共 6 首，示例结果：\n\n' +
      '· 周杰伦 - 晴天（流行）\n' +
      '· 朴树 - 平凡之路（民谣）\n' +
      '· Ed Sheeran - Shape of You（流行）\n' +
      '· Beyond - 海阔天空（摇滚）\n' +
      '· 林俊杰 - 晴天雨（流行）\n' +
      '· 周深 - 无问（国风）\n\n' +
      '你可以在接入真实账号后让我按流派分类并自动建歌单。'
    );
  }
  if (/分类|流派|整理/.test(text)) {
    onToolCall?.('get_liked_songs', {});
    await new Promise((r) => setTimeout(r, 500));
    return (
      '【演示模式】已模拟将你的歌曲按流派分类：\n\n' +
      '🎵 流行（3 首）：晴天、Shape of You、晴天雨\n' +
      '🎸 摇滚（1 首）：海阔天空\n' +
      '🌾 民谣（1 首）：平凡之路\n' +
      '🏮 国风（1 首）：无问\n\n' +
      '接入真实账号后，我可以自动为每个流派创建歌单并添加歌曲。'
    );
  }
  if (/创建|新建|建.{0,4}歌单/.test(text)) {
    onToolCall?.('create_playlist', { name: text.slice(0, 12) });
    await new Promise((r) => setTimeout(r, 500));
    return '【演示模式】已模拟创建歌单「' + text.slice(0, 12) + '」，并添加了 3 首示例歌曲。接入真实账号后即为真实操作。';
  }
  onToolCall?.('get_user_playlists', {});
  await new Promise((r) => setTimeout(r, 500));
  return '【演示模式】已模拟获取你的歌单列表（右侧面板可见 3 个示例歌单）。可以试试说"把红心歌曲按流派分类"。';
}
