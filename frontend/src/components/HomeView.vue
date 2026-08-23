<template>
  <div ref="rootEl" class="home-view">
    <!-- ============ HERO：全屏 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-label">Playlist Helper</p>
        <h1 class="hero-title">
          <span class="fw-light">整理</span><span class="fw-italic">你</span><span class="fw-thin">的</span><br/>
          <span class="fw-medium">音乐</span><span class="fw-bold">世</span><span class="fw-oblique">界</span>
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

    <!-- ============ 逐字说明 ============ -->
    <section class="section">
      <p class="section-text char-block">
        <span
          v-for="(c, i) in chars"
          :key="i"
          class="char"
          :style="{ '--i': i, '--r': randomOff(i) }"
        ><template v-if="c === ' '">&nbsp;</template><template v-else>{{ c }}</template></span>
      </p>
      <div v-if="!loggedIn" class="trust-row">
        <span>仅读歌单 · 不改不删 · 随时撤销</span>
      </div>
      <p v-else class="trusted-text">已连接</p>
    </section>

    <!-- ============ 整理前后 ============ -->
    <section class="section">
      <h2 class="section-title">整理前后</h2>
      <div class="ba-wrap">
        <div class="ba-col">
          <p class="ba-label">之前</p>
          <div class="ba-item">我喜欢的音乐 482 首</div>
        </div>
        <div class="ba-col ba-after">
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
      <h2 class="section-title">三步完成</h2>
      <div class="steps">
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
      <h2 class="cta-title">现在开始</h2>
      <div class="cta-arrow">→</div>
    </section>

    <!-- ============ Footer ============ -->
    <footer class="footer">
      免费 · v{{ version }}
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const props = defineProps({ loggedIn: Boolean, version: String });
const emit = defineEmits(['select']);

const rootEl = ref(null);
let ctx;

gsap.registerPlugin(ScrollTrigger);

const text = '连接网易云账号，AI 按情绪、曲风、语种或热度自动分类整理。不删不改。';
const chars = text.split('');

function randomOff(i) {
  // 交替变化偏移量，营造错落感
  return (i % 3) * 4 + (Math.sin(i * 0.7) > 0 ? 3 : -2);
}

function onStart() {
  emit('select', 'mood');
}

onMounted(() => {
  const root = rootEl.value;
  ctx = gsap.context(() => {
    gsap.from('.hero-label', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 });
    gsap.from('.hero-title span', { y: 32, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.04, delay: 0.2 });
    gsap.from('.hero-sub', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.4 });

    // 逐字动画：每个字 y 偏移 + 透明度 + blur 根据 --r 错落
    gsap.utils.toArray('.char-block').forEach((block) => {
      const els = block.querySelectorAll('.char');
      gsap.from(els, {
        y: (i) => 10 + (i % 5) * 2,
        opacity: 0,
        filter: 'blur(2px)',
        duration: 0.4,
        ease: 'power2.out',
        stagger: { each: 0.035, from: 'start' },
        scrollTrigger: { trigger: block, scroller: root, start: 'top 80%' },
      });
    });

    // Section titles
    gsap.utils.toArray('.section-title').forEach((el) => {
      gsap.from(el, {
        y: 20, opacity: 0, duration: 0.45, ease: 'power2.out',
        scrollTrigger: { trigger: el, scroller: root, start: 'top 86%' },
      });
    });

    // CTA
    gsap.from('.cta-title', {
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.cta-section', scroller: root, start: 'top 82%' },
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

/* ============ HERO ============ */
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
  letter-spacing: -0.04em;
  color: var(--text);
  text-wrap: balance;
}
/* 字体粗细正斜混排 */
.fw-light  { font-weight: 300; }
.fw-thin   { font-weight: 200; }
.fw-medium { font-weight: 480; letter-spacing: -0.06em; }
.fw-bold   { font-weight: 600; }
.fw-italic { font-style: italic; font-weight: 350; }
.fw-oblique { font-style: oblique; font-weight: 500; }
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

/* ============ Sections ============ */
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

/* 逐字段落 */
.section-text {
  margin: 0 auto 16px;
  font-size: clamp(14px, 1.5vw, 16px);
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 540px;
}
.char {
  display: inline;
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

/* ============ 整理前后 ============ */
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

/* ============ Steps ============ */
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

/* ============ CTA ============ */
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

/* ============ Footer ============ */
.footer {
  padding: 50px 24px 32px;
  font-size: 11px;
  color: var(--text-muted);
}

/* ============ Mobile ============ */
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