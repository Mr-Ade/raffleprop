import { NextRequest, NextResponse } from 'next/server';

const ACCESS_MAX_AGE = 8 * 60 * 60; // 8 hours
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const IS_PROD = process.env['NODE_ENV'] === 'production';

/**
 * POST /api/auth/set-token
 * Called client-side after successful login to store JWT in httpOnly cookies.
 * Body: { accessToken, refreshToken }
 */
export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = await req.json() as {
    accessToken: string;
    refreshToken: string;
  };

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set('rp_access', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: ACCESS_MAX_AGE,
    path: '/',
  });

  res.cookies.set('rp_refresh', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: REFRESH_MAX_AGE,
    path: '/',
  });

  return res;
}

/**
 * POST /api/auth/signout
 * Clears auth cookies and calls the Express logout endpoint.
 */
export async function DELETE(req: NextRequest) {
  const refreshToken = req.cookies.get('rp_refresh')?.value;

  // Tell Express to revoke the refresh token
  if (refreshToken) {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => { /* ignore network error */ });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('rp_access', '', { maxAge: 0, path: '/' });
  res.cookies.set('rp_refresh', '', { maxAge: 0, path: '/' });
  return res;
}
