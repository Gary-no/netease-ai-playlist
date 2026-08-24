import axios from 'axios';

// 会话 ID：用于后端关联网易云 Cookie。前端本地持久化，同一浏览器保持同一身份
const SESSION_KEY = 'ncm_ai_session_id';
export function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// 退出登录时清空本地会话，下次登录使用全新身份
export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
}

// API 基础地址：本地开发用 /api（走 Vite proxy），生产部署用 VITE_API_BASE 指向后端域名
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const http = axios.create({ baseURL: API_BASE, timeout: 120000 });

// 所有请求自动携带会话 ID
http.interceptors.request.use((config) => {
  config.headers['X-Session-Id'] = getSessionId();
  return config;
});

export const api = {
  // ===== 扫码登录 =====
  // 一次性返回 unikey + 二维码 base64
  async createQr() {
    const { data: keyData } = await http.get('/auth/qr/key');
    const { data: qrData } = await http.get('/auth/qr/create', {
      params: { key: keyData.unikey },
    });
    return { unikey: keyData.unikey, qrimg: qrData.qrimg };
  },

  // 轮询扫码状态：{ code, message, profile? }
  // 800=过期 801=等待扫码 802=已扫码待确认 803=成功
  async checkQr(unikey) {
    const { data } = await http.get('/auth/qr/check', { params: { key: unikey } });
    return data;
  },

  // 当前登录状态
  async me() {
    const { data } = await http.get('/auth/me');
    return data;
  },

  // 退出登录（后端删除会话关联的网易云 Cookie）
  async logout() {
    const { data } = await http.post('/auth/logout');
    return data;
  },

  // ===== 手机验证码登录 =====
  // 发送短信验证码
  async sendCaptcha(phone) {
    const { data } = await http.post('/auth/captcha/sent', { phone });
    return data;
  },
  // 手机验证码登录
  async loginByCellphone(phone, captcha) {
    const { data } = await http.post('/auth/cellphone', { phone, captcha });
    return data;
  },

  // ===== 聊天 =====
  async sendMessage(message, history) {
    const { data } = await http.post('/chat', { message, history });
    return data;
  },

  // ===== 一键分类 =====
  // 异步分类：立即返回 taskId，前端轮询进度
  async startClassify(playlistIds, mode, options, minCommentTotal = 0, minLikedCount = 0) {
    const { data } = await http.post('/classify/start', {
      playlistIds,
      mode,
      options,
      minCommentTotal,
      minLikedCount,
    });
    return data.taskId;
  },
  // 轮询任务状态
  async classifyStatus(taskId) {
    const { data } = await http.get(`/classify/status/${taskId}`);
    return data;
  },
  // 兼容旧接口
  async classify(playlistIds, mode, options, minCommentTotal = 0, minLikedCount = 0) {
    const { data } = await http.post('/classify', {
      playlistIds,
      mode,
      options,
      minCommentTotal,
      minLikedCount,
    });
    return data;
  },
  // 确认分类结果，创建歌单并加歌
  async confirmClassify(categories) {
    const { data } = await http.post('/classify/confirm', { categories });
    return data;
  },

  // ===== 歌单 =====
  async getPlaylists() {
    const { data } = await http.get('/playlists');
    return data.playlists;
  },

  // 歌单详情（歌曲列表）
  async getPlaylistDetail(id) {
    const { data } = await http.get(`/playlists/${id}`);
    return data;
  },

  // ===== 后台管理 =====
  async verifyAdminPassword(password) {
    const { data } = await http.post('/admin/verify', { password });
    return data;
  },
  async getAdminStats(token) {
    const { data } = await http.get('/admin/stats', {
      headers: { 'X-Admin-Token': token },
    });
    return data;
  },

  // ===== 反馈 =====
  async submitFeedback(content) {
    const { data } = await http.post('/admin/feedback', { content });
    return data;
  },
  async getMyFeedbacks() {
    const { data } = await http.get('/admin/my-feedback');
    return data;
  },
  async submitFeedbackReply(id, reply) {
    const { data } = await http.post('/admin/feedback-reply', { id, reply });
    return data;
  },

  // ===== 歌单评价 =====
  async submitRating(mode, categories, score, comment) {
    const { data } = await http.post('/admin/rate', { mode, categories, score, comment });
    return data;
  },
};
