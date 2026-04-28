import { NextRequest, NextResponse } from 'next/server';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('rp_access')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${API}/api/users/me/password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
