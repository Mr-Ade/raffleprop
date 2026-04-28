'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, FormEvent } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  propertyAddress: string;
  propertyState: string;
  propertyLga: string;
  propertyType: string;
  marketValue: string | number;
  reservePrice: string | number;
  ticketPrice: string | number;
  totalTickets: number;
  minTickets: number;
  status: string;
  fccpcRef: string | null;
  lslgaRef: string | null;
  escrowBank: string | null;
  escrowAccountNo: string | null;
  skillQuestion: Record<string, unknown>;
  bundles: unknown[];
  drawDate: string | null;
  drawMethod: string;
  documentKeys: Record<string, string | null> | null;
  featuredImageKey: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DrawInfo {
  id: string;
  status: string;
  winnerTicketId: string | null;
  witnessName: string | null;
  witnessTitle: string | null;
  fccpcNotifiedAt: string | null;
  winnerNotifiedAt: string | null;
  cpcbFiledAt: string | null;
  createdAt: string;
}

interface TicketRow {
  id: string;
  ticketNumber: string;
  userId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: string;
  purchasedAt: string;
  receiptNumber: string;
}

const DOCUMENT_KEYS = [
  { key: 'titleDeed', label: 'Title Deed' },
  { key: 'survey', label: 'Survey Plan' },
  { key: 'fccpcCert', label: 'FCCPC Certificate' },
  { key: 'governorConsent', label: "Governor's Consent" },
  { key: 'cOfO', label: 'Certificate of Occupancy' },
  { key: 'buildingApproval', label: 'Building Approval' },
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray', REVIEW: 'badge-blue', LIVE: 'badge-green',
  CLOSED: 'badge-gray', DRAWN: 'badge-purple', CANCELLED: 'badge-red',
};

const TICKET_STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-gold', SUCCESS: 'badge-green', FAILED: 'badge-red', REFUNDED: 'badge-blue',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params['id'] as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [draw, setDraw] = useState<DrawInfo | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const initialTab = searchParams.get('tab') ?? 'details';
  const [tab, setTab] = useState(initialTab);

  // Edit form state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [form, setForm] = useState({
    title: '', propertyAddress: '', propertyState: '', propertyLga: '',
    propertyType: 'RESIDENTIAL', marketValue: '', reservePrice: '',
    ticketPrice: '', totalTickets: '', minTickets: '',
    escrowBank: '', escrowAccountNo: '',
    fccpcRef: '', lslgaRef: '',
    drawDate: '', drawMethod: 'RANDOM',
    skillQuestion: '',
  });

  // Document upload state
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadOk, setUploadOk] = useState<Record<string, boolean>>({});
  const [uploadErr, setUploadErr] = useState<Record<string, string>>({});

  // Status action state
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadCampaign();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadCampaign() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/campaigns/${id}`, { credentials: 'include' });
      if (!res.ok) { setError('Campaign not found.'); setLoading(false); return; }
      const data = await res.json() as { success: boolean; data: Campaign };
      const c = data.data;
      setCampaign(c);
      setForm({
        title: c.title,
        propertyAddress: c.propertyAddress,
        propertyState: c.propertyState,
        propertyLga: c.propertyLga,
        propertyType: c.propertyType,
        marketValue: String(c.marketValue),
        reservePrice: String(c.reservePrice),
        ticketPrice: String(c.ticketPrice),
        totalTickets: String(c.totalTickets),
        minTickets: String(c.minTickets),
        escrowBank: c.escrowBank ?? '',
        escrowAccountNo: c.escrowAccountNo ?? '',
        fccpcRef: c.fccpcRef ?? '',
        lslgaRef: c.lslgaRef ?? '',
        drawDate: c.drawDate ? c.drawDate.slice(0, 16) : '',
        drawMethod: c.drawMethod,
        skillQuestion: JSON.stringify(c.skillQuestion, null, 2),
      });
    } catch { setError('Failed to load campaign.'); }
    finally { setLoading(false); }
  }

  async function loadDraw() {
    try {
      const res = await fetch(`${API}/api/admin/draws/${id}/status`, { credentials: 'include' });
      if (res.ok) { const d = await res.json() as { data: DrawInfo }; setDraw(d.data); }
    } catch { /* draw may not exist yet */ }
  }

  async function loadTickets() {
    try {
      const res = await fetch(`${API}/api/admin/campaigns/${id}/tickets`, { credentials: 'include' });
      if (res.ok) { const d = await res.json() as { data: TicketRow[] }; setTickets(d.data ?? []); }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (tab === 'draw') loadDraw();
    if (tab === 'tickets') loadTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function setField(k: keyof typeof form, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaveOk(false);
    try {
      let skillQuestion: unknown;
      try { skillQuestion = JSON.parse(form.skillQuestion); } catch { setSaveError('Invalid skill question JSON.'); setSaving(false); return; }
      const res = await fetch(`${API}/api/admin/campaigns/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          marketValue: parseFloat(form.marketValue),
          reservePrice: parseFloat(form.reservePrice),
          ticketPrice: parseFloat(form.ticketPrice),
          totalTickets: parseInt(form.totalTickets),
          minTickets: parseInt(form.minTickets),
          drawDate: form.drawDate ? new Date(form.drawDate).toISOString() : null,
          skillQuestion,
        }),
      });
      const data = await res.json() as { success: boolean; data?: Campaign; error?: string };
      if (!res.ok || !data.success) { setSaveError(data.error ?? 'Failed to save.'); return; }
      setCampaign(data.data!);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch { setSaveError('Network error.'); }
    finally { setSaving(false); }
  }

  async function handleUploadDocument(docKey: string, file: File) {
    setUploading((p) => ({ ...p, [docKey]: true }));
    setUploadErr((p) => ({ ...p, [docKey]: '' }));
    setUploadOk((p) => ({ ...p, [docKey]: false }));
    try {
      // Get presigned URL
      const presignRes = await fetch(`${API}/api/admin/campaigns/${id}/documents/presign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docKey, fileName: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) { setUploadErr((p) => ({ ...p, [docKey]: 'Failed to get upload URL.' })); return; }
      const { uploadUrl, objectKey } = await presignRes.json() as { uploadUrl: string; objectKey: string };

      // Upload directly to R2
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!uploadRes.ok) { setUploadErr((p) => ({ ...p, [docKey]: 'Upload failed.' })); return; }

      // Confirm key stored in DB
      const confirmRes = await fetch(`${API}/api/admin/campaigns/${id}/documents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docKey, objectKey }),
      });
      if (!confirmRes.ok) { setUploadErr((p) => ({ ...p, [docKey]: 'Upload succeeded but DB update failed.' })); return; }
      setUploadOk((p) => ({ ...p, [docKey]: true }));
      await loadCampaign();
    } catch { setUploadErr((p) => ({ ...p, [docKey]: 'Upload error.' })); }
    finally { setUploading((p) => ({ ...p, [docKey]: false })); }
  }

  async function handleStatusAction(action: 'submit-review' | 'publish' | 'cancel' | 'close') {
    setActioning(true); setActionError('');
    const endpoint = action === 'publish' ? `/api/admin/campaigns/${id}/publish`
      : action === 'submit-review' ? `/api/admin/campaigns/${id}/review`
      : action === 'cancel' ? `/api/admin/campaigns/${id}/cancel`
      : `/api/admin/campaigns/${id}/close`;
    try {
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', credentials: 'include' });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) { setActionError(data.error ?? 'Action failed.'); return; }
      await loadCampaign();
    } catch { setActionError('Network error.'); }
    finally { setActioning(false); }
  }

  async function handleInitiateDraw() {
    setActioning(true); setActionError('');
    try {
      const witnessName = prompt('Witness full name:');
      if (!witnessName) { setActioning(false); return; }
      const witnessTitle = prompt('Witness title / role:');
      if (!witnessTitle) { setActioning(false); return; }
      const res = await fetch(`${API}/api/admin/draws/${id}/initiate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ witnessName, witnessTitle }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) { setActionError(data.error ?? 'Draw initiation failed.'); return; }
      await loadDraw();
    } catch { setActionError('Network error.'); }
    finally { setActioning(false); }
  }

  async function handleCompleteDraw() {
    if (!confirm('Complete the draw now? This action is irreversible.')) return;
    setActioning(true); setActionError('');
    try {
      const res = await fetch(`${API}/api/admin/draws/${id}/complete`, { method: 'POST', credentials: 'include' });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) { setActionError(data.error ?? 'Draw completion failed.'); return; }
      await loadDraw();
      await loadCampaign();
    } catch { setActionError('Network error.'); }
    finally { setActioning(false); }
  }

  if (loading) return (
    <>
      <div className="admin-topbar"><h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Campaign</h1></div>
      <div className="admin-content"><div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem' }} /></div></div>
    </>
  );

  if (error || !campaign) return (
    <>
      <div className="admin-topbar"><h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Campaign</h1></div>
      <div className="admin-content"><div style={{ padding: '2rem', color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)' }}>{error || 'Campaign not found.'}</div></div>
    </>
  );

  const docs = campaign.documentKeys ?? {};

  return (
    <>
      <div className="admin-topbar" style={{ gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <button onClick={() => router.push('/campaigns')} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign.title}</h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>ID: {campaign.id}</div>
          </div>
          <span className={`badge ${STATUS_BADGE[campaign.status] ?? 'badge-gray'}`} style={{ flexShrink: 0 }}>{campaign.status}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {campaign.status === 'DRAFT' && <button className="btn btn-outline btn-sm" disabled={actioning} onClick={() => handleStatusAction('submit-review')}>Submit for Review</button>}
          {campaign.status === 'REVIEW' && <button className="btn btn-primary btn-sm" disabled={actioning} onClick={() => handleStatusAction('publish')}><i className="fa-solid fa-rocket" /> Publish</button>}
          {campaign.status === 'LIVE' && <button className="btn btn-outline btn-sm" disabled={actioning} onClick={() => handleStatusAction('close')}>Close</button>}
          {['DRAFT', 'REVIEW', 'LIVE'].includes(campaign.status) && (
            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }} disabled={actioning} onClick={() => handleStatusAction('cancel')}>Cancel</button>
          )}
        </div>
      </div>

      {actionError && <div style={{ margin: '0 1.5rem', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#991b1b' }}>{actionError}</div>}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border-light)', padding: '0 1.5rem', display: 'flex', gap: '0' }}>
        {[
          { key: 'details', label: 'Campaign Details', icon: 'fa-pen' },
          { key: 'documents', label: 'Documents', icon: 'fa-file-arrow-up' },
          { key: 'draw', label: 'Draw', icon: 'fa-trophy' },
          { key: 'tickets', label: 'Tickets', icon: 'fa-ticket' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.875rem 1.125rem',
              fontSize: '0.875rem',
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? 'var(--green-primary)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--green-primary)' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              whiteSpace: 'nowrap',
            }}
          >
            <i className={`fa-solid ${t.icon}`} style={{ fontSize: '0.8125rem' }} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-content">

        {/* ── TAB: Details ── */}
        {tab === 'details' && (
          <div className="card" style={{ maxWidth: 800 }}>
            <div className="card-body">
              {saveError && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>{saveError}</div>}
              {saveOk && <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#15803d' }}><i className="fa-solid fa-check" /> Changes saved successfully.</div>}
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Campaign Title <span className="required">*</span></label>
                    <input className="form-input" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Property Address <span className="required">*</span></label>
                    <input className="form-input" value={form.propertyAddress} onChange={(e) => setField('propertyAddress', e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State <span className="required">*</span></label>
                    <input className="form-input" value={form.propertyState} onChange={(e) => setField('propertyState', e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">LGA <span className="required">*</span></label>
                    <input className="form-input" value={form.propertyLga} onChange={(e) => setField('propertyLga', e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Property Type</label>
                    <select className="form-select" value={form.propertyType} onChange={(e) => setField('propertyType', e.target.value)}>
                      {['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'MIXED_USE'].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Draw Method</label>
                    <select className="form-select" value={form.drawMethod} onChange={(e) => setField('drawMethod', e.target.value)}>
                      <option value="RANDOM">Random (CSPRNG)</option>
                      <option value="RANDOM_ORG_VERIFIED">Random.org Verified</option>
                    </select>
                  </div>

                  {([
                    { k: 'marketValue', label: 'Market Value (₦)' },
                    { k: 'reservePrice', label: 'Reserve Price (₦)' },
                    { k: 'ticketPrice', label: 'Ticket Price (₦)' },
                    { k: 'totalTickets', label: 'Total Tickets' },
                    { k: 'minTickets', label: 'Min. Tickets (for draw)' },
                  ] as { k: keyof typeof form; label: string }[]).map((f) => (
                    <div key={f.k} className="form-group">
                      <label className="form-label">{f.label} <span className="required">*</span></label>
                      <input type="number" className="form-input" value={form[f.k]} onChange={(e) => setField(f.k, e.target.value)} required />
                    </div>
                  ))}

                  <div className="form-group">
                    <label className="form-label">Escrow Bank</label>
                    <input className="form-input" value={form.escrowBank} onChange={(e) => setField('escrowBank', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Escrow Account No.</label>
                    <input className="form-input" value={form.escrowAccountNo} onChange={(e) => setField('escrowAccountNo', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">FCCPC Reference</label>
                    <input className="form-input" value={form.fccpcRef} onChange={(e) => setField('fccpcRef', e.target.value)} placeholder="e.g. FCCPC/2024/LP/001" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">LSLGA Reference</label>
                    <input className="form-input" value={form.lslgaRef} onChange={(e) => setField('lslgaRef', e.target.value)} placeholder="State lottery board ref" />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Scheduled Draw Date</label>
                    <input type="datetime-local" className="form-input" value={form.drawDate} onChange={(e) => setField('drawDate', e.target.value)} />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Skill Question (JSON) <span className="required">*</span></label>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={form.skillQuestion}
                      onChange={(e) => setField('skillQuestion', e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                    />
                    <p className="form-hint">Format: {`{"question":"...","options":["a","b","c","d"],"correctIndex":0}`}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : <><i className="fa-solid fa-floppy-disk" /> Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB: Documents ── */}
        {tab === 'documents' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {DOCUMENT_KEYS.map(({ key, label }) => {
              const existingKey = docs[key];
              return (
                <div key={key} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{label}</div>
                      {existingKey
                        ? <span className="badge badge-green"><i className="fa-solid fa-check" /> Uploaded</span>
                        : <span className="badge badge-gray">Missing</span>
                      }
                    </div>
                    {existingKey && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
                        {existingKey}
                      </div>
                    )}
                    {uploadOk[key] && <div style={{ fontSize: '0.8125rem', color: '#15803d', marginBottom: '0.5rem' }}><i className="fa-solid fa-check" /> Upload successful</div>}
                    {uploadErr[key] && <div style={{ fontSize: '0.8125rem', color: '#991b1b', marginBottom: '0.5rem' }}>{uploadErr[key]}</div>}
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '0.5rem', border: '1px solid var(--border-main)', borderRadius: 'var(--radius)',
                        cursor: uploading[key] ? 'wait' : 'pointer', fontSize: '0.875rem',
                        background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {uploading[key]
                        ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading…</>
                        : <><i className="fa-solid fa-file-arrow-up" /> {existingKey ? 'Replace' : 'Upload'} PDF</>
                      }
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        style={{ display: 'none' }}
                        disabled={uploading[key]}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocument(key, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: Draw ── */}
        {tab === 'draw' && (
          <div style={{ maxWidth: 640 }}>
            {actionError && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem', color: '#991b1b' }}>{actionError}</div>}

            {/* Draw status card */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header" style={{ fontWeight: 700 }}>Draw Status</div>
              <div className="card-body">
                {!draw ? (
                  <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No draw initiated yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {[
                      { label: 'Status', value: draw.status },
                      { label: 'Witness', value: draw.witnessName ? `${draw.witnessName} (${draw.witnessTitle})` : '—' },
                      { label: 'Winner Ticket ID', value: draw.winnerTicketId ?? '—' },
                      { label: 'FCCPC Notified', value: draw.fccpcNotifiedAt ? new Date(draw.fccpcNotifiedAt).toLocaleString('en-NG') : '—' },
                      { label: 'Winner Notified', value: draw.winnerNotifiedAt ? new Date(draw.winnerNotifiedAt).toLocaleString('en-NG') : '—' },
                      { label: 'Form CPC B Filed', value: draw.cpcbFiledAt ? new Date(draw.cpcbFiledAt).toLocaleString('en-NG') : '—' },
                    ].map((r) => (
                      <div key={r.label} className="spec-row">
                        <span className="spec-key">{r.label}</span>
                        <span className="spec-val">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {campaign.status === 'LIVE' && !draw && (
              <div className="card">
                <div className="card-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Initiating the draw requires a witnessed session. You will be prompted for the witness&apos;s name and title. Ensure minimum ticket threshold has been met before proceeding.
                  </p>
                  <button className="btn btn-primary" disabled={actioning} onClick={handleInitiateDraw}>
                    <i className="fa-solid fa-play" /> Initiate Draw
                  </button>
                </div>
              </div>
            )}

            {draw?.status === 'SCHEDULED' && (
              <div className="card">
                <div className="card-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    The draw is scheduled. Click <strong>Complete Draw</strong> to execute the CSPRNG selection and record the winner. This action is <strong>irreversible</strong>.
                  </p>
                  <button className="btn btn-primary" disabled={actioning} onClick={handleCompleteDraw}>
                    <i className="fa-solid fa-trophy" /> Complete Draw
                  </button>
                </div>
              </div>
            )}

            {draw?.status === 'COMPLETED' && (
              <div className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#dcfce7', borderRadius: 'var(--radius)' }}>
                    <i className="fa-solid fa-circle-check" style={{ color: '#15803d', fontSize: '1.25rem' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#15803d' }}>Draw Completed</div>
                      <div style={{ fontSize: '0.8125rem', color: '#166534', marginTop: '0.125rem' }}>
                        Winner ticket: <strong>{draw.winnerTicketId}</strong>. Upload Form CPC B in the Post-Draw Compliance section.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Tickets ── */}
        {tab === 'tickets' && (
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>User ID</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Receipt #</th>
                    <th>Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tickets sold yet</td></tr>
                  ) : tickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{t.ticketNumber}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.userId.slice(0, 8)}…</td>
                      <td>{t.quantity}</td>
                      <td>₦{Number(t.unitPrice).toLocaleString()}</td>
                      <td>₦{Number(t.totalAmount).toLocaleString()}</td>
                      <td><span className={`badge ${TICKET_STATUS_BADGE[t.paymentStatus] ?? 'badge-gray'}`}>{t.paymentStatus}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{t.receiptNumber}</td>
                      <td>{new Date(t.purchasedAt).toLocaleDateString('en-NG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
