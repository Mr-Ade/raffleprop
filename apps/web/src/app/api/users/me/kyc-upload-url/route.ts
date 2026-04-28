import { NextRequest, NextResponse } from 'next/server';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('rp_access')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  const mimeType = req.nextUrl.searchParams.get('mimeType') ?? '';
  const res = await fetch(`${API}/api/users/me/kyc-upload-url?mimeType=${encodeURIComponent(mimeType)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
