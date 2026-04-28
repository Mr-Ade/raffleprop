import { NextRequest, NextResponse } from 'next/server';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const R2_BASE = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('rp_access')?.value;
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const purpose = formData.get('purpose') as string | null;
  const entityId = formData.get('entityId') as string | null;
  const indexStr = formData.get('index') as string | null;

  if (!file || !purpose || !entityId) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  // Get presigned URL from Express backend (server-to-server — no browser CORS issue)
  const presignRes = await fetch(`${API}/api/admin/storage/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      purpose,
      entityId,
      mimeType: file.type,
      ...(indexStr !== null ? { index: parseInt(indexStr, 10) } : {}),
    }),
  });
  const presignData = await presignRes.json() as { success: boolean; data?: { uploadUrl: string; key: string }; error?: string };
  if (!presignData.success || !presignData.data) {
    return NextResponse.json({ success: false, error: presignData.error ?? 'Could not get upload URL' }, { status: presignRes.status });
  }

  const { uploadUrl, key } = presignData.data;

  // Upload to R2 from the server — browser never touches R2, no CORS needed
  const fileBuffer = await file.arrayBuffer();
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: fileBuffer,
  });
  if (!uploadRes.ok) {
    return NextResponse.json({ success: false, error: `Storage upload failed (${uploadRes.status})` }, { status: 502 });
  }

  const publicUrl = R2_BASE ? `${R2_BASE}/${key}` : key;
  return NextResponse.json({ success: true, data: { key, publicUrl } });
}
