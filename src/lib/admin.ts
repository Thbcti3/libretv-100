import crypto from 'node:crypto';

/**
 * 管理员鉴权：独立于站点访问密码（PASSWORD），
 * 使用单独的 cookie `ltv_admin` 与独立密钥派生的 HMAC 签名。
 * 账号密码来自环境变量 ADMIN_USER / ADMIN_PASSWORD，未配置时使用内置默认值。
 */

export const ADMIN_COOKIE = 'ltv_admin';
const ADMIN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

export function getAdminUser(): string {
  return process.env.ADMIN_USER || '1362280';
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'Aa230702';
}

function secret(): string {
  return crypto
    .createHash('sha256')
    .update(`${getAdminUser()}:${getAdminPassword()}:libretv::admin-salt`)
    .digest('hex');
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function signAdminSession(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + ADMIN_TTL_MS;
  const payload = String(expiresAt);
  return { token: `${payload}.${hmac(payload)}`, expiresAt };
}

export function verifyAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const expiresAt = parseInt(payload, 10);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() < expiresAt;
}

/** 恒定时间比较账号 / 密码 */
export function checkAdminCredentials(user: string, password: string): boolean {
  const a1 = crypto.createHash('sha256').update(user).digest();
  const b1 = crypto.createHash('sha256').update(getAdminUser()).digest();
  const a2 = crypto.createHash('sha256').update(password).digest();
  const b2 = crypto.createHash('sha256').update(getAdminPassword()).digest();
  return crypto.timingSafeEqual(a1, b1) && crypto.timingSafeEqual(a2, b2);
}

export function adminFromCookieHeader(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  for (const c of cookieHeader.split(';')) {
    const eq = c.indexOf('=');
    if (eq === -1) continue;
    if (c.slice(0, eq).trim() === ADMIN_COOKIE) {
      return verifyAdminSession(decodeURIComponent(c.slice(eq + 1).trim()));
    }
  }
  return false;
}

// 管理员登录限速（内存实现，单实例足够）
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (e.count >= MAX_ATTEMPTS) return false;
  e.count += 1;
  return true;
}

export function clearAdminRateLimit(ip: string): void {
  attempts.delete(ip);
}

if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, e] of attempts) if (now > e.resetAt) attempts.delete(ip);
  }, 60 * 1000);
  if (typeof timer.unref === 'function') timer.unref();
}
