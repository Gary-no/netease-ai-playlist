<template>
  <div class="admin-view" ref="rootEl">
    <!-- 密码验证 -->
    <div v-if="!token" class="admin-login">
      <div class="admin-card">
        <h3>后台管理</h3>
        <p class="admin-hint">请输入管理员密码</p>
        <input
          v-model="password"
          type="password"
          class="admin-input"
          placeholder="密码"
          @keyup.enter="onVerify"
        />
        <p v-if="pwdError" class="admin-error">{{ pwdError }}</p>
        <button class="admin-btn" :disabled="verifying" @click="onVerify">
          {{ verifying ? '验证中…' : '进入' }}
        </button>
        <button class="admin-back" @click="$emit('back')">返回</button>
      </div>
    </div>

    <!-- 仪表盘 -->
    <div v-else-if="stats" class="dashboard">
      <div class="dash-header">
        <h2>后台管理</h2>
        <button class="admin-back" @click="onLogout">退出</button>
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

      <h3 class="dash-section-title">分类维度统计</h3>
      <div class="classify-bars">
        <div v-for="(v, k) in stats.classifyStats" :key="k" class="bar-row">
          <span class="bar-label">{{ labels[k] || k }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: barWidth(v) + '%' }"></div>
          </div>
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
    </div>

    <div v-else class="admin-loading">加载中…</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '../api';

const emit = defineEmits(['back']);
const rootEl = ref(null);

const password = ref('');
const pwdError = ref('');
const verifying = ref(false);
const token = ref(localStorage.getItem('admin_token') || '');
const stats = ref(null);

const labels = { mood: '情绪', genre: '曲风', language: '语种', hot: '热度', custom: '自定义' };

const maxVal = ref(1);

function barWidth(v) {
  return maxVal.value > 0 ? (v / maxVal.value) * 100 : 0;
}

async function onVerify() {
  if (!password.value) return;
  verifying.value = true;
  pwdError.value = '';
  try {
    const res = await api.verifyAdminPassword(password.value);
    if (res.token) {
      token.value = res.token;
      localStorage.setItem('admin_token', res.token);
      await loadStats();
    } else {
      pwdError.value = res.error || '密码错误';
    }
  } catch (e) {
    pwdError.value = '验证失败';
  } finally {
    verifying.value = false;
  }
}

async function loadStats() {
  try {
    const data = await api.getAdminStats(token.value);
    stats.value = data;
    const vals = Object.values(data.classifyStats || {});
    maxVal.value = Math.max(...vals, 1);
  } catch {
    // token 过期
    token.value = '';
    localStorage.removeItem('admin_token');
  }
}

function onLogout() {
  token.value = '';
  stats.value = null;
  localStorage.removeItem('admin_token');
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(() => {
  if (token.value) loadStats();
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

/* 密码验证 */
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
  margin: 0 0 20px;
  font-size: 12px;
  color: var(--text-muted);
}
.admin-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.admin-input:focus {
  border-color: var(--border-strong);
}
.admin-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger);
}
.admin-btn {
  margin-top: 16px;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #1d1d1d;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}
.admin-btn:disabled {
  opacity: 0.5;
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

/* 仪表盘 */
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
.admin-loading {
  font-size: 14px;
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .dash-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>