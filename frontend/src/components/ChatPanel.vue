<template>
  <div class="chat-panel glass">
    <div class="messages" ref="msgBox">
      <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role, 'anim-spring']">
        <div class="bubble">{{ m.content }}</div>
      </div>
      <div v-if="loading" class="msg assistant anim-spring">
        <div class="bubble typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          正在调用网易云接口处理，请稍候...
        </div>
      </div>
    </div>

    <div class="input-row">
      <input
        v-model="input"
        placeholder='例如："把我所有红心歌曲按流派分类" 或 "为跑步场景建一个歌单"'
        :disabled="!loggedIn || loading"
        @keyup.enter="send"
      />
      <button class="primary" :disabled="!input.trim() || loading || !loggedIn" @click="send">
        发送
      </button>
    </div>
    <p v-if="!loggedIn" class="hint">请先扫码登录，AI 才能读取并整理你的歌单</p>
    <p v-else class="hint">💡 试试：把红心歌曲里偏流行的挑出来，建个「流行精选」歌单</p>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { api } from '../api';

defineProps({ loggedIn: Boolean });

const messages = ref([
  { role: 'assistant', content: '你好！我是你的网易云音乐歌单助手。登录后告诉我你想怎么整理歌单即可。' },
]);
const input = ref('');
const loading = ref(false);
const msgBox = ref(null);

async function send() {
  const text = input.value.trim();
  if (!text || loading.value) return;
  input.value = '';
  messages.value.push({ role: 'user', content: text });
  loading.value = true;
  scrollBottom();

  try {
    // 传历史消息（不含刚加的这条，由后端统一追加）
    const { answer } = await api.sendMessage(text, messages.value.slice(0, -1));
    messages.value.push({ role: 'assistant', content: answer });
  } catch (e) {
    const msg = e.response?.data?.error || e.message;
    messages.value.push({ role: 'assistant', content: '出错了：' + msg });
  } finally {
    loading.value = false;
    scrollBottom();
  }
}

function scrollBottom() {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight;
  });
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 22px;
  padding: 16px;
  transition: background 0.25s;
}
.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
}
.msg {
  display: flex;
}
.msg.user {
  justify-content: flex-end;
}
.msg.assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.user .bubble {
  background: var(--text);
  color: var(--panel-bg);
  border-top-right-radius: 2px;
}
.assistant .bubble {
  background: var(--bubble-ai-bg);
  color: var(--bubble-ai-text);
  border-top-left-radius: 2px;
}
.typing .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: pulse 1.2s infinite;
}
.typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.input-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.input-row input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--input-border);
  border-radius: 980px;
  font-size: 14px;
  outline: none;
  background: var(--input-bg);
  color: var(--text);
}
.input-row input:focus {
  border-color: var(--accent);
}
.input-row button {
  padding: 10px 24px;
  border: none;
  border-radius: 980px;
  background: var(--text);
  color: var(--panel-bg);
  font-size: 14px;
  cursor: pointer;
}
.input-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 8px 0 0;
}
</style>
