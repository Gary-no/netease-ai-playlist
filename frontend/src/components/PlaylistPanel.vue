<template>
  <div class="playlist-panel">
    <!-- 歌单列表视图 -->
    <template v-if="!detail">
      <div class="panel-header">
        <h3>我的歌单</h3>
        <button :disabled="!loggedIn || loading" @click="load" class="refresh">
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>

      <p v-if="!loggedIn" class="empty">登录后展示你的歌单列表</p>
      <p v-else-if="!playlists.length && !loading" class="empty">暂无数据，点击刷新</p>

      <ul class="list" v-else>
        <li
          v-for="p in playlists"
          :key="p.id"
          class="item clickable"
          @click="openDetail(p)"
        >
          <img v-if="p.coverImgUrl" :src="p.coverImgUrl" class="cover" alt="" />
          <div v-else class="cover placeholder">🎵</div>
          <div class="info">
            <div class="name">{{ p.name }}</div>
            <div class="meta">{{ p.trackCount }} 首</div>
          </div>
          <span class="arrow">›</span>
        </li>
      </ul>
    </template>

    <!-- 歌曲列表视图 -->
    <template v-else>
      <div class="panel-header">
        <button class="refresh" @click="closeDetail">‹ 返回</button>
        <h3 class="detail-title">{{ detail.name }}</h3>
        <span class="detail-count">{{ detail.tracks.length }} 首</span>
      </div>

      <p v-if="detailLoading" class="empty">歌曲加载中...</p>
      <p v-else-if="!detail.tracks.length" class="empty">这个歌单是空的</p>

      <ul class="song-list" v-else>
        <li v-for="(s, i) in detail.tracks" :key="s.id" class="song-item">
          <img v-if="s.coverImgUrl" :src="s.coverImgUrl" class="song-cover" alt="" />
          <div v-else class="song-cover placeholder">🎵</div>
          <div class="song-info">
            <div class="song-name">{{ s.name }}</div>
            <div class="song-meta">{{ artistsText(s) }} · {{ s.album || '未知专辑' }}</div>
          </div>
          <span class="song-duration">{{ formatDuration(s.duration) }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { api } from '../api';

const props = defineProps({ loggedIn: Boolean });

const playlists = ref([]);
const loading = ref(false);
const detail = ref(null); // { id, name, trackCount, tracks: [] }
const detailLoading = ref(false);

// 登录成功后自动加载
watch(
  () => props.loggedIn,
  (v) => v && load()
);

async function load() {
  loading.value = true;
  try {
    playlists.value = await api.getPlaylists();
  } catch (e) {
    playlists.value = [];
  } finally {
    loading.value = false;
  }
}

async function openDetail(p) {
  detail.value = { id: p.id, name: p.name, trackCount: p.trackCount, tracks: [] };
  detailLoading.value = true;
  try {
    const data = await api.getPlaylistDetail(p.id);
    detail.value = data;
  } catch (e) {
    detail.value = {
      ...detail.value,
      error: e.response?.data?.error || e.message,
    };
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  detail.value = null;
}

function artistsText(s) {
  return (s.artists || []).join(' / ') || '未知歌手';
}

function formatDuration(sec) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
</script>

<style scoped>
.playlist-panel {
  height: 100%;
  background: var(--panel-bg);
  border-radius: 12px;
  box-shadow: 0 2px 12px var(--panel-shadow);
  padding: 16px;
  overflow-y: auto;
  transition: background 0.25s;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}
.detail-title {
  flex: 1;
  font-size: 14px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-count {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.refresh {
  padding: 6px 14px;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}
.refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 40px 0;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item.clickable {
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: background 0.15s;
}
.item.clickable:hover {
  background: var(--hover-bg);
}
.cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--placeholder-bg);
  font-size: 20px;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.arrow {
  color: var(--text-secondary);
  font-size: 18px;
}
.song-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.song-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-radius: 8px;
}
.song-item:hover {
  background: var(--hover-bg);
}
.song-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.song-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--placeholder-bg);
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
.song-duration {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
</style>
