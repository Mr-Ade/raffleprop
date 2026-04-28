'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type WinnerTicket = {
  ticketNumber: string;
  user: { fullName: string; phone: string };
};

type DrawRecord = {
  id: string;
  status: string;
  winnerNotifiedAt: string | null;
  winnerAcknowledgedAt: string | null;
  cpcbFiledAt: string | null;
  cpcbAcknowledgedAt: string | null;
  cpcbFormKey: string | null;
  claimIdentityVerifiedAt: string | null;
  claimAcceptanceSignedAt: string | null;
  claimKycCompletedAt: string | null;
  claimTransferCompletedAt: string | null;
  claimKeysHandedAt: string | null;
  winnerTicket: WinnerTicket | null;
};

type Campaign = {
  id: string;
  title: string;
  propertyState: string;
  propertyLga: string;
  fccpcRef: string | null;
  drawDate: string | null;
  status: string;
  draw: DrawRecord | null;
};

type WinnerStory = {
  id: string;
  winnerName: string;
  propertyTitle: string;
  propertyState: string | null;
  prize: string | null;
  blurb: string | null;
  drawArchiveUrl: string | null;
  featured: boolean;
  published: boolean;
  drawDate: string | null;
};

type ClaimDocument = {
  id: string;
  step: number;
  name: string;
  description: string | null;
  requiresPhysical: boolean;
  storageKey: string | null;
  mimeType: string | null;
  originalFileName: string | null;
  uploadedAt: string | null;
  uploadedByRole: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
};

// ─── Static data ──────────────────────────────────────────────────────────────

const CPCB_FIELDS: [string, string][] = [
  ['Promoter Name & Address', 'RaffleProp Ltd, 14 Admiralty Way, Lekki Phase 1'],
  ['FCCPC Approval Reference', 'Required — from campaign record'],
  ['Campaign Title & Description', 'Property campaign details'],
  ['Draw Date, Venue & Method', 'As recorded in draw manager'],
  ['Total Tickets Sold', 'From ticket registry'],
  ['Gross Revenue Collected', 'From revenue dashboard'],
  ['Winner Details (Name, Address, Phone)', 'From winner verification portal'],
  ['Prize Description & Certified Value', 'NIESV valuation'],
  ['FCCPC Monitor Present (Name & Sig)', 'From draw manager records'],
  ['RNG Method & Seed Hash', 'From draw manager records'],
  ['Escrow Release Confirmation', 'From escrow bank'],
  ['Promotional Status', 'Completed / Did Not Proceed'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(dateStr: string, offsetDays: number): number {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offsetDays);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type DeadlineState = 'overdue' | 'urgent' | 'ok' | 'filed';

function deadlineState(drawDate: string | null, offsetDays: number, filed: boolean): DeadlineState {
  if (filed) return 'filed';
  if (!drawDate) return 'ok';
  const days = daysFromNow(drawDate, offsetDays);
  if (days < 0) return 'overdue';
  if (days <= 2) return 'urgent';
  return 'ok';
}

function DeadlineBadge({ drawDate, offsetDays, filed, filedLabel = 'Filed' }: { drawDate: string | null; offsetDays: number; filed: boolean; filedLabel?: string }) {
  const state = deadlineState(drawDate, offsetDays, filed);
  if (state === 'filed') return <span className="badge badge-green"><i className="fa-solid fa-check" style={{ marginRight: '0.3rem' }} />{filedLabel}</span>;
  if (!drawDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>;
  const days = daysFromNow(drawDate, offsetDays);
  if (state === 'overdue') return <span className="deadline-badge deadline-overdue">OVERDUE</span>;
  if (state === 'urgent') return <span className="deadline-badge deadline-urgent">Due in {days} day{days !== 1 ? 's' : ''}</span>;
  return <span className="deadline-badge deadline-ok">Due in {days} day{days !== 1 ? 's' : ''}</span>;
}

function isOverdue(drawDate: string | null, offsetDays: number, filed: boolean): boolean {
  return deadlineState(drawDate, offsetDays, filed) === 'overdue';
}

function isDueSoon(drawDate: string | null, offsetDays: number, filed: boolean, days = 7): boolean {
  if (filed || !drawDate) return false;
  const d = daysFromNow(drawDate, offsetDays);
  return d >= 0 && d <= days;
}

// ─── Workflow step ─────────────────────────────────────────────────────────────

function WorkflowStep({ num, state, title, children }: { num: number; state: 'done' | 'active' | 'pending'; title: string; children?: React.ReactNode }) {
  const numStyle: React.CSSProperties = {
    width: '2rem', height: '2rem', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '0.875rem', flexShrink: 0,
    background: state === 'done' ? 'var(--green-50)' : state === 'active' ? 'var(--gold)' : 'var(--border)',
    color: state === 'done' ? 'var(--green-primary)' : state === 'active' ? '#fff' : 'var(--text-muted)',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', borderRadius: 10, background: 'var(--bg-secondary)', marginBottom: '0.75rem', opacity: state === 'pending' ? 0.5 : 1 }}>
      <div style={numStyle}>{num}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PostDrawClient({ token, apiUrl }: { token: string; apiUrl: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const workflowRef = useRef<HTMLDivElement>(null);

  // Claim documents
  const [docs, setDocs] = useState<ClaimDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [addDocForm, setAddDocForm] = useState({ name: '', description: '', step: 1, requiresPhysical: false });
  const [addDocError, setAddDocError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadInput, setUploadInput] = useState<{ [docId: string]: File | null }>({});

  // Winner story
  const [winnerStory, setWinnerStory] = useState<WinnerStory | null>(null);
  const [storyForm, setStoryForm] = useState({ blurb: '', drawArchiveUrl: '', prize: '', featured: false });
  const [storySaving, setStorySaving] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storySuccess, setStorySuccess] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/draws`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setCampaigns(r.data as Campaign[]);
        else setError(r.error ?? 'Failed to load draws');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [apiUrl, token]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  const fetchDocs = useCallback(async (campaignId: string) => {
    setDocsLoading(true);
    try {
      const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/claim-documents`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json());
      if (r.success) setDocs(r.data as ClaimDocument[]);
    } catch { /* ignore */ } finally { setDocsLoading(false); }
  }, [apiUrl, token]);

  const fetchWinnerStory = useCallback(async (campaignId: string) => {
    try {
      const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/winner-story`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json());
      if (r.success && r.data) {
        const s = r.data as WinnerStory;
        setWinnerStory(s);
        setStoryForm({ blurb: s.blurb ?? '', drawArchiveUrl: s.drawArchiveUrl ?? '', prize: s.prize ?? '', featured: s.featured });
      } else {
        setWinnerStory(null);
        setStoryForm({ blurb: '', drawArchiveUrl: '', prize: '', featured: false });
      }
    } catch { /* ignore */ }
  }, [apiUrl, token]);

  function selectCampaign(id: string) {
    setSelectedId(id);
    setDocs([]);
    setAddDocOpen(false);
    setStoryError(null);
    setStorySuccess(false);
    fetchDocs(id);
    fetchWinnerStory(id);
    setTimeout(() => workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function advanceClaim(campaignId: string, step: number) {
    const key = `claim-${step}`;
    setActionLoading(key);
    setActionError(null);
    try {
      const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/advance-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ step }),
      }).then((res) => res.json());
      if (!r.success) { setActionError(r.error ?? 'Action failed'); return; }
      const updated = r.data as Partial<DrawRecord>;
      setCampaigns((prev) => prev.map((c) =>
        c.id === campaignId ? { ...c, draw: c.draw ? { ...c.draw, ...updated } : c.draw } : c,
      ));
    } catch {
      setActionError('Network error — please try again');
    } finally {
      setActionLoading(null);
    }
  }

  async function addDoc(campaignId: string) {
    if (!addDocForm.name.trim()) { setAddDocError('Name is required'); return; }
    setAddDocError(null);
    const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/claim-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(addDocForm),
    }).then((res) => res.json());
    if (!r.success) { setAddDocError(r.error ?? 'Failed'); return; }
    setDocs((prev) => [...prev, r.data as ClaimDocument]);
    setAddDocForm({ name: '', description: '', step: 1, requiresPhysical: false });
    setAddDocOpen(false);
  }

  async function deleteDoc(campaignId: string, docId: string) {
    await fetch(`${apiUrl}/api/admin/draws/${campaignId}/claim-documents/${docId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    setConfirmDeleteId(null);
  }

  async function uploadFile(campaignId: string, doc: ClaimDocument) {
    const file = uploadInput[doc.id];
    if (!file) return;
    setUploadingDocId(doc.id);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/claim-documents/${doc.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const r = await res.json() as { success: boolean; error?: string; data?: ClaimDocument };
      if (r.success && r.data) {
        setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, ...r.data } : d));
        setUploadInput((prev) => ({ ...prev, [doc.id]: null }));
      } else {
        setActionError(r.error ?? 'Upload failed');
      }
    } catch { setActionError('Upload failed — please try again'); } finally { setUploadingDocId(null); }
  }

  async function verifyDoc(campaignId: string, docId: string) {
    const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/claim-documents/${docId}/verify`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json());
    if (r.success) setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, ...r.data } : d));
    else setActionError(r.error ?? 'Failed to verify');
  }

  async function downloadDoc(campaignId: string, docId: string, fileName: string) {
    const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/claim-documents/${docId}/download-url`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json());
    if (!r.success) { setActionError('Failed to get download link'); return; }
    const a = document.createElement('a');
    a.href = r.data.url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function publishWinnerStory(campaignId: string, published: boolean) {
    setStorySaving(true);
    setStoryError(null);
    setStorySuccess(false);
    try {
      const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/winner-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...storyForm, published }),
      }).then((res) => res.json());
      if (!r.success) { setStoryError(r.error ?? 'Failed to save'); return; }
      setWinnerStory(r.data as WinnerStory);
      setStorySuccess(true);
      setTimeout(() => setStorySuccess(false), 3000);
      // Bust Next.js ISR cache so /winners page reflects the change immediately
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/winners' }),
      }).catch(() => {});
    } catch { setStoryError('Network error'); } finally { setStorySaving(false); }
  }

  async function callAction(campaignId: string, endpoint: string) {
    setActionLoading(endpoint);
    setActionError(null);
    try {
      const r = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }).then((res) => res.json());

      if (!r.success) { setActionError(r.error ?? 'Action failed'); return; }

      // Merge updated draw fields into campaigns state
      const updated = r.data as Partial<DrawRecord>;
      setCampaigns((prev) => prev.map((c) =>
        c.id === campaignId ? { ...c, draw: c.draw ? { ...c.draw, ...updated } : c.draw } : c,
      ));
    } catch {
      setActionError('Network error — please try again');
    } finally {
      setActionLoading(null);
    }
  }

  async function downloadCpcbPdf(campaignId: string) {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/draws/${campaignId}/cpcb-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setPdfError(j.error ?? 'Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? 'form-cpcb.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError('Network error — could not download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const overdueCount = campaigns.filter((c) =>
    isOverdue(c.drawDate, 3, !!c.draw?.winnerNotifiedAt) ||
    isOverdue(c.drawDate, 21, !!c.draw?.cpcbFiledAt),
  ).length;

  const dueSoonCount = campaigns.filter((c) =>
    isDueSoon(c.drawDate, 3, !!c.draw?.winnerNotifiedAt) ||
    isDueSoon(c.drawDate, 21, !!c.draw?.cpcbFiledAt),
  ).length;

  const acknowledgedCount = campaigns.filter(
    (c) => c.draw?.winnerAcknowledgedAt && c.draw?.cpcbAcknowledgedAt,
  ).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <div className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Post-Draw Compliance</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>FCCPC winner submission (3-day) and Form CPC B (21 days)</p>
          </div>
        </div>
        <div className="admin-content"><p style={{ color: 'var(--text-muted)' }}>Loading draws…</p></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="admin-topbar">
          <div><h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Post-Draw Compliance</h1></div>
        </div>
        <div className="admin-content"><p style={{ color: '#ef4444' }}>{error}</p></div>
      </>
    );
  }

  return (
    <>
      {/* ── Topbar ── */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Post-Draw Compliance</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            FCCPC winner submission (3-day deadline) and Form CPC B End of Promotion Report (21 days)
          </p>
        </div>
      </div>

      <div className="admin-content">

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--error)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--error)' }}>{overdueCount}</div>
            <div className="stat-label">Overdue Filings</div>
          </div>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--warning)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--warning)' }}>{dueSoonCount}</div>
            <div className="stat-label">Due Within 7 Days</div>
          </div>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--green-primary)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green-primary)' }}>{acknowledgedCount}</div>
            <div className="stat-label">Filed &amp; Acknowledged</div>
          </div>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--info)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--info)' }}>{campaigns.length}</div>
            <div className="stat-label">Completed Draws</div>
          </div>
        </div>

        {/* ── FCCPA banner ── */}
        <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <i className="fa-solid fa-circle-info" style={{ color: '#3b82f6', marginTop: '0.1rem', flexShrink: 0, fontSize: '1.125rem' }} />
          <div>
            <strong style={{ fontSize: '0.875rem', color: '#1d4ed8' }}>FCCPA 2018 §124 — Mandatory Post-Draw Obligations</strong>
            <p style={{ fontSize: '0.8125rem', color: '#3b82f6', marginTop: '0.25rem', lineHeight: 1.6 }}>
              <strong>3 working days after draw:</strong> Submit winner details to FCCPC (full name, address, phone, prize description, ticket number).<br />
              <strong>21 days after draw close:</strong> File Form CPC B — End of Promotion Report with FCCPC.<br />
              Failure to meet these deadlines is an offence under FCCPA 2018 and may result in sanction.
            </p>
          </div>
        </div>

        {/* ── Filing status table ── */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Post-Draw Filing Status</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No completed draws yet.</div>
            ) : (
              <table className="data-table data-table-responsive">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Draw Date</th>
                    <th>Winner Submission (3-day)</th>
                    <th>Form CPC B (21-day)</th>
                    <th>FCCPC Acknowledgement</th>
                    <th>Overall Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const d = c.draw;
                    const bothAcked = !!(d?.winnerAcknowledgedAt && d?.cpcbAcknowledgedAt);
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => selectCampaign(c.id)}>
                        <td data-label="Campaign">
                          <div style={{ fontWeight: 600 }}>{c.title}</div>
                          {c.fccpcRef && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FCCPC Ref: {c.fccpcRef}</div>}
                        </td>
                        <td data-label="Draw Date" style={{ fontSize: '0.8125rem' }}>{fmtDate(c.drawDate)}</td>
                        <td data-label="Winner Submission (3-day)">
                          <DeadlineBadge drawDate={c.drawDate} offsetDays={3} filed={!!d?.winnerNotifiedAt} filedLabel="Submitted" />
                        </td>
                        <td data-label="Form CPC B (21-day)">
                          <DeadlineBadge drawDate={c.drawDate} offsetDays={21} filed={!!d?.cpcbFiledAt} filedLabel="Filed" />
                        </td>
                        <td data-label="FCCPC Acknowledgement">
                          {d?.winnerAcknowledgedAt
                            ? <span className="badge badge-green">Received</span>
                            : <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Awaiting</span>}
                        </td>
                        <td data-label="Overall Status">
                          {bothAcked
                            ? <span className="badge badge-green">Complete</span>
                            : <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>In Progress</span>}
                        </td>
                        <td data-label="Actions">
                          <button type="button" onClick={(e) => { e.stopPropagation(); selectCampaign(c.id); }} className="btn btn-outline btn-sm">
                            <i className="fa-solid fa-file-circle-check" style={{ marginRight: '0.4rem' }} />Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Workflow panel ── */}
        {selected && selected.draw && (
          <div ref={workflowRef} style={{ marginBottom: '2rem' }}>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{selected.title}</h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Post-draw compliance workflow</div>
              </div>
              <button type="button" onClick={() => { setSelectedId(null); setActionError(null); }} className="btn btn-outline btn-sm">
                <i className="fa-solid fa-xmark" style={{ marginRight: '0.4rem' }} />Close
              </button>
            </div>

            {/* Inline action error */}
            {actionError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-circle-exclamation" />
                {actionError}
                <button type="button" onClick={() => setActionError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', lineHeight: 1 }}>×</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>

              {/* Step A: Winner Submission */}
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-trophy" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />
                    Step A: Winner Submission to FCCPC
                  </h3>
                  <DeadlineBadge drawDate={selected.drawDate} offsetDays={3} filed={!!selected.draw.winnerNotifiedAt} filedLabel="Submitted" />
                </div>
                <div className="card-body">
                  <WorkflowStep num={1} state="done" title="Draw Completed">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      Draw date: {fmtDate(selected.drawDate)} · Winning ticket: <strong>{selected.draw.winnerTicket?.ticketNumber ?? '—'}</strong>
                    </div>
                  </WorkflowStep>

                  <WorkflowStep num={2} state={selected.draw.winnerNotifiedAt ? 'done' : 'active'} title="Prepare Winner Details">
                    {selected.draw.winnerTicket && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                        <div>Winner: <strong>{selected.draw.winnerTicket.user.fullName}</strong></div>
                        <div>Phone: {selected.draw.winnerTicket.user.phone}</div>
                      </div>
                    )}
                  </WorkflowStep>

                  <WorkflowStep num={3} state={selected.draw.winnerNotifiedAt ? 'done' : 'pending'} title="Submit to FCCPC">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {selected.draw.winnerNotifiedAt
                        ? <>Submitted {fmtDateTime(selected.draw.winnerNotifiedAt)} — awaiting FCCPC acknowledgement</>
                        : 'Not yet submitted'}
                    </div>
                  </WorkflowStep>

                  <WorkflowStep num={4} state={selected.draw.winnerAcknowledgedAt ? 'done' : 'pending'} title="FCCPC Acknowledgement">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {selected.draw.winnerAcknowledgedAt
                        ? `FCCPC acknowledgement received ${fmtDateTime(selected.draw.winnerAcknowledgedAt)}`
                        : 'Awaiting confirmation from FCCPC'}
                    </div>
                    {selected.draw.winnerNotifiedAt && !selected.draw.winnerAcknowledgedAt && (
                      <button
                        type="button"
                        onClick={() => callAction(selected.id, 'acknowledge-winner')}
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: '0.5rem' }}
                        disabled={actionLoading === 'acknowledge-winner'}
                      >
                        <i className="fa-solid fa-check" style={{ marginRight: '0.4rem' }} />Mark Acknowledged
                      </button>
                    )}
                  </WorkflowStep>

                  <button
                    type="button"
                    onClick={() => callAction(selected.id, 'notify-winner')}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={!!selected.draw.winnerNotifiedAt || actionLoading === 'notify-winner'}
                  >
                    {selected.draw.winnerNotifiedAt
                      ? <><i className="fa-solid fa-check" style={{ marginRight: '0.4rem' }} />Winner Submitted</>
                      : <><i className="fa-solid fa-paper-plane" style={{ marginRight: '0.4rem' }} />Submit Winner Details to FCCPC</>}
                  </button>
                </div>
              </div>

              {/* Step B: Form CPC B */}
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-file-lines" style={{ color: 'var(--info)', marginRight: '0.5rem' }} />
                    Step B: Form CPC B — End of Promotion Report
                  </h3>
                  <DeadlineBadge drawDate={selected.drawDate} offsetDays={21} filed={!!selected.draw.cpcbFiledAt} filedLabel="Filed" />
                </div>
                <div className="card-body">
                  <WorkflowStep num={1} state="done" title="Compile Report Data">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      Revenue, winner, draw details, escrow release all required
                    </div>
                  </WorkflowStep>

                  <WorkflowStep num={2} state={selected.draw.cpcbFiledAt ? 'done' : 'active'} title="Complete Form CPC B">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      All 12 mandatory fields required. Generate PDF below.
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadCpcbPdf(selected.id)}
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                      disabled={pdfLoading}
                    >
                      <i className={`fa-solid ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} style={{ marginRight: '0.4rem' }} />
                      {pdfLoading ? 'Generating…' : 'Download Form CPC B PDF'}
                    </button>
                    {pdfError && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.375rem' }}>{pdfError}</div>}
                  </WorkflowStep>

                  <WorkflowStep num={3} state={selected.draw.cpcbFiledAt ? 'done' : 'pending'} title="File with FCCPC">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {selected.draw.cpcbFiledAt
                        ? `Form CPC B filed ${fmtDateTime(selected.draw.cpcbFiledAt)}`
                        : 'Submit completed form to FCCPC (physical + email)'}
                    </div>
                  </WorkflowStep>

                  <WorkflowStep num={4} state={selected.draw.cpcbAcknowledgedAt ? 'done' : 'pending'} title="FCCPC Acknowledgement">
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {selected.draw.cpcbAcknowledgedAt
                        ? `Acknowledged ${fmtDateTime(selected.draw.cpcbAcknowledgedAt)} — compliance complete`
                        : 'Awaiting FCCPC filing receipt'}
                    </div>
                    {selected.draw.cpcbFiledAt && !selected.draw.cpcbAcknowledgedAt && (
                      <button
                        type="button"
                        onClick={() => callAction(selected.id, 'acknowledge-cpcb')}
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: '0.5rem' }}
                        disabled={actionLoading === 'acknowledge-cpcb'}
                      >
                        <i className="fa-solid fa-check" style={{ marginRight: '0.4rem' }} />Mark Acknowledged
                      </button>
                    )}
                  </WorkflowStep>

                  <button
                    type="button"
                    onClick={() => callAction(selected.id, 'file-cpcb')}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={!!selected.draw.cpcbFiledAt || actionLoading === 'file-cpcb'}
                  >
                    {selected.draw.cpcbFiledAt
                      ? <><i className="fa-solid fa-check" style={{ marginRight: '0.4rem' }} />Form CPC B Filed</>
                      : <><i className="fa-solid fa-file-circle-check" style={{ marginRight: '0.4rem' }} />File Form CPC B</>}
                  </button>
                </div>
              </div>

              {/* Step C: Winner Claim Journey */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-key" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />
                    Step C: Winner Claim Journey
                  </h3>
                  {selected.draw.claimKeysHandedAt
                    ? <span className="badge badge-green"><i className="fa-solid fa-check" style={{ marginRight: '0.3rem' }} />Complete — Keys Handed Over</span>
                    : <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>In Progress</span>}
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem' }}>
                    {[
                      { step: 1, label: 'Identity Verification', icon: 'fa-id-card', field: 'claimIdentityVerifiedAt' as const },
                      { step: 2, label: 'Acceptance Signed', icon: 'fa-file-signature', field: 'claimAcceptanceSignedAt' as const },
                      { step: 3, label: 'KYC & Legal Docs', icon: 'fa-building-columns', field: 'claimKycCompletedAt' as const },
                      { step: 4, label: 'Property Transfer', icon: 'fa-handshake', field: 'claimTransferCompletedAt' as const },
                      { step: 5, label: 'Keys Handed Over', icon: 'fa-key', field: 'claimKeysHandedAt' as const },
                    ].map(({ step, label, icon, field }) => {
                      const done = !!selected.draw![field];
                      const prevDone = step === 1 || (step === 2 && !!selected.draw!.claimIdentityVerifiedAt) || (step === 3 && !!selected.draw!.claimAcceptanceSignedAt) || (step === 4 && !!selected.draw!.claimKycCompletedAt) || (step === 5 && !!selected.draw!.claimTransferCompletedAt);
                      const isLoading = actionLoading === `claim-${step}`;
                      return (
                        <div key={step} style={{ borderRadius: 10, border: `1.5px solid ${done ? 'var(--green-primary)' : 'var(--border)'}`, padding: '1rem', background: done ? 'var(--green-50)' : 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? 'var(--green-primary)' : prevDone ? 'var(--gold)' : 'var(--border)', color: done || prevDone ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem' }}>
                              {done ? <i className="fa-solid fa-check" /> : <i className={`fa-solid ${icon}`} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>STEP {step}</div>
                              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: done ? 'var(--green-primary)' : 'var(--text-primary)' }}>{label}</div>
                            </div>
                          </div>
                          {done
                            ? <div style={{ fontSize: '0.75rem', color: 'var(--green-primary)' }}>{fmtDateTime(selected.draw![field]!)}</div>
                            : prevDone
                              ? <button type="button" onClick={() => advanceClaim(selected.id, step)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }} disabled={isLoading}>
                                  {isLoading ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.3rem' }} />Saving…</> : <><i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} />Mark Complete</>}
                                </button>
                              : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Waiting on previous step</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* ── Claim Documents panel ── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  <i className="fa-solid fa-folder-open" style={{ color: 'var(--info)', marginRight: '0.5rem' }} />
                  Claim Documents
                </h3>
                <button type="button" onClick={() => { setAddDocOpen((o) => !o); setAddDocError(null); }} className="btn btn-outline btn-sm">
                  <i className={`fa-solid ${addDocOpen ? 'fa-xmark' : 'fa-plus'}`} style={{ marginRight: '0.4rem' }} />
                  {addDocOpen ? 'Cancel' : 'Add Document Request'}
                </button>
              </div>

              <div className="card-body">
                {/* Add doc form */}
                {addDocOpen && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Document Name *</label>
                        <input className="form-input" value={addDocForm.name} onChange={(e) => setAddDocForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. National ID Card, Title Deed" style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Claim Step</label>
                        <select className="form-input" value={addDocForm.step} onChange={(e) => setAddDocForm((f) => ({ ...f, step: Number(e.target.value) }))} style={{ width: '100%' }}>
                          <option value={1}>Step 1 — Identity Verification</option>
                          <option value={2}>Step 2 — Acceptance Form</option>
                          <option value={3}>Step 3 — KYC & Legal Docs</option>
                          <option value={4}>Step 4 — Property Transfer</option>
                          <option value={5}>Step 5 — Keys Handover</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Instructions for Winner (optional)</label>
                      <input className="form-input" value={addDocForm.description} onChange={(e) => setAddDocForm((f) => ({ ...f, description: e.target.value }))} placeholder="What should the winner submit or bring?" style={{ width: '100%' }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={addDocForm.requiresPhysical} onChange={(e) => setAddDocForm((f) => ({ ...f, requiresPhysical: e.target.checked }))} />
                      <span>Requires physical office visit (original must be presented in person)</span>
                    </label>
                    {addDocError && <div style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{addDocError}</div>}
                    <button type="button" onClick={() => addDoc(selected!.id)} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                      <i className="fa-solid fa-plus" style={{ marginRight: '0.4rem' }} />Create Document Request
                    </button>
                  </div>
                )}

                {docsLoading ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading documents…</p>
                ) : docs.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                    No documents added yet. Click "Add Document Request" to request documents from the winner.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {[1, 2, 3, 4, 5].map((step) => {
                      const stepDocs = docs.filter((d) => d.step === step);
                      if (stepDocs.length === 0) return null;
                      const stepLabels = ['Identity Verification', 'Acceptance Form', 'KYC & Legal', 'Property Transfer', 'Keys Handover'];
                      return (
                        <div key={step}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Step {step} — {stepLabels[step - 1]}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {stepDocs.map((doc) => (
                              <div key={doc.id} style={{ border: `1px solid ${doc.verifiedAt ? 'var(--green-primary)' : doc.uploadedAt ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 10, padding: '0.875rem 1rem', background: doc.verifiedAt ? 'var(--green-50)' : 'var(--bg)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{doc.name}</span>
                                      {doc.requiresPhysical && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.5rem', borderRadius: 10 }}>
                                          <i className="fa-solid fa-building" style={{ marginRight: '0.2rem' }} />OFFICE VISIT REQUIRED
                                        </span>
                                      )}
                                      {doc.verifiedAt && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check" style={{ marginRight: '0.2rem' }} />Verified</span>}
                                      {doc.uploadedAt && !doc.verifiedAt && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fffbeb', color: '#b45309', padding: '0.1rem 0.5rem', borderRadius: 10 }}>Uploaded — Awaiting Verification</span>}
                                      {!doc.uploadedAt && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending</span>}
                                    </div>
                                    {doc.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{doc.description}</div>}
                                    {doc.uploadedAt && doc.originalFileName && (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        <i className="fa-solid fa-file" style={{ marginRight: '0.3rem' }} />
                                        {doc.originalFileName} · uploaded by {doc.uploadedByRole} on {fmtDate(doc.uploadedAt)}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {doc.uploadedAt && (
                                      <button type="button" onClick={() => downloadDoc(selected!.id, doc.id, doc.originalFileName ?? doc.name)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                        <i className="fa-solid fa-download" style={{ marginRight: '0.3rem' }} />View
                                      </button>
                                    )}
                                    {doc.uploadedAt && !doc.verifiedAt && (
                                      <button type="button" onClick={() => verifyDoc(selected!.id, doc.id)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                        <i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} />Verify
                                      </button>
                                    )}
                                    {!doc.verifiedAt && (
                                      confirmDeleteId === doc.id ? (
                                        <>
                                          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Remove?</span>
                                          <button type="button" onClick={() => deleteDoc(selected!.id, doc.id)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444', borderColor: '#fca5a5' }}>
                                            Yes
                                          </button>
                                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                            No
                                          </button>
                                        </>
                                      ) : (
                                        <button type="button" onClick={() => setConfirmDeleteId(doc.id)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444', borderColor: '#fca5a5' }}>
                                          <i className="fa-solid fa-trash" />
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>

                                {/* Upload area — admin can upload for any doc */}
                                {!doc.verifiedAt && (
                                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                      {doc.requiresPhysical ? 'Upload scanned original (after office visit):' : 'Upload file:'}
                                    </label>
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                                      onChange={(e) => setUploadInput((prev) => ({ ...prev, [doc.id]: e.target.files?.[0] ?? null }))}
                                      style={{ fontSize: '0.75rem' }}
                                    />
                                    {uploadInput[doc.id] && (
                                      <button
                                        type="button"
                                        onClick={() => uploadFile(selected!.id, doc)}
                                        className="btn btn-primary btn-sm"
                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                                        disabled={uploadingDocId === doc.id}
                                      >
                                        {uploadingDocId === doc.id ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.3rem' }} />Uploading…</> : <><i className="fa-solid fa-upload" style={{ marginRight: '0.3rem' }} />Upload</>}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Publish to Winners Page ── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    <i className="fa-solid fa-trophy" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />
                    Publish to Winners Page
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Adds this winner to the public <strong>/winners</strong> page with their story and testimonial.
                  </div>
                </div>
                {winnerStory?.published && (
                  <span className="badge badge-green"><i className="fa-solid fa-globe" style={{ marginRight: '0.3rem' }} />Published</span>
                )}
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>Prize Value (shown publicly)</label>
                    <input
                      className="form-input"
                      value={storyForm.prize}
                      onChange={(e) => setStoryForm((f) => ({ ...f, prize: e.target.value }))}
                      placeholder="e.g. ₦45,000,000 3-Bedroom Flat"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>YouTube Draw Archive URL</label>
                    <input
                      className="form-input"
                      value={storyForm.drawArchiveUrl}
                      onChange={(e) => setStoryForm((f) => ({ ...f, drawArchiveUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
                    Winner&apos;s Quote / Testimonial
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.375rem' }}>(optional — shown as a blockquote on the winners page)</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={storyForm.blurb}
                    onChange={(e) => setStoryForm((f) => ({ ...f, blurb: e.target.value }))}
                    placeholder={`"I still can't believe it! Everything was transparent — I watched the live draw and my ticket appeared. RaffleProp is 100% legit!"`}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem' }}>
                  <input type="checkbox" checked={storyForm.featured} onChange={(e) => setStoryForm((f) => ({ ...f, featured: e.target.checked }))} />
                  <span>Feature this winner (shown first on the winners page)</span>
                </label>

                {storyError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8125rem', color: '#ef4444' }}>
                    {storyError}
                  </div>
                )}
                {storySuccess && (
                  <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-primary)', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8125rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                    <i className="fa-solid fa-check" style={{ marginRight: '0.4rem' }} />Winner story saved and {winnerStory?.published ? 'published' : 'unpublished'} successfully.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => publishWinnerStory(selected!.id, true)}
                    className="btn btn-primary btn-sm"
                    disabled={storySaving}
                  >
                    <i className={`fa-solid ${storySaving ? 'fa-spinner fa-spin' : 'fa-globe'}`} style={{ marginRight: '0.4rem' }} />
                    {storySaving ? 'Saving…' : winnerStory?.published ? 'Update & Keep Published' : 'Publish to Winners Page'}
                  </button>
                  {winnerStory?.published && (
                    <button
                      type="button"
                      onClick={() => publishWinnerStory(selected!.id, false)}
                      className="btn btn-outline btn-sm"
                      disabled={storySaving}
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                    >
                      <i className="fa-solid fa-eye-slash" style={{ marginRight: '0.4rem' }} />Unpublish
                    </button>
                  )}
                </div>

                {winnerStory && (
                  <div style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-circle-info" style={{ marginRight: '0.3rem' }} />
                    Showing as <strong>{winnerStory.winnerName}</strong> · {winnerStory.propertyTitle}
                    {winnerStory.published ? ' · Live on /winners' : ' · Hidden (draft)'}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── Form CPC B reference card ── */}
        <div className="card" style={{ marginTop: '0.5rem' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Form CPC B — Required Fields Reference</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>End of Promotion Report to be filed with FCCPC</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
              {CPCB_FIELDS.map(([field, note]) => (
                <div key={field} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{field}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{note}</div>
                </div>
              ))}
            </div>
            {selected ? (
              <button
                type="button"
                onClick={() => downloadCpcbPdf(selected.id)}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1.25rem' }}
                disabled={pdfLoading}
              >
                <i className={`fa-solid ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} style={{ marginRight: '0.4rem' }} />
                {pdfLoading ? 'Generating…' : `Download Form CPC B — ${selected.title}`}
              </button>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Select a campaign from the table above to generate its Form CPC B PDF.
              </p>
            )}
            {pdfError && <div style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.5rem' }}>{pdfError}</div>}
          </div>
        </div>

      </div>


      {/* ── Inline styles for deadline badges ── */}
      <style>{`
        .deadline-badge { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.625rem; border-radius: 20px; white-space: nowrap; display: inline-block; }
        .deadline-overdue { background: #fef2f2; color: #ef4444; }
        .deadline-urgent { background: #fff7ed; color: #ea580c; }
        .deadline-ok { background: var(--green-50); color: var(--green-primary); }
      `}</style>
    </>
  );
}
