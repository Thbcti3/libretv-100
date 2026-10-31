import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkAdminCredentials, checkAdminRateLimit, clearAdminRateLimit, signAdminSession } from '@/lib/admin';

export const runtime = 'nodejs';

function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  const ip = (xf ? xf.split(',')[0] : req.headers.get('x-real-ip')) || 'local';
  return ip.trim();
}

/** 管理员登录：账号 + 密码 → 下发独立的 ltv_admin cookie */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkAdminRateLimit(ip)) {
    return NextResponse.json({ success: false, error: '尝试次数过多，请 10 分钟后再试' }, { status: 429 });
  }

  let body: { user?: string; password?: string };
  try {
    body = (await req.json()) as { user?: string; password?: string };
  } catch {
    return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 });
  }

  if (!checkAdminCredentials(String(body.user ?? ''), String(body.password ?? ''))) {
    return NextResponse.json({ success: false, error: '账号或密码错误' }, { status: 401 });
  }

  clearAdminRateLimit(ip);
  const { token, expiresAt } = signAdminSession();
  const secure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' &&
      (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim() === 'https');

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.floor((expiresAt - Date.now()) / 1000),
  });
  return res;
}
