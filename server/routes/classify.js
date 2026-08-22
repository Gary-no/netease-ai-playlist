import { Router } from 'express';
import { neteaseApi } from '../services/netease.js';
import { cookieStore } from '../services/cookieStore.js';
import { classifySongs } from '../services/llm.js';

const router = Router();

// 获取会话并校验登录
function getRecord(req) {
  const sessionId = req.headers['x-session-id'];
  const record = sessionId && cookieStore.get(sessionId);
  return record;
}

// 简单的并发控制：同时最多 N 个任务
async function mapWithConcurrency(arr, limit, fn) {
  const results = new Array(arr.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, arr.length) }, async () => {
    while (i < arr.length) {
      const idx = i++;
      results[idx] = await fn(arr[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// POST /api/classify —— 按指定方式分类所选歌单的歌曲（预览，不落库）
router.post('/', async (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先扫码登录网易云账号' });

  const {
    playlistIds = [],
    mode = 'genre',
    options = [],
    minCommentTotal = 0,
    minLikedCount = 0,
  } = req.body || {};
  if (!Array.isArray(playlistIds) || !playlistIds.length) {
    return res.status(400).json({ error: '请选择至少一个歌单' });
  }

  try {
    // 收集所选歌单的歌曲（去重），最多 5 个歌单
    const songMap = new Map();
    for (const pid of playlistIds.slice(0, 5)) {
      const detail = await neteaseApi.getPlaylistDetail(pid, record.cookie);
      for (const t of detail.tracks || []) {
        if (!songMap.has(t.id)) {
          songMap.set(t.id, {
            id: t.id,
            name: t.name,
            artist: (t.ar || []).map((a) => a.name).join(' / ') || '未知歌手',
            coverImgUrl: t.al?.picUrl || null,
            duration: t.dt ? Math.round(t.dt / 1000) : 0,
          });
        }
      }
    }

    let songs = [...songMap.values()].slice(0, 300);
    if (!songs.length) return res.status(400).json({ error: '所选歌单没有可分类的歌曲' });

    // 按评论数 / 点赞数 过滤（限并发 5 拉取歌曲统计）
    let filteredCount = 0;
    if (minCommentTotal > 0 || minLikedCount > 0) {
      const stats = await mapWithConcurrency(songs, 5, (s) => neteaseApi.getSongStats(s.id, record.cookie));
      const kept = [];
      for (let i = 0; i < songs.length; i++) {
        const st = stats[i] || {};
        const okComment = minCommentTotal <= 0 || (st.commentTotal || 0) >= minCommentTotal;
        const okLiked = minLikedCount <= 0 || (st.hotComment?.likedCount || 0) >= minLikedCount;
        if (okComment && okLiked) kept.push(songs[i]);
        else filteredCount++;
      }
      songs = kept;
      if (!songs.length) return res.status(400).json({ error: '过滤后没有符合条件的歌曲' });
    }

    // 拉歌词 + 评论（限并发 5，提升分类准确度；热度筛选不需要）
    if (mode !== 'hot' && songs.length) {
      await mapWithConcurrency(songs, 5, async (s) => {
        try {
          const [lyric, comments] = await Promise.all([
            neteaseApi.getLyric(s.id, record.cookie),
            neteaseApi.getSongComments(s.id, record.cookie, 8),
          ]);
          s.lyric = lyric;
          s.comments = comments;
        } catch {
          s.lyric = '';
          s.comments = [];
        }
      });
    }

    // 热度模式：只按评论/点赞阈值筛选，不做 LLM 分类
    let categories;
    if (mode === 'hot') {
      categories = songs.length ? [{ name: '热门歌曲', songs }] : [];
    } else {
      // 情绪模式：读取"-训练"后缀歌单作为训练语料（few-shot + 已知歌曲直接归类）
      let extra = {};
      if (mode === 'mood') {
        try {
          const pls = await neteaseApi.getUserPlaylists(record.profile.userId, record.cookie);
          const trainPls = pls.filter((p) => /-训练\s*$/.test(p.name));
          if (trainPls.length) {
            const knownMap = new Map();
            const knownReason = new Map();
            const samples = {};
            for (const tp of trainPls) {
              const cat = tp.name.replace(/-训练\s*$/, '').trim();
              const detail = await neteaseApi.getPlaylistDetail(tp.id, record.cookie);
              const items = (detail.tracks || []).slice(0, 40);
              const sampleNames = [];
              for (const t of items) {
                knownMap.set(Number(t.id), cat);
                knownReason.set(Number(t.id), `来自你的「${tp.name}」歌单`);
                sampleNames.push(`${t.name} - ${(t.ar || []).map((a) => a.name).join('/')}`);
              }
              if (sampleNames.length) samples[cat] = sampleNames.slice(0, 20);
            }
            extra = { knownMap, knownReason, samples };
          }
        } catch (e) {
          // 训练语料获取失败不阻断分类
          console.log('[classify] 训练语料加载失败:', e.message);
        }
      }
      categories = await classifySongs(songs, mode, options, extra);
    }
    res.json({ songCount: songs.length, filteredCount, categories });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// POST /api/classify/confirm —— 根据分类结果创建歌单并添加歌曲
router.post('/confirm', async (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先扫码登录网易云账号' });

  const { categories = [] } = req.body || {};
  const valid = categories.filter((c) => c.name && Array.isArray(c.songs) && c.songs.length);
  if (!valid.length) return res.status(400).json({ error: '没有可生成的分类结果' });

  try {
    const created = [];
    for (const cat of valid) {
      const playlist = await neteaseApi.createPlaylist(cat.name, '', record.cookie);
      const ids = cat.songs.map((s) => Number(s.id)).filter(Boolean);
      for (let i = 0; i < ids.length; i += 200) {
        await neteaseApi.editPlaylistTracks('add', playlist.id, ids.slice(i, i + 200), record.cookie);
      }
      created.push({ name: cat.name, playlistId: playlist.id, count: ids.length });
    }
    res.json({ created });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

export default router;
