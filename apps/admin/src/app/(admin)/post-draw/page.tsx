'use client';

import { useRef, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default function PostDrawPage() {
  const [drawId, setDrawId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !drawId) return;

    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('drawId', drawId);

    try {
      const res = await fetch(`${API}/api/admin/compliance/cpcb-form`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json() as { success: boolean; error?: string };
      setMsg(data.success ? 'Form CPC B uploaded and cpcbFiledAt timestamp recorded.' : (data.error ?? 'Upload failed.'));
    } catch { setMsg('Network error.'); }
    finally { setUploading(false); }
  }

  return (
    <>
      <div className="admin-topbar">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Post-Draw Filing</h1>
      </div>
      <div className="admin-content">
        <div className="card" style={{ maxWidth: 580 }}>
          <div className="card-header" style={{ fontWeight: 700 }}>Upload Form CPC B (FCCPA §124 — 21-day deadline)</div>
          <div className="card-body">
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid var(--warning)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e' }}>
              Form CPC B must be filed with the FCCPC within 21 days of the draw. Uploading here stores the document in Cloudflare R2 (Object Lock / WORM) and records the filing timestamp.
            </div>

            {msg && (
              <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#166534' }}>{msg}</div>
            )}

            <form onSubmit={upload}>
              <div className="form-group">
                <label className="form-label">Draw ID <span className="required">*</span></label>
                <input type="text" className="form-input" value={drawId} onChange={(e) => setDrawId(e.target.value)} placeholder="UUID of completed draw" required />
              </div>
              <div className="form-group">
                <label className="form-label">Form CPC B (PDF) <span className="required">*</span></label>
                <input ref={fileRef} type="file" accept=".pdf" className="form-input" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading…</> : <><i className="fa-solid fa-upload" /> Upload Form CPC B</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
