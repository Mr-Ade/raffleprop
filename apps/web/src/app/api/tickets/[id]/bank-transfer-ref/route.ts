import { NextRequest, NextResponse } from 'next/server';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.cookies.get('rp_access')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const body = await req.text();
  const res = await fetch(`${API}/api/tickets/${id}/bank-transfer-ref`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
