import { Router } from 'express';
import { getStats, trackFeedback, replyToFeedback, getUserFeedbacks, trackRating, isAdminProfile } from '../services/admin.js';
import { cookieStore } from '../services/cookieStore.js';

const router = Router();

function getRecord(req) {
  const sessionId = req.headers['x-session-id'];
  return sessionId && cookieStore.get(sessionId);
}

// 验证当前登录用户是否为管理员（基于手机号）
router.get('/check', (req, res) => {
  const record = getRecord(req);
  if (!record) return res.json({ isAdmin: false });
  res.json({ isAdmin: isAdminProfile(record.profile) });
});

// 获取统计数据（需管理员身份）
router.get('/stats', (req, res) => {
  const record = getRecord(req);
  if (!record || !isAdminProfile(record.profile)) return res.status(403).json({ error: '无权限' });
  res.json(getStats());
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
router.get('/my-feedback', (req, res) => {
  const record = getRecord(req);
  if (!record) return res.status(401).json({ error: '请先登录' });
  const nickname = record.profile?.nickname || '未知用户';
  res.json({ feedbacks: getUserFeedbacks(nickname) });
});

// 管理员回复反馈（需管理员身份）
router.post('/feedback-reply', async (req, res) => {
  const record = getRecord(req);
  if (!record || !isAdminProfile(record.profile)) return res.status(403).json({ error: '无权限' });
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