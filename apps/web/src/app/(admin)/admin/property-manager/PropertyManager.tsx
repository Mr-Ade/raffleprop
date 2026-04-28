'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocMeta = {
  r2Key: string;
  issuer: string;
  date: string;
  ref: string | null;
  expiry: string | null;
};

type DocumentKeys = {
  cof?: DocMeta;
  nisvReport?: DocMeta;
  surveyPlan?: DocMeta;
  titleClearance?: DocMeta;
};

type Campaign = {
  id: string;
  title: string;
  propertyState: string;
  propertyLga: string;
  status: string;
  documentKeys: DocumentKeys | null;
};

// ─── Document config ──────────────────────────────────────────────────────────

const DOCS = [
  { key: 'cof' as const,            label: 'C of O / Title Document',        icon: 'fa-certificate', purpose: 'title_deed',      isRegulatory: true  },
  { key: 'nisvReport' as const,     label: 'NIESV Valuation Report',          icon: 'fa-file-lines',  purpose: 'niesv_report',    isRegulatory: false },
  { key: 'surveyPlan' as const,     label: 'Survey Plan',                     icon: 'fa-map',         purpose: 'survey_plan',     isRegulatory: true  },
  { key: 'titleClearance' as const, label: "Lawyer's Title Clearance Letter", icon: 'fa-scroll',      purpose: 'title_clearance', isRegulatory: false },
];

type DocKey = (typeof DOCS)[number]['key'];

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getReadiness(campaign: Campaign): number {
  const dk = campaign.documentKeys ?? {};
  return DOCS.filter((d) => dk[d.key]?.r2Key).length;
}

function isExpired(meta: DocMeta): boolean {
  if (!meta.expiry) return false;
  return new Date(meta.expiry) < new Date();
}

function hasExpiredDoc(campaign: Campaign): boolean {
  const dk = campaign.documentKeys ?? {};
  return DOCS.some((d) => {
    const m = dk[d.key];
    return m && isExpired(m);
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Main component ───────────────────────────────────────────────────────────

type UploadModalState = {
  open: boolean;
  campaignId: string;
  docKey: DocKey;
  docLabel: string;
  purpose: string;
  isRegulatory: boolean;
  prefill: DocMeta | null;
};

const CLOSED_MODAL: UploadModalState = {
  open: false, campaignId: '', docKey: 'cof', docLabel: '',
  purpose: '', isRegulatory: false, prefill: null,
};

export function PropertyManager({ token, apiUrl }: { token: string; apiUrl: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<UploadModalState>(CLOSED_MODAL);
  const detailRef = useRef<HTMLDivElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadIssuer, setUploadIssuer] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadRef, setUploadRef] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && modal.open) setModal(CLOSED_MODAL);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal.open]);

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/campaigns/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setCampaigns(r.data as Campaign[]);
        else setError(r.error ?? 'Failed to load campaigns');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [apiUrl, token]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) ?? null;

  function openManage(id: string) {
    setSelectedId(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function openUploadModal(campaign: Campaign, docDef: (typeof DOCS)[number]) {
    const existing = (campaign.documentKeys ?? {})[docDef.key] ?? null;
    setModal({ open: true, campaignId: campaign.id, docKey: docDef.key, docLabel: docDef.label, purpose: docDef.purpose, isRegulatory: docDef.isRegulatory, prefill: existing });
    setUploadFile(null);
    setUploadIssuer(existing?.issuer ?? '');
    setUploadDate(existing?.date ?? '');
    setUploadRef(existing?.ref ?? '');
    setUploadExpiry(existing?.expiry ?? '');
    setUploadError(null);
    setDragOver(false);
    // Reset file input so the same file can be re-selected after an error
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const acceptFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`);
      return;
    }
    setUploadFile(file);
    setUploadError(null);
  }, []);

  async function viewDocument(campaignId: string, docKey: DocKey) {
    setViewingKey(`${campaignId}-${docKey}`);
    setViewError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/campaigns/${campaignId}/documents/${docKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
      if (!res.ok || !json.success || !json.data?.url) {
        setViewError(json.error ?? 'Failed to load document.');
        return;
      }
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setViewError('Network error — please try again.');
    } finally {
      setViewingKey(null);
    }
  }

  async function handleUploadAndVerify() {
    if (!uploadFile) { setUploadError('Please select a file'); return; }
    if (!uploadIssuer.trim()) { setUploadError('Issuer is required'); return; }
    if (!uploadDate) { setUploadError('Document date is required'); return; }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Get presigned URL
      const presignRes = await fetch(`${apiUrl}/api/admin/storage/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose: modal.purpose, entityId: modal.campaignId, mimeType: uploadFile.type }),
      }).then((r) => r.json());

      if (!presignRes.success) throw new Error(presignRes.error ?? 'Presign failed');
      const { uploadUrl, key } = presignRes.data as { uploadUrl: string; key: string };

      // 2. Upload directly to R2
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: { 'Content-Type': uploadFile.type },
      });
      if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);

      // 3. Record metadata
      const patchRes = await fetch(`${apiUrl}/api/admin/campaigns/${modal.campaignId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          docKey: modal.docKey,
          r2Key: key,
          issuer: uploadIssuer.trim(),
          date: uploadDate,
          ref: uploadRef.trim() || null,
          expiry: (modal.docKey === 'nisvReport' && uploadExpiry) ? uploadExpiry : null,
        }),
      }).then((r) => r.json());

      if (!patchRes.success) throw new Error(patchRes.error ?? 'Save failed');

      // 4. Optimistic update
      const updatedDocKeys = (patchRes.data as { documentKeys: DocumentKeys }).documentKeys;
      setCampaigns((prev) => prev.map((c) => c.id === modal.campaignId ? { ...c, documentKeys: updatedDocKeys } : c));
      setModal(CLOSED_MODAL);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalCampaigns = campaigns.length;
  const docComplete = campaigns.filter((c) => getReadiness(c) === 4).length;
  const awaiting = campaigns.filter((c) => getReadiness(c) < 4).length;
  const expired = campaigns.filter(hasExpiredDoc).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <div className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Property Manager</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Manage property documents per campaign.</p>
          </div>
        </div>
        <div className="admin-content">
          <p style={{ color: 'var(--text-muted)' }}>Loading campaigns…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Property Manager</h1>
          </div>
        </div>
        <div className="admin-content">
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Topbar ── */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Property Manager</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Manage property documents per campaign. Documents are optional but recommended for due diligence and compliance.
          </p>
        </div>
      </div>

      <div className="admin-content">

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--green-primary)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green-primary)' }}>{docComplete}</div>
            <div className="stat-label">Doc-Complete Campaigns</div>
          </div>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--warning)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--warning)' }}>{awaiting}</div>
            <div className="stat-label">Incomplete Documents</div>
          </div>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid #ef4444' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ef4444' }}>{expired}</div>
            <div className="stat-label">Expired Documents</div>
          </div>
          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--info)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--info)' }}>{totalCampaigns}</div>
            <div className="stat-label">Total Campaigns</div>
          </div>
        </div>

        {/* ── Info banner ── */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <i className="fa-solid fa-circle-info" style={{ color: '#2563eb', marginTop: '0.1rem', flexShrink: 0, fontSize: '1.125rem' }} />
          <div>
            <strong style={{ fontSize: '0.875rem', color: '#1e40af' }}>Recommended: 4 Property Documents</strong>
            <p style={{ fontSize: '0.8125rem', color: '#2563eb', marginTop: '0.25rem', lineHeight: 1.6 }}>
              Per FCCPA 2018 and NIESV standards, campaigns should have: (1) C of O / Title Document, (2) NIESV Valuation Report, (3) Survey Plan, (4) Lawyer&apos;s Title Clearance Letter.{' '}
              Documents are optional and do not block campaign activation.
            </p>
          </div>
        </div>

        {/* ── Overview table ── */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Campaign Document Readiness</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Click a campaign row to manage its documents</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {campaigns.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns yet.</div>
            ) : (
              <table className="data-table data-table-responsive">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>C of O</th>
                    <th>NIESV Valuation</th>
                    <th>Survey Plan</th>
                    <th>Title Clearance</th>
                    <th>Readiness</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const dk = c.documentKeys ?? {};
                    const ready = getReadiness(c);
                    const pct = Math.round((ready / 4) * 100);
                    const barColor = pct === 100 ? 'var(--green-primary)' : pct >= 50 ? 'var(--gold)' : '#ef4444';
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openManage(c.id)}>
                        <td data-label="Campaign">
                          <div style={{ fontWeight: 600 }}>{c.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.propertyState}, {c.propertyLga}</div>
                        </td>
                        {DOCS.map((d) => (
                          <td key={d.key} data-label={d.label}>
                            {dk[d.key]?.r2Key
                              ? <span style={{ color: 'var(--green-primary)', fontSize: '1.125rem' }}><i className="fa-solid fa-circle-check" /></span>
                              : <span style={{ color: '#ef4444', fontSize: '1.125rem' }}><i className="fa-solid fa-circle-xmark" /></span>}
                          </td>
                        ))}
                        <td data-label="Readiness">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 120 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 4, background: barColor, width: `${pct}%`, transition: 'width 0.4s' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: barColor }}>{ready}/4</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          {ready === 4
                            ? <span className="badge badge-green">All Docs Uploaded</span>
                            : <span className="badge" style={{ background: '#fef9c3', color: '#a16207' }}>{4 - ready} doc{4 - ready > 1 ? 's' : ''} missing</span>}
                        </td>
                        <td data-label="Actions">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openManage(c.id); }}
                            className="btn btn-outline btn-sm"
                          >
                            <i className="fa-solid fa-folder-open" style={{ marginRight: '0.4rem' }} />Manage
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

        {/* ── Detail panel ── */}
        {selectedCampaign && (
          <div ref={detailRef}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedCampaign.title}</h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Document Management</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--green-primary)' }}>
                    {getReadiness(selectedCampaign)}/4 documents
                  </span>
                  <button type="button" onClick={() => { setSelectedId(null); setViewError(''); }} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-xmark" style={{ marginRight: '0.4rem' }} />Close
                  </button>
                </div>
              </div>
              <div className="card-body">
                {DOCS.map((docDef) => {
                  const meta = (selectedCampaign.documentKeys ?? {})[docDef.key] ?? null;
                  const uploaded = !!meta?.r2Key;
                  const expired = uploaded && isExpired(meta!);
                  const rowBg = expired ? { border: '1px solid #fed7aa', background: '#fff7ed' } : {};
                  const iconBg = !uploaded ? 'var(--bg-secondary)' : expired ? '#fff7ed' : 'var(--green-50)';
                  const iconColor = !uploaded ? 'var(--text-muted)' : expired ? '#ea580c' : 'var(--green-primary)';

                  return (
                    <div key={docDef.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 8, background: 'var(--bg-secondary)', marginBottom: '0.5rem', gap: '1rem', flexWrap: 'wrap', ...rowBg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`fa-solid ${docDef.icon}`} style={{ color: iconColor }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{docDef.label}</div>
                          {uploaded && meta ? (
                            <>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meta.issuer}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Date: {fmtDate(meta.date)}
                                {meta.ref ? ` · Ref: ${meta.ref}` : ''}
                                {meta.expiry ? ` · Expires: ${fmtDate(meta.expiry)}` : ''}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not uploaded</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        {uploaded ? (
                          <>
                            <span className={expired ? 'badge' : 'badge badge-green'} style={expired ? { background: '#fff7ed', color: '#ea580c' } : {}}>
                              {expired ? 'Expired' : 'Verified'}
                            </span>
                            <button
                              type="button"
                              onClick={() => void viewDocument(selectedCampaign.id, docDef.key)}
                              disabled={viewingKey === `${selectedCampaign.id}-${docDef.key}`}
                              className="btn btn-outline btn-sm"
                            >
                              <i className={`fa-solid ${viewingKey === `${selectedCampaign.id}-${docDef.key}` ? 'fa-spinner fa-spin' : 'fa-eye'}`} style={{ marginRight: '0.4rem' }} />
                              View
                            </button>
                            <button type="button" onClick={() => openUploadModal(selectedCampaign, docDef)} className="btn btn-outline btn-sm">
                              <i className="fa-solid fa-arrow-rotate-right" style={{ marginRight: '0.4rem' }} />Replace
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => openUploadModal(selectedCampaign, docDef)} className="btn btn-primary btn-sm">
                            <i className="fa-solid fa-upload" style={{ marginRight: '0.4rem' }} />Upload
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {viewError && (
                  <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                    {viewError}
                  </div>
                )}

                {/* Activation footer */}
                {getReadiness(selectedCampaign) === 4 ? (
                  <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-primary)', borderRadius: 8, padding: '0.875rem 1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <i className="fa-solid fa-circle-check" style={{ color: 'var(--green-primary)', fontSize: '1.125rem' }} />
                    <strong>All 4 documents uploaded and verified.</strong>
                  </div>
                ) : (
                  <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '0.875rem 1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <i className="fa-solid fa-circle-info" style={{ color: '#a16207', fontSize: '1.125rem' }} />
                    <span style={{ color: '#78350f' }}>
                      {4 - getReadiness(selectedCampaign)} document{4 - getReadiness(selectedCampaign) > 1 ? 's' : ''} not yet uploaded. Campaign activation is not affected.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Upload modal ── */}
      {modal.open && (
        <div
          style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(CLOSED_MODAL); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>Upload: {modal.docLabel}</div>
              <button type="button" onClick={() => setModal(CLOSED_MODAL)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {/* Document type (read-only) */}
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <input type="text" className="form-input" value={modal.docLabel} readOnly style={{ background: 'var(--bg-secondary)' }} />
              </div>

              {/* File upload dropzone */}
              <div className="form-group">
                <label className="form-label">Upload File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) acceptFile(file);
                  }}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--green-primary)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '2rem', textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'var(--green-50)' : 'var(--bg-secondary)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.75rem', color: dragOver ? 'var(--green-primary)' : 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', transition: 'color 0.15s' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: dragOver ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                    {dragOver ? 'Drop file here' : 'Click or drag & drop to upload'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>PDF, JPG, PNG · Max 20 MB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) acceptFile(file);
                    e.target.value = '';
                  }}
                />
                {uploadFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                    <i className="fa-solid fa-file" style={{ color: 'var(--green-primary)' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFile.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(uploadFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                )}
              </div>

              {/* Issuer */}
              <div className="form-group">
                <label className="form-label">Issuing Authority / Solicitor</label>
                <input
                  type="text" className="form-input"
                  value={uploadIssuer} onChange={(e) => setUploadIssuer(e.target.value)}
                  placeholder="e.g. Lagos State Land Bureau / Barrister Eze & Co"
                />
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Document Date</label>
                <input type="date" className="form-input" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
              </div>

              {/* Reference */}
              <div className="form-group">
                <label className="form-label">
                  Document Reference / Number{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text" className="form-input"
                  value={uploadRef} onChange={(e) => setUploadRef(e.target.value)}
                  placeholder="e.g. LG/DOC/2024/0012"
                />
              </div>

              {/* Expiry — NIESV only */}
              {modal.docKey === 'nisvReport' && (
                <div className="form-group">
                  <label className="form-label">
                    Report Expiry Date{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(NIESV valuations typically valid for 12 months)</span>
                  </label>
                  <input type="date" className="form-input" value={uploadExpiry} onChange={(e) => setUploadExpiry(e.target.value)} />
                </div>
              )}

              {uploadError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#ef4444' }}>
                  {uploadError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setModal(CLOSED_MODAL)} className="btn btn-outline" style={{ flex: 1 }} disabled={uploading}>Cancel</button>
                <button type="button" onClick={() => void handleUploadAndVerify()} className="btn btn-primary" style={{ flex: 2 }} disabled={uploading}>
                  {uploading
                    ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.4rem' }} />Uploading…</>
                    : <><i className="fa-solid fa-upload" style={{ marginRight: '0.4rem' }} />Upload &amp; Verify</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
