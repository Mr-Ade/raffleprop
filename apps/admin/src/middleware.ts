import { NextRequest, NextResponse } from 'next/server';

function isValidAdminToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return false;
    return ['ADMIN', 'SUPER_ADMIN'].includes(payload.role ?? '');
  } catch { return false; }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login and API routes through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('rp_admin')?.value;
  if (!token || !isValidAdminToken(token)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
