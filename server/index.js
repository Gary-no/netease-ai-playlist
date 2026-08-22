import express from 'express';
import cors from 'cors';
import config from './config.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import playlistRoutes from './routes/playlists.js';
import classifyRoutes from './routes/classify.js';

const app = express();
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

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`🚀 网易云 AI 歌单助手后端已启动: http://localhost:${config.port}`);
  console.log(`   对接网易云 API: ${config.neteaseApiBase}`);
  console.log(`   LLM 模型: ${config.llm.model}`);
});
