import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'admin.json');

// 简单的文件写入锁（单实例足够，多实例需换 Redis）
let writeQueue = Promise.resolve();
async function lockedWrite(data) {
  writeQueue = writeQueue.then(() => {
    writeFileSync(FILE, JSON.stringify(data, null, 2));
  });
  await writeQueue;
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

function load() {
  if (!existsSync(FILE)) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(DEFAULT, null, 2));
    return { ...DEFAULT };
  }
  try {
    // 与 DEFAULT 合并，兼容旧结构缺字段（如 feedbacks/ratings）导致 getStats 崩溃
    return { ...DEFAULT, ...JSON.parse(readFileSync(FILE, 'utf-8')) };
  }
  catch { return { ...DEFAULT }; }
}

// 所有写操作都走锁，防止并发写损坏 JSON
export async function trackLogin(phone, userId) {
  const data = load();
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
  const data = load();
  if (data.classifyStats[mode] !== undefined) data.classifyStats[mode]++;
  data.totalClassify++;
  data.dailyActive[today()] = data.dailyActive[today()] || [];
  await lockedWrite(data);
}

export async function trackError(phone, method, url, message) {
  const data = load();
  data.errors.unshift({ time: new Date().toISOString(), phone, method, url, message });
  if (data.errors.length > 200) data.errors = data.errors.slice(0, 200);
  await lockedWrite(data);
}

let fbId = 0;
export async function trackFeedback(nickname, content) {
  const data = load();
  fbId++;
  data.feedbacks.unshift({ id: fbId, time: new Date().toISOString(), nickname, content, reply: null });
  if (data.feedbacks.length > 200) data.feedbacks = data.feedbacks.slice(0, 200);
  await lockedWrite(data);
  return fbId;
}

export async function replyToFeedback(feedbackId, reply) {
  const data = load();
  const fb = data.feedbacks.find((f) => f.id === feedbackId);
  if (!fb) return false;
  fb.reply = reply;
  await lockedWrite(data);
  return true;
}

export function getUserFeedbacks(nickname) {
  const data = load();
  return data.feedbacks.filter((f) => f.nickname === nickname).slice(0, 50);
}

export async function trackRating(nickname, mode, categories, score, comment) {
  const data = load();
  data.ratings.unshift({ time: new Date().toISOString(), nickname, mode, categories, score, comment: comment || '' });
  if (data.ratings.length > 500) data.ratings = data.ratings.slice(0, 500);
  await lockedWrite(data);
}

export function getStats() {
  const data = load();
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