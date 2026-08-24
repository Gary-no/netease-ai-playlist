# 网易云 AI 歌单助手 — 项目全量上下文交接文档

> **版本**：v0.7.0 ｜ **生成日期**：2026-08-24 ｜ **适用对象**：新环境 AI / 开发者
> **线上地址**：https://www.playlist-helper.com ｜ **仓库**：github.com/Gary-no/netease-ai-playlist

---

## 一、项目全局架构与当前进度

### 1.1 核心业务逻辑与技术栈（3-5 句话）

**业务**：用户通过网易云扫码/验证码登录后，选择收藏歌单，AI 按**情绪 / 曲风 / 语种 / 热度 / 自定义聊天**五个维度对歌曲自动分类，并一键创建多个新歌单（不删除原歌单、只新建分类），全程免费。

**技术栈**：
- **前端**：Vue 3 + Vite + GSAP 动画 + TailwindCSS v4（灰度自定义变量），灰度极简风格（参考 itsoffbrand.com）
- **后端**：Express + Axios，JSON 文件存储（无数据库）
- **LLM**：OpenAI 兼容协议调用 DeepSeek（qwen-plus 为 fallback）
- **网易云数据**：开源 NeteaseCloudMusicApi 项目（vendor 在仓库内）作为代理

### 1.2 开发进度

| 模块 | 状态 | 说明 |
|------|------|------|
| 扫码 / 验证码登录 | ✅ 完成 | 扫码三步曲 + 手机验证码，登录态 localStorage 持久化 |
| 分类选择页 | ✅ 完成 | 5 个入口（情绪/曲风/语种/热度/自定义） |
| 异步分类流程 | ✅ 完成 | 选歌单 → 细分项 → 异步任务 + 进度条轮询 |
| 自定义分类聊天 | ✅ 完成 | ChatPanel 对话式分类 |
| 一键建歌单 | ✅ 完成 | 分类结果确认后创建多个歌单并加歌 |
| 后台管理 | ✅ 完成 | 密码 `1234` 验证 → 用户数/活跃/分类统计/报错/反馈/评价 |
| 反馈系统 | ✅ 完成 | 用户提交反馈 + 管理员逐条回复 |
| 歌单评价 | ✅ 完成 | 生成歌单后评价（满意/一般/不满意 + 文字） |
| 安全加固 | ✅ 完成 | CORS 锁域 / 请求体限制 100KB / admin.json 写入锁 / 分类每日 3 次上限 |
| 冷启动优化 | ✅ 完成 | 超时 45s + 指数退避重试 4 次 + 启动预热 + keep-alive 每 5 分钟 |

**下一步计划**：
- ⚠️ 撤销历史对话中泄露的所有明文 token（GitHub PAT / Render / Vercel / Cloudflare）
- ⚠️ `COOKIE_SECRET` 生产环境改用强随机值
- 可考虑将 JSON 文件存储升级为数据库（当前 admin.json 已提交仓库，部署不丢数据，但多实例需换 Redis/DB）

### 1.3 核心目录结构

```
netease-ai-playlist/
├── frontend/                        # 前端 SPA（Vercel 部署）
│   ├── package.json                 # ← 版本号在此修改（每次推送必改）
│   ├── .env                         # VITE_API_BASE（本地 /api）
│   └── src/
│       ├── App.vue                  # 根组件：路由切换、更新日志、用户菜单、主题
│       ├── api/index.js             # 全部 API 封装（自动带 X-Session-Id / X-Ncm-Cookie）
│       ├── style.css                # 设计令牌（灰度 CSS 变量）
│       ├── main.js                  # Vue 入口
│       └── components/
│           ├── HomeView.vue         # 首页（Hero + 逐字动画 + CTA）
│           ├── SelectView.vue       # 分类选择页
│           ├── ClassifyFlow.vue     # 分类流程（进度条）
│           ├── LoginModal.vue       # 扫码/验证码登录弹窗
│           ├── ChatPanel.vue        # 自定义分类对话
│           ├── AdminView.vue        # 后台管理（密码 1234）
│           ├── FeedbackView.vue     # 我的反馈记录页
│           └── PlaylistPanel.vue    # 歌单面板
├── server/                          # Express 后端（Render 部署）
│   ├── index.js                     # 入口：CORS/中间件/路由挂载/启动预热
│   ├── config.js                    # 配置（NETEASE_API_BASE 自动补全 onrender.com）
│   ├── .env                         # 本地环境变量（MOCK=false）
│   ├── routes/
│   │   ├── auth.js                  # 登录三件套 + 验证码 + me/logout
│   │   ├── classify.js              # 异步分类（含每日 3 次上限）
│   │   ├── playlists.js             # 歌单读取/创建
│   │   ├── chat.js                  # 自定义聊天分类
│   │   └── admin.js                 # 密码验证/统计/反馈/评价
│   ├── services/
│   │   ├── admin.js                 # admin.json 数据读写（带写入锁）
│   │   ├── cookieStore.js           # 网易云 Cookie AES-256-GCM 加密存储
│   │   ├── netease.js               # 网易云 API 封装（45s 超时 + 重试）
│   │   ├── llm.js                   # LLM 调用
│   │   ├── mock.js                  # MOCK=true 时模拟数据
│   │   ├── rateLimit.js             # 滑动窗口限流 + 每日限额
│   │   ├── taskStore.js             # 分类任务存储
│   │   └── tools.js                 # 工具函数
│   └── data/
│       └── admin.json               # ← 运行时数据（已提交仓库，部署保留）
├── NeteaseCloudMusicApi/            # vendor 的网易云 API 代理（Render 独立服务）
├── render.yaml                      # Render Blueprint（两个服务）
└── .github/workflows/keep-alive.yml # 每 5 分钟保活任务
```

---

## 二、开发者个人习惯与代码规范（重要）

### 2.1 编码偏好

- **设计风格**：灰度极简，`background #1d1d1d`，文字 `#e5e4e0`。**拒绝**彩色渐变、粒子效果、玻璃拟态。参考 itsoffbrand.com
- **文案**：越少越好，能一行不要两行
- **动画**：**第一次确定的动画方案就是最终版**（逐字 stagger 0.035s + blur 入场），禁止反复实验其他动画方案（曾有 2 次尝试被否定回退）
- **手机适配**：硬性要求，768px / 480px 双断点
- **版本号规则**：
  - 小改动（修复/小功能）→ `0.0.x` 递增
  - 大功能 → `0.x.0` 递增
  - 每次推送**必须**同时：改 `frontend/package.json` 的 `version` + 在 `App.vue` 的 `changelog` 数组头部插入新条目
  - commit message 格式：`<type>: <中文描述>`
- **命名**：文件小写横线（`classify.js`），组件 PascalCase（`HomeView.vue`），ref 用 camelCase
- **注释**：中文注释，解释"为什么"而非"是什么"

### 2.2 工具链与格式配置

- **包管理器**：npm（无 pnpm/yarn）
- **格式化**：无 ESLint/Prettier 全局配置，代码风格靠 Vue 官方风格 + 2 空格缩进
- **运行时**：Node 20（Render 指定）、本地 macOS Node 22.22.2
- **模块系统**：ESM（`"type": "module"`，前后端都是）

### 2.3 沟通偏好

- 直接说需求，不需要客套
- 遇到报错时：直接给解决方案代码，简短解释原因即可（1-3 句）
- 用"晒"表示对简洁的认可
- 完成功能后直接演示，不啰嗦
- 部署/推送类操作完成后，简明列出"你需要在控制台做什么"

---

## 三、第三方依赖、API 与凭证配置

### 3.1 关键依赖及版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| vue | ^3.4.27 | 前端框架 |
| vite | ^5.2.11 | 构建工具 |
| gsap | ^3.15.0 | 滚动动画 |
| tailwindcss | ^4.3.3 | CSS（灰度自定义变量） |
| axios | ^1.7.2 | 前后端 HTTP |
| three | ^0.185.1 | 3D（备用，未深度使用） |
| express | ^4.19.2 | 后端框架 |
| cors | ^2.8.5 | CORS |
| dotenv | ^16.4.5 | 环境变量 |
| openai | ^4.52.0 | LLM 调用（OpenAI 兼容协议） |

### 3.2 API 接口清单

**认证类**（`routes/auth.js`）：
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/qr/key` | 获取二维码 unikey |
| GET | `/api/auth/qr/create?key=` | 生成二维码 base64 |
| GET | `/api/auth/qr/check?key=` | 轮询扫码状态（803=成功，返回 `_cookie`） |
| POST | `/api/auth/captcha/sent` | 发送手机验证码 `{phone}` |
| POST | `/api/auth/cellphone` | 验证码登录 `{phone, captcha}`，返回 `_cookie` |
| GET | `/api/auth/me` | 当前登录状态（需 X-Session-Id 头） |
| POST | `/api/auth/logout` | 退出登录 |

**核心功能**：
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/playlists` | 获取用户歌单列表 |
| GET | `/api/playlists/:id` | 歌单详情（歌曲列表） |
| POST | `/api/classify/start` | 异步分类 `{playlistIds, mode, options}` → `taskId`（**每日 3 次上限**） |
| GET | `/api/classify/status/:taskId` | 轮询分类进度 |
| POST | `/api/classify/confirm` | 确认分类结果，创建歌单并加歌 |
| POST | `/api/chat` | 自定义分类对话 `{message, history}` |

**管理类**（`routes/admin.js`）：
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/verify` | 密码验证 `{password}` → `token`（密码 `1234`） |
| GET | `/api/admin/stats` | 统计/报错/反馈/评价（需 `X-Admin-Token` 头） |
| POST | `/api/admin/feedback` | 提交反馈 `{content}`（需登录） |
| GET | `/api/admin/my-feedback` | 我的反馈记录（需登录） |
| POST | `/api/admin/feedback-reply` | 管理员回复（需 `X-Admin-Token`） |
| POST | `/api/admin/rate` | 提交歌单评价（需登录） |

**其他**：`GET /health` 健康检查。

> ⚠️ 所有请求自动携带 `X-Session-Id` 头（前端 axios 拦截器自动注入）；登录后额外携带 `X-Ncm-Cookie`（加密的网易云 Cookie，用于部署后恢复登录态）。

### 3.3 环境变量清单（凭据配置）

**后端 `server/.env`（本地）**：
| 变量 | 用途 | 来源 |
|------|------|------|
| `MOCK` | `true`=模拟数据，`false`=真实 | 本地手动 |
| `PORT` | 端口，默认 3000 | — |
| `NETEASE_API_BASE` | 网易云 API 地址 | 本地 `http://localhost:3001` |
| `LLM_BASE_URL` | LLM 地址，**必须带 `/v1`** | DeepSeek 控制台 |
| `LLM_API_KEY` | LLM 密钥 | DeepSeek 控制台 platform.deepseek.com |
| `LLM_MODEL` | 模型名 | `deepseek-chat` |
| `COOKIE_SECRET` | Cookie 加密密钥 | 本地 `change-me`，生产强随机 |
| `CORS_ORIGIN` | 允许的域名 | 本地 `http://localhost:5173` |

**前端 `frontend/.env`（Vercel 部署用）**：
| 变量 | 用途 | 来源 |
|------|------|------|
| `VITE_API_BASE` | API 基础地址，**必须 `https://api.playlist-helper.com/api`（带 /api）** | Vercel 环境变量 |

**Render 后端环境变量**（dashboard.render.com 手动填）：
| 变量 | 用途 |
|------|------|
| `LLM_API_KEY` | DeepSeek 密钥（`YOUR_API_KEY_HERE`，从 platform.deepseek.com 获取） |
| `COOKIE_SECRET` | 强随机串（`YOUR_SECRET_HERE`，用 `openssl rand -hex 32` 生成） |

**⚠️ 安全提醒**：
- 已泄露的凭证（需撤销）：GitHub PAT `ghp_jZBO1C77...`、Render API `rnd_L6Em7Ct8...`、DeepSeek key、网易云 Cookie
- **管理员密码 = `1234`**（硬编码在 `server/services/admin.js` 的 `verifyPassword`）
- 生产环境所有密钥务必通过平台环境变量注入，不要写死在代码里

---

## 四、历史 Bug 追踪与修复记录（避坑指南）

| # | 错误现象 | 根本原因 | 最终修复 |
|---|---------|---------|---------|
| 1 | 后端连不上网易云 API | `NETEASE_API_BASE` 传裸主机名 | `config.js` 自动补全 `.onrender.com` + 协议 |
| 2 | LLM 接口 404 | `LLM_BASE_URL` 缺 `/v1` 后缀 | render.yaml 强制带 `/v1` |
| 3 | 手机验证码 406 | 网易云风控限流 | 透传错误码 + 60s 倒计时 + 用户手动重试 |
| 4 | 管理员回复反馈 401 无响应 | 前端没传 `X-Admin-Token` 头 | api 方法补 header |
| 5 | **后台无权限** | session profile 缺 `phone` 字段；手机号识别方案反复失败 | 放弃手机号识别，**改回密码 `1234`**（`/api/admin/verify` 返回 token） |
| 6 | **部署一直失败 (update_failed)** | `auth.js` 引用已删除的 `isAdminProfile` 函数 | 移除该 import 与 `/me` 的 isAdmin 字段，`node --check` 验证后推送 |
| 7 | **总用户数一直是 0** | 数据追踪中间件放在路由**之后**，`res.json` 已被调用 | 把追踪中间件移到路由**之前** |
| 8 | **反馈/评价数据丢失** | ① `trackFeedback`/`trackRating` 是 async 但路由没 `await`；② `server/data/` 在 .gitignore 里，每次部署清空 | ① 路由全部 `await`；② 删除 .gitignore 的 `server/data/`，`admin.json` 提交仓库 |
| 9 | 白屏 | `git reset --hard` 残留 `<<<<<<<` merge conflict 标记 | 手动清理冲突标记，`npm run build` 验证 |
| 10 | 二维码 502 | Render 免费版冷启动（15 分钟休眠） | 超时 35s→45s、重试 4 次（3s/6s/12s/24s）、启动预热 getQrKey、keep-alive 每 5 分钟 |
| 11 | 手机访问报 network error | CORS 只允许 `www.playlist-helper.com`，手机可能访问非 www 域名 | CORS 白名单数组：www + 非 www + localhost |
| 12 | git push 失败 (502/超时) | 本地代理问题 | 主通道 `unset http_proxy https_proxy && git push`；备选 GitHub REST API（blobs→trees→commits→refs） |
| 13 | Render 部署后旧代码还在 | REST API 推送不触发 webhook；deploy 失败 | 用 Render API `POST /v1/services/{id}/deploys` 显式触发 + 检查 deploy status |

### 避坑建议（给新 AI 的 5 条铁律）

1. **改服务端导出函数前，先全局搜索引用**（`grep -rn "函数名" server/`），删除导出会立刻让部署崩溃（教训：#6）
2. **Express 中间件顺序决定一切**：数据追踪/拦截 `res.json` 的中间件必须在路由注册**之前**（教训：#7）
3. **async 函数必须 await**：`trackFeedback`/`trackRating` 这类写库函数，路由里漏 `await` 会丢数据（教训：#8）
4. **绝不用 `git reset --hard`**：会丢本地改动 + 留 merge conflict 标记导致白屏；用 `git fetch && git rebase`（教训：#9）
5. **改完必须本地验证再推**：`node --check` 语法检查 + 本地起服务 curl 测试 + `npm run build`，确认无误后再走部署（教训：#6/#10）
6. **部署后要验证**：用 Render API 查 `status=live`，再 curl 线上接口确认新功能生效（`/api/admin/verify` 返回 `{success:true}` 才算成功）

---

## 五、本地环境搭建与启动指南

### 5.1 环境要求

- **Node.js ≥ 20**（推荐 22.x，Render 生产用 20）
- **npm**（随 Node 安装）
- 无需数据库、无需 Redis（单实例内存方案）

### 5.2 从零搭建步骤（新电脑）

```bash
# 1. 克隆仓库
git clone https://github.com/Gary-no/netease-ai-playlist.git
cd netease-ai-playlist

# 2. 安装后端依赖
cd server
cp .env.example .env        # 按需填写（MOCK=false 连真实数据）
npm install

# 3. 安装前端依赖
cd ../frontend
cp .env.example .env 2>/dev/null || echo "VITE_API_BASE=/api" > .env
npm install

# 4.（可选）本地起网易云 API 代理
#    生产环境用远程 netease-api-x8t6.onrender.com，本地可不启动
#    如需本地：cd NeteaseCloudMusicApi && npm install && npm start（端口 3001）
```

### 5.3 一键启动命令

```bash
# 终端 1 — 后端（端口 3000）
cd server && npm run dev        # 或 MOCK=true node index.js 用模拟数据

# 终端 2 — 前端（端口 5173）
cd frontend && npm run dev
```

浏览器打开 **http://localhost:5173**，扫码或验证码登录即可完整体验。

> 本地默认 `NETEASE_API_BASE=http://localhost:3001`，如果没起本地网易云 API，可改为 `NETEASE_API_BASE=https://netease-api-x8t6.onrender.com` 直连线上代理。

### 5.4 部署命令速查

```bash
# Render 手动触发部署（AI 可执行）
curl -X POST -H "Authorization: Bearer $RENDER_KEY" \
  -H "Content-Type: application/json" \
  https://api.render.com/v1/services/srv-da4nqa8n74is73e5ndig/deploys \
  -d '{"commitId":"<SHA>"}'

# 检查部署状态
curl -H "Authorization: Bearer $RENDER_KEY" \
  https://api.render.com/v1/services/srv-da4nqa8n74is73e5ndig/deploys?limit=1
```

---

## 六、给新 AI 的系统指令（System Prompt）

> 将以下内容作为系统指令粘贴给新环境的 AI，或要求它先读取本文档。

---

**你是「网易云 AI 歌单助手」项目的开发助手。接手前必须先完整阅读仓库内 `PROJECT_HANDOFF.md` 交接文档，并严格遵守以下规则：**

1. **项目**：Vue3 + Vite + GSAP 前端（Vercel）、Express 后端（Render）、NeteaseCloudMusicApi 代理（Render），JSON 文件存储无数据库。用户扫码/验证码登录后，AI 按情绪/曲风/语种/热度/自定义对话对收藏歌单自动分类并一键建新歌单。

2. **设计铁律**：灰度极简（bg #1d1d1d / 文字 #e5e4e0），拒绝渐变/粒子/玻璃拟态；文案越少越好；手机端必须适配；**动画方案一旦确定就是最终版，禁止实验替代方案**（逐字 stagger 是已确认方案）。

3. **版本规范（每次推送必做）**：改 `frontend/package.json` 的 version（修复→0.0.x，大功能→0.x.0）+ 在 `App.vue` changelog 数组头部插入对应条目 + commit message 用中文。

4. **后台管理**：密码 `1234`（硬编码 `server/services/admin.js`），验证后带 `X-Admin-Token` 头访问 `/api/admin/stats`。

5. **避坑清单（必须遵守）**：① 删除服务端导出函数前先 grep 引用，否则部署崩溃；② 拦截 res.json 的中间件必须放路由前；③ async 写库函数必须 await；④ 禁止 `git reset --hard`，用 fetch+rebase；⑤ 改完先 `node --check` + 本地测试 + `npm run build` 再推送；⑥ git push 代理失败时用 GitHub REST API（blobs→trees→commits→refs），推送后需 fetch 同步本地；⑦ 部署后必须用 Render API 确认 status=live 并 curl 线上接口验证。

6. **数据**：admin.json 已提交仓库，部署不清空；cookies_store.json 不入库（含加密 Cookie）。分类每日上限 3 次/用户。网易云接口超时 45s + 重试 4 次，冷启动时耐心重试。

7. **沟通**：直接给结论和代码，不要客套；报告问题给原因+修复方案；涉及部署时最后列出"用户在控制台需要手动做的事"。

---

*文档结束 — 新 AI 读取后可直接延续开发*
