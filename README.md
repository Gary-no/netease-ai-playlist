# 网易云音乐 AI 智能歌单整理

通过自然语言对话，让 AI 帮你自动整理网易云音乐歌单（按流派分类、提取红心歌曲、生成场景歌单等）。

## 整体架构

```
┌──────────────────────────── 前端 (Vue3 + Vite :5173) ────────────────────────────┐
│  LoginModal.vue        二维码扫码登录弹窗（每 2s 轮询扫码状态）                     │
│  ChatPanel.vue         聊天界面（自然语言指令 → 展示 AI 结果）                     │
│  PlaylistPanel.vue     歌单结果展示列表                                            │
│  api/index.js          axios 封装，自动携带 X-Session-Id（localStorage 生成）      │
└──────────────┬────────────────────────────────────────────────────────────────────┘
               │  HTTP 请求（Vite proxy 将 /api 转发到 :3000）
┌──────────────▼────────────────────────────────────────────────────────────────────┐
│  后端 (Node.js + Express :3000)                                                   │
│  routes/auth.js        登录四步曲：qr/key → qr/create → qr/check(轮询) → 存 Cookie │
│  routes/chat.js        聊天入口：校验登录态 → 交给 LLM 编排器 → 返回结果            │
│  routes/playlists.js   歌单列表查询（供右侧面板展示）                              │
│  services/llm.js       Function Calling 编排循环（自动调用工具，≤8 轮防死循环）     │
│  services/tools.js     AI Tool Schema 定义 + 工具实际执行器                        │
│  services/netease.js   网易云 API 统一封装（每个请求都携带用户 Cookie）            │
│  services/cookieStore.js Cookie AES-256-GCM 加密落盘（生产换 Redis + KMS）        │
└───────┬──────────────────────────────────┬────────────────────────────────────────┘
        │ HTTP 请求(带 Cookie)             │ HTTP 请求(OpenAI 兼容协议)
┌───────▼─────────────┐        ┌───────────▼───────────────────────┐
│ NeteaseCloudMusicApi│        │ LLM：通义千问 / 智谱 GLM           │
│ (开源服务, :3001)    │        │ Chat Completions + Tools          │
└─────────────────────┘        └───────────────────────────────────┘
```

## 核心业务流程

### 1. 账号鉴权（扫码登录）

```
前端                         后端                              网易云API
 │ ① GET /auth/qr/key        │──▶  GET /login/qr/key           │
 │◀────── unikey ────────────│                                  │
 │ ② GET /auth/qr/create     │──▶  GET /login/qr/create?key    │
 │◀────── 二维码 base64 ─────│                                  │
 │ ③ 展示二维码，每 2s 轮询   │                                  │
 │ ④ GET /auth/qr/check      │──▶  GET /login/qr/check?key     │
 │     (801等待/802已扫/803成功)│◀────── cookie ────────────────│
 │                          │ ⑤ 校验 login/status，拿 profile  │
 │◀────── { profile } ──────│ ⑥ Cookie AES 加密存储            │
```

后续所有接口（/chat、/playlists）通过 `X-Session-Id` 请求头在后端换取对应的网易云 Cookie，**Cookie 永远不出后端**。

### 2. AI 意图解析 + 执行闭环（Function Calling）

```
用户: "把我红心歌曲里的流行歌单独建一个歌单"
  │
  ▼  POST /api/chat  { message, history } + X-Session-Id
  ▼  后端拼 system prompt + 用户消息 + tools 定义
  ▼  LLM 返回 tool_calls: [get_liked_songs → get_songs_detail → create_playlist → add_tracks_to_playlist]
  ▼  后端依次执行工具（带 Cookie 调网易云 API），把结果回传给 LLM
  ▼  LLM 汇总成自然语言返回前端
```

## 目录结构

```
netease-ai-playlist/
├── server/                      # 后端 Node.js + Express
│   ├── index.js                 # 服务入口
│   ├── config.js                # 环境配置
│   ├── .env.example             # 环境变量模板
│   ├── routes/
│   │   ├── auth.js              # 扫码登录
│   │   ├── chat.js              # 聊天 / LLM 编排入口
│   │   └── playlists.js         # 歌单列表
│   ├── services/
│   │   ├── netease.js           # 网易云 API 封装
│   │   ├── llm.js               # Function Calling 编排循环
│   │   ├── tools.js             # AI 工具定义 + 执行器
│   │   └── cookieStore.js       # Cookie 加密存储
│   └── data/                    # 演示用 Cookie 落盘目录
└── frontend/                    # 前端 Vue3 + Vite
    ├── index.html
    ├── vite.config.js           # /api 代理到后端
    └── src/
        ├── main.js
        ├── App.vue
        ├── style.css
        ├── api/index.js         # axios 封装
        └── components/
            ├── LoginModal.vue   # 扫码登录
            ├── ChatPanel.vue    # 聊天界面
            └── PlaylistPanel.vue# 歌单列表
```

## 快速启动

### 方式一：演示模式（无需任何外部依赖，立即体验界面）

`server/.env` 里已默认 `MOCK=true`，扫码登录、AI 整理歌单均用模拟数据跑通：

```bash
# 1. 启动后端（演示模式）
cd server && npm install && npm run dev   # :3000

# 2. 启动前端
cd frontend && npm install && npm run dev # :5173，浏览器打开即可
```

演示模式下点「扫码登录」约 2 秒即自动登录成功，聊天输入"把红心歌曲按流派分类"可看到模拟执行结果。

### 方式二：接入真实服务

```bash
# 0. 前置：启动网易云 API 服务（原仓库已删库，用 npm 官方包，端口 3001）
mkdir ncm-api && cd ncm-api && npm init -y
npm install NeteaseCloudMusicApi          # 装完直接运行
NODE_OPTIONS= PORT=3001 node node_modules/NeteaseCloudMusicApi/app.js

# 1. 后端：把 .env 里 MOCK 改为 false，并填入 LLM_API_KEY
cd server
cp .env.example .env              # 填入 LLM_API_KEY、COOKIE_SECRET
npm install
npm run dev                       # :3000

# 2. 启动前端
cd frontend
npm install
npm run dev                       # :5173，浏览器打开即可
```

> 注意：Windows 下如果使用 WorkBuddy 内置 Node，启动网易云 API 时需加 `NODE_OPTIONS=` 清空沙箱注入，
> 否则会出现 `http-proxy-agent` MODULE_NOT_FOUND 的诡异报错。

## AI 工具清单（Tools）

| 工具名 | 说明 | 对应网易云接口 |
|---|---|---|
| `get_user_playlists` | 获取用户所有歌单 | `/user/playlist` |
| `get_playlist_detail` | 获取歌单内歌曲 | `/playlist/detail` |
| `get_liked_songs` | 获取红心歌曲 | `/likelist` + `/song/detail` |
| `get_songs_detail` | 批量获取歌曲详情（流派/歌手/专辑） | `/song/detail` |
| `create_playlist` | 新建歌单 | `/playlist/create` |
| `add_tracks_to_playlist` | 歌单添加歌曲 | `/playlist/tracks?op=add` |
| `remove_tracks_from_playlist` | 歌单移除歌曲 | `/playlist/tracks?op=del` |

## 生产环境注意

- 演示模式：`server/.env` 的 `MOCK=true` 时，登录/聊天/歌单全部走 `server/services/mock.js` 模拟数据；接入真实服务后改为 `MOCK=false`。
- Cookie 存储：本演示用 `data/cookies.json` + AES 加密；生产请用 **Redis 带过期时间** 或数据库，密钥走 KMS。
- LLM 密钥：统一放服务端 `.env`，前端永远不接触。
- 限流与鉴权：`/api/chat` 需要登录态校验 + 频率限制，防止 Cookie 被滥用。
- 大歌单性能：`get_liked_songs` 可能返回上千首，需分批拉取歌曲详情（当前为演示做了简化）。
- 请求串行化：网易云接口需携带 `timestamp` 防缓存，且部分接口有频控。
