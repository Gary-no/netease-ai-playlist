import dotenv from 'dotenv';
dotenv.config();

// 补全 base URL 的协议、Render 裸主机名后缀，并去掉尾部斜杠。
// 背景：render.yaml 用 fromService `property: host` 只返回裸主机名
// （如 netease-api-x8t6，无协议、无后缀），线上曾因此连续出现
// "Invalid URL" -> "ENOTFOUND netease-api-x8t6" 回归。
function normalizeBase(value, fallback) {
  let raw = (value || '').trim();
  if (!raw) return fallback;
  // 裸 Render 服务名（无点、无协议、非 localhost）：补域名后缀
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
  // 演示模式：无网易云API/LLM 环境时用模拟数据跑通全流程
  mock: process.env.MOCK === 'true',
  // 开源 NeteaseCloudMusicApi 服务地址
  // 注意：Render Blueprint 的 fromService `property: host` 只返回裸主机名（无协议），
  // axios 的 baseURL 缺协议会直接抛 "Invalid URL"，因此这里统一补全。
  neteaseApiBase: normalizeBase(process.env.NETEASE_API_BASE, 'http://localhost:3001'),
  // LLM 配置（OpenAI 兼容协议）
  llm: {
    baseURL: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'qwen-plus',
  },
  cookieSecret: process.env.COOKIE_SECRET || 'dev-secret',
};
