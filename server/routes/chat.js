import { Router } from 'express';
import { chatWithTools } from '../services/llm.js';
import { cookieStore } from '../services/cookieStore.js';

const router = Router();

// POST /api/chat
// body: { message: string, history: [{role, content}] }
// header: X-Session-Id
router.post('/', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const record = sessionId && cookieStore.get(sessionId);

  // 未登录则直接拦截，前端会引导用户扫码
  if (!record) {
    return res.status(401).json({ error: '请先扫码登录网易云账号' });
  }

  const { message, history = [] } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    const answer = await chatWithTools(
      [...history, { role: 'user', content: message.trim() }],
      { cookie: record.cookie, profile: record.profile }
    );
    res.json({ answer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
