import { neteaseApi } from './netease.js';

/**
 * ========== AI Tools：定义 + 执行器 ==========
 * 定义部分提供给 LLM 做 Function Calling 规划；
 * 执行器部分由后端真实调用网易云 API（携带用户 Cookie）。
 */

// 1) 提供给 LLM 的 Tool Schema（OpenAI tools 协议）
export const aiTools = [
  {
    type: 'function',
    function: {
      name: 'get_user_playlists',
      description: '获取当前登录用户的全部歌单列表',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: '获取数量，默认 100' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_playlist_detail',
      description: '获取某个歌单的详细信息，包括歌单内的歌曲列表',
      parameters: {
        type: 'object',
        properties: {
          playlistId: { type: 'number', description: '歌单 ID' },
        },
        required: ['playlistId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_liked_songs',
      description: '获取用户所有红心歌曲（即"我喜欢的音乐"）的详细信息',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: '获取数量，默认全部' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_songs_detail',
      description:
        '根据歌曲 ID 列表获取歌曲详细信息（含流派、歌手、专辑、时长等），用于按流派/场景对歌曲分类',
      parameters: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'number' }, description: '歌曲 ID 列表，最多 1000 个' },
        },
        required: ['ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_song_stats',
      description:
        '获取歌曲的热度统计：流行度(pop)、总评论数、热门评论点赞数。用于评估歌曲热度或向用户展示歌曲数据',
      parameters: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'number' }, description: '歌曲 ID 列表，最多 5 个' },
        },
        required: ['ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_playlist',
      description: '创建新的歌单，返回新歌单的 ID',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '歌单名称' },
          desc: { type: 'string', description: '歌单简介（可空）' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_tracks_to_playlist',
      description: '将一组歌曲添加到指定歌单',
      parameters: {
        type: 'object',
        properties: {
          playlistId: { type: 'number', description: '目标歌单 ID' },
          trackIds: { type: 'array', items: { type: 'number' }, description: '要添加的歌曲 ID 列表' },
        },
        required: ['playlistId', 'trackIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_tracks_from_playlist',
      description: '将一组歌曲从指定歌单中移除',
      parameters: {
        type: 'object',
        properties: {
          playlistId: { type: 'number', description: '目标歌单 ID' },
          trackIds: { type: 'array', items: { type: 'number' }, description: '要移除的歌曲 ID 列表' },
        },
        required: ['playlistId', 'trackIds'],
      },
    },
  },
];

// 歌曲对象精简，避免把大量字段灌给 LLM 造成 token 浪费
function slimSong(song) {
  return {
    id: song.id,
    name: song.name,
    artists: (song.ar || []).map((a) => a.name),
    album: song.al?.name,
    // 网易云接口的歌曲详情不含标准流派字段，流派分类由 LLM 根据歌曲名/歌手/专辑推断
    duration: song.dt ? Math.round(song.dt / 1000) + 's' : null,
  };
}

// 2) 工具执行器：name + args + 用户上下文(ctx = { cookie, profile })
export async function executeTool(name, args, ctx) {
  const { cookie, profile } = ctx;

  switch (name) {
    case 'get_user_playlists': {
      const list = await neteaseApi.getUserPlaylists(profile.userId, cookie);
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        trackCount: p.trackCount,
        playCount: p.playCount,
        coverImgUrl: p.coverImgUrl,
      }));
    }

    case 'get_playlist_detail': {
      const detail = await neteaseApi.getPlaylistDetail(args.playlistId, cookie);
      return {
        name: detail.name,
        description: detail.description,
        trackCount: detail.trackCount,
        tracks: (detail.tracks || []).map(slimSong),
      };
    }

    case 'get_liked_songs': {
      const ids = await neteaseApi.getLikedSongIds(profile.userId, cookie);
      // 演示简化：一次性拉取详情。上千首红心歌在生产需分批拉取
      const songs = await neteaseApi.getSongsDetail(ids, cookie);
      return { total: ids.length, songs: songs.map(slimSong) };
    }

    case 'get_songs_detail': {
      const songs = await neteaseApi.getSongsDetail(args.ids || [], cookie);
      return songs.map(slimSong);
    }

    case 'get_song_stats': {
      // 逐首查询统计（评论接口一次只能查一首），最多 5 首
      const ids = (args.ids || []).slice(0, 5);
      const results = [];
      for (const id of ids) {
        results.push(await neteaseApi.getSongStats(id, cookie));
      }
      return results;
    }

    case 'create_playlist': {
      const playlist = await neteaseApi.createPlaylist(args.name, args.desc || '', cookie);
      return { id: playlist.id, name: playlist.name };
    }

    case 'add_tracks_to_playlist': {
      const res = await neteaseApi.editPlaylistTracks('add', args.playlistId, args.trackIds, cookie);
      return { success: res.code === 200, message: res.message, code: res.code };
    }

    case 'remove_tracks_from_playlist': {
      const res = await neteaseApi.editPlaylistTracks('del', args.playlistId, args.trackIds, cookie);
      return { success: res.code === 200, message: res.message, code: res.code };
    }

    default:
      return { error: `未知工具: ${name}` };
  }
}
