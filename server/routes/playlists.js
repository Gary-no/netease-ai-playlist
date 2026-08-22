import { Router } from 'express';
import { neteaseApi } from '../services/netease.js';
import { cookieStore } from '../services/cookieStore.js';

const router = Router();

// GET /api/playlists  —— 获取当前用户的歌单列表（供右侧面板展示）
router.get('/', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const record = sessionId && cookieStore.get(sessionId);
  if (!record) return res.status(401).json({ error: '请先扫码登录网易云账号' });

  try {
    const playlists = await neteaseApi.getUserPlaylists(record.profile.userId, record.cookie);
    res.json({
      playlists: playlists.map((p) => ({
        id: p.id,
        name: p.name,
        trackCount: p.trackCount,
        playCount: p.playCount,
        coverImgUrl: p.coverImgUrl,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/playlists/:id  —— 歌单详情（歌曲列表）
router.get('/:id', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const record = sessionId && cookieStore.get(sessionId);
  if (!record) return res.status(401).json({ error: '请先扫码登录网易云账号' });

  try {
    const detail = await neteaseApi.getPlaylistDetail(req.params.id, record.cookie);
    res.json({
      id: detail.id,
      name: detail.name,
      description: detail.description,
      trackCount: detail.trackCount,
      tracks: (detail.tracks || []).map((t) => ({
        id: t.id,
        name: t.name,
        artists: (t.ar || []).map((a) => a.name),
        album: t.al?.name,
        coverImgUrl: t.al?.picUrl || null, // 专辑封面
        duration: t.dt ? Math.round(t.dt / 1000) : 0, // 秒
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
