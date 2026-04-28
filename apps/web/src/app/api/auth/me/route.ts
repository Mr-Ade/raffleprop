import { NextRequest, NextResponse } from 'next/server';

function decodeJwtPayload(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64').toString('utf8'));
    return {
      id: payload.sub ?? payload.userId,
      fullName: payload.fullName ?? payload.name ?? '',
      email: payload.email ?? '',
      role: (payload.role ?? 'USER') as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('rp_access')?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = decodeJwtPayload(token);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
