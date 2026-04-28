import { NextRequest, NextResponse } from 'next/server';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.cookies.get('rp_access')?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }

  const res = await fetch(`${API}/api/tickets/${id}/receipt`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };

  if (!res.ok || !json.success || !json.data?.url) {
    const msg = json.error ?? 'Receipt not available.';
    const isNotReady = res.status === 202 || msg.toLowerCase().includes('not yet');
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
      .box{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:2.5rem;max-width:440px;text-align:center}
      h2{margin:0 0 0.75rem;font-size:1.25rem}p{color:#6b7280;font-size:0.9rem;line-height:1.6;margin:0 0 1.5rem}
      a{display:inline-block;padding:0.6rem 1.5rem;background:#0D5E30;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}</style></head>
      <body><div class="box">
      <h2>${isNotReady ? '⏳ Receipt Generating…' : '⚠️ Receipt Unavailable'}</h2>
      <p>${isNotReady ? 'Your receipt PDF is being generated. Please wait a few seconds and try again.' : msg}</p>
      <a href="javascript:history.back()">← Go Back</a>
      </div></body></html>`,
      { status: isNotReady ? 202 : res.status, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Redirect the browser directly to the presigned R2 URL
  return NextResponse.redirect(json.data.url);
}
