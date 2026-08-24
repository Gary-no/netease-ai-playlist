import { Router } from 'express';
import { getStats, verifyPassword, trackFeedback, replyToFeedback, getUserFeedbacks, trackRating } from '../services/admin.js';
import { cookieStore } from '../services/cookieStore.js';

const router = Router();

function getRecord(req) {
  const sessionId = req.headers['x-session-id'];
  return sessionId && cookieStore.get(sessionId);
}

// 验证管理员密码
router.post('/verify', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: '请输入密码' });
  if (verifyPassword(password)) {
    const token = Buffer.from(Date.now() + ':' + password).toString('base64');
    return res.json({ token });
  }
  res.status(403).json({ error: '密码错误' });
});

// 获取统计数据（需密码验证）
router.get('/stats', (req, res) => {
  const auth = req.headers['x-admin-token'];
  if (!auth) return res.status(401).json({ error: '未授权' });
  try {
    const decoded = Buffer.from(auth, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    const ts = parseInt(parts[0], 10);
    const pwd = parts.slice(1).join(':');
    if (Date.now() - ts > 24 * 60 * 60 * 1000) {
      return res.status(401).json({ error: 'token 已过期' });
    }
    if (!verifyPassword(pwd)) {
      return res.status(401).json({ error: 'token 无效' });
    }
  } catch {
    return res.status(401).json({ error: 'token 无效' });
  }
  res.json(getStats());
});

// 用户提交反馈（需登录）
router.post('/feedback', (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: '请输入反馈内容' });
  const nickname = record.profile?.nickname || '未知用户';
  const id = trackFeedback(nickname, content.trim());
  res.json({ success: true, id });
});

// 查看自己的反馈记录（需登录）
router.get('/my-feedback', (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const nickname = record.profile?.nickname || '未知用户';
  res.json({ feedbacks: getUserFeedbacks(nickname) });
});

// 管理员回复反馈（需密码验证）
router.post('/feedback-reply', (req, res) => {
  const auth = req.headers['x-admin-token'];
  if (!auth) return res.status(401).json({ error: '未授权' });
  try {
    const decoded = Buffer.from(auth, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    const pwd = parts.slice(1).join(':');
    if (!verifyPassword(pwd)) return res.status(401).json({ error: 'token 无效' });
  } catch {
    return res.status(401).json({ error: 'token 无效' });
  }
  const { id, reply } = req.body || {};
  if (!id || !reply) return res.status(400).json({ error: '缺少参数' });
  const ok = replyToFeedback(id, reply);
  if (!ok) return res.status(404).json({ error: '反馈不存在' });
  res.json({ success: true });
});

// 提交歌单评价（需登录）
router.post('/rate', (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const { mode, categories, score } = req.body || {};
  if (!score) return res.status(400).json({ error: '请选择评价' });
  const nickname = record.profile?.nickname || '未知用户';
  trackRating(nickname, mode || '', categories || [], score);
  res.json({ success: true });
});

export default router;