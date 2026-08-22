/**
 * 演示模式（MOCK=true）的模拟数据与实现。
 * 用于在没有 NeteaseCloudMusicApi / LLM 密钥的环境中跑通全流程展示界面。
 */

const PROFILE = {
  userId: 10001,
  nickname: '演示用户',
  avatarUrl: '',
};

// 模拟歌单数据
const MOCK_PLAYLISTS = [
  { id: 1001, name: '我喜欢的音乐', trackCount: 42, playCount: 666, coverImgUrl: '' },
  { id: 1002, name: '深夜自习', trackCount: 18, playCount: 233, coverImgUrl: '' },
  { id: 1003, name: '健身跑步', trackCount: 25, playCount: 188, coverImgUrl: '' },
];

// 模拟歌曲数据（供按流派分类演示）
const MOCK_SONGS = [
  { id: 1, name: '晴天', ar: [{ name: '周杰伦' }], al: { name: '叶惠美' }, dt: 269000 },
  { id: 2, name: '平凡之路', ar: [{ name: '朴树' }], al: { name: '猎户星座' }, dt: 302000 },
  { id: 3, name: 'Shape of You', ar: [{ name: 'Ed Sheeran' }], al: { name: '÷' }, dt: 233000 },
  { id: 4, name: '海阔天空', ar: [{ name: 'Beyond' }], al: { name: '乐与怒' }, dt: 325000 },
  { id: 5, name: '晴天雨', ar: [{ name: '林俊杰' }], al: { name: '梦想的声音' }, dt: 275000 },
  { id: 6, name: '无问', ar: [{ name: '周深' }], al: { name: '无问' }, dt: 320000 },
];

export const mockNetease = {
  async getQrKey() {
    return 'mock-qr-key-' + Date.now();
  },
  async createQr(key) {
    // 不返回真实二维码图片，前端会显示占位图标
    return { qrimg: '', qrurl: 'https://music.163.com/login' };
  },
  // 演示：第一次轮询即视为扫码成功
  async checkQr(key) {
    return {
      code: 803,
      message: '登录成功（演示模式）',
      cookie: 'MUSIC_U=mock-cookie; __csrf=mockcsrf',
    };
  },
  async loginStatus(cookie) {
    return { account: { id: PROFILE.userId }, profile: PROFILE };
  },
  async sendCaptcha(phone) {
    return { code: 200, message: '验证码已发送（演示模式无需真实短信）' };
  },
  async getLyric(id) {
    return '这是一段演示歌词，描述了一种轻松愉快的氛围';
  },
  async getSongComments(id) {
    return ['这首歌好治愈，循环了一天', '节奏感很强，适合跑步听', '听完有点 emo 了'];
  },
  async loginByCellphone(phone, captcha) {
    return {
      code: 200,
      cookie: 'MUSIC_U=mock-cellphone-cookie',
      account: { id: PROFILE.userId },
      profile: PROFILE,
    };
  },
  async getUserPlaylists() {
    return MOCK_PLAYLISTS;
  },
  async getPlaylistDetail(id) {
    const p = MOCK_PLAYLISTS.find((x) => x.id === Number(id)) || MOCK_PLAYLISTS[0];
    return {
      name: p.name,
      description: '演示模式的歌单',
      trackCount: MOCK_SONGS.length,
      tracks: MOCK_SONGS,
    };
  },
  async getLikedSongIds() {
    return MOCK_SONGS.map((s) => s.id);
  },
  async getSongsDetail(ids) {
    const set = new Set((ids || []).map(Number));
    return MOCK_SONGS.filter((s) => set.has(s.id) || ids == null);
  },
  // 模拟单曲统计
  async getSongStats(id) {
    const song = MOCK_SONGS.find((s) => s.id === Number(id));
    if (!song) return { id: Number(id), name: '', commentTotal: 0 };
    return {
      id: Number(id),
      name: song.name,
      artist: song.ar.map((a) => a.name).join(' / '),
      pop: 70 + (song.id % 30), // 模拟流行度
      commentTotal: 80000 + song.id * 12345, // 模拟评论数
      hotComment: { content: '这首歌太好听了！', likedCount: 5000 + song.id * 111 },
    };
  },
  async createPlaylist(name, desc) {
    return { id: 9001 + Math.floor(Math.random() * 100), name, description: desc };
  },
  async editPlaylistTracks(op, playlistId, trackIds) {
    return { code: 200, message: 'success (演示模式)' };
  },
};

// 演示模式下生成用户资料
export const mockProfile = PROFILE;
