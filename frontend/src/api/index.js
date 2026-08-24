import axios from 'axios';

// 会话 ID：用于后端关联网易云 Cookie。前端本地持久化，同一浏览器保持同一身份
const SESSION_KEY = 'ncm_ai_session_id';
const COOKIE_KEY = 'ncm_encrypted_cookie';
const PROFILE_KEY = 'ncm_profile';

export function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// 退出登录时清空本地会话和 Cookie
export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(COOKIE_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

// 存储加密的网易云 Cookie（登陆后由后端返回）
export function storeNcmCookie(encrypted) {
  if (encrypted) localStorage.setItem(COOKIE_KEY, encrypted);
}

// 存储用户 profile，用于部署后恢复管理员身份
export function storeProfile(profile) {
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// 获取本地缓存的 profile
export function getLocalProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY));
  } catch { return null; }
}

// API 基础地址：本地开发用 /api（走 Vite proxy），生产部署用 VITE_API_BASE 指向后端域名
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const http = axios.create({ baseURL: API_BASE, timeout: 120000 });

// 所有请求自动携带会话 ID + 加密 Cookie
http.interceptors.request.use((config) => {
  config.headers['X-Session-Id'] = getSessionId();
  const cookie = localStorage.getItem(COOKIE_KEY);
  if (cookie) config.headers['X-Ncm-Cookie'] = cookie;
  return config;
});

export const api = {
  // ===== 扫码登录 =====
  async createQr() {
    const { data: keyData } = await http.get('/auth/qr/key');
    const { data: qrData } = await http.get('/auth/qr/create', {
      params: { key: keyData.unikey },
    });
    return { unikey: keyData.unikey, qrimg: qrData.qrimg };
  },
  async checkQr(unikey) {
    const { data } = await http.get('/auth/qr/check', { params: { key: unikey } });
    if (data._cookie) storeNcmCookie(data._cookie);
    return data;
  },
  async me() {
    const { data } = await http.get('/auth/me');
    return data;
  },
  async logout() {
    const { data } = await http.post('/auth/logout');
    return data;
  },
  async sendCaptcha(phone) {
    const { data } = await http.post('/auth/captcha/sent', { phone });
    return data;
  },
  async loginByCellphone(phone, captcha) {
    const { data } = await http.post('/auth/cellphone', { phone, captcha });
    if (data._cookie) storeNcmCookie(data._cookie);
    return data;
  },
  async sendMessage(message, history) {
    const { data } = await http.post('/chat', { message, history });
    return data;
  },
  async startClassify(playlistIds, mode, options, minCommentTotal = 0, minLikedCount = 0) {
    const { data } = await http.post('/classify/start', { playlistIds, mode, options, minCommentTotal, minLikedCount });
    return data.taskId;
  },
  async classifyStatus(taskId) {
    const { data } = await http.get(`/classify/status/${taskId}`);
    return data;
  },
  async classify(playlistIds, mode, options, minCommentTotal = 0, minLikedCount = 0) {
    const { data } = await http.post('/classify', { playlistIds, mode, options, minCommentTotal, minLikedCount });
    return data;
  },
  async confirmClassify(categories) {
    const { data } = await http.post('/classify/confirm', { categories });
    return data;
  },
  async getPlaylists() {
    const { data } = await http.get('/playlists');
    return data.playlists;
  },
  async getPlaylistDetail(id) {
    const { data } = await http.get(`/playlists/${id}`);
    return data;
  },
  async checkAdmin() {
    const { data } = await http.get('/admin/check');
    return data;
  },
  async getAdminStats() {
    const { data } = await http.get('/admin/stats');
    return data;
  },
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
  async submitRating(mode, categories, score, comment) {
    const { data } = await http.post('/admin/rate', { mode, categories, score, comment });
    return data;
  },
};