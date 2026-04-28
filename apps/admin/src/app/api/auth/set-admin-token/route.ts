import { NextRequest, NextResponse } from 'next/server';

const IS_PROD = process.env['NODE_ENV'] === 'production';

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = await req.json() as {
    accessToken: string;
    refreshToken: string;
  };

  if (!accessToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('rp_admin', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours for admin sessions
    path: '/',
  });
  if (refreshToken) {
    res.cookies.set('rp_admin_refresh', refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
  }
  return res;
}
