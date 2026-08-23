<template>
  <div class="app">
    <header class="app-header">
      <div class="brand" aria-label="Playlist Helper">
        <div class="brand-title" role="img" aria-label="Playlist Helper">Playlist Helper</div>
        <span class="version-badge">v{{ APP_VERSION }}</span>
      </div>
      <div class="user-area">
        <template v-if="profile">
          <div
            class="user-menu-wrap"
            :class="{ 'not-clickable': view !== 'home' }"
            @click.stop="view === 'home' && (showMenu = !showMenu)"
          >
            <img v-if="profile.avatarUrl" :src="profile.avatarUrl" class="avatar" alt="" />
            <span v-else class="avatar avatar-fallback">👤</span>
            <span class="nickname">{{ profile.nickname }}</span>
            <span class="caret" :class="{ hidden: view !== 'home' }">▾</span>
            <div v-if="showMenu && view === 'home'" class="user-menu anim-pop">
              <button class="menu-item" @click="toggleTheme">
                {{ theme === 'light' ? '🌙 暗色模式' : '☀️ 亮色模式' }}
              </button>
              <button class="menu-item danger" @click="onLogout" :disabled="loggingOut">
                {{ loggingOut ? '退出中...' : '退出账号' }}
              </button>
            </div>
          </div>
        </template>
        <button v-else class="login-btn" @click="showLogin = true">登录</button>
      </div>
    </header>

    <main class="app-main">
      <Transition name="view" mode="out-in">
        <!-- 一级界面：分类入口 -->
        <HomeView v-if="view === 'home'" key="home" :logged-in="!!profile" :version="APP_VERSION" @select="onSelectMode" />

        <!-- 二级界面：一键分类流程 -->
        <ClassifyFlow
          v-else-if="view === 'classify'"
          key="classify"
          :mode="classifyMode"
          :logged-in="!!profile"
          @back="view = 'home'"
        />

        <!-- 自定义分类：对话界面 -->
        <div v-else key="custom" class="custom-wrap">
          <div class="custom-header">
            <button class="back-btn" @click="view = 'home'">‹ 返回</button>
            <h3>自定义分类</h3>
          </div>
          <ChatPanel :logged-in="!!profile" />
        </div>
      </Transition>
    </main>

    <LoginModal :visible="showLogin" @close="showLogin = false" @success="onLoginSuccess" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api, clearSessionId } from './api';
import pkg from '../package.json';
import LoginModal from './components/LoginModal.vue';
import HomeView from './components/HomeView.vue';
import ClassifyFlow from './components/ClassifyFlow.vue';
import ChatPanel from './components/ChatPanel.vue';

const APP_VERSION = pkg.version;

const view = ref('home'); // home | classify | custom
const classifyMode = ref('genre');
const showLogin = ref(false);
const profile = ref(null);
const loggingOut = ref(false);
const showMenu = ref(false);
const theme = ref(localStorage.getItem('ncm_theme') || 'dark');

// 明暗主题
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme.value);
}
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('ncm_theme', theme.value);
  applyTheme();
}

// 点击页面其他地方时关闭头像菜单
function closeMenu() {
  showMenu.value = false;
}

onMounted(async () => {
  document.addEventListener('click', closeMenu);
  applyTheme();
  try {
    const res = await api.me();
    if (res.loggedIn) profile.value = res.profile;
  } catch {
    // 后端未启动时忽略
  }
});

onUnmounted(() => {
  document.removeEventListener('click', closeMenu);
});

function onSelectMode(mode) {
  if (!profile.value) {
    showLogin.value = true;
    return;
  }
  if (mode === 'custom') {
    view.value = 'custom';
    return;
  }
  classifyMode.value = mode;
  view.value = 'classify';
}

async function onLoginSuccess(p) {
  showLogin.value = false;
  showMenu.value = false;
  // 以 /me 为准二次确认登录态（防止扫码接口返回的 profile 不完整）
  try {
    const res = await api.me();
    if (res.loggedIn && res.profile) {
      profile.value = res.profile;
      return;
    }
  } catch {
    // 网络异常时忽略，走下方兜底
  }
  // 兜底：使用扫码接口返回的 profile
  if (p) profile.value = p;
}

async function onLogout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await api.logout();
  } catch {
    // 后端异常也继续本地登出
  }
  clearSessionId();
  profile.value = null;
  loggingOut.value = false;
  showMenu.value = false;
  view.value = 'home';
}
</script>

<style scoped>
.app {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  animation: fade-in 0.5s var(--ease) both;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand h1 {
  margin: 0;
  font-size: 20px;
  color: var(--text);
}
.brand-title {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--text);
}
.version-badge {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  padding: 2px 8px;
  border-radius: 10px;
  line-height: 1.4;
  transform: translateY(2px);
}
.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.nickname {
  font-size: 14px;
  color: var(--text);
  font-weight: 600;
}
.login-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 980px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}
.login-btn:hover {
  opacity: 0.85;
}
.user-menu-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.user-menu-wrap:hover {
  background: var(--hover-bg-strong);
  border-color: var(--accent);
}
.user-menu-wrap.not-clickable {
  cursor: default;
}
.user-menu-wrap.not-clickable:hover {
  background: transparent;
  border-color: transparent;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  font-size: 16px;
}
.caret {
  font-size: 10px;
  color: var(--text-secondary);
}
.caret.hidden {
  visibility: hidden;
}
.user-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 150px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--panel-shadow);
  padding: 5px;
  z-index: 60;
}
.menu-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
  border-radius: 9px;
  text-align: left;
  color: var(--text);
}
.menu-item:hover {
  background: var(--hover-bg);
}
.menu-item.danger {
  color: var(--danger);
}
.menu-item.danger:hover {
  background: var(--danger);
  color: #fff;
}
.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.app-main {
  flex: 1;
  min-height: 0;
  padding-bottom: 16px;
}
.custom-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.custom-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 12px;
  flex-shrink: 0;
}
.custom-header h3 {
  margin: 0;
  font-size: 17px;
  color: var(--text);
}
.custom-hint {
  font-size: 13px;
  color: var(--text-secondary);
}
.back-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 980px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  font-weight: 500;
}
/* 视图切换过渡 */
.view-enter-active,
.view-leave-active {
  transition: opacity 0.26s var(--ease), transform 0.26s var(--ease);
}
.view-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.99);
}
.view-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.99);
}
</style>
