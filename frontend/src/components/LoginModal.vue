<template>
  <div v-if="visible" class="login-modal">
    <div class="modal-card anim-spring">
      <h3>登录网易云音乐</h3>

      <!-- 登录方式切换 -->
      <div class="tabs">
        <button :class="{ active: mode === 'qr' }" @click="switchMode('qr')">扫码登录</button>
        <button :class="{ active: mode === 'phone' }" @click="switchMode('phone')">手机验证码登录</button>
      </div>

      <!-- 扫码登录：默认直接显示二维码 -->
      <template v-if="mode === 'qr'">
        <div class="qr-box">
          <img v-if="qrimg" :src="qrimg" alt="登录二维码" />
          <div v-else class="qr-placeholder">加载中...</div>
        </div>
        <p class="status" :class="{ success: loggedIn, error: expired }">{{ statusText }}</p>
        <div class="actions">
          <button class="ghost" @click="startLogin" :disabled="scanning">刷新二维码</button>
          <button @click="$emit('close')">关闭</button>
        </div>
      </template>

      <!-- 手机验证码登录 -->
      <template v-else>
        <div class="phone-form">
          <input
            v-model="phone"
            class="text-input"
            type="tel"
            maxlength="11"
            placeholder="手机号"
          />
          <div class="captcha-row">
            <input
              v-model="captcha"
              class="text-input"
              type="text"
              maxlength="6"
              placeholder="验证码"
            />
            <button class="captcha-btn" :disabled="sending || countdown > 0" @click="sendCaptcha">
              {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
            </button>
          </div>
          <button
            class="primary full"
            :disabled="!phone || !captcha || phoneLogging"
            @click="phoneLogin"
          >
            {{ phoneLogging ? '登录中...' : '登录' }}
          </button>
          <p v-if="phoneError" class="status error">{{ phoneError }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { api } from '../api';

const props = defineProps({ visible: Boolean });
const emit = defineEmits(['close', 'success']);

const mode = ref('qr'); // qr | phone

// ---- 扫码登录 ----
const qrimg = ref('');
const statusText = ref('');
const scanning = ref(false);
const expired = ref(false);
const loggedIn = ref(false);

let unikey = '';
let timer = null;
let qrCreatedAt = 0;
const QR_AUTO_REFRESH_MS = 240 * 1000;

// ---- 手机验证码登录 ----
const phone = ref('');
const captcha = ref('');
const sending = ref(false);
const phoneLogging = ref(false);
const phoneError = ref('');
const countdown = ref(0);
let countdownTimer = null;

function switchMode(m) {
  mode.value = m;
  if (m === 'qr' && !qrimg.value) startLogin();
}

// 获取二维码并开始轮询
async function startLogin() {
  statusText.value = '正在生成二维码...';
  expired.value = false;
  loggedIn.value = false;
  try {
    const res = await api.createQr();
    unikey = res.unikey;
    qrimg.value = res.qrimg;
    qrCreatedAt = Date.now();
    statusText.value = '请使用网易云音乐 App 扫码';
    scanning.value = true;
    startPoll();
  } catch (e) {
    statusText.value = '生成二维码失败：' + (e.response?.data?.error || e.message);
    scanning.value = false;
  }
}

// 每 2s 轮询一次扫码状态
function startPoll() {
  stopPoll();
  timer = setInterval(async () => {
    let res;
    try {
      res = await api.checkQr(unikey);
    } catch {
      return;
    }

    if (res.code === 800) {
      startLogin();
      statusText.value = '二维码已过期，正在自动刷新...';
    } else if (res.code === 802) {
      statusText.value = '已扫码，请在手机上确认登录';
    } else if (res.code === 803) {
      stopPoll();
      if (res.loginWarn) {
        statusText.value = res.loginWarn;
        loggedIn.value = false;
        scanning.value = false;
      } else {
        statusText.value = '登录成功！';
        loggedIn.value = true;
        emit('success', res.profile);
      }
    } else if (res.code === 801 && Date.now() - qrCreatedAt > QR_AUTO_REFRESH_MS) {
      startLogin();
      statusText.value = '二维码即将过期，正在自动刷新...';
    }
  }, 2000);
}

function stopPoll() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// 发送验证码
async function sendCaptcha() {
  if (!/^1\d{10}$/.test(phone.value)) {
    phoneError.value = '请输入正确的手机号';
    return;
  }
  phoneError.value = '';
  sending.value = true;
  try {
    await api.sendCaptcha(phone.value);
    countdown.value = 60;
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(countdownTimer);
    }, 1000);
  } catch (e) {
    phoneError.value = e.response?.data?.error || e.message || '发送验证码失败';
  } finally {
    sending.value = false;
  }
}

// 手机验证码登录
async function phoneLogin() {
  phoneLogging.value = true;
  phoneError.value = '';
  try {
    const res = await api.loginByCellphone(phone.value, captcha.value);
    emit('success', res.profile);
  } catch (e) {
    phoneError.value = e.response?.data?.error || e.message || '登录失败';
  } finally {
    phoneLogging.value = false;
  }
}

onUnmounted(() => {
  stopPoll();
  if (countdownTimer) clearInterval(countdownTimer);
});

// 打开弹窗默认直接显示二维码
watch(
  () => props.visible,
  (v) => {
    if (v && mode.value === 'qr' && !qrimg.value) startLogin();
  }
);
</script>

<style scoped>
.login-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  width: 360px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(34px) saturate(180%);
  -webkit-backdrop-filter: blur(34px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--panel-shadow);
  padding: 24px;
  text-align: center;
}
.modal-card h3 {
  margin: 0 0 16px;
  color: var(--text);
  font-size: 18px;
}
.tabs {
  display: flex;
  gap: 6px;
  background: var(--bubble-ai-bg);
  border-radius: 980px;
  padding: 4px;
  margin-bottom: 20px;
}
.tabs button {
  flex: 1;
  border: none;
  background: none;
  padding: 8px 0;
  border-radius: 980px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s var(--ease);
}
.tabs button.active {
  background: var(--glass-bg-strong);
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}
.qr-box {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  border: 1px solid var(--input-border);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
}
.qr-box img {
  width: 100%;
  height: 100%;
}
.qr-placeholder {
  font-size: 14px;
  color: var(--text-secondary);
}
.status {
  font-size: 13px;
  color: var(--text);
  margin: 12px 0 4px;
  min-height: 18px;
}
.status.success {
  color: #34c759;
}
.status.error {
  color: var(--danger);
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 12px;
}
.actions button {
  padding: 8px 20px;
  border: 1px solid var(--input-border);
  border-radius: 980px;
  background: var(--input-bg);
  color: var(--text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}
.actions button.ghost {
  border: none;
  background: none;
  color: var(--accent);
}
.phone-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}
.text-input {
  width: 100%;
  padding: 11px 16px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 15px;
  outline: none;
}
.text-input:focus {
  border-color: var(--accent);
}
.captcha-row {
  display: flex;
  gap: 10px;
}
.captcha-btn {
  flex-shrink: 0;
  border: none;
  background: var(--accent-soft);
  color: var(--accent);
  padding: 0 16px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}
.captcha-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.primary {
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 12px;
  padding: 12px;
  font-size: 15px;
  cursor: pointer;
  font-weight: 600;
}
button.primary.full {
  width: 100%;
}
button.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
