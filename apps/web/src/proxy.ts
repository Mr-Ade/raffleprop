import { NextRequest, NextResponse } from 'next/server';

const USER_PROTECTED_PREFIXES = [
  '/dashboard', '/tickets', '/profile', '/ndpr', '/referrals',
  '/notifications', '/transactions', '/winner', '/terms-log',
];

const ADMIN_PREFIXES = ['/admin'];

function decodeToken(token: string): { exp?: number; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  const now = Math.floor(Date.now() / 1000);
  return !payload.exp || payload.exp > now;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('rp_access')?.value;

  // ── Admin routes ──────────────────────────────────────────────────────────
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAdminRoute) {
    if (!token || !isTokenValid(token)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const payload = decodeToken(token);
    if (payload?.role !== 'ADMIN' && payload?.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // ── User portal routes ────────────────────────────────────────────────────
  const isUserProtected = USER_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isUserProtected) {
    if (!token || !isTokenValid(token)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/tickets/:path*',
    '/profile/:path*',
    '/ndpr/:path*',
    '/referrals/:path*',
    '/notifications/:path*',
    '/transactions/:path*',
    '/winner/:path*',
    '/terms-log/:path*',
  ],
};
