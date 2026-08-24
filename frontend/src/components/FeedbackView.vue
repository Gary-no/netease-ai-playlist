<template>
  <div class="fb-view">
    <div class="fb-header">
      <button class="back-btn" @click="$emit('back')">‹ 返回</button>
      <h3>我的反馈记录</h3>
    </div>
    <div v-if="loading" class="fb-empty">加载中…</div>
    <div v-else-if="!list.length" class="fb-empty">暂无反馈记录</div>
    <div v-else class="fb-list">
      <div v-for="f in list" :key="f.id" class="fb-item">
        <div class="fb-head">
          <span class="fb-time">{{ fmtTime(f.time) }}</span>
        </div>
        <p class="fb-content">{{ f.content }}</p>
        <div v-if="f.reply" class="fb-reply">
          <span class="fb-reply-label">管理员回复：</span>
          <span>{{ f.reply }}</span>
        </div>
        <div v-else class="fb-noreply">等待回复</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

defineEmits(['back']);

const list = ref([]);
const loading = ref(true);

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(async () => {
  try {
    const res = await api.getMyFeedbacks();
    list.value = res.feedbacks || [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.fb-view {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}
.fb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.fb-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: var(--text);
}
.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-btn:hover {
  background: var(--surface-hover);
}
.fb-empty {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  padding: 40px 0;
}
.fb-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
  margin: 0 auto;
}
.fb-item {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}
.fb-head {
  margin-bottom: 6px;
}
.fb-time {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.fb-content {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
}
.fb-reply {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 8px 10px;
  background: var(--accent-soft);
  border-radius: 8px;
  line-height: 1.5;
}
.fb-reply-label {
  font-weight: 600;
  color: var(--accent);
}
.fb-noreply {
  font-size: 12px;
  color: var(--text-muted);
}
</style>