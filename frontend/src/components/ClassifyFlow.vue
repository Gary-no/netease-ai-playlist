<template>
  <div class="classify-flow glass anim-material">
    <!-- ======== 阶段1：选择细项 + 筛选 + 歌单 ======== -->
    <template v-if="state === 'pick'">
      <!-- 歌单详情视图（优先级最高，覆盖整个 pick，只留一个返回） -->
      <template v-if="detail">
        <div class="detail-header">
          <button class="back-btn" @click="closeDetail">‹</button>
          <span class="detail-name">{{ detail.name }}</span>
        </div>
        <p v-if="detailLoading" class="empty">加载中</p>
        <ul class="song-list detail-song-list" v-else>
          <li v-for="s in detail.tracks" :key="s.id" class="song-item">
            <img v-if="s.coverImgUrl" :src="s.coverImgUrl" class="song-cover" alt="" />
            <div v-else class="song-cover placeholder">♪</div>
            <div class="song-info">
              <div class="song-name">{{ s.name }}</div>
              <div class="song-meta">{{ (s.artists || []).join(' / ') }}</div>
            </div>
            <span class="song-duration">{{ fmtDuration(s.duration) }}</span>
          </li>
        </ul>
      </template>

      <!-- 主视图：细项(分类) / 阈值(热度) + 歌单 -->
      <template v-else>
        <div class="flow-header">
          <button class="back-btn" @click="$emit('back')">‹</button>
          <h2 class="flow-title">{{ MODE_META[mode].title }}</h2>
        </div>

        <div class="pick-content">
          <!-- 分类模式：细项 chips -->
          <div v-if="!isHot" class="options-block">
            <div class="chips">
              <span
                class="chip auto-chip"
                :class="{ active: autoMatch }"
                @click="toggleAutoMatch"
              >AI 自动匹配</span>
              <span
                v-for="(opt, i) in modeOptions"
                :key="opt"
                class="chip"
                :class="{ active: !autoMatch && selectedOptions.has(opt) }"
                :style="{ '--i': i }"
                @click="toggleOption(opt)"
              >{{ opt }}</span>
            </div>
          </div>

          <!-- 热度模式：评论 / 点赞阈值滑块 -->
          <div v-else class="filter-block glass">
            <div class="filter-row">
              <span class="filter-label">评论 ≥</span>
              <input
                type="range"
                min="0"
                max="1000"
                step="1"
                :value="commentPos"
                class="slider"
                @input="onCommentPos(Number($event.target.value))"
              />
              <input
                type="number"
                min="0"
                max="10000"
                :value="commentTotal"
                class="number-input"
                @input="onCommentValue(Number($event.target.value))"
              />
            </div>
            <div class="filter-row">
              <span class="filter-label">点赞 ≥</span>
              <input
                type="range"
                min="0"
                max="1000"
                step="1"
                :value="likedPos"
                class="slider"
                @input="onLikedPos(Number($event.target.value))"
              />
              <input
                type="number"
                min="0"
                max="10000"
                :value="likedCount"
                class="number-input"
                @input="onLikedValue(Number($event.target.value))"
              />
            </div>
          </div>

          <p v-if="loading" class="empty">加载中</p>
          <p v-else-if="!playlists.length" class="empty">暂无歌单</p>
          <ul class="pl-list" v-else>
            <li
              v-for="(p, i) in playlists"
              :key="p.id"
              class="pl-item anim-stagger"
              :style="{ '--i': i }"
              @click="toggleSelect(p.id)"
            >
              <span
                class="dot"
                :class="{ checked: selected.has(p.id) }"
                @click.stop="toggleSelect(p.id)"
              ></span>
              <img v-if="p.coverImgUrl" :src="p.coverImgUrl" class="pl-cover" alt="" />
              <div v-else class="pl-cover placeholder">♪</div>
              <div class="pl-info">
                <div class="pl-name">{{ p.name }}</div>
                <div class="pl-count">{{ p.trackCount }} 首</div>
              </div>
              <button class="view-arrow" @click.stop="openDetail(p)">›</button>
            </li>
          </ul>
        </div>

        <div class="flow-actions">
          <button
            class="primary"
            :disabled="!selected.size || (!isHot && !autoMatch && !selectedOptions.size)"
            @click="startClassify"
          >
            {{ isHot ? '开始筛选' : '开始分类' }}
          </button>
        </div>
      </template>
    </template>

    <!-- ======== 阶段2：分类中（进度条） ======== -->
    <div v-else-if="state === 'running'" class="running">
      <div class="spinner"></div>
      <p>分类中</p>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: smoothProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ Math.round(smoothProgress) }}%</span>
      </div>
      <p class="progress-step">{{ progressStep }}</p>
    </div>

    <!-- ======== 阶段3：分类结果 ======== -->
    <div v-else-if="state === 'result'" class="result-view">
      <div class="flow-header">
        <button class="back-btn" @click="state = 'pick'">‹</button>
        <h2 class="flow-title">结果</h2>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div class="result-list">
        <div
          v-for="(cat, i) in result.categories"
          :key="cat.name"
          class="cat-block glass anim-stagger"
          :style="{ '--i': i }"
        >
          <h4>
            {{ cat.name }}
            <span class="cat-count">{{ cat.songs.length }} / {{ result.songCount }}</span>
          </h4>
          <ul class="song-list">
            <li v-for="s in cat.songs" :key="s.id" class="song-item">
              <img v-if="s.coverImgUrl" :src="s.coverImgUrl" class="song-cover" alt="" />
              <div v-else class="song-cover placeholder">♪</div>
              <div class="song-info">
                <div class="song-name">{{ s.name }}</div>
                <div class="song-meta">{{ s.artist }}</div>
                <div v-if="s.reason" class="song-reason">{{ s.reason }}</div>
              </div>
              <span class="song-duration">{{ fmtDuration(s.duration) }}</span>
            </li>
          </ul>
          <!-- 每个分类独立命名 + 生成 -->
          <div class="cat-footer">
            <input
              v-model="catNames[i]"
              class="name-input"
              placeholder="命名歌单"
              @keyup.enter="generateOne(i)"
            />
            <button
              class="gen-btn"
              :disabled="!catNames[i]?.trim() || generating[i] || generated[i]"
              @click="generateOne(i)"
            >
              {{ generated[i] ? '已生成 ✓' : generating[i] ? '生成中...' : '生成歌单' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flow-actions">
        <button class="ghost" @click="state = 'pick'">重选</button>
        <button class="primary" @click="$emit('back')">完成</button>
      </div>
    </div>

    <!-- 生成完成弹窗 -->
    <div v-if="showDone" class="done-modal" @click.self="showDone = false">
      <div class="done-card glass anim-spring">
        <div class="done-check">✓</div>
        <h4>生成完成</h4>
        <p class="done-desc">「{{ doneInfo.name }}」已创建，共 {{ doneInfo.count }} 首</p>
        <div class="done-actions">
          <button class="primary" @click="openNetease">跳转到网易云</button>
          <button class="ghost" @click="showDone = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { api } from '../api';

const props = defineProps({
  mode: String,
  loggedIn: Boolean,
});
const emit = defineEmits(['back']);

// 网易云音乐官方歌单分类标签
const MODE_META = {
  mood: { title: '按情绪' },
  genre: { title: '按曲风' },
  language: { title: '按语种' },
  hot: { title: '按热度' },
};

const MODE_OPTIONS = {
  mood: ['emo', '快乐', '运动', '氛围'],
  genre: ['流行', '摇滚', '民谣', '电子', '说唱', 'R&B', '爵士', '古典', 'ACG', '古风'],
  language: ['华语', '欧美', '日语', '韩语', '粤语', '小语种'],
  hot: [],
};

const isHot = computed(() => props.mode === 'hot');

const state = ref('pick');
const playlists = ref([]);
const selected = ref(new Set());
const selectedOptions = ref(new Set());
const autoMatch = ref(true); // AI 自动匹配：默认开启，忽略手动勾选
const loading = ref(false);
const detail = ref(null);
const detailLoading = ref(false);
const result = ref({ songCount: 0, filteredCount: 0, categories: [] });
const catNames = ref([]); // 每类的命名
const generated = ref([]); // 每类是否已生成
const generating = ref([]); // 每类是否生成中
const showDone = ref(false); // 生成完成弹窗
const doneInfo = ref(null); // 完成的歌单信息 { name, playlistId, count }
const error = ref('');
const progress = ref(0);        // 后端报告的原始值（目标）
const smoothProgress = ref(0);   // 前端平滑显示值
const progressStep = ref('');
let progressTimer = null;        // 后端轮询定时器
let smoothTimer = null;          // 前端平滑动画定时器

// 热度模式的评论/点赞阈值（非均匀滑块，0-10000，前 1000 占 90%）
const commentTotal = ref(0);
const likedCount = ref(0);
const commentPos = ref(0);
const likedPos = ref(0);
const HOT_MAX = 10000;
const HOT_BREAK = 1000;
const HOT_RATIO = 0.9;

function hotSliderToValue(pos) {
  const t = pos / 1000;
  if (t <= HOT_RATIO) return Math.round((t / HOT_RATIO) * HOT_BREAK);
  return Math.round(HOT_BREAK + ((t - HOT_RATIO) / (1 - HOT_RATIO)) * (HOT_MAX - HOT_BREAK));
}
function hotValueToSlider(value) {
  const v = Math.max(0, Math.min(HOT_MAX, value || 0));
  if (v <= HOT_BREAK) return Math.round((v / HOT_BREAK) * HOT_RATIO * 1000);
  return Math.round((HOT_RATIO + ((v - HOT_BREAK) / (HOT_MAX - HOT_BREAK)) * (1 - HOT_RATIO)) * 1000);
}
function onCommentPos(pos) {
  commentPos.value = pos;
  commentTotal.value = hotSliderToValue(pos);
}
function onCommentValue(v) {
  const val = Math.max(0, Math.min(HOT_MAX, Math.round(v || 0)));
  commentPos.value = hotValueToSlider(val);
  commentTotal.value = val;
}
function onLikedPos(pos) {
  likedPos.value = pos;
  likedCount.value = hotSliderToValue(pos);
}
function onLikedValue(v) {
  const val = Math.max(0, Math.min(HOT_MAX, Math.round(v || 0)));
  likedPos.value = hotValueToSlider(val);
  likedCount.value = val;
}

const modeOptions = computed(() => MODE_OPTIONS[props.mode] || []);

onMounted(loadPlaylists);
watch(() => props.loggedIn, (v) => v && loadPlaylists());
onUnmounted(() => {
  if (progressTimer) clearTimeout(progressTimer);
  if (smoothTimer) clearInterval(smoothTimer);
});

async function loadPlaylists() {
  loading.value = true;
  try {
    playlists.value = await api.getPlaylists();
  } catch {
    playlists.value = [];
  } finally {
    loading.value = false;
  }
}

function toggleOption(opt) {
  autoMatch.value = false;
  const next = new Set(selectedOptions.value);
  next.has(opt) ? next.delete(opt) : next.add(opt);
  selectedOptions.value = next;
}

function toggleAutoMatch() {
  autoMatch.value = true;
  selectedOptions.value = new Set();
}

function toggleSelect(id) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}

async function openDetail(p) {
  detail.value = { name: p.name, tracks: [] };
  detailLoading.value = true;
  try { detail.value = await api.getPlaylistDetail(p.id); }
  catch { detail.value = { name: p.name, tracks: [] }; }
  finally { detailLoading.value = false; }
}

function closeDetail() { detail.value = null; }

async function startClassify() {
  if (!selected.value.size) return;
  if (!isHot.value && !autoMatch.value && !selectedOptions.value.size) return;
  state.value = 'running';
  error.value = '';
  progress.value = 0;
  smoothProgress.value = 0;
  progressStep.value = '正在提交分类任务…';
  try {
    // AI 自动匹配时用全部细项，否则用手动勾选的细项
    const effectiveOptions = autoMatch.value ? modeOptions.value : [...selectedOptions.value];
    const taskId = await api.startClassify(
      [...selected.value],
      props.mode,
      effectiveOptions,
      commentTotal.value,
      likedCount.value
    );
    // 轮询进度（真进度，不超时）
    await pollTask(taskId);
  } catch (e) {
    state.value = 'pick';
    error.value = e.response?.data?.error || e.message || '分类失败';
  }
}

// 轮询后端任务状态，前端自主平滑增长
async function pollTask(taskId) {
  // 自主平滑进度：每 100ms 按当前速率递增，不受后端跳变约束
  let smoothRate = 0.15; // 起始速率（每帧增长）
  if (smoothTimer) clearInterval(smoothTimer);
  smoothTimer = setInterval(() => {
    const target = progress.value; // 后端报告的最新值
    const cur = smoothProgress.value;

    if (cur >= 100) return;

    // 后端完成时直接拉满
    if (target === 100) {
      smoothProgress.value = Math.min(100, cur + 6);
      return;
    }

    // 若已超过后端目标，继续自主增长（但速度放缓）
    if (cur >= target) {
      smoothRate = Math.max(0.08, smoothRate * 0.98);
      smoothProgress.value = Math.min(100, cur + smoothRate);
      // 最多不超过 95%（等后端完成）
      if (smoothProgress.value >= 95) smoothProgress.value = 95;
      return;
    }

    // 落后于后端目标：快速追赶
    const catchup = (target - cur) * 0.1;
    smoothProgress.value = Math.min(target, cur + Math.max(catchup, 0.5));
  }, 100);

  const poll = async () => {
    const st = await api.classifyStatus(taskId);
    if (st.status === 'running') {
      progress.value = st.progress;
      progressStep.value = st.step || '处理中…';
      progressTimer = setTimeout(poll, 1500);
    } else if (st.status === 'done') {
      clearTimeout(progressTimer);
      progress.value = 100;
      progressStep.value = '完成';
      result.value = st.result;
      catNames.value = st.result.categories.map((c) => c.name);
      generated.value = st.result.categories.map(() => false);
      generating.value = st.result.categories.map(() => false);
      // 等平滑动画拉满到 100 后再切结果页
      setTimeout(() => {
        if (smoothTimer) clearInterval(smoothTimer);
        smoothProgress.value = 100;
        state.value = 'result';
      }, 600);
    } else if (st.status === 'error') {
      clearTimeout(progressTimer);
      if (smoothTimer) clearInterval(smoothTimer);
      state.value = 'pick';
      error.value = st.error || '分类失败';
    }
  };
  await poll();
}

// 单个分类生成歌单（命名后）
async function generateOne(i) {
  const name = (catNames.value[i] || '').trim();
  if (!name || generating.value[i] || generated.value[i]) return;
  generating.value[i] = true;
  error.value = '';
  try {
    const data = await api.confirmClassify([{ name, songs: result.value.categories[i].songs }]);
    generated.value[i] = true;
    const created = data.created?.[0];
    doneInfo.value = created || { name, playlistId: null, count: result.value.categories[i].songs.length };
    showDone.value = true;
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '生成失败';
  } finally {
    generating.value[i] = false;
  }
}

// 跳转到网易云（网页版链接，手机端会自动唤起 App）
function openNetease() {
  if (doneInfo.value.playlistId) {
    window.open(`https://music.163.com/#/playlist?id=${doneInfo.value.playlistId}`, '_blank');
  }
  showDone.value = false;
}

function fmtDuration(sec) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
</script>

<style scoped>
.classify-flow {
  height: 100%;
  border-radius: 22px;
  padding: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--text);
}
.flow-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-shrink: 0;
}
.pick-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.flow-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--accent);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}
.back-btn:hover {
  background: var(--hover-bg-strong);
}
.options-block {
  margin-bottom: 18px;
  flex-shrink: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  padding: 7px 16px;
  border-radius: 980px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--input-border);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text);
  transition: all 0.16s var(--ease);
  user-select: none;
}
.chip:hover {
  border-color: var(--accent);
}
.chip:active {
  transform: scale(0.94);
}
.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--accent-shadow);
}
/* AI 自动匹配：始终带强调色，突出在首位 */
.chip.auto-chip {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.chip.auto-chip.active {
  background: var(--accent);
  color: var(--text-on-accent);
}
.empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 40px 0;
}
.filter-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 14px 16px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.filter-label {
  font-size: 14px;
  color: var(--text);
  min-width: 52px;
  font-weight: 500;
}
.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--hover-bg);
  border-radius: 2px;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--panel-bg);
  border: 1.5px solid var(--accent);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
}
.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--panel-bg);
  border: 1.5px solid var(--accent);
  cursor: pointer;
}
.number-input {
  width: 88px;
  padding: 6px 8px;
  border: 1px solid var(--input-border);
  border-radius: 980px;
  background: var(--input-bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  outline: none;
  text-align: center;
}
.number-input:focus {
  border-color: var(--accent);
}
.pl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.pl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.16s var(--ease), border-color 0.16s, transform 0.16s var(--ease);
  border: 1px solid transparent;
}
.pl-item:hover {
  background: var(--hover-bg);
}
.pl-item:active {
  transform: scale(0.99);
}
.pl-item:has(.dot.checked) {
  background: var(--accent-soft);
  border-color: var(--accent);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}
.dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.15s;
}
.dot.checked {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: inset 0 0 0 3px var(--glass-bg);
}
.pl-cover {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}
.pl-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  font-size: 20px;
}
.pl-info {
  flex: 1;
  min-width: 0;
}
.pl-name {
  font-size: 15px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pl-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.view-arrow {
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 22px;
  cursor: pointer;
  padding: 4px 8px;
  flex-shrink: 0;
  line-height: 1;
}
.view-arrow:hover {
  color: var(--accent);
}
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.detail-name {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
/* 歌单详情视图的歌曲列表：独立滚动 */
.detail-song-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.song-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-radius: 10px;
}
.song-item:hover {
  background: var(--hover-bg);
}
.song-cover {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.song-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  font-size: 16px;
}
.song-info {
  flex: 1;
  min-width: 0;
}
.song-name {
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-reason {
  font-size: 11px;
  color: var(--accent);
  margin-top: 2px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-duration {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.flow-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 16px;
  flex-shrink: 0;
}
.flow-actions button {
  padding: 10px 28px;
  border-radius: 980px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--text);
  transition: transform 0.16s var(--ease), box-shadow 0.2s var(--ease), opacity 0.15s;
}
.flow-actions button:active {
  transform: scale(0.96);
}
.flow-actions button.primary {
  background: var(--accent);
  color: var(--text-on-accent);
  box-shadow: var(--accent-shadow);
}
.flow-actions button.primary:hover {
  box-shadow: var(--accent-shadow-strong);
}
.flow-actions button.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.flow-actions button.ghost {
  background: none;
  color: var(--accent);
}
.running {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text);
  gap: 14px;
}
.running p {
  font-size: 16px;
  margin: 0;
  font-weight: 500;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--hover-bg);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.progress-wrap {
  width: 100%;
  max-width: 320px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--hover-bg);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--accent);
  transition: width 0.05s linear;
}
.progress-text {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.progress-step {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin: 10px 0 0;
  min-height: 18px;
}
.result-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.result-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-right: 4px;
}
.cat-block {
  border-radius: 16px;
  padding: 14px 16px;
}
.cat-block h4 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}
.cat-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}
.cat-block .song-list {
  max-height: 38vh;
  overflow-y: auto;
  padding-right: 4px;
}
/* 每类右下角：命名 + 生成 */
.cat-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--input-border);
}
.name-input {
  width: 160px;
  padding: 7px 14px;
  border: 1px solid var(--input-border);
  border-radius: 980px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 13px;
  outline: none;
}
.name-input:focus {
  border-color: var(--accent);
}
.gen-btn {
  border: none;
  background: var(--accent);
  color: var(--text-on-accent);
  border-radius: 980px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.gen-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.error-text {
  color: var(--danger);
  font-size: 13px;
  text-align: center;
  padding: 8px;
}
/* 生成完成弹窗 */
.done-modal {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: var(--modal-overlay);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.done-card {
  width: 320px;
  border-radius: 20px;
  padding: 28px;
  text-align: center;
}
.done-check {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.done-card h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.done-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 20px;
}
.done-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.done-actions button {
  padding: 9px 22px;
  border-radius: 980px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
}
.done-actions button.primary {
  border: none;
  background: var(--accent);
  color: var(--text-on-accent);
}
.done-actions button.ghost {
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text);
}
</style>
