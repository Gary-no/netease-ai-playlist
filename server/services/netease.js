import axios from 'axios';
import config from '../config.js';
import { mockNetease } from './mock.js';

// 演示模式：直接使用模拟实现，跳过真实网络请求
if (config.mock) {
  console.log('⚡ 演示模式已开启（MOCK=true），使用模拟数据');
}

// 指数退避重试（429/502/冷启动时自动重试）
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function withRetry(fn, options = {}) {
  const { retries = 4, baseDelay = 3000 } = options;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      const isRetryable = status === 429 || status === 502 || status === 503 || !status;
      if (i === retries || !isRetryable) throw err;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.log(`[netease] 请求失败(${status || 'timeout'})，${Math.round(delay)}ms 后重试(${i + 1}/${retries})`);
      await sleep(delay);
    }
  }
}

// 统一封装开源 NeteaseCloudMusicApi 的 HTTP 调用
// 所有需要登录态的请求都会把用户 Cookie 放进请求头，代表用户操作
const http = axios.create({
  baseURL: config.neteaseApiBase,
  timeout: 45000, // 45s：给 Render 冷启动留足时间（免费版冷启动约 20-30s）
});

// 网易云接口要求带 timestamp 防缓存
function params(obj = {}) {
  return { ...obj, timestamp: Date.now() };
}

function cookieHeader(cookie) {
  return cookie ? { Cookie: cookie } : {};
}

// 清洗 cookie：仅保留 key=value 对，去掉 Set-Cookie 指令字段（Max-Age/Expires/Path 等）
function sanitizeCookie(cookieStr) {
  const SKIP = new Set([
    'max-age', 'expires', 'path', 'domain', 'httponly', 'secure', 'samesite',
    'priority', 'partitioned', 'comment', 'version',
  ]);
  return (cookieStr || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((seg) => {
      const key = seg.split('=')[0].trim();
      return key && !SKIP.has(key.toLowerCase());
    })
    .join('; ');
}

const realNetease = {
  // ============ 登录相关 ============

  // 获取二维码 unikey
  async getQrKey() {
    return withRetry(async () => {
      const { data } = await http.get('/login/qr/key', { params: params() });
      return data.data.unikey;
    });
  },

  // 用 unikey 生成二维码（返回 base64 图片 + 跳转链接）
  async createQr(key) {
    return withRetry(async () => {
      const { data } = await http.get('/login/qr/create', {
        params: params({ key, qrimg: true }),
      });
      return data.data; // { qrimg: 'data:image/png;base64,...', qrurl }
    });
  },

  // 轮询扫码状态
  // code: 800=二维码过期 801=等待扫码 802=已扫码待确认 803=登录成功(含 cookie)
  async checkQr(key) {
    return withRetry(async () => {
      const { data } = await http.get('/login/qr/check', { params: params({ key }) });
      // 扫码接口返回的 cookie 会混入 Set-Cookie 指令（Max-Age/Expires/Path 等），
      // 直接放进 Cookie 头会导致服务端解析失败，必须清洗后再存储
      if (data.cookie) data.cookie = sanitizeCookie(data.cookie);
      return data;
    });
  },

  // 校验登录态，拿用户信息
  async loginStatus(cookie) {
    return withRetry(async () => {
      const { data } = await http.get('/login/status', {
        headers: cookieHeader(cookie),
        params: params(),
      });
      return data.data; // { account, profile }
    });
  },

  // 发送手机验证码
  async sendCaptcha(phone, opts = {}) {
    try {
      const { data } = await http.get('/captcha/sent', {
        params: params({ phone, ctcode: '86', ...opts }),
        validateStatus: () => true,
      });
      return data;
    } catch (e) {
      if (e.response?.data) return e.response.data;
      throw e;
    }
  },

  // 手机验证码登录
  async loginByCellphone(phone, captcha, opts = {}) {
    try {
      const { data } = await http.get('/login/cellphone', {
        params: params({ phone, captcha, ctcode: '86', ...opts }),
        validateStatus: () => true,
      });
      if (data.cookie) data.cookie = sanitizeCookie(data.cookie);
      return data;
    } catch (e) {
      if (e.response?.data) {
        const d = e.response.data;
        if (d.cookie) d.cookie = sanitizeCookie(d.cookie);
        return d;
      }
      throw e;
    }
  },

  // ============ 歌单相关 ============

  // 获取用户的所有歌单
  async getUserPlaylists(uid, cookie) {
    const { data } = await http.get('/user/playlist', {
      headers: cookieHeader(cookie),
      params: params({ uid, limit: 100 }),
    });
    return data.playlist || [];
  },

  // 获取歌单详情（含歌单内歌曲，注意大歌单接口可能截断）
  async getPlaylistDetail(playlistId, cookie) {
    const { data } = await http.get('/playlist/detail', {
      headers: cookieHeader(cookie),
      params: params({ id: playlistId }),
    });
    return data.playlist;
  },

  // 获取用户所有红心歌曲的 ID 列表
  async getLikedSongIds(uid, cookie) {
    const { data } = await http.get('/likelist', {
      headers: cookieHeader(cookie),
      params: params({ uid }),
    });
    return data.ids || [];
  },

  // 批量获取歌曲详情（用于分析流派、歌手、专辑；一次最多约 1000 首）
  async getSongsDetail(ids, cookie) {
    if (!ids.length) return [];
    const { data } = await http.get('/song/detail', {
      headers: cookieHeader(cookie),
      params: params({ ids: ids.join(',') }),
    });
    return data.songs || [];
  },

  // 获取单曲统计：流行度(pop) + 评论总数 + 热门评论点赞数
  async getSongStats(id, cookie) {
    const [detailRes, commentRes] = await Promise.all([
      http.get('/song/detail', { headers: cookieHeader(cookie), params: params({ ids: id }) }),
      http.get('/comment/music', { headers: cookieHeader(cookie), params: params({ id, limit: 1 }) }),
    ]);
    const song = detailRes.data.songs?.[0];
    const hot = commentRes.data.hotComments?.[0];
    return {
      id: Number(id),
      name: song?.name || '',
      artist: (song?.ar || []).map((a) => a.name).join(' / '),
      pop: song?.pop ?? null, // 流行度 0-100
      commentTotal: commentRes.data.total ?? null, // 总评论数
      hotComment: hot
        ? { content: String(hot.content).slice(0, 50), likedCount: hot.likedCount }
        : null,
    };
  },

  // 获取歌词（去掉时间戳与制作信息，只保留歌词正文，截断）
  async getLyric(id, cookie) {
    const { data } = await http.get('/lyric', {
      headers: cookieHeader(cookie),
      params: params({ id }),
    });
    const raw = data.lrc?.lyric || '';
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/\[[^\]]*\]/g, '').trim())
      .filter(
        (l) =>
          l &&
          !/^(作词|作曲|编曲|制作人|制作|和声|和音|吉他|贝斯|鼓|键盘|弦乐|录音|混音|母带|监制|出品|发行|演唱|音乐总监|programming|engineer|op|sp|策划|统筹|企划|文案|摄影|封面|设计|录音助理|混音助理|母带工程师|录音师|混音师|乐器)/i.test(l)
      );
    return lines.join(' ').slice(0, 200);
  },

  // 获取歌曲评论（热评 + 最新评论，多抓几条，用于提取情感词）
  async getSongComments(id, cookie, limit = 10) {
    const { data } = await http.get('/comment/music', {
      headers: cookieHeader(cookie),
      params: params({ id, limit }),
    });
    const hot = (data.hotComments || []).map((c) => String(c.content || '').replace(/\s+/g, ' ').trim());
    const normal = (data.comments || []).map((c) => String(c.content || '').replace(/\s+/g, ' ').trim());
    return [...hot, ...normal].filter(Boolean).slice(0, limit);
  },

  // 新建歌单
  async createPlaylist(name, desc, cookie) {
    const { data } = await http.get('/playlist/create', {
      headers: cookieHeader(cookie),
      params: params({ name, desc }),
    });
    return data.playlist;
  },

  // 歌单添加/移除歌曲：op = 'add' | 'del'
  async editPlaylistTracks(op, playlistId, trackIds, cookie) {
    const { data } = await http.get('/playlist/tracks', {
      headers: cookieHeader(cookie),
      params: params({ op, pid: playlistId, tracks: trackIds.join(',') }),
    });
    return data;
  },
};

export const neteaseApi = config.mock ? mockNetease : realNetease;
