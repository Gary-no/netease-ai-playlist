<template>
  <div class="home-view">
    <!-- Hero：平台 + 输入 + 产出，一句话说清 -->
    <div class="hero anim-fade-up">
      <p class="eyebrow">仅支持 · 网易云音乐 NetEase Cloud Music</p>
      <h1 class="hero-title">连接你的网易云，把 500 首乱糟糟的收藏<br />自动按情绪/曲风拆成井井有条的歌单</h1>
      <p class="hero-desc">
        登录即读取你的歌单与收藏 · AI 分析歌名、歌手、歌词与评论 · 一键新建分类歌单，不删一首，原歌单不动
      </p>
      <!-- 登录前权限承诺（折叠式，三句话） -->
      <div v-if="!loggedIn" class="trust-strip glass">
        <span class="trust-dot" aria-hidden="true">●</span>
        <span>仅请求「读取歌单」权限</span>
        <span class="sep">·</span>
        <span>不修改、不删除你的任何歌单</span>
        <span class="sep">·</span>
        <span>可随时在网易云账号中撤销授权</span>
      </div>
      <p v-else class="trust-strip-ok">已连接 · 随时可在头像菜单退出并撤销授权</p>
    </div>

    <!-- Before / After 对比图：静态示例，不靠想象 -->
    <div class="before-after glass anim-fade-up" style="animation-delay: 80ms">
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

    <!-- 四个入口：标题 + 一句话说明分类依据与产出 -->
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
        <p class="card-desc">{{ opt.desc }}</p>
      </div>
    </div>

    <!-- 自定义：小入口 -->
    <button class="custom-link anim-fade-up" style="animation-delay: 260ms" @click="emit('select', 'custom')">
      自定义分类
      <span class="arrow">→</span>
    </button>
    <p class="custom-hint anim-fade-up" style="animation-delay: 280ms">比如：按“适合跑步/加班/下雨天”自由描述，AI 按你的话术分</p>

    <!-- 怎么用 3 步 + 隐私/信任兜底 -->
    <div class="howto anim-fade-up" style="animation-delay: 320ms">
      <h4 class="howto-title">怎么用 · 三步完成</h4>
      <ol class="howto-steps">
        <li><strong>登录网易云</strong> — 扫码或验证码，仅读取歌单</li>
        <li><strong>选一个维度</strong> — 情绪 / 曲风 / 语种 / 热度，或自定义描述</li>
        <li><strong>确认新建</strong> — 预览分类结果，确认后才批量建新歌单加歌</li>
      </ol>
      <p class="howto-foot">
        免费使用 · v{{ version }} · 不会删除或修改原歌单 · 隐私与授权说明见登录弹窗 ·
        反馈请提 <a href="https://github.com/Gary-no/netease-ai-playlist/issues" target="_blank" rel="noopener">GitHub Issue</a>
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ loggedIn: Boolean, version: String });
const emit = defineEmits(['select']);

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
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 18px 16px 28px;
  gap: 18px;
}
/* Hero：单 H2，顶栏品牌为纯展示，不与正文抢 H1 */
.hero { max-width: 640px; width: 100%; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 4px 10px;
  border-radius: 980px;
}
.hero-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}
.hero-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 520px;
}
.trust-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.trust-dot { color: var(--accent); font-size: 7px; }
.sep { opacity: 0.4; }
.trust-strip-ok { margin: 0; font-size: 12px; color: var(--text-secondary); }

/* Before / After */
.before-after {
  width: 100%;
  max-width: 640px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  text-align: left;
}
.ba-col { min-width: 0; }
.ba-label { margin: 0 0 8px; font-size: 11px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.02em; }
.ba-stack { display: flex; flex-direction: column; gap: 6px; }
.ba-stack--grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ba-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 10px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ba-pill--mess { background: var(--accent-soft); border-color: transparent; }
.ba-hint { font-size: 11px; color: var(--text-secondary); }
.ba-arrow { font-size: 18px; color: var(--text-secondary); padding: 0 2px; }

.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 420px;
}
.card {
  border-radius: 18px;
  padding: 18px 14px 16px;
  cursor: pointer;
  transition: transform 0.22s var(--ease), box-shadow 0.22s var(--ease);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: inset 0 1px 0 var(--glass-highlight), 0 8px 20px rgba(0,0,0,0.08), 0 24px 56px rgba(0,0,0,0.14);
}
.card:active { transform: translateY(-1px) scale(0.98); }
.card-icon { width: 40px; height: 40px; color: var(--accent); transition: transform 0.32s var(--ease); }
.card:hover .card-icon { transform: translateY(-2px) scale(1.06); }
.card h3 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.02em; }
.card-desc { margin: 0; font-size: 11px; line-height: 1.45; color: var(--text-secondary); max-width: 16em; }

.custom-link {
  border: none; background: none; color: var(--accent);
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 980px; transition: background 0.15s;
}
.custom-link:hover { background: var(--accent-soft); }
.arrow { transition: transform 0.2s var(--ease); }
.custom-link:hover .arrow { transform: translateX(3px); }
.custom-hint { margin: -8px 0 0; font-size: 11px; color: var(--text-secondary); max-width: 32em; }

.howto {
  width: 100%; max-width: 640px;
  text-align: left;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}
.howto-title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--text); }
.howto-steps { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: var(--text-secondary); }
.howto-steps strong { color: var(--text); font-weight: 600; }
.howto-foot { margin: 10px 0 0; font-size: 11px; line-height: 1.6; color: var(--text-secondary); }
.howto-foot a { color: var(--accent); text-decoration: none; }
.howto-foot a:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .hero-title { font-size: 22px; }
  .before-after { grid-template-columns: 1fr; }
  .ba-arrow { display: none; }
  .cards { gap: 10px; }
}
</style>
