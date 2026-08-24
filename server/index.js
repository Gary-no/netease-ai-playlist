import express from 'express';
import cors from 'cors';
import config from './config.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import playlistRoutes from './routes/playlists.js';
import classifyRoutes from './routes/classify.js';
import adminRoutes from './routes/admin.js';
import { trackLogin, trackClassify, trackError } from './services/admin.js';
import { cookieStore } from './services/cookieStore.js';

const app = express();

// ============ 安全基础 ============
// 信任反向代理（Render / Cloudflare）
app.set('trust proxy', true);

// CORS：仅允许本域名
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// 请求体限制
app.use(express.json({ limit: '100kb' }));

// ============ 会话 + Cookie 持久化中间件 ============
app.use((req, res, next) => {
  // 前端未带 sessionId 时自动生成
  if (!req.headers['x-session-id']) {
    req.headers['x-session-id'] = 'auto-' + Math.random().toString(36).slice(2);
  }
  // 前端 localStorage 中存有网易云 Cookie 时，导入到 session
  const ncmCookie = req.headers['x-ncm-cookie'];
  if (ncmCookie) {
    const sessionId = req.headers['x-session-id'];
    const existing = cookieStore.get(sessionId);
    if (!existing) {
      try {
        cookieStore.import(sessionId, ncmCookie);
      } catch {
        // Cookie 无效或格式错误，忽略
      }
    }
  }
  next();
});

// ============ 路由 ============
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

// ============ 数据追踪中间件 ============
app.use((req, res, next) => {
  const oldJson = res.json.bind(res);
  res.json = function (body) {
    if (req.originalUrl === '/api/auth/cellphone' && req.method === 'POST' && res.statusCode === 200 && body?.profile) {
      const phone = req.body?.phone;
      if (phone) trackLogin(phone, body.profile.userId).catch(() => {});
    }
    if (req.originalUrl === '/api/classify/start' && req.method === 'POST' && res.statusCode === 200) {
      const mode = req.body?.mode || 'genre';
      trackClassify(mode).catch(() => {});
    }
    if (res.statusCode >= 500) {
      trackError(req.body?.phone || '', req.method, req.originalUrl, body?.error || '服务器错误').catch(() => {});
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
  console.log(`   CORS 域: ${config.corsOrigin}`);
});