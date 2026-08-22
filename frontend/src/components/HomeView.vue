<template>
  <div class="home-view">
    <h1 class="welcome">Playlist Helper</h1>
    <p class="subtitle">选择一种方式，整理你的歌单</p>

    <!-- 四个入口卡片 -->
    <div class="cards">
      <div
        v-for="(opt, i) in options"
        :key="opt.mode"
        class="card glass anim-stagger"
        :style="{ '--i': i }"
        @click="emit('select', opt.mode)"
      >
        <svg class="card-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <g v-html="opt.svg"></g>
        </svg>
        <h3>{{ opt.title }}</h3>
      </div>
    </div>

    <!-- 自定义：小入口 -->
    <button class="custom-link anim-fade-up" @click="emit('select', 'custom')">
      自定义分类
      <span class="arrow">→</span>
    </button>
  </div>
</template>

<script setup>
const emit = defineEmits(['select']);

const options = [
  {
    mode: 'mood',
    title: '情绪',
    svg: `
      <circle cx="24" cy="24" r="18" />
      <path d="M16 20v.5M32 20v.5" stroke-width="3" />
      <path d="M16 29c2 2.8 4.8 4.2 8 4.2s6-1.4 8-4.2" />
    `,
  },
  {
    mode: 'genre',
    title: '曲风',
    svg: `
      <path d="M14 34V12l20-4v22" />
      <circle cx="11" cy="34" r="4" />
      <circle cx="31" cy="30" r="4" />
    `,
  },
  {
    mode: 'language',
    title: '语种',
    svg: `
      <circle cx="24" cy="24" r="18" />
      <line x1="6" y1="24" x2="42" y2="24" />
      <path d="M24 6a26 26 0 0 1 0 36" />
      <path d="M24 6a26 26 0 0 0 0 36" />
    `,
  },
  {
    mode: 'hot',
    title: '热度',
    svg: `
      <path d="M24 40 C12.5 32.5 7 25 7 17.5 A9 9 0 0 1 24 14 A9 9 0 0 1 41 17.5 C41 25 35.5 32.5 24 40 Z" fill="currentColor" stroke="none" />
    `,
  },
];
</script>

<style scoped>
.home-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  gap: 28px;
  overflow-y: auto;
}
.welcome {
  font-size: 40px;
  font-weight: 700;
  margin: 0;
  color: var(--text);
  letter-spacing: -0.5px;
  animation: fade-up 0.6s var(--ease) both;
}
.subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: -18px 0 0;
  animation: fade-up 0.6s var(--ease) 0.1s both;
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 400px;
}
.card {
  border-radius: 20px;
  padding: 26px 16px;
  cursor: pointer;
  transition: transform 0.22s var(--ease), box-shadow 0.22s var(--ease);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    0 8px 20px rgba(0, 0, 0, 0.08),
    0 24px 56px rgba(0, 0, 0, 0.14);
}
.card:active {
  transform: translateY(-1px) scale(0.98);
}
.card-icon {
  width: 44px;
  height: 44px;
  color: var(--accent);
  transition: transform 0.32s var(--ease);
}
.card:hover .card-icon {
  transform: translateY(-2px) scale(1.06);
}
.card h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.custom-link {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 980px;
  transition: background 0.15s;
  animation: fade-up 0.6s var(--ease) 0.3s both;
}
.custom-link:hover {
  background: var(--accent-soft);
}
.arrow {
  transition: transform 0.2s var(--ease);
}
.custom-link:hover .arrow {
  transform: translateX(3px);
}
@media (max-width: 480px) {
  .welcome { font-size: 30px; }
  .cards { grid-template-columns: 1fr 1fr; gap: 12px; }
}
</style>
