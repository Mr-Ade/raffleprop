import { NextRequest, NextResponse } from 'next/server';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function bearer(req: NextRequest) {
  const token = req.cookies.get('rp_access')?.value;
  return token ? `Bearer ${token}` : null;
}

export async function GET(req: NextRequest) {
  const auth = bearer(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  const res = await fetch(`${API}/api/users/me`, { headers: { Authorization: auth } });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

export async function PUT(req: NextRequest) {
  const auth = bearer(req);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${API}/api/users/me`, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
