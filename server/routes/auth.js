import { Router } from 'express';
import { neteaseApi } from '../services/netease.js';
import { cookieStore } from '../services/cookieStore.js';

const router = Router();

// ---------- 扫码登录三步曲 ----------

// ① 获取二维码 unikey
router.get('/qr/key', async (req, res) => {
  try {
    const unikey = await neteaseApi.getQrKey();
    res.json({ unikey });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ② 生成二维码图片（前端拿到 base64 直接展示）
router.get('/qr/create', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: '缺少 key 参数' });
    const data = await neteaseApi.createQr(key);
    res.json(data); // { qrimg: 'data:image/png;base64,...', qrurl }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ③ 轮询扫码状态（前端每 2s 调一次）
//    code: 800=过期 801=等待扫码 802=已扫码待确认 803=登录成功
router.get('/qr/check', async (req, res) => {
  try {
    const { key, sessionId: qSessionId } = req.query;
    const sessionId = req.headers['x-session-id'] || qSessionId;
    if (!key || !sessionId) return res.status(400).json({ error: '缺少 key/sessionId 参数' });

    const result = await neteaseApi.checkQr(key);

    // 扫码成功：校验登录态，加密保存 Cookie，返回用户信息
    if (result.code === 803) {
      console.log(`[auth/qr/check] 803 登录成功, cookie长度=${result.cookie ? result.cookie.length : 0}`);
      if (!result.cookie) {
        // 罕见情况：接口返回 803 但无 cookie，无法建立会话
        return res.json({ ...result, loginWarn: '扫码成功但未获取到登录凭证，请重新扫码' });
      }
      let profile = { userId: null, nickname: '网易云用户', avatarUrl: '' };
      try {
        const statusData = await neteaseApi.loginStatus(result.cookie);
        profile = {
          userId: statusData.account?.id ?? statusData.profile?.userId,
          nickname: statusData.profile?.nickname || '网易云用户',
          avatarUrl: statusData.profile?.avatarUrl || '',
        };
      } catch (err) {
        // 登录态查询失败不阻断登录：cookie 照常保存，前端会收到 803
        console.log('[auth/qr/check] loginStatus 失败:', err.message);
      }
      cookieStore.set(sessionId, result.cookie, profile);
      res.json({ ...result, profile, loginWarn: profile.userId ? undefined : '登录态获取失败，请重新扫码' });
    } else {
      res.json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- 登录态 ----------

// 查询当前 session 的登录状态
router.get('/me', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const record = sessionId && cookieStore.get(sessionId);
  res.json({ loggedIn: !!record, profile: record?.profile || null });
});

// 发送手机验证码
router.post('/captcha/sent', async (req, res) => {
  const { phone } = req.body || {};
  if (!phone || !/^1\d{10}$/.test(String(phone))) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }
  // 提取客户端真实 IP，透传给网易云以按“用户 IP”限流
  // X-Forwarded-For 可能是 "client, proxy1, proxy2"，取首个即为客户端
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = forwarded
    ? String(forwarded).split(',')[0].trim()
    : req.headers['x-real-ip'] || req.ip || '';
  // 仅透传合法的 IPv4/IPv6，忽略未知或内网占位
  const realIP =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(rawIp) || rawIp.includes(':') ? rawIp : undefined;
  try {
    const data = await neteaseApi.sendCaptcha(phone, realIP ? { realIP } : {});
    // 保持与前端 sendCaptcha 期望一致：透传 code/message
    // 406 频繁 / 505 未知号码 等由前端展示，不在此统一 500
    if (data.code && data.code !== 200) {
      return res.status(200).json({ code: data.code, message: data.message || data.msg || '发送失败' });
    }
    res.json({ code: data.code, message: data.message || '验证码已发送' });
  } catch (e) {
    res.status(500).json({ error: e.message || '发送验证码失败' });
  }
});

// 手机验证码登录
router.post('/cellphone', async (req, res) => {
  const { phone, captcha } = req.body || {};
  if (!phone || !captcha) {
    return res.status(400).json({ error: '请输入手机号和验证码' });
  }
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(400).json({ error: '缺少会话标识' });

  try {
    const data = await neteaseApi.loginByCellphone(phone, captcha);
    if (data.code !== 200 || !data.cookie) {
      return res.status(400).json({ error: data.message || data.msg || '验证码错误或已过期' });
    }
    const profile = {
      userId: data.account?.id ?? data.profile?.userId,
      nickname: data.profile?.nickname || '网易云用户',
      avatarUrl: data.profile?.avatarUrl || '',
    };
    cookieStore.set(sessionId, data.cookie, profile);
    res.json({ profile });
  } catch (e) {
    res.status(500).json({ error: e.message || '登录失败' });
  }
});

// 退出登录
router.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) cookieStore.delete(sessionId);
  res.json({ success: true });
});

export default router;
