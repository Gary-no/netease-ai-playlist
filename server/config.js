import dotenv from 'dotenv';
dotenv.config();

function normalizeBase(value, fallback) {
  let raw = (value || '').trim();
  if (!raw) return fallback;
  if (
    !raw.includes('.') &&
    !/^https?:\/\//i.test(raw) &&
    !/^(localhost|127\.0\.0\.1)(:|$)/i.test(raw)
  ) {
    raw = `${raw}.onrender.com`;
  }
  const withProto = /^https?:\/\//i.test(raw)
    ? raw
    : (/^(localhost|127\.0\.0\.1)(:|$)/i.test(raw) ? `http://${raw}` : `https://${raw}`);
  return withProto.replace(/\/+$/, '');
}

export default {
  port: process.env.PORT || 3000,
  mock: process.env.MOCK === 'true',
  neteaseApiBase: normalizeBase(process.env.NETEASE_API_BASE, 'http://localhost:3001'),
  llm: {
    baseURL: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'qwen-plus',
  },
  // 生产环境必须在 Render 环境变量设置强随机值
  cookieSecret: process.env.COOKIE_SECRET || 'dev-secret-replace-in-production',
  // CORS 允许的域名
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};