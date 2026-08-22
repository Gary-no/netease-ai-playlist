import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 使用 cookies_store.json：早期 cookies.json 曾因文件锁/残留 mock 数据需要换名绕开
const STORE_FILE = path.join(__dirname, '../data/cookies_store.json');

/**
 * Cookie 存储（演示实现）
 * - 用 sessionId 关联用户，Cookie AES-256-GCM 加密后落盘
 * - 生产环境请替换为 Redis（带过期时间）或数据库，密钥走 KMS
 */
class CookieStore {
  constructor() {
    this.data = {};
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        this.data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      }
    } catch {
      this.data = {};
    }
  }

  _persist() {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2));
  }

  _key() {
    return crypto.createHash('sha256').update(config.cookieSecret).digest();
  }

  _encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this._key(), iv);
    const enc = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
  }

  _decrypt(payload) {
    const [ivHex, tagHex, encHex] = payload.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this._key(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf-8');
  }

  set(sessionId, cookie, profile) {
    this.data[sessionId] = {
      cookie: this._encrypt(cookie),
      profile,
      updatedAt: Date.now(),
    };
    this._persist();
  }

  get(sessionId) {
    const record = this.data[sessionId];
    if (!record) return null;
    return { ...record, cookie: this._decrypt(record.cookie) };
  }

  delete(sessionId) {
    delete this.data[sessionId];
    this._persist();
  }
}

export const cookieStore = new CookieStore();
