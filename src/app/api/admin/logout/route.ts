import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  return res;
}
