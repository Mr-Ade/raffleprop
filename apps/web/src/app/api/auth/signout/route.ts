import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('rp_refresh')?.value;
  const accessToken  = req.cookies.get('rp_access')?.value;

  if (refreshToken && accessToken) {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => { /* ignore — cookies are cleared regardless */ });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('rp_access', '', { maxAge: 0, path: '/' });
  res.cookies.set('rp_refresh', '', { maxAge: 0, path: '/' });
  return res;
}
