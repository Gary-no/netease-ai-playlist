import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'admin.json');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234abcdGary';

// 默认数据结构
const DEFAULT = {
  totalUsers: [],       // 手机号列表（去重）
  dailyActive: {},      // { "2026-08-23": ["138xxx", ...] }
  errors: [],           // [{ time, phone, userId, method, url, message }]
  classifyStats: {      // 各维度使用次数
    mood: 0,
    genre: 0,
    language: 0,
    hot: 0,
    custom: 0,
  },
  totalClassify: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  if (!existsSync(FILE)) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(DEFAULT, null, 2));
    return { ...DEFAULT };
  }
  try {
    return JSON.parse(readFileSync(FILE, 'utf-8'));
  } catch {
    return { ...DEFAULT };
  }
}

function save(data) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// 记录用户登录
export function trackLogin(phone, userId) {
  const data = load();
  if (phone && !data.totalUsers.includes(phone)) {
    data.totalUsers.push(phone);
  }
  const d = today();
  if (!data.dailyActive[d]) data.dailyActive[d] = [];
  if (phone && !data.dailyActive[d].includes(phone)) {
    data.dailyActive[d].push(phone);
  }
  save(data);
}

// 记录分类
export function trackClassify(mode) {
  const data = load();
  if (data.classifyStats[mode] !== undefined) {
    data.classifyStats[mode]++;
  }
  data.totalClassify++;
  // 记录活跃
  data.dailyActive[today()] = data.dailyActive[today()] || [];
  save(data);
}

// 记录错误
export function trackError(phone, method, url, message) {
  const data = load();
  data.errors.unshift({ time: new Date().toISOString(), phone, method, url, message });
  if (data.errors.length > 200) data.errors = data.errors.slice(0, 200);
  save(data);
}

// 获取统计数据
export function getStats() {
  const data = load();
  const d = today();
  const todayActive = (data.dailyActive[d] || []).length;
  // 7 日活跃
  const sevenDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (data.dailyActive[key]) {
      sevenDays.push(...data.dailyActive[key]);
    }
  }
  const sevenDayActive = new Set(sevenDays).size;

  return {
    totalUsers: data.totalUsers.length,
    todayActive,
    sevenDayActive,
    totalClassify: data.totalClassify,
    classifyStats: data.classifyStats,
    errors: data.errors.slice(0, 50),
  };
}

// 验证管理员密码
export function verifyPassword(password) {
  return password === ADMIN_PASSWORD;
}