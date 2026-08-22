import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  // 演示模式：无网易云API/LLM 环境时用模拟数据跑通全流程
  mock: process.env.MOCK === 'true',
  // 开源 NeteaseCloudMusicApi 服务地址
  neteaseApiBase: process.env.NETEASE_API_BASE || 'http://localhost:3001',
  // LLM 配置（OpenAI 兼容协议）
  llm: {
    baseURL: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'qwen-plus',
  },
  cookieSecret: process.env.COOKIE_SECRET || 'dev-secret',
};
