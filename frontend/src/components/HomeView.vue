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
          {{ description }}
        </p>
      </div>
      <div class="scroll-cue" aria-hidden="true">
        <span class="cue-text">scroll</span>
        <span class="cue-line"></span>
      </div>
    </section>

    <!-- ============ 段落文字（逐字动画） ============ -->
    <section class="section">
      <p class="section-text char-block">
        <span
          v-for="(c, i) in splitChars(description)"
          :key="i"
          class="char"
          :style="{ '--i': i }"
        ><template v-if="c === ' '">&nbsp;</template><template v-else>{{ c }}</template></span>
      </p>
      <div v-if="!loggedIn" class="trust-row">
        <span class="trust-dot">●</span>
        <span>仅读取歌单</span>
        <span class="sep">·</span>
        <span>不改不删</span>
        <span class="sep">·</span>
        <span>可随时撤销</span>
      </div>
      <p v-else class="trusted-text">已连接 · 随时可在头像菜单退出并撤销授权</p>
    </section>

    <!-- ============ 四个入口 ============ -->
    <section class="section">
      <div class="cards">
        <div
          v-for="(opt, i) in options"
          :key="opt.mode"
          class="card"
          :style="{ '--i': i }"
          @click="emit('select', opt.mode)"
        >
          <h3 class="card-title">{{ opt.title }}</h3>
          <p class="card-desc">{{ opt.desc }}</p>
          <span class="card-arrow">→</span>
        </div>
      </div>
      <button class="custom-btn" @click="emit('select', 'custom')">
        自定义分类
        <span class="arrow">→</span>
      </button>
    </section>

    <!-- ============ Before / After ============ -->
    <section class="section">
      <h2 class="section-title">整理前后</h2>
      <div class="ba-wrap">
        <div class="ba-col">
          <p class="ba-label">整理前</p>
          <div class="ba-item">我喜欢的音乐 482 首</div>
          <p class="ba-note">摇滚和民谣混在一起</p>
        </div>
        <div class="ba-arrow">→</div>
        <div class="ba-col">
          <p class="ba-label">整理后</p>
          <div class="ba-grid">
            <span class="ba-chip">深夜治愈 38 首</span>
            <span class="ba-chip">热血摇滚 54 首</span>
            <span class="ba-chip">咖啡民谣 42 首</span>
            <span class="ba-chip">运动节拍 61 首</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 三步用法 ============ -->
    <section class="section">
      <h2 class="section-title">三步完成</h2>
      <div class="steps">
        <div class="step">
          <span class="step-num">01</span>
          <div>
            <strong>登录网易云</strong>
            <p>扫码或验证码，仅读取歌单</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">02</span>
          <div>
            <strong>选一个维度</strong>
            <p>情绪 / 曲风 / 语种 / 热度</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">03</span>
          <div>
            <strong>确认新建</strong>
            <p>预览结果，确认后批量建歌单</p>
          </div>
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
      免费使用 · v{{ version }} · 不删不改原歌单 ·
      <a href="https://github.com/Gary-no/netease-ai-playlist/issues" target="_blank" rel="noopener">反馈</a>
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

const description = '连接网易云账号，AI 读取你的歌单与收藏。按情绪、曲风、语种或热度，自动拆成井井有条的新歌单 —— 不删一首，原歌单原样保留。';

function splitChars(text) {
  return text.split('');
}

function onStart() {
  emit('select', 'mood');
}

onMounted(() => {
  const root = rootEl.value;
  ctx = gsap.context(() => {
    // Hero 入场
    gsap.from('.hero-label', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 });
    gsap.from('.hero-title', { y: 32, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
    gsap.from('.hero-sub', { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.35 });

    // 逐字动画：每个字符从下方滑入淡出，间隔 0.025s
    gsap.utils.toArray('.char-block').forEach((block) => {
      const chars = block.querySelectorAll('.char');
      gsap.from(chars, {
        y: 16,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.out',
        stagger: 0.025,
        scrollTrigger: { trigger: block, scroller: root, start: 'top 82%' },
      });
    });

    // 卡片交错入场
    gsap.utils.toArray('.card').forEach((el) => {
      gsap.from(el, {
        y: 30,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: { trigger: el.parentElement, scroller: root, start: 'top 80%' },
      });
    });

    // 其它 section 浮现
    gsap.utils.toArray('.section-title').forEach((el) => {
      gsap.from(el, {
        y: 20,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, scroller: root, start: 'top 86%' },
      });
    });

    // CTA 入场
    gsap.from('.cta-title', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.cta-section', scroller: root, start: 'top 82%' },
    });
  }, root);
});

onUnmounted(() => ctx && ctx.revert());

const options = [
  {
    mode: 'mood', title: '情绪',
    desc: '按歌词与评论语义判断：治愈 / 热血 / 伤感等',
  },
  {
    mode: 'genre', title: '曲风',
    desc: '按歌手、专辑与简介归类：摇滚 / 民谣 / 电子…',
  },
  {
    mode: 'language', title: '语种',
    desc: '按歌词与歌手语种分：华语 / 欧美 / 日韩…',
  },
  {
    mode: 'hot', title: '热度',
    desc: '按播放与评论热度排序：冷门宝藏 / 热门金曲',
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
  background: var(--bg);
}

/* ============ HERO ============ */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px 80px;
  position: relative;
}
.hero-inner {
  max-width: 720px;
}
.hero-label {
  margin: 0 0 20px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.hero-title {
  margin: 0 0 24px;
  font-family: var(--font-display);
  font-size: clamp(48px, 11vw, 120px);
  line-height: 1;
  font-weight: 400;
  letter-spacing: -0.03em;
  color: var(--text);
  text-wrap: balance;
}
.hero-sub {
  margin: 0;
  font-size: clamp(14px, 1.6vw, 17px);
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
}
.scroll-cue {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cue-text {
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cue-line {
  width: 1px;
  height: 48px;
  background: linear-gradient(180deg, var(--text-muted), transparent);
  animation: cue-down 2s var(--ease) infinite;
  transform-origin: top;
}
@keyframes cue-down {
  0%   { transform: scaleY(0); opacity: 0; }
  30%  { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(1) translateY(12px); opacity: 0; }
}

/* ============ Sections ============ */
.section {
  max-width: 800px;
  margin: 0 auto;
  padding: 100px 24px 8px;
}
.section-title {
  margin: 0 0 36px;
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 400;
  letter-spacing: -0.02em;
  color: var(--text);
}

/* 逐字段落 */
.section-text {
  margin: 0 auto 20px;
  font-size: clamp(14px, 1.5vw, 17px);
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 600px;
}
.char {
  display: inline;
  white-space: pre;
}
.char-space { display: inline; }

.trust-row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 24px;
}
.trust-dot { font-size: 8px; color: var(--text-secondary); }
.sep { opacity: 0.3; }
.trusted-text {
  margin-top: 20px;
  font-size: 13px;
  color: var(--text-muted);
}

/* ============ Cards ============ */
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.card {
  position: relative;
  padding: 28px 20px 24px;
  cursor: pointer;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  transition: background 0.25s var(--ease);
  min-height: 140px;
  justify-content: center;
}
.card:hover {
  background: var(--surface-hover);
}
.card-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: 0.02em;
}
.card-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
  max-width: 16em;
}
.card-arrow {
  position: absolute;
  top: 14px;
  right: 16px;
  font-size: 14px;
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
}
.card:hover .card-arrow { opacity: 1; transform: translateX(0); }

.custom-btn {
  margin-top: 24px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 980px;
  transition: background 0.2s var(--ease), border-color 0.2s var(--ease);
}
.custom-btn:hover { background: var(--surface-hover); border-color: var(--border-strong); }
.custom-btn .arrow { transition: transform 0.2s var(--ease); }
.custom-btn:hover .arrow { transform: translateX(4px); }

/* ============ Before/After ============ */
.ba-wrap {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: left;
}
.ba-label {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.ba-item {
  font-size: 14px;
  font-weight: 500;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--surface);
}
.ba-note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.ba-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ba-chip {
  font-size: 14px;
  font-weight: 500;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  background: var(--surface);
}
.ba-arrow {
  font-size: 22px;
  color: var(--text-muted);
}

/* ============ Steps ============ */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  text-align: left;
}
.step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 20px 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}
.step-num {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  color: var(--text-muted);
  line-height: 1;
  padding-top: 2px;
}
.step strong { display: block; font-size: 14px; color: var(--text); margin-bottom: 4px; }
.step p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-muted); }

/* ============ CTA ============ */
.cta-section {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.cta-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(56px, 10vw, 130px);
  line-height: 1;
  font-weight: 400;
  color: var(--text);
  letter-spacing: -0.04em;
  transition: letter-spacing 0.4s var(--ease);
}
.cta-section:hover .cta-title {
  letter-spacing: -0.01em;
}
.cta-arrow {
  margin-top: 20px;
  font-size: 28px;
  color: var(--text-muted);
  animation: breathe 2.4s var(--ease) infinite;
}
@keyframes breathe {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 0.7; transform: translateY(6px); }
}

/* ============ Footer ============ */
.footer {
  padding: 60px 24px 40px;
  font-size: 12px;
  color: var(--text-muted);
}
.footer a { color: var(--text-secondary); text-decoration: none; }
.footer a:hover { text-decoration: underline; }

/* ============ Responsive ============ */
@media (max-width: 767px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
  .steps { grid-template-columns: 1fr; }
  .ba-wrap { grid-template-columns: 1fr; }
  .ba-arrow { display: none; }
  .section { padding-top: 64px; }
}
@media (max-width: 480px) {
  .cards { grid-template-columns: 1fr; }
}
</style>