import { NextResponse } from 'next/server';
import { adminFromCookieHeader } from '@/lib/admin';
import { getStatsSnapshot } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 后台数据：需要 ltv_admin 会话 */
export async function GET(req: Request) {
  if (!adminFromCookieHeader(req.headers.get('cookie'))) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return NextResponse.json(getStatsSnapshot(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
