<template>
  <div class="app">
    <header class="app-header">
      <div class="brand" aria-label="Playlist Helper">
        <div class="brand-title" role="img" aria-label="Playlist Helper">Playlist Helper</div>
        <span class="version-badge">v{{ APP_VERSION }}</span>
      </div>
      <div class="user-area">
        <button class="theme-btn" @click="toggleTheme" :title="theme === 'light' ? '暗色模式' : '亮色模式'">
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 8.5A5.5 5.5 0 1 1 7.5 3a4.5 4.5 0 0 0 5.5 5.5Z" />
          </svg>
        </button>
        <button class="changelog-btn" @click="showFeedback = true" title="反馈">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12.5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6l-3 2.5Z" />
            <path d="M5.5 5.5h5M5.5 8h3" />
          </svg>
        </button>
        <button class="changelog-btn" @click="showChangelog = true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="12" height="11" rx="2" />
            <path d="M5 7h6M5 10h4" />
          </svg>
        </button>
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
              <button v-if="isAdmin" class="menu-item" @click="onAdmin">后台管理</button>
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
        <HomeView v-if="view === 'home'" key="home" :logged-in="!!profile" :version="APP_VERSION" @start="onStart" @select="onSelectMode" />

        <SelectView v-else-if="view === 'select'" key="select" @select="onSelectMode" @back="view = 'home'" />

        <ClassifyFlow
          v-else-if="view === 'classify'"
          key="classify"
          :mode="classifyMode"
          :logged-in="!!profile"
          @back="view = 'home'"
        />

        <div v-else-if="view === 'custom'" key="custom" class="custom-wrap">
          <div class="custom-header">
            <button class="back-btn" @click="view = 'home'">‹ 返回</button>
            <h3>自定义分类</h3>
          </div>
          <ChatPanel :logged-in="!!profile" />
        </div>
      </Transition>

      <!-- 后台管理 -->
      <AdminView v-if="view === 'admin'" key="admin" @back="view = 'home'" />

      <!-- 反馈记录 -->
      <FeedbackView v-if="view === 'feedback'" key="feedback" @back="view = 'home'" />
    </main>

    <LoginModal :visible="showLogin" @close="showLogin = false" @success="onLoginSuccess" />

    <!-- 反馈弹窗 -->
    <div v-if="showFeedback" class="changelog-overlay" @click.self="showFeedback = false">
      <div class="changelog-card anim-spring" style="width:380px">
        <div class="changelog-head">
          <h3>反馈</h3>
          <button class="changelog-close" @click="showFeedback = false">✕</button>
        </div>
        <template v-if="!profile">
          <p class="feedback-login-hint">请先登录后再提交反馈</p>
          <button class="feedback-submit" @click="showLogin = true; showFeedback = false">去登录</button>
        </template>
        <template v-else>
          <textarea
            v-model="feedbackContent"
            class="feedback-input"
            rows="4"
            placeholder="描述你的问题或建议…"
          ></textarea>
          <p v-if="feedbackSent" class="feedback-done">已收到，谢谢反馈！</p>
          <button
            v-if="!feedbackSent"
            class="feedback-submit"
            :disabled="!feedbackContent.trim() || feedbackSending"
            @click="onSubmitFeedback"
          >{{ feedbackSending ? '发送中…' : '发送' }}</button>
          <button class="feedback-my-link" @click="showFeedback = false; view = 'feedback'">我的反馈记录 →</button>
        </template>
      </div>
    </div>

    <!-- 更新日志弹窗 -->
    <div v-if="showChangelog" class="changelog-overlay" @click.self="showChangelog = false">
      <div class="changelog-card anim-spring">
        <div class="changelog-head">
          <h3>更新日志</h3>
          <button class="changelog-close" @click="showChangelog = false">✕</button>
        </div>
        <div class="changelog-body">
          <div v-for="v in changelog" :key="v.version" class="cl-entry">
            <span class="cl-version">{{ v.version }}</span>
            <ul>
              <li v-for="item in v.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api, clearSessionId } from './api';
import pkg from '../package.json';
import LoginModal from './components/LoginModal.vue';
import HomeView from './components/HomeView.vue';
import SelectView from './components/SelectView.vue';
import ClassifyFlow from './components/ClassifyFlow.vue';
import ChatPanel from './components/ChatPanel.vue';
import AdminView from './components/AdminView.vue';
import FeedbackView from './components/FeedbackView.vue';

const APP_VERSION = pkg.version;

const view = ref('home'); // home | select | classify | custom
const classifyMode = ref('genre');
const showLogin = ref(false);
const showChangelog = ref(false);
const showFeedback = ref(false);
const feedbackContent = ref('');
const feedbackSending = ref(false);
const feedbackSent = ref(false);
const profile = ref(null);
const loggingOut = ref(false);
const showMenu = ref(false);
const theme = ref(localStorage.getItem('ncm_theme') || 'dark');

// 判断是否为管理员（昵称 lbz老班长- 或手机号 13310843113）
const isAdmin = computed(() => {
  const p = profile.value;
  if (!p) return false;
  return p.nickname === 'lbz老班长-' || p.phone === '13310843113';
});

const changelog = [
  {
    version: '0.7',
    items: ['正式上线安全加固：CORS 锁域、请求体限制、数据文件锁', '分类每日上限 3 次', '登录态本地持久化，部署后自动恢复', '网易云接口超时提升 + 自动重试'],
  },
  {
    version: '0.6.1',
    items: ['评价新增文字输入框，可补充评价内容', '后台评价列表显示文字评价'],
  },
  {
    version: '0.6',
    items: ['反馈系统升级：需登录提交，用户可查看反馈记录与管理员回复', '管理员可逐条回复反馈', '生成歌单后提供评价选项（满意/一般/不满意）', '后台管理新增评价列表'],
  },
  {
    version: '0.5.5',
    items: ['右上角新增反馈按钮（气泡图标）', '用户可提交文字反馈，后台管理页查看', '后台管理新增反馈列表'],
  },
  {
    version: '0.5.4',
    items: ['新增后台管理面板（仅管理员可见）', '数据追踪：用户数、活跃、分类统计、报错日志', '密码验证访问'],
  },
  {
    version: '0.5.3',
    items: ['补全 0.1.1~0.4.3 历史更新日志', '分类选择页增加退出按钮'],
  },
  {
    version: '0.5.2',
    items: ['进度条自主平滑增长 — 不再卡在 45% 等待后端'],
  },
  {
    version: '0.5.1',
    items: ['主题切换独立为太阳/月亮图标', '版本号同步更新 0.5.0', '分类进度条平滑动画', '用户菜单 z-index 修复', '用户名区域背景色提示可点击'],
  },
  {
    version: '0.5',
    items: ['HomeView 精简重构 — 移除分类入口，滑到底 CTA 开始', '逐字滚动动画，模仿 itsoffbrand 文字效果', '手机端适配'],
  },
  {
    version: '0.4.3',
    items: ['菜单 z-index 二次修复（app-header 堆叠上下文）', '分类按钮始终固定在底部，歌单未加载时不上移'],
  },
  {
    version: '0.4.2',
    items: ['主题切换从菜单独立为太阳/月亮 SVG 图标', '用户菜单 z-index 60→1000', '用户名区域默认背景色+边框，hover 加深可点击提示'],
  },
  {
    version: '0.4.1',
    items: ['版本号同步 0.5.0', '分类进度条平滑动画（渲染 25%→45%→100% 不再跳变）'],
  },
  {
    version: '0.4',
    items: ['新增分类选择页"按什么整理？"', '右上角更新日志弹窗', 'CTA 点击先进入选择页再进分类流程'],
  },
  {
    version: '0.3.4',
    items: ['HomeView 大精简 — 移除入口卡片，滑到底 CTA 进入', '文案大幅精简，信任条合并为一句'],
  },
  {
    version: '0.3.3',
    items: ['全面模仿 itsoffbrand 灰度风格', '移除所有彩色与粒子效果', '纯灰 #1d1d1d 背景 #e5e4e0 文字'],
  },
  {
    version: '0.3.2',
    items: ['底部全屏 CTA"现在开始"区块'],
  },
  {
    version: '0.3.1',
    items: ['全面 itsoffbrand 灰度风格视觉改版', '暗色默认主题，亮色可切换', '19 处硬编码颜色替换为 CSS 变量'],
  },
  {
    version: '0.3',
    items: ['首屏信息架构重构 — 信任设计、Before/After 对比', '登录权限承诺与隐私说明'],
  },
  {
    version: '0.2.5',
    items: ['登录风控修复 — loginByCellphone 同步透传真实 IP'],
  },
  {
    version: '0.2.4',
    items: ['验证码 406 限流修复 — 真实 IP 透传破 Render 共享 IP 限制'],
  },
  {
    version: '0.2.3',
    items: ['右上角改为"登录"', '验证码登录与扫码登录面板均增加关闭按钮'],
  },
  {
    version: '0.2.2',
    items: ['NETEASE_API_BASE 修复两轮 — Invalid URL + ENOTFOUND', '配置层 normalizeBase 完整兼容裸主机名/完整 URL/localhost'],
  },
  {
    version: '0.2.1',
    items: ['render.yaml 的 LLM_BASE_URL 补 /v1', '忽略本地 ncm-api 临时目录'],
  },
  {
    version: '0.2',
    items: ['分类流程改为异步任务 + 真进度轮询，解决 Render 50s 超时', 'GitHub Actions 定时保活（每 10 分钟 ping）'],
  },
  {
    version: '0.1.2',
    items: ['验证码登录错误透传', 'GitHub Actions 保活工作流'],
  },
  {
    version: '0.1.1',
    items: ['Render.yaml 部署配置（网易云 API + 后端服务）', '修复 render.yaml fromService property 配置'],
  },
  {
    version: '0.1',
    items: ['网易云 AI 歌单助手初始版本', '扫码 + 手机验证码登录', '情绪 / 曲风 / 语种 / 热度四维分类', '自定义描述分类', '一键新建歌单'],
  },
];

function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme.value);
}
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('ncm_theme', theme.value);
  applyTheme();
}

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

function onStart() {
  view.value = 'select';
}

function onAdmin() {
  showMenu.value = false;
  view.value = 'admin';
}

async function onSubmitFeedback() {
  const text = feedbackContent.value.trim();
  if (!text) return;
  feedbackContent.value = '';
  feedbackSending.value = true;
  try {
    await api.submitFeedback(text);
    feedbackSent.value = true;
  } catch {
    // 失败不阻塞
  } finally {
    feedbackSending.value = false;
  }
}

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
  try {
    const res = await api.me();
    if (res.loggedIn && res.profile) {
      profile.value = res.profile;
      return;
    }
  } catch {
    // 网络异常时忽略
  }
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
  position: relative;
  z-index: 10;
  animation: fade-in 0.5s var(--ease) both;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
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
  color: #e5e4e0;
  background: rgba(255,255,255,0.1);
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
.changelog-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s var(--ease), border-color 0.15s var(--ease);
}
.changelog-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  color: var(--text-secondary);
}
.theme-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s var(--ease), border-color 0.15s var(--ease);
}
.theme-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  color: var(--text-secondary);
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
  color: #1d1d1d;
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
  border: 1px solid var(--border);
  background: var(--surface);
  transition: background 0.15s, border-color 0.15s;
}
.user-menu-wrap:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}
.user-menu-wrap.not-clickable {
  cursor: default;
  opacity: 0.6;
}
.user-menu-wrap.not-clickable:hover {
  background: var(--surface);
  border-color: var(--border);
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
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--glass-shadow);
  padding: 5px;
  z-index: 1000;
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
  color: #1d1d1d;
}
.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.app-main {
  flex: 1;
  min-height: 0;
  padding-bottom: 16px;
  position: relative;
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

/* ============ 更新日志 ============ */
.changelog-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--modal-overlay);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.changelog-card {
  width: 340px;
  max-height: 70vh;
  border-radius: 18px;
  padding: 20px;
  text-align: left;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  box-shadow: var(--glass-shadow);
  display: flex;
  flex-direction: column;
}
.changelog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.changelog-head h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
}
.changelog-close {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s;
}
.changelog-close:hover {
  background: var(--hover-bg);
}
.feedback-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
  font-family: var(--font);
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  line-height: 1.5;
}
.feedback-input:focus {
  border-color: var(--border-strong);
}
.feedback-submit {
  margin-top: 12px;
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
.feedback-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.feedback-done {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}
.feedback-login-hint {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  margin: 12px 0;
}
.feedback-my-link {
  margin-top: 8px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  display: block;
  width: 100%;
  text-align: center;
  padding: 6px;
}
.feedback-my-link:hover {
  color: var(--text-secondary);
}
.changelog-body {
  overflow-y: auto;
  flex: 1;
}
.cl-entry {
  margin-bottom: 14px;
}
.cl-version {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  display: block;
  margin-bottom: 4px;
}
.cl-entry ul {
  margin: 0;
  padding-left: 16px;
  list-style: disc;
}
.cl-entry li {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ============ Mobile ============ */
@media (max-width: 767px) {
  .app { padding: 0 12px; }
  .app-header { padding: 12px 0; gap: 4px; }
  .brand-title { font-size: 14px; }
  .version-badge { font-size: 10px; padding: 1px 6px; }
  .nickname { display: none; }
  .user-area { gap: 4px; }
  .user-menu-wrap { padding: 4px 8px; }
  .changelog-btn, .theme-btn { padding: 4px; }
  .changelog-btn svg, .theme-btn svg { width: 14px; height: 14px; }
}
@media (max-width: 480px) {
  .version-badge { display: none; }
}
</style>