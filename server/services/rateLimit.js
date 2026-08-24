// 简单的内存限流器 + 每日限额（Render 单实例，重启即清零，符合当前无状态部署）
// 注意：单实例内存方案，若未来扩多实例需换 Redis

// 滑动窗口限流：每个 key 每分钟最多 count 次
const windows = new Map();
function rateLimit(key, limit, windowMs = 60000) {
  const now = Date.now();
  const arr = windows.get(key) || [];
  // 清理过期记录
  while (arr.length && arr[0] <= now - windowMs) arr.shift();
  if (arr.length >= limit) return false;
  arr.push(now);
  windows.set(key, arr);
  // 防止 Map 无限增长
  if (windows.size > 10000) {
    for (const [k, v] of windows) {
      const fresh = v.filter((t) => t > now - windowMs);
      if (!fresh.length) windows.delete(k);
      else windows.set(k, fresh);
    }
  }
  return true;
}

// 每日限额：每个 key 每天最多 count 次（按自然日）
const daily = new Map();
function dailyLimit(key, count) {
  const today = new Date().toISOString().slice(0, 10);
  const rec = daily.get(key);
  if (!rec || rec.day !== today) {
    daily.set(key, { day: today, count: 1 });
    return true;
  }
  if (rec.count >= count) return false;
  rec.count++;
  return true;
}

export function getDailyCount(key) {
  const today = new Date().toISOString().slice(0, 10);
  const rec = daily.get(key);
  return rec && rec.day === today ? rec.count : 0;
}

export { rateLimit, dailyLimit };