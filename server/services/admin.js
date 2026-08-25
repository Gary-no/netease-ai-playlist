import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'admin.json');

// ---------- Upstash Redis 持久化（可选） ----------
// 配置了 UPSTASH_REDIS_REST_URL/TOKEN 时，admin 数据以整个 JSON 形式存到 Redis，
// 本地文件仅作为运行时兜底。这样 Render 免费版实例重启/回收后数据不丢。
const REDIS_KEY = 'admin:data';
const useRedis = Boolean(config.upstash.redisUrl && config.upstash.redisToken);

async function redisGet() {
  const res = await fetch(`${config.upstash.redisUrl}/get/${REDIS_KEY}`, {
    headers: { Authorization: `Bearer ${config.upstash.redisToken}` },
  });
  const body = await res.json();
  return body.result ?? null; // Upstash GET 返回 { result: string | null }
}

async function redisSet(value) {
  const res = await fetch(`${config.upstash.redisUrl}/set/${REDIS_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.upstash.redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  return res.ok;
}

// 简单的文件写入锁（单实例足够，多实例需换 Redis）
// 注意：单次写入失败不能污染整条队列，否则后续所有写入会永久静默失败
let writeQueue = Promise.resolve();
async function persist(data) {
  if (useRedis) {
    await redisSet(JSON.stringify(data));
    return; // 有 Redis 时以云存储为准，本地文件只是调试兜底
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}
async function lockedWrite(data) {
  const task = writeQueue.then(() => persist(data));
  // 队列本身吞掉错误，保证下一条任务能正常执行；本次错误由调用方 await 捕获
  writeQueue = task.catch(() => {});
  await task;
}

// 判断是否为管理员账号
const DEFAULT = {
  totalUsers: [],
  dailyActive: {},
  errors: [],
  classifyStats: { mood: 0, genre: 0, language: 0, hot: 0, custom: 0 },
  totalClassify: 0,
  feedbacks: [],
  ratings: [],
};

function today() { return new Date().toISOString().slice(0, 10); }

// 从存储读取整个 admin 数据（与 DEFAULT 合并，兼容旧结构缺字段）
function merge(data) {
  return { ...DEFAULT, ...(data || {}) };
}

async function load() {
  if (useRedis) {
    try {
      const raw = await redisGet();
      if (raw) return merge(JSON.parse(raw));
      // Redis 无数据时，尝试把本地文件同步上去（首次迁移）
      if (existsSync(FILE)) {
        const local = merge(JSON.parse(readFileSync(FILE, 'utf-8')));
        persist(local).catch(() => {});
        return local;
      }
      return { ...DEFAULT };
    } catch (e) {
      console.log('[admin] Redis 读取失败，回退本地文件:', e.message);
      if (existsSync(FILE)) {
        try { return merge(JSON.parse(readFileSync(FILE, 'utf-8'))); } catch { return { ...DEFAULT }; }
      }
      return { ...DEFAULT };
    }
  }
  if (!existsSync(FILE)) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(DEFAULT, null, 2));
    return { ...DEFAULT };
  }
  try {
    // 与 DEFAULT 合并，兼容旧结构缺字段（如 feedbacks/ratings）导致 getStats 崩溃
    return merge(JSON.parse(readFileSync(FILE, 'utf-8')));
  }
  catch { return { ...DEFAULT }; }
}

// 所有写操作都走锁，防止并发写损坏 JSON
export async function trackLogin(phone, userId) {
  const data = await load();
  // 扫码登录拿不到手机号时，用 uid 兜底，保证用户不漏计
  const key = phone || (userId ? `uid:${userId}` : '');
  if (!key) return;
  if (!data.totalUsers.includes(key)) data.totalUsers.push(key);
  const d = today();
  if (!data.dailyActive[d]) data.dailyActive[d] = [];
  if (!data.dailyActive[d].includes(key)) data.dailyActive[d].push(key);
  await lockedWrite(data);
}

export async function trackClassify(mode) {
  const data = await load();
  if (data.classifyStats[mode] !== undefined) data.classifyStats[mode]++;
  data.totalClassify++;
  data.dailyActive[today()] = data.dailyActive[today()] || [];
  await lockedWrite(data);
}

export async function trackError(phone, method, url, message) {
  const data = await load();
  data.errors.unshift({ time: new Date().toISOString(), phone, method, url, message });
  if (data.errors.length > 200) data.errors = data.errors.slice(0, 200);
  await lockedWrite(data);
}

let fbId = 0;
export async function trackFeedback(nickname, content) {
  const data = await load();
  // 从已有反馈的最大 id 继续，避免后端重启后 id 重复导致管理员回复错乱
  if (fbId === 0) {
    for (const f of data.feedbacks) if (f.id > fbId) fbId = f.id;
  }
  fbId++;
  data.feedbacks.unshift({ id: fbId, time: new Date().toISOString(), nickname, content, reply: null });
  if (data.feedbacks.length > 200) data.feedbacks = data.feedbacks.slice(0, 200);
  await lockedWrite(data);
  return fbId;
}

export async function replyToFeedback(feedbackId, reply) {
  const data = await load();
  const fb = data.feedbacks.find((f) => f.id === feedbackId);
  if (!fb) return false;
  fb.reply = reply;
  await lockedWrite(data);
  return true;
}

export async function getUserFeedbacks(nickname) {
  const data = await load();
  return data.feedbacks.filter((f) => f.nickname === nickname).slice(0, 50);
}

export async function trackRating(nickname, mode, categories, score, comment) {
  const data = await load();
  data.ratings.unshift({ time: new Date().toISOString(), nickname, mode, categories, score, comment: comment || '' });
  if (data.ratings.length > 500) data.ratings = data.ratings.slice(0, 500);
  await lockedWrite(data);
}

export async function getStats() {
  const data = await load();
  const d = today();
  const todayActive = (data.dailyActive[d] || []).length;
  const sevenDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (data.dailyActive[key]) sevenDays.push(...data.dailyActive[key]);
  }
  return {
    totalUsers: data.totalUsers.length,
    todayActive,
    sevenDayActive: new Set(sevenDays).size,
    totalClassify: data.totalClassify,
    classifyStats: data.classifyStats,
    errors: data.errors.slice(0, 50),
    feedbacks: data.feedbacks.slice(0, 50),
    ratings: data.ratings.slice(0, 50),
  };
}

// 管理者密码验证
export function verifyPassword(password) {
  return password === '1234';
}