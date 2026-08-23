import express from 'express';
import cors from 'cors';
import config from './config.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import playlistRoutes from './routes/playlists.js';
import classifyRoutes from './routes/classify.js';
import adminRoutes from './routes/admin.js';
import { trackLogin, trackClassify, trackError } from './services/admin.js';

const app = express();
// 信任反向代理（Render / Cloudflare），以正确解析 X-Forwarded-For / X-Real-IP
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// 演示用中间件：请求未带 sessionId 时自动生成（生产环境建议由前端生成并持久化）
app.use((req, res, next) => {
  if (!req.headers['x-session-id']) {
    req.headers['x-session-id'] = 'auto-' + Math.random().toString(36).slice(2);
  }
  next();
});

app.use('/api/auth', (req, res, next) => {
  res.on('finish', () => {
    console.log(`[auth] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/classify', classifyRoutes);
app.use('/api/admin', adminRoutes);

// 数据追踪中间件（包装 res.json 以捕获响应）
app.use((req, res, next) => {
  const oldJson = res.json.bind(res);
  res.json = function (body) {
    // 追踪登录成功
    if (req.originalUrl === '/api/auth/cellphone' && req.method === 'POST' && res.statusCode === 200 && body?.profile) {
      const phone = req.body?.phone;
      if (phone) trackLogin(phone, body.profile.userId);
    }
    // 追踪分类
    if (req.originalUrl === '/api/classify/start' && req.method === 'POST' && res.statusCode === 200) {
      const mode = req.body?.mode || 'genre';
      trackClassify(mode);
    }
    // 追踪错误 (500)
    if (res.statusCode >= 500) {
      trackError(req.body?.phone || '', req.method, req.originalUrl, body?.error || '服务器错误');
    }
    return oldJson(body);
  };
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`🚀 网易云 AI 歌单助手后端已启动: http://localhost:${config.port}`);
  console.log(`   对接网易云 API: ${config.neteaseApiBase}`);
  console.log(`   LLM 模型: ${config.llm.model}`);
});
