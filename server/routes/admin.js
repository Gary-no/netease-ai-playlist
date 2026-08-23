import { Router } from 'express';
import { getStats, verifyPassword, trackFeedback } from '../services/admin.js';

const router = Router();

// 验证管理员密码（返回 token，前端存 localStorage 用于后续请求）
router.post('/verify', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: '请输入密码' });
  if (verifyPassword(password)) {
    // 简单 token：base64(时间戳+密码) 前端存本地，每次请求带上
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
    // token 24 小时内有效
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

// 用户提交反馈（无需验证）
router.post('/feedback', (req, res) => {
  const { nickname, content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: '请输入反馈内容' });
  trackFeedback(nickname || '匿名用户', content.trim());
  res.json({ success: true });
});

export default router;