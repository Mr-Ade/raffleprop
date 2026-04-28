'use client';

import { useState, useEffect, type ReactNode } from 'react';

// ── FCCPC fee tiers (same schedule as calculator) ──────────────────────────────
const TIERS = [
  { label: 'Below ₦2M',        max: 2e6,      rate: 0.12,  app: 25000 },
  { label: '₦2M – ₦9.9M',     max: 10e6,     rate: 0.10,  app: 50000 },
  { label: '₦10M – ₦29.9M',   max: 30e6,     rate: 0.085, app: 75000 },
  { label: '₦30M – ₦49.9M',   max: 50e6,     rate: 0.06,  app: 100000 },
  { label: '₦50M – ₦99.9M',   max: 100e6,    rate: 0.052, app: 150000 },
  { label: '₦100M – ₦499.9M', max: 500e6,    rate: 0.045, app: 200000 },
  { label: 'Above ₦500M',      max: Infinity, rate: 0.03,  app: 250000 },
];

function getTier(pv: number) {
  return TIERS.find(t => pv < t.max) ?? TIERS[TIERS.length - 1]!;
}

function fmt(n: number) {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dateBadge(isoDate: string | Date | null | undefined): ReactNode {
  if (!isoDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (diff < 0) return <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.25rem' }} />{label}</span>;
  if (diff <= 7) return <span className="badge badge-gold">{label}</span>;
  return <span className="badge badge-green">{label}</span>;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ComplianceCampaign {
  id: string;
  title: string;
  slug: string;
  propertyState: string;
  propertyLga: string;
  marketValue: string; // Decimal comes as string from Prisma JSON
  fccpcRef: string | null;
  fccpcApprovalDate: string | null;
  lslgaRef: string | null;
  drawDate: string | null;
  status: string;
  draw: { cpcbFormKey: string | null; cpcbFiledAt: string | null; status: string } | null;
}

interface Props {
  token: string;
  apiUrl: string;
}

export function ComplianceManager({ token, apiUrl }: Props) {
  const [campaigns, setCampaigns] = useState<ComplianceCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalCampaign, setModalCampaign] = useState<ComplianceCampaign | null>(null);
  const [fccpcRef, setFccpcRef] = useState('');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${apiUrl}/api/admin/compliance/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ success: boolean; data: ComplianceCampaign[] }>)
      .then(j => { if (j.success) setCampaigns(j.data); else setError('Failed to load campaigns'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [apiUrl, token]);

  // Stat computations
  const total = campaigns.length;
  const approved = campaigns.filter(c => c.fccpcRef && c.fccpcApprovalDate).length;
  const underReview = campaigns.filter(c => c.fccpcRef && !c.fccpcApprovalDate).length;
  const pending = campaigns.filter(c => !c.fccpcRef).length;

  function openModal(c: ComplianceCampaign) {
    setModalCampaign(c);
    setFccpcRef(c.fccpcRef ?? '');
    setApprovalDate(c.fccpcApprovalDate ? new Date(c.fccpcApprovalDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setSaveError(null);
  }

  function closeModal() {
    setModalCampaign(null);
    setFccpcRef('');
    setSaveError(null);
  }

  async function handleSaveApproval() {
    if (!modalCampaign || !fccpcRef.trim()) { setSaveError('FCCPC Reference is required'); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/compliance/campaigns/${modalCampaign.id}/fccpc-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fccpcRef: fccpcRef.trim(), fccpcApprovalDate: approvalDate }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setSaveError(json.error ?? 'Save failed'); return; }
      setCampaigns(prev => prev.map(c => c.id === modalCampaign.id
        ? { ...c, fccpcRef: fccpcRef.trim(), fccpcApprovalDate: approvalDate }
        : c
      ));
      closeModal();
    } catch {
      setSaveError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  }

  // ── Deadline column helpers ────────────────────────────────────────────────
  function sellInBadge(c: ComplianceCampaign): ReactNode {
    if (!c.fccpcApprovalDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>;
    const expiry = new Date(c.fccpcApprovalDate);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return dateBadge(expiry.toISOString().slice(0, 10));
  }

  function drawNotifBadge(c: ComplianceCampaign): ReactNode {
    if (!c.drawDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const drawDate = new Date(c.drawDate);
    const notifDeadline = new Date(c.drawDate);
    notifDeadline.setDate(notifDeadline.getDate() - 14);
    if (today > drawDate) return <span className="badge badge-green"><i className="fa-solid fa-check" style={{ marginRight: '0.25rem' }} />Sent</span>;
    if (today >= notifDeadline) return <span className="badge badge-gold"><i className="fa-solid fa-clock" style={{ marginRight: '0.25rem' }} />Due now</span>;
    const daysUntil = Math.ceil((notifDeadline.getTime() - today.getTime()) / 86400000);
    return <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Due in {daysUntil}d</span>;
  }

  function postDrawBadge(c: ComplianceCampaign): ReactNode {
    if (!c.drawDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (today <= new Date(c.drawDate)) return <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Awaiting draw</span>;
    if (c.draw?.cpcbFiledAt) return <span className="badge badge-green"><i className="fa-solid fa-check" style={{ marginRight: '0.25rem' }} />Filed</span>;
    const deadline = new Date(c.drawDate); deadline.setDate(deadline.getDate() + 3);
    return dateBadge(deadline.toISOString().slice(0, 10));
  }

  function cpcbBadge(c: ComplianceCampaign): ReactNode {
    if (!c.drawDate) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (today <= new Date(c.drawDate)) return <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Awaiting draw</span>;
    if (c.draw?.cpcbFiledAt) return <span className="badge badge-green"><i className="fa-solid fa-check" style={{ marginRight: '0.25rem' }} />Filed {fmtDate(c.draw.cpcbFiledAt)}</span>;
    const deadline = new Date(c.drawDate); deadline.setDate(deadline.getDate() + 21);
    return dateBadge(deadline.toISOString().slice(0, 10));
  }

  function lslgaBadge(c: ComplianceCampaign): ReactNode {
    const isLagos = c.propertyState.toLowerCase().includes('lagos');
    if (!isLagos) return <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>N/A</span>;
    if (c.lslgaRef) return <><span className="badge badge-green">Licensed</span><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>{c.lslgaRef}</div></>;
    return <span className="badge badge-gold">Pending</span>;
  }

  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>FCCPC Approval Manager</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Track campaign approval status with the Federal Competition &amp; Consumer Protection Commission
          </p>
        </div>
        {(() => {
          const firstPending = campaigns.find(c => !c.fccpcRef);
          return (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { if (firstPending) openModal(firstPending); }}
              disabled={loading || !firstPending}
              title={!firstPending && !loading ? 'All campaigns have FCCPC references recorded' : undefined}
            >
              <i className="fa-solid fa-paper-plane" style={{ marginRight: '0.4rem' }} />
              Record Approval
            </button>
          );
        })()}
      </div>

      <div className="admin-content">

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Campaigns', value: total, color: 'var(--green-primary)' },
            { label: 'FCCPC Approved', value: approved, color: 'var(--success, #16a34a)' },
            { label: 'Under Review', value: underReview, color: '#2563eb' },
            { label: 'Pending Submission', value: pending, color: 'var(--gold)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '1rem', borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>{loading ? '…' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FCCPA §123 info alert ── */}
        <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <i className="fa-solid fa-circle-info" style={{ color: '#3b82f6', marginTop: '0.1rem', flexShrink: 0, fontSize: '1.125rem' }} />
          <div>
            <strong style={{ fontSize: '0.875rem', color: '#1d4ed8' }}>FCCPA 2018 — Section 123 Obligation</strong>
            <p style={{ fontSize: '0.8125rem', color: '#3b82f6', marginTop: '0.25rem', lineHeight: 1.6 }}>
              Every promotional competition must receive FCCPC approval before any ticket sales begin. Operating without approval is an offence under the Federal Competition &amp; Consumer Protection Act 2018. The Commission must also be notified at least 14 days before the draw date.
            </p>
          </div>
        </div>

        {/* ── Campaign approval table ── */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Campaign Approval Status</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }} />
                Loading campaigns…
              </div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.5rem' }} />{error}
              </div>
            ) : campaigns.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem', opacity: 0.3 }} />
                No campaigns yet. Create a campaign to start tracking approvals.
              </div>
            ) : (
              <table className="data-table data-table-responsive">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Property Value</th>
                    <th>FCCPC Tier</th>
                    <th>FCCPC Ref</th>
                    <th>Approval Date</th>
                    <th>Sell-in Expiry</th>
                    <th>14-day Draw Notif.</th>
                    <th>Post-draw Filing</th>
                    <th>Form CPC B</th>
                    <th>LSLGA</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const pv = parseFloat(String(c.marketValue));
                    const tier = getTier(pv);
                    const totalFccpc = pv * tier.rate + tier.app + 25000;
                    const isApproved = !!c.fccpcRef && !!c.fccpcApprovalDate;
                    const hasRef = !!c.fccpcRef;
                    return (
                      <tr key={c.id}>
                        <td data-label="Campaign">
                          <div style={{ fontWeight: 600 }}>{c.title}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.propertyState}{c.propertyLga ? ` · ${c.propertyLga}` : ''}</div>
                        </td>
                        <td data-label="Property Value"><strong>{fmt(pv)}</strong></td>
                        <td data-label="FCCPC Tier">
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{tier.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(tier.rate * 100).toFixed(1)}% · Est. {fmt(totalFccpc)}</div>
                        </td>
                        <td data-label="FCCPC Ref" style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{c.fccpcRef ?? '—'}</td>
                        <td data-label="Approval Date" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{fmtDate(c.fccpcApprovalDate)}</td>
                        <td data-label="Sell-in Expiry">{sellInBadge(c)}</td>
                        <td data-label="14-day Draw Notif.">{drawNotifBadge(c)}</td>
                        <td data-label="Post-draw Filing">{postDrawBadge(c)}</td>
                        <td data-label="Form CPC B">{cpcbBadge(c)}</td>
                        <td data-label="LSLGA">{lslgaBadge(c)}</td>
                        <td data-label="Status">
                          {isApproved
                            ? <span className="badge badge-green">Approved</span>
                            : hasRef
                              ? <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' }}>Under Review</span>
                              : <span className="badge badge-gold">Pending Submission</span>}
                        </td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => openModal(c)}>
                              <i className="fa-solid fa-pen" style={{ marginRight: '0.3rem' }} />
                              {hasRef ? 'Edit' : 'Record'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── FCCPC Fee Schedule table ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>FCCPC Fee Schedule — Schedule 3 Reference</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Federal Competition &amp; Consumer Protection Act 2018</span>
          </div>
          <div className="card-body">
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table data-table-responsive">
                <thead>
                  <tr>
                    <th>Property Prize Value</th>
                    <th>Monitoring Rate</th>
                    <th>Application Fee</th>
                    <th>Draw Attendance</th>
                    <th>Est. Total FCCPC Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map(t => (
                    <tr key={t.label}>
                      <td data-label="Property Prize Value" style={{ fontWeight: 600 }}>{t.label}</td>
                      <td data-label="Monitoring Rate">{(t.rate * 100).toFixed(1)}%</td>
                      <td data-label="Application Fee">{fmt(t.app)}</td>
                      <td data-label="Draw Attendance">{fmt(25000)}</td>
                      <td data-label="Est. Total FCCPC Cost" style={{ fontWeight: 700, color: 'var(--green-primary)' }}>Variable — depends on prize value</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.875rem' }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />
              All fees are paid to the FCCPC directly. The Draw Attendance Fee (₦25,000) is fixed regardless of prize value. Confirm current rates with the Commission before filing.
            </p>
          </div>
        </div>

      </div>

      {/* ── Record Approval Modal ── */}
      {modalCampaign && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ maxWidth: 560, margin: '3rem auto', padding: '1rem' }}>
            <div className="card" style={{ borderRadius: 16 }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Record FCCPC Approval</h3>
                <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
              </div>
              <div className="card-body" style={{ padding: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Campaign</label>
                  <div style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600 }}>
                    {modalCampaign.title}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>— {modalCampaign.propertyState}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">FCCPC Reference Number <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. FCCPC/2024/PROP/00142"
                    value={fccpcRef}
                    onChange={e => setFccpcRef(e.target.value)}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Approval Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={approvalDate}
                    onChange={e => setApprovalDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Documents Submitted to FCCPC</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    {[
                      'NIESV Valuation Certificate',
                      'Certificate of Occupancy (C of O)',
                      'Form CPC A — Competition Summary',
                      'Draft Terms & Conditions',
                      'Company Registration (CAC)',
                      'Escrow Bank Undertaking Letter',
                    ].map(doc => (
                      <label key={doc} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: 'var(--green-primary)' }} />
                        {doc}
                      </label>
                    ))}
                  </div>
                  <div className="form-hint">Checklist is for your reference only — not saved to database.</div>
                </div>

                {saveError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem', marginTop: '1rem', fontSize: '0.8125rem', color: '#dc2626' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />{saveError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => void handleSaveApproval()}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <i className="fa-solid fa-floppy-disk" style={{ marginRight: '0.4rem' }} />
                    {saving ? 'Saving…' : 'Save Approval Record'}
                  </button>
                  <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
