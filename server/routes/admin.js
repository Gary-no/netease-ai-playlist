import { Router } from 'express';
import { getStats, trackFeedback, replyToFeedback, getUserFeedbacks, trackRating, verifyPassword } from '../services/admin.js';
import { cookieStore } from '../services/cookieStore.js';

const router = Router();

function getRecord(req) {
  const sessionId = req.headers['x-session-id'];
  return sessionId && cookieStore.get(sessionId);
}

// 管理员登录：验证密码，成功后返回 adminToken（前端 localStorage 保存）
router.post('/verify', (req, res) => {
  const { password } = req.body || {};
  if (verifyPassword(password)) {
    // 记录本次验证为管理员的 session，之后无需重复验证
    const sessionId = req.headers['x-session-id'];
    const token = 'admin-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

// 获取统计数据（需密码 verified）
router.get('/stats', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !token.startsWith('admin-')) return res.status(403).json({ error: '无权限，请先验证密码' });
  res.json(await getStats());
});

// 获取当前在线用户列表（需密码 verified）
router.get('/online-users', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !token.startsWith('admin-')) return res.status(403).json({ error: '无权限，请先验证密码' });
  res.json({ users: cookieStore.listUsers() });
});

// 用户提交反馈（需登录）
router.post('/feedback', async (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: '请输入反馈内容' });
  const nickname = record.profile?.nickname || '未知用户';
  const id = await trackFeedback(nickname, content.trim());
  res.json({ success: true, id });
});

// 查看自己的反馈记录（需登录）
router.get('/my-feedback', async (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const nickname = record.profile?.nickname || '未知用户';
  res.json({ feedbacks: await getUserFeedbacks(nickname) });
});

// 管理员回复反馈（需密码 verified）
router.post('/feedback-reply', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !token.startsWith('admin-')) return res.status(403).json({ error: '无权限，请先验证密码' });
  const { id, reply } = req.body || {};
  if (!id || !reply) return res.status(400).json({ error: '缺少参数' });
  const ok = await replyToFeedback(id, reply);
  if (!ok) return res.status(404).json({ error: '反馈不存在' });
  res.json({ success: true });
});

// 提交歌单评价（需登录）
router.post('/rate', async (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const { mode, categories, score, comment } = req.body || {};
  if (!score) return res.status(400).json({ error: '请选择评价' });
  const nickname = record.profile?.nickname || '未知用户';
  await trackRating(nickname, mode || '', categories || [], score, comment || '');
  res.json({ success: true });
});

export default router;