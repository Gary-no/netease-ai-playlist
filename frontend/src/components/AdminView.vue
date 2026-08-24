<template>
  <div class="admin-view" ref="rootEl">
    <!-- 密码输入 -->
    <div v-if="!token" class="admin-login">
      <div class="admin-card">
        <h3>后台管理</h3>
        <p class="admin-hint">请输入管理密码</p>
        <input v-model="password" type="password" class="admin-pwd-input" placeholder="密码" @keyup.enter="onVerify" />
        <p v-if="err" class="admin-error">{{ err }}</p>
        <button class="admin-btn" :disabled="!password || verifying" @click="onVerify">
          {{ verifying ? '验证中…' : '进入' }}
        </button>
        <button class="admin-back" @click="$emit('back')">返回</button>
      </div>
    </div>

    <!-- 仪表盘 -->
    <div v-else-if="stats" class="dashboard">
      <div class="dash-header">
        <h2>后台管理</h2>
        <button class="admin-back" @click="$emit('back')">返回</button>
      </div>

      <div class="dash-grid">
        <div class="dash-card">
          <span class="dash-num">{{ stats.totalUsers }}</span>
          <span class="dash-label">总用户</span>
        </div>
        <div class="dash-card">
          <span class="dash-num">{{ stats.todayActive }}</span>
          <span class="dash-label">今日活跃</span>
        </div>
        <div class="dash-card">
          <span class="dash-num">{{ stats.sevenDayActive }}</span>
          <span class="dash-label">7日活跃</span>
        </div>
        <div class="dash-card">
          <span class="dash-num">{{ stats.totalClassify }}</span>
          <span class="dash-label">总分类</span>
        </div>
      </div>

      <h3 class="dash-section-title">当前在线用户（{{ onlineUsers.length }}）</h3>
      <div v-if="!onlineUsers.length" class="dash-empty">暂无在线用户</div>
      <div v-else class="error-list">
        <div v-for="(u, i) in onlineUsers" :key="u.sessionId || i" class="online-user-item">
          <img v-if="u.avatarUrl" :src="u.avatarUrl" class="online-avatar" alt="" />
          <span class="online-nickname">{{ u.nickname }}</span>
          <span v-if="u.phone" class="online-phone">{{ u.phone }}</span>
          <span v-else-if="u.userId" class="online-phone">uid: {{ u.userId }}</span>
          <span class="online-time">{{ fmtTime(u.updatedAt) }}</span>
        </div>
      </div>

      <h3 class="dash-section-title">分类维度统计</h3>
      <div class="classify-bars">
        <div v-for="(v, k) in stats.classifyStats" :key="k" class="bar-row">
          <span class="bar-label">{{ labels[k] || k }}</span>
          <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(v) + '%' }"></div></div>
          <span class="bar-value">{{ v }}</span>
        </div>
      </div>

      <h3 class="dash-section-title">最近报错</h3>
      <div v-if="!stats.errors.length" class="dash-empty">暂无报错</div>
      <div v-else class="error-list">
        <div v-for="(e, i) in stats.errors" :key="i" class="error-item">
          <span class="error-time">{{ fmtTime(e.time) }}</span>
          <span class="error-method">{{ e.method }}</span>
          <span class="error-url">{{ e.url }}</span>
          <span class="error-msg">{{ e.message }}</span>
        </div>
      </div>

      <h3 class="dash-section-title">反馈</h3>
      <div v-if="!stats.feedbacks.length" class="dash-empty">暂无反馈</div>
      <div v-else class="error-list">
        <div v-for="(f, i) in stats.feedbacks" :key="i" class="feedback-item">
          <span class="error-time">{{ fmtTime(f.time) }}</span>
          <span class="fb-nickname">{{ f.nickname }}</span>
          <span class="fb-content">{{ f.content }}</span>
          <div v-if="f.reply" class="fb-existing-reply">回复：{{ f.reply }}</div>
          <div v-else class="fb-reply-row">
            <input v-model="replyTexts[f.id]" class="fb-reply-input" placeholder="回复…" @keyup.enter="onReply(f.id)" />
            <button class="fb-reply-btn" :disabled="!replyTexts[f.id]?.trim()" @click="onReply(f.id)">回复</button>
          </div>
        </div>
      </div>

      <h3 class="dash-section-title">歌单评价</h3>
      <div v-if="!stats.ratings?.length" class="dash-empty">暂无评价</div>
      <div v-else class="error-list">
        <div v-for="(r, i) in stats.ratings" :key="i" class="error-item">
          <span class="error-time">{{ fmtTime(r.time) }}</span>
          <span class="fb-nickname">{{ r.nickname }}</span>
          <span class="error-method">{{ r.score }}</span>
          <span class="error-url">{{ r.mode }}</span>
          <span class="error-msg">{{ (r.categories || []).join(', ') }}</span>
          <span v-if="r.comment" class="rating-comment">{{ r.comment }}</span>
        </div>
      </div>
    </div>

    <div v-else class="admin-loading">加载中…</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

const emit = defineEmits(['back']);
const rootEl = ref(null);

const password = ref('');
const token = ref(localStorage.getItem('admin_token') || '');
const err = ref('');
const verifying = ref(false);
const stats = ref(null);
const onlineUsers = ref([]);

const labels = { mood: '情绪', genre: '曲风', language: '语种', hot: '热度', custom: '自定义' };
const replyTexts = ref({});
const maxVal = ref(1);

function barWidth(v) {
  return maxVal.value > 0 ? (v / maxVal.value) * 100 : 0;
}

async function loadStats() {
  try {
    const data = await api.getAdminStats(token.value);
    stats.value = data;
    const vals = Object.values(data.classifyStats || {});
    maxVal.value = Math.max(...vals, 1);
  } catch {
    token.value = '';
    localStorage.removeItem('admin_token');
  }
}

async function loadOnlineUsers() {
  try {
    onlineUsers.value = await api.getOnlineUsers(token.value);
  } catch {
    onlineUsers.value = [];
  }
}

async function onVerify() {
  err.value = '';
  verifying.value = true;
  try {
    const res = await api.verifyAdminPassword(password.value);
    if (res.success) {
      token.value = res.token;
      localStorage.setItem('admin_token', res.token);
      await Promise.all([loadStats(), loadOnlineUsers()]);
    } else {
      err.value = res.error || '密码错误';
    }
  } catch (e) {
    err.value = e?.response?.data?.error || '验证失败';
  } finally {
    verifying.value = false;
  }
}

async function onReply(id) {
  const text = replyTexts.value[id]?.trim();
  if (!text) return;
  try {
    await api.submitFeedbackReply(id, text, token.value);
    replyTexts.value[id] = '';
    await loadStats();
  } catch (e) {
    alert(e?.response?.data?.error || '回复失败');
  }
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(async () => {
  if (token.value) {
    try {
      await loadStats();
      await loadOnlineUsers();
    } catch {
      token.value = '';
      localStorage.removeItem('admin_token');
    }
  }
});
</script>

<style scoped>
.admin-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  overflow-y: auto;
  padding: 20px;
}
.admin-login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.admin-card {
  max-width: 320px;
  width: 100%;
  text-align: center;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
}
.admin-card h3 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
}
.admin-hint {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--text-muted);
}
.admin-pwd-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.admin-pwd-input:focus {
  border-color: var(--border-strong);
}
.admin-error {
  font-size: 12px;
  color: var(--danger);
  margin: 8px 0 0;
}
.admin-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #1d1d1d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.admin-btn:disabled {
  opacity: 0.4;
}
.admin-back {
  margin-top: 10px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 6px 12px;
}
.admin-back:hover {
  color: var(--text-secondary);
}
.dashboard {
  width: 100%;
  max-width: 640px;
  padding: 20px 0;
}
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.dash-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  color: var(--text);
}
.dash-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
.dash-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}
.dash-num {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.dash-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.dash-section-title {
  margin: 0 0 14px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.classify-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 28px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-label {
  width: 56px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--hover-bg);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--accent);
  transition: width 0.4s var(--ease);
}
.bar-value {
  width: 32px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dash-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 20px 0;
  text-align: center;
}
.error-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 28px;
  /* 每个区块内部独立滚动，避免整个页面滚得太长找不到顶部内容 */
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}
.error-list::-webkit-scrollbar {
  width: 6px;
}
.error-list::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 3px;
}
.error-list::-webkit-scrollbar-track {
  background: transparent;
}
.error-item {
  display: flex;
  gap: 8px;
  font-size: 11px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  flex-wrap: wrap;
}
.error-time {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.error-method {
  color: var(--accent);
  font-weight: 600;
  flex-shrink: 0;
}
.error-url {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.error-msg {
  color: var(--danger);
  flex: 1;
  min-width: 100px;
}
.feedback-item {
  display: flex;
  gap: 8px;
  font-size: 11px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  flex-wrap: wrap;
  flex-direction: column;
}
.fb-nickname {
  font-weight: 600;
  color: var(--accent);
  font-size: 12px;
}
.fb-content {
  color: var(--text-secondary);
  line-height: 1.6;
}
.fb-existing-reply {
  margin-top: 6px;
  font-size: 12px;
  color: var(--accent);
  padding: 6px 8px;
  background: var(--accent-soft);
  border-radius: 6px;
  width: 100%;
}
.fb-reply-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  width: 100%;
}
.fb-reply-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 12px;
  outline: none;
  min-width: 0;
}
.fb-reply-input:focus {
  border-color: var(--border-strong);
}
.fb-reply-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #1d1d1d;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
}
.fb-reply-btn:disabled {
  opacity: 0.4;
}
.online-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}
.online-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--hover-bg);
}
.online-nickname {
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}
.online-phone {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.online-time {
  color: var(--text-muted);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}
.rating-comment {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
  min-width: 100px;
}
.admin-loading {
  font-size: 14px;
  color: var(--text-muted);
}
@media (max-width: 480px) {
  .dash-grid { grid-template-columns: repeat(2, 1fr); }
  .error-list { max-height: 260px; }
}
</style>