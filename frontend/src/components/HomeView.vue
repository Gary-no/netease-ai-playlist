<template>
  <div ref="rootEl" class="home-view">
    <!-- ============ HERO：全屏 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-label">Playlist Helper</p>
        <h1 class="hero-title">
          整理你的<br/>音乐世界
        </h1>
        <p class="hero-sub">
          按情绪、曲风、语种、热度<br class="mob-br"/>自动分类整理
        </p>
      </div>
      <div class="scroll-cue" aria-hidden="true">
        <span class="cue-text">scroll</span>
        <span class="cue-line"></span>
      </div>
    </section>

    <!-- ============ 段落 ============ -->
    <section class="section">
      <p class="section-text baseline-reveal">
        连接网易云账号，AI 按情绪、曲风、语种或热度分类整理。不删不改。
      </p>
      <div v-if="!loggedIn" class="trust-row baseline-reveal">
        <span>仅读歌单 · 不改不删 · 随时撤销</span>
      </div>
      <p v-else class="trusted-text baseline-reveal">已连接</p>
    </section>

    <!-- ============ 整理前后 ============ -->
    <section class="section">
      <h2 class="section-title baseline-reveal">整理前后</h2>
      <div class="ba-wrap baseline-reveal">
        <div class="ba-col">
          <p class="ba-label">之前</p>
          <div class="ba-item">我喜欢的音乐 482 首</div>
        </div>
        <div class="ba-col">
          <p class="ba-label">之后</p>
          <div class="ba-list">
            <span>深夜治愈</span>
            <span>热血摇滚</span>
            <span>咖啡民谣</span>
            <span>运动节拍</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 玩法 ============ -->
    <section class="section">
      <h2 class="section-title baseline-reveal">三步完成</h2>
      <div class="steps baseline-reveal">
        <div class="step">
          <span class="step-num">01</span>
          <strong>登录</strong>
        </div>
        <div class="step">
          <span class="step-num">02</span>
          <strong>选维度</strong>
        </div>
        <div class="step">
          <span class="step-num">03</span>
          <strong>新建</strong>
        </div>
      </div>
    </section>

    <!-- ============ CTA ============ -->
    <section class="section cta-section" @click="onStart">
      <h2 class="cta-title baseline-reveal">现在开始</h2>
      <div class="cta-arrow baseline-reveal">→</div>
    </section>

    <!-- ============ Footer ============ -->
    <footer class="footer baseline-reveal">
      免费 · v{{ version }}
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const props = defineProps({ loggedIn: Boolean, version: String });
const emit = defineEmits(['select', 'start']);

const rootEl = ref(null);
let ctx;

gsap.registerPlugin(ScrollTrigger);

function onStart() {
  emit('start');
}

onMounted(() => {
  const root = rootEl.value;
  ctx = gsap.context(() => {
    // Hero 入场
    gsap.from('.hero-label', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 });
    gsap.from('.hero-title', { y: 32, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
    gsap.from('.hero-sub', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.4 });

    // === Baseline Reveal：遮罩从基线收缩，文字从基线向外生长 ===
    gsap.utils.toArray('.baseline-reveal').forEach((el) => {
      gsap.fromTo(el,
        { '--mask-scale': 1, '--line-opacity': 1 },
        {
          '--mask-scale': 0,
          '--line-opacity': 0,
          duration: 0.7,
          ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          scrollTrigger: { trigger: el, scroller: root, start: 'top 88%' },
        }
      );
    });
  }, root);
});

onUnmounted(() => ctx && ctx.revert());
</script>

<style scoped>
.home-view {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  text-align: center;
  background: var(--bg);
}

/* ============ Baseline Reveal ============ */
/* 
  原理：::after 遮罩层覆盖文字，初始 scaleY(1) 完全遮盖，
  动画时从基线位置 (top:72%) 收缩到 scaleY(0)，
  文字从基线处向上向下同步露出 —— 看起来就像从一条线生长出来
*/
.baseline-reveal {
  position: relative;
  --mask-scale: 1;
  --line-opacity: 1;
}

/* 基线线条 */
.baseline-reveal::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 72%;
  height: 1px;
  background: var(--text-muted);
  opacity: var(--line-opacity);
  pointer-events: none;
  z-index: 2;
}

/* 遮罩覆盖层 */
.baseline-reveal::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bg);
  transform-origin: 50% 72%;
  transform: scaleY(var(--mask-scale));
  pointer-events: none;
  z-index: 1;
  will-change: transform;
}

.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px 80px;
  position: relative;
}
.hero-inner {
  max-width: 700px;
}
.hero-label {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 450;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.hero-title {
  margin: 0 0 22px;
  font-family: var(--font-display);
  font-size: clamp(44px, 10vw, 110px);
  line-height: 1;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: var(--text);
  text-wrap: balance;
}
.hero-sub {
  margin: 0;
  font-size: clamp(13px, 1.4vw, 15px);
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 500px;
  margin: 0 auto;
}
.mob-br { display: none; }
.scroll-cue {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cue-text {
  font-family: var(--font-display);
  font-size: 9px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cue-line {
  width: 1px;
  height: 44px;
  background: linear-gradient(180deg, var(--text-muted), transparent);
  animation: cue-down 2s var(--ease) infinite;
  transform-origin: top;
}
@keyframes cue-down {
  0%   { transform: scaleY(0); opacity: 0; }
  30%  { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(1) translateY(10px); opacity: 0; }
}
.section {
  max-width: 680px;
  margin: 0 auto;
  padding: 80px 24px 0;
}
.section-title {
  margin: 0 0 30px;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 350;
  letter-spacing: -0.02em;
  color: var(--text);
}
.section-text {
  margin: 0 auto 16px;
  font-size: clamp(14px, 1.5vw, 16px);
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 540px;
}
.trust-row {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 20px;
}
.trusted-text {
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-muted);
}
.ba-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 14px;
  text-align: center;
}
.ba-label {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ba-item {
  font-size: 15px;
  font-weight: 400;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--surface);
}
.ba-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ba-list span {
  font-size: 14px;
  font-weight: 400;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  background: var(--surface);
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}
.step-num {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 450;
  color: var(--text-muted);
}
.step strong {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 450;
  color: var(--text);
  letter-spacing: 0.03em;
}
.cta-section {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.cta-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(52px, 9vw, 120px);
  line-height: 1;
  font-weight: 300;
  color: var(--text);
  letter-spacing: -0.04em;
  transition: letter-spacing 0.4s var(--ease);
}
.cta-section:hover .cta-title {
  letter-spacing: -0.01em;
}
.cta-arrow {
  margin-top: 16px;
  font-size: 24px;
  color: var(--text-muted);
  animation: breathe 2.4s var(--ease) infinite;
}
@keyframes breathe {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 0.6; transform: translateY(5px); }
}
.footer {
  padding: 50px 24px 32px;
  font-size: 11px;
  color: var(--text-muted);
}
@media (max-width: 767px) {
  .hero { padding: 32px 20px 72px; }
  .hero-title { font-size: clamp(36px, 12vw, 52px); }
  .hero-sub { max-width: 360px; }
  .section { padding-top: 60px; }
  .ba-wrap { grid-template-columns: 1fr; gap: 16px; }
  .steps { grid-template-columns: 1fr; }
  .mob-br { display: inline; }
  .cta-section { min-height: 50vh; }
  .ba-list { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .section { padding-left: 16px; padding-right: 16px; }
  .ba-list { grid-template-columns: 1fr; }
  .section-text { font-size: 14px; }
}
</style>
