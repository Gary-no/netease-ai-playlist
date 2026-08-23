<template>
  <div ref="rootEl" class="select-view">
    <button class="close-btn" @click="emit('back')" aria-label="退出">✕</button>
    <div class="select-inner">
      <p class="select-label">选择分类维度</p>
      <h2 class="select-title">按什么整理？</h2>

      <div class="grid">
        <div
          v-for="opt in options"
          :key="opt.mode"
          class="item"
          @click="emit('select', opt.mode)"
        >
          <h3>{{ opt.title }}</h3>
          <p>{{ opt.desc }}</p>
        </div>
      </div>

      <button class="custom-btn" @click="emit('select', 'custom')">
        自定义描述
        <span>→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';

const emit = defineEmits(['select', 'back']);
const rootEl = ref(null);
let ctx;

const options = [
  { mode: 'mood', title: '情绪', desc: '治愈 / 热血 / 伤感' },
  { mode: 'genre', title: '曲风', desc: '摇滚 / 民谣 / 电子' },
  { mode: 'language', title: '语种', desc: '华语 / 欧美 / 日韩' },
  { mode: 'hot', title: '热度', desc: '冷门宝藏 / 热门金曲' },
];

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from('.select-label', { y: 12, opacity: 0, duration: 0.4, ease: 'power2.out', delay: 0.05 });
    gsap.from('.select-title', { y: 16, opacity: 0, duration: 0.45, ease: 'power2.out', delay: 0.1 });
    gsap.from('.item', { y: 20, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06, delay: 0.15 });
    gsap.from('.custom-btn', { y: 12, opacity: 0, duration: 0.35, ease: 'power2.out', delay: 0.35 });
  }, rootEl.value);
});

onUnmounted(() => ctx && ctx.revert());
</script>

<style scoped>
.select-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  position: relative;
}
.select-inner {
  max-width: 520px;
  width: 100%;
  padding: 20px;
  text-align: center;
}
.select-label {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 450;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.select-title {
  margin: 0 0 32px;
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 42px);
  font-weight: 350;
  letter-spacing: -0.02em;
  color: var(--text);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--border);
}
.item {
  padding: 28px 18px 22px;
  cursor: pointer;
  background: var(--bg);
  transition: background 0.25s var(--ease);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.item:hover {
  background: var(--surface-hover);
}
.item h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 450;
  color: var(--text);
  letter-spacing: 0.02em;
}
.item p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.custom-btn {
  margin-top: 22px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 450;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 980px;
  transition: background 0.2s var(--ease), border-color 0.2s var(--ease);
}
.custom-btn:hover { background: var(--surface-hover); border-color: var(--border-strong); }
.custom-btn span { transition: transform 0.2s var(--ease); }
.custom-btn:hover span { transform: translateX(4px); }
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.15s var(--ease), border-color 0.15s var(--ease);
  z-index: 2;
}
.close-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
  .select-inner { padding: 16px; }
}
</style>