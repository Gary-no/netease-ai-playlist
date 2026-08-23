<template>
  <div ref="rootEl" class="home-view">
    <ParticleField />

    <!-- ============ HERO：全屏情感入口 ============ -->
    <section class="hero">
      <p class="eyebrow hero-el">仅支持 · 网易云音乐</p>
      <h1 class="hero-title hero-el">
        用情绪，整理<br />你的<span class="grad">音乐世界</span>。
      </h1>
      <p class="hero-desc hero-el">
        连接网易云账号，AI 读取你的歌单与收藏，按情绪 / 曲风 / 语种 / 热度
        自动拆成井井有条的新歌单 —— 不删一首，原歌单原样保留。
      </p>
      <div v-if="!loggedIn" class="trust-strip glass hero-el">
        <span class="trust-dot" aria-hidden="true">●</span>
        <span>仅请求「读取歌单」权限</span>
        <span class="sep">·</span>
        <span>不修改、不删除你的任何歌单</span>
        <span class="sep">·</span>
        <span>可随时在网易云账号中撤销授权</span>
      </div>
      <p v-else class="trust-strip-ok hero-el">已连接 · 随时可在头像菜单退出并撤销授权</p>
      <div class="scroll-cue hero-el" aria-hidden="true">
        <span class="cue-line"></span>
        <span class="cue-text">SCROLL</span>
      </div>
    </section>

    <!-- ============ 四个分类入口 ============ -->
    <section class="section reveal">
      <p class="section-eyebrow">四种维度 · 一键开整</p>
      <h2 class="section-title">选一个入口</h2>
      <div class="cards">
        <div
          v-for="opt in options"
          :key="opt.mode"
          class="card glass"
          @click="emit('select', opt.mode)"
          @mousemove="onCardMove"
          @mouseleave="onCardLeave"
        >
          <svg class="card-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <g v-html="opt.svg"></g>
          </svg>
          <h3>{{ opt.title }}</h3>
          <p class="card-desc">{{ opt.desc }}</p>
          <span class="card-go" aria-hidden="true">→</span>
        </div>
      </div>
      <button class="custom-link" @click="emit('select', 'custom')">
        自定义分类
        <span class="arrow">→</span>
      </button>
      <p class="custom-hint">比如：按“适合跑步/加班/下雨天”自由描述，AI 按你的话术分</p>
    </section>

    <!-- ============ Before / After ============ -->
    <section class="section reveal">
      <p class="section-eyebrow">效果直观对比</p>
      <h2 class="section-title">整理前后，一目了然</h2>
      <div class="before-after glass">
        <div class="ba-col ba-before">
          <p class="ba-label">整理前 · 一个大杂烩</p>
          <div class="ba-stack">
            <span class="ba-pill ba-pill--mess">我喜欢的音乐 482 首 ▶</span>
            <span class="ba-hint">摇滚和民谣混一起 · 找歌靠翻</span>
          </div>
        </div>
        <div class="ba-arrow" aria-hidden="true">→</div>
        <div class="ba-col ba-after">
          <p class="ba-label">整理后 · 按你选的维度自动拆分</p>
          <div class="ba-stack ba-stack--grid">
            <span class="ba-pill">🌙 深夜治愈 38 首</span>
            <span class="ba-pill">🔥 热血摇滚 54 首</span>
            <span class="ba-pill">☕ 咖啡民谣 42 首</span>
            <span class="ba-pill">✈️ 运动节拍 61 首</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 三步用法 + 信任页脚 ============ -->
    <section class="section reveal">
      <p class="section-eyebrow">怎么用</p>
      <h2 class="section-title">三步完成</h2>
      <ol class="howto-steps">
        <li><span class="step-no">01</span><div><strong>登录网易云</strong><p>扫码或验证码，仅读取歌单</p></div></li>
        <li><span class="step-no">02</span><div><strong>选一个维度</strong><p>情绪 / 曲风 / 语种 / 热度，或自定义描述</p></div></li>
        <li><span class="step-no">03</span><div><strong>确认新建</strong><p>预览分类结果，确认后才批量建新歌单加歌</p></div></li>
      </ol>
    </section>

    <footer class="foot reveal">
      免费使用 · v{{ version }} · 不会删除或修改原歌单 · 隐私与授权说明见登录弹窗 ·
      反馈请提 <a href="https://github.com/Gary-no/netease-ai-playlist/issues" target="_blank" rel="noopener">GitHub Issue</a>
    </footer>

    <!-- ============ CTA：现在开始（全屏） ============ -->
    <section class="cta reveal" @click="onStart">
      <p class="cta-eyebrow">准备好了吗</p>
      <h2 class="cta-title">
        现在<span class="grad">开始</span>
      </h2>
      <div class="cta-arrow" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="24" cy="24" r="22" />
          <path d="M20 16l8 8-8 8" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ParticleField from './ParticleField.vue';

const props = defineProps({ loggedIn: Boolean, version: String });
const emit = defineEmits(['select']);

const rootEl = ref(null);
let ctx;

gsap.registerPlugin(ScrollTrigger);

onMounted(() => {
  const root = rootEl.value;
  ctx = gsap.context(() => {
    // Hero 入场：依次浮现（600ms 内 ease-out）
    gsap.from('.hero-el', {
      y: 36,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.09,
      delay: 0.1,
    });
    // 滚动触发：每个 section 进入视口时浮现
    gsap.utils.toArray('.reveal').forEach((el) => {
      gsap.from(el, {
        y: 56,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, scroller: root, start: 'top 86%' },
      });
    });
  }, root);
});

onUnmounted(() => ctx && ctx.revert());

// 卡片 3D 倾斜（悬停视差翻转）
function onCardMove(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const rx = ((e.clientY - r.top) / r.height - 0.5) * -9;
  const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
  gsap.to(el, { rotationX: rx, rotationY: ry, transformPerspective: 800, duration: 0.4, ease: 'power2.out' });
}
function onCardLeave(e) {
  gsap.to(e.currentTarget, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'elastic.out(1, 0.55)' });
}

// 底部 CTA —— 点击后默认进入「情绪」分类入口
// 若未登录，App.vue 的 onSelectMode 会自动弹出登录弹窗
function onStart() {
  emit('select', 'mood');
}

const options = [
  {
    mode: 'mood',
    title: '情绪',
    desc: '按歌词与评论语义判断：治愈 / 热血 / 伤感等',
    svg: `
      <circle cx="24" cy="24" r="18" />
      <path d="M16 20v.5M32 20v.5" stroke-width="3" />
      <path d="M16 29c2 2.8 4.8 4.2 8 4.2s6-1.4 8-4.2" />
    `,
  },
  {
    mode: 'genre',
    title: '曲风',
    desc: '按歌手、专辑与简介归类：摇滚 / 民谣 / 电子…',
    svg: `
      <path d="M14 34V12l20-4v22" />
      <circle cx="11" cy="34" r="4" />
      <circle cx="31" cy="30" r="4" />
    `,
  },
  {
    mode: 'language',
    title: '语种',
    desc: '按歌词与歌手语种分：华语 / 欧美 / 日韩…',
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
    desc: '按播放与评论热度排序：冷门宝藏 / 热门金曲',
    svg: `
      <path d="M24 40 C12.5 32.5 7 25 7 17.5 A9 9 0 0 1 24 14 A9 9 0 0 1 41 17.5 C41 25 35.5 32.5 24 40 Z" fill="currentColor" stroke="none" />
    `,
  },
];
</script>

<style scoped>
.home-view {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  text-align: center;
}
.home-view > section,
.home-view > footer {
  position: relative;
  z-index: 1;
}

/* ============ HERO：全屏 ============ */
.hero {
  min-height: calc(100% - 4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 40px 20px 72px;
}
.eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  padding: 7px 16px;
  border-radius: 980px;
}
.hero-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(44px, 8.5vw, 104px);
  line-height: 1.04;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--text);
  text-wrap: balance;
}
.grad {
  background: linear-gradient(92deg, var(--accent) 0%, #a78bfa 55%, #ff7eb6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
[data-theme='light'] .grad {
  background: linear-gradient(92deg, #0071e3 0%, #7c5cff 55%, #e0509e 100%);
  -webkit-background-clip: text;
  background-clip: text;
}
.hero-desc {
  margin: 0;
  font-size: clamp(14px, 1.6vw, 17px);
  line-height: 1.75;
  color: var(--text-secondary);
  max-width: 560px;
}
.trust-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 980px;
  font-size: 12px;
  color: var(--text-secondary);
}
.trust-dot { color: var(--accent); font-size: 7px; }
.sep { opacity: 0.4; }
.trust-strip-ok { margin: 0; font-size: 12px; color: var(--text-secondary); }

.scroll-cue {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cue-line {
  width: 1px;
  height: 42px;
  background: linear-gradient(180deg, var(--text-secondary), transparent);
  animation: cue-drop 1.8s var(--ease) infinite;
  transform-origin: top;
}
@keyframes cue-drop {
  0% { transform: scaleY(0); opacity: 0; }
  35% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(1) translateY(10px); opacity: 0; }
}
.cue-text {
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.34em;
  color: var(--text-secondary);
}

/* ============ 通用 Section ============ */
.section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 96px 24px 8px;
}
.section-eyebrow {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--accent);
}
.section-title {
  margin: 0 0 40px;
  font-family: var(--font-display);
  font-size: clamp(30px, 4.6vw, 52px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--text);
}

/* ============ 入口卡片 ============ */
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  perspective: 1000px;
}
.card {
  position: relative;
  border-radius: 22px;
  padding: 30px 20px 26px;
  cursor: pointer;
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  transform-style: preserve-3d;
  transition: border-color 0.3s var(--ease), background 0.3s var(--ease), box-shadow 0.3s var(--ease);
  will-change: transform;
}
.card:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    0 18px 48px rgba(0, 0, 0, 0.35),
    0 0 0 1px var(--accent-soft);
}
.card-icon {
  width: 44px;
  height: 44px;
  color: var(--accent);
  transition: transform 0.32s var(--ease);
}
.card:hover .card-icon { transform: translateY(-3px) scale(1.08); }
.card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.card-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 18em;
}
.card-go {
  position: absolute;
  top: 16px;
  right: 18px;
  font-size: 15px;
  color: var(--accent);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
}
.card:hover .card-go { opacity: 1; transform: translateX(0); }

.custom-link {
  margin-top: 30px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 26px;
  border-radius: 980px;
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease), transform 0.2s var(--ease);
}
.custom-link:hover { border-color: var(--accent); background: var(--accent-soft); transform: translateY(-1px); }
.custom-link .arrow { color: var(--accent); transition: transform 0.2s var(--ease); }
.custom-link:hover .arrow { transform: translateX(4px); }
.custom-hint { margin: 12px 0 0; font-size: 12px; color: var(--text-secondary); }

/* ============ Before / After ============ */
.before-after {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 18px;
  align-items: center;
  padding: 26px;
  border-radius: 22px;
  text-align: left;
}
.ba-col { min-width: 0; }
.ba-label {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}
.ba-stack { display: flex; flex-direction: column; gap: 8px; }
.ba-stack--grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ba-pill {
  font-size: 13px;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ba-pill--mess { background: var(--accent-soft); border-color: transparent; }
.ba-hint { font-size: 12px; color: var(--text-secondary); }
.ba-arrow { font-size: 22px; color: var(--accent); padding: 0 4px; }

/* ============ 三步用法 ============ */
.howto-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  text-align: left;
}
.howto-steps li {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 22px 20px;
  border-radius: 18px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}
.step-no {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.02em;
  line-height: 1;
  padding-top: 2px;
}
.howto-steps strong { display: block; font-size: 15px; color: var(--text); margin-bottom: 4px; }
.howto-steps p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--text-secondary); }

/* ============ 页脚 ============ */
.foot {
  max-width: 1080px;
  margin: 0 auto;
  padding: 80px 24px 48px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-secondary);
}
.foot a { color: var(--accent); text-decoration: none; }
.foot a:hover { text-decoration: underline; }

/* ============ CTA：现在开始 ============ */
.cta {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  cursor: pointer;
  position: relative;
  z-index: 1;
  user-select: none;
}
.cta-eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--text-secondary);
  transition: color 0.3s var(--ease);
}
.cta:hover .cta-eyebrow {
  color: var(--text);
}
.cta-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(72px, 12vw, 160px);
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text);
  transition: transform 0.4s var(--ease), letter-spacing 0.4s var(--ease);
}
.cta:hover .cta-title {
  letter-spacing: -0.02em;
  transform: scale(1.04);
}
.cta-arrow {
  color: var(--accent);
  opacity: 0;
  transform: translateY(-12px) scale(0.8);
  transition:
    opacity 0.4s var(--ease),
    transform 0.4s var(--ease);
  animation: cta-breathe 2.8s var(--ease) infinite;
}
.cta:hover .cta-arrow {
  opacity: 1;
  transform: translateY(0) scale(1);
}
@keyframes cta-breathe {
  0%, 100% { opacity: 0.4; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(6px); }
}

/* ============ 响应式 ============ */
@media (max-width: 1023px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
  .howto-steps { grid-template-columns: 1fr; }
  .section { padding-top: 72px; }
}
@media (max-width: 767px) {
  .cards { grid-template-columns: 1fr; gap: 12px; }
  .before-after { grid-template-columns: 1fr; }
  .ba-arrow { display: none; }
  .hero { padding-top: 24px; gap: 16px; }
  .scroll-cue { display: none; }
}
</style>
