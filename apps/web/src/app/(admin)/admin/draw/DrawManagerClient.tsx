'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrawStatus {
  campaign: {
    id: string;
    title: string;
    totalTickets: number;
    minTickets: number;
    ticketPrice: number;
    status: string;
    drawDate: string | null;
    drawMethod: string;
  };
  ticketsSold: number;
  meetsMinimum: boolean;
  draw: {
    id: string;
    status: string;
    witnessName: string;
    witnessTitle: string;
    initiatedBy: string;
    seedCommitment: string | null;
    drawSeed: string | null;
    winnerTicketId: string | null;
    ticketCount: number | null;
    publicAnnouncedAt: string | null;
    fccpcNotifiedAt: string | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PENDING:   { label: 'Pending',   bg: '#f3f4f6', color: '#374151' },
    SCHEDULED: { label: 'Scheduled', bg: '#fffbeb', color: '#92400e' },
    LIVE:      { label: 'Live',      bg: '#fef2f2', color: '#991b1b' },
    COMPLETED: { label: 'Completed', bg: '#f0fdf4', color: '#166534' },
    FILED:     { label: 'Filed',     bg: '#eff6ff', color: '#1e40af' },
  };
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 100, padding: '0.25rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: 0.5 }}>
      {status === 'LIVE' && (
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#dc2626', marginRight: 5, animation: 'pulse 1s ease-in-out infinite' }} />
      )}
      {s.label}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="btn btn-outline btn-sm"
      style={{ fontSize: '0.75rem' }}
    >
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '0.3rem' }} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DrawManagerClient({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign') ?? '';
  const WEB_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const [status, setStatus] = useState<DrawStatus | null>(null);
  const [loadError, setLoadError] = useState('');

  const [witnessName, setWitnessName]     = useState('');
  const [witnessTitle, setWitnessTitle]   = useState('');
  const [fccpcNotifDate, setFccpcNotifDate] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch status ─────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!campaignId) return;
    try {
      const res = await fetch(`${API}/api/admin/draws/${campaignId}/status`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { success: boolean; data: DrawStatus; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Failed to load status');
      setStatus(json.data);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load draw status');
    }
  }, [campaignId]);

  // ── Polling ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();

    pollRef.current = setInterval(() => {
      setStatus((prev) => {
        const s = prev?.draw?.status;
        if (s === 'COMPLETED' || s === 'FILED') {
          if (pollRef.current) clearInterval(pollRef.current);
          return prev;
        }
        fetchStatus();
        return prev;
      });
    }, 4000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  // ── Initiate ──────────────────────────────────────────────────────────────────
  async function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API}/api/admin/draws/${campaignId}/initiate`, {
        method: 'POST',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify({
          witnessName: witnessName.trim(),
          witnessTitle: witnessTitle.trim(),
          ...(fccpcNotifDate ? { fccpcNotifiedAt: fccpcNotifDate } : {}),
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { draw: { id: string }; seedCommitment: string; ticketListHash: string };
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? 'Initiation failed');
      setActionSuccess(
        `Draw initiated. Seed commitment: ${json.data?.seedCommitment ?? ''} | Ticket list hash: ${json.data?.ticketListHash ?? ''} — post the seed commitment publicly NOW.`,
      );
      await fetchStatus();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to initiate draw');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Announce ──────────────────────────────────────────────────────────────────
  async function handleAnnounce() {
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API}/api/admin/draws/${campaignId}/announce`, {
        method: 'POST',
        headers: authHeaders(token),
        credentials: 'include',
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Announce failed');
      setActionSuccess('Winner announced publicly. Announcement timestamp recorded in audit log.');
      await fetchStatus();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to record announcement');
    } finally {
      setActionLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (!campaignId) {
    return (
      <>
        <div className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Draw Manager</h1>
          </div>
          <Link href="/admin/campaigns" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.4rem' }} />Campaigns
          </Link>
        </div>
        <div className="admin-content">
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <i className="fa-solid fa-dice" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }} />
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Select a Campaign</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Open Draw Manager from a campaign page to manage its draw.
            </p>
            <Link href="/admin/campaigns" className="btn btn-primary btn-sm">
              View Campaigns
            </Link>
          </div>
        </div>
      </>
    );
  }

  const draw     = status?.draw;
  const campaign = status?.campaign;
  const drawStatus = draw?.status ?? 'NONE';
  const liveUrl  = `${WEB_BASE}/draw/live/${campaignId}`;
  const verifyUrl = `${WEB_BASE}/draw/verify/${campaignId}`;

  // ── 14-day FCCPC notification gate ───────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const notifDateObj = fccpcNotifDate ? new Date(fccpcNotifDate) : null;
  const daysSinceNotif = notifDateObj
    ? Math.floor((today.getTime() - notifDateObj.getTime()) / 86_400_000)
    : null;
  const fccpcDateError =
    fccpcNotifDate && daysSinceNotif !== null && daysSinceNotif < 14
      ? `FCCPC was notified ${daysSinceNotif} day(s) ago — 14 days required (FCCPA §124). Draw unlocks ${new Date(new Date(fccpcNotifDate).getTime() + 14 * 86_400_000).toLocaleDateString('en-GB')}.`
      : '';
  const fccpcGateBlocked = fccpcNotifDate !== '' && fccpcDateError !== '';

  // ── Download draw report ──────────────────────────────────────────────────────
  function downloadDrawReport() {
    if (!draw || !campaign || !status) return;
    const revenue = (status.ticketsSold * Number(campaign.ticketPrice)).toLocaleString('en-NG');
    const rows: [string, string][] = [
      ['Field', 'Value'],
      ['Campaign', campaign.title],
      ['Campaign ID', campaignId],
      ['Draw Method', campaign.drawMethod === 'RANDOM_ORG_VERIFIED' ? 'Random.org Verified' : 'Cryptographic RNG'],
      ['Eligible Tickets', draw.ticketCount?.toLocaleString() ?? String(status.ticketsSold)],
      ['Winning Ticket ID', draw.winnerTicketId ?? ''],
      ['Seed Commitment', draw.seedCommitment ?? ''],
      ['Revealed Draw Seed', draw.drawSeed ?? ''],
      ['Witness Name', draw.witnessName ?? ''],
      ['Witness Title', draw.witnessTitle ?? ''],
      ['FCCPC Notified', draw.fccpcNotifiedAt ? new Date(draw.fccpcNotifiedAt).toLocaleDateString('en-GB') : ''],
      ['Announced At', draw.publicAnnouncedAt ? new Date(draw.publicAnnouncedAt).toLocaleString('en-GB') : 'Pending'],
      ['Revenue (NGN)', revenue],
      ['Verification (Two-Phase)', `(1) sha256(drawPreSeed) must equal "${draw.seedCommitment}" (2) sha256(drawPreSeed + ":" + ticketListHash) must equal "${draw.drawSeed}"`],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `draw-report-${campaignId.slice(0, 8)}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
      `}</style>

      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Draw Manager</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.125rem 0 0' }}>
            {campaign?.title ?? `Campaign ${campaignId}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {draw && <StatusBadge status={draw.status} />}
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Live Overlay
          </a>
          {drawStatus === 'COMPLETED' && (
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '0.375rem' }} />Verify
            </a>
          )}
          <Link href={`/admin/campaigns/${campaignId}`} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.375rem' }} />Campaign
          </Link>
        </div>
      </div>

      <div className="admin-content">

        {loadError && (
          <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.875rem', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{loadError}
          </div>
        )}

        {actionSuccess && (
          <div style={{ padding: '0.875rem 1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', marginBottom: '1.5rem', color: '#166534', fontSize: '0.875rem', fontWeight: 600, wordBreak: 'break-all' }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />{actionSuccess}
          </div>
        )}
        {actionError && (
          <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.875rem', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{actionError}
          </div>
        )}

        {!status ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.75rem', display: 'block' }} />
            Loading draw status…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Campaign snapshot ────────────────────────────────────────── */}
            <div className="card">
              <div className="card-header" style={{ fontWeight: 700 }}>Campaign Snapshot</div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Campaign Status', value: campaign?.status },
                    { label: 'Tickets Sold',    value: status.ticketsSold.toLocaleString() },
                    { label: 'Revenue',         value: campaign ? `₦${(status.ticketsSold * Number(campaign.ticketPrice)).toLocaleString('en-NG')}` : '—', color: 'var(--gold)' },
                    { label: 'Min. Required',   value: campaign?.minTickets.toLocaleString() },
                    { label: 'Total Tickets',   value: campaign?.totalTickets.toLocaleString() },
                    { label: 'Draw Method',     value: campaign?.drawMethod === 'RANDOM_ORG_VERIFIED' ? 'Random.org' : 'Crypto RNG' },
                    { label: 'Threshold',       value: status.meetsMinimum ? '✓ Met' : '✗ Not met', color: status.meetsMinimum ? 'var(--success)' : 'var(--error)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
                      <div style={{ fontWeight: 700, color: color ?? 'var(--text-primary)' }}>{value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Step 1: Initiate ─────────────────────────────────────────── */}
            {(!draw || draw.status === 'PENDING') && (
              <div className="card">
                <div className="card-header" style={{ fontWeight: 700 }}>
                  <i className="fa-solid fa-1" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                  Initiate Draw
                </div>
                <div className="card-body">
                  {!status.meetsMinimum && (
                    <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#92400e' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.5rem' }} />
                      Minimum threshold not met ({status.ticketsSold.toLocaleString()}/{campaign?.minTickets.toLocaleString()}). Cannot initiate — trigger refunds instead.
                    </div>
                  )}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
                    Locks a cryptographic seed commitment that must be announced publicly before the draw executes.
                    An independent witness is required (FCCPA §124).
                  </p>
                  <form onSubmit={handleInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="admin-chart-grid-1-1" style={{ gap: '1rem', marginBottom: 0 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Witness Name <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input className="form-input" value={witnessName} onChange={(e) => setWitnessName(e.target.value)}
                          placeholder="e.g. Funmilayo Okonkwo" required />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Independent witness present at the draw</span>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Witness Title / Organisation <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input className="form-input" value={witnessTitle} onChange={(e) => setWitnessTitle(e.target.value)}
                          placeholder="e.g. FCCPA Compliance Officer" required />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Their role or organisation</span>
                      </div>
                    </div>

                    {/* FCCPC §124 — notification date gate */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.625rem', fontSize: '0.875rem' }}>
                        <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.4rem' }} />
                        FCCPA §124 — FCCPC Notification Date
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                          Date FCCPC was notified of this draw
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.375rem' }}>(must be ≥ 14 days ago)</span>
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          value={fccpcNotifDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setFccpcNotifDate(e.target.value)}
                          style={{ maxWidth: 220 }}
                        />
                      </div>
                      {fccpcDateError && (
                        <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.8125rem', color: '#991b1b', fontWeight: 600 }}>
                          <i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.4rem' }} />{fccpcDateError}
                        </div>
                      )}
                      {fccpcNotifDate && !fccpcDateError && (
                        <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: '#166534', fontWeight: 600 }}>
                          <i className="fa-solid fa-circle-check" style={{ marginRight: '0.4rem' }} />
                          Notified {daysSinceNotif} day(s) ago — requirement satisfied.
                        </div>
                      )}
                    </div>

                    <div>
                      <button type="submit" className="btn btn-primary"
                        disabled={actionLoading || !status.meetsMinimum || !witnessName.trim() || !witnessTitle.trim() || fccpcGateBlocked}>
                        {actionLoading
                          ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Initiating…</>
                          : <><i className="fa-solid fa-play" style={{ marginRight: '0.375rem' }} />Initiate Draw</>}
                      </button>
                      {fccpcGateBlocked && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--error)', marginLeft: '0.75rem', fontWeight: 600 }}>
                          Draw blocked — 14-day FCCPC notice not satisfied.
                        </span>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Step 2: SCHEDULED — announce seed commitment ─────────────── */}
            {draw?.status === 'SCHEDULED' && draw.seedCommitment && (
              <div className="card" style={{ borderColor: '#fbbf24', borderWidth: 2 }}>
                <div className="card-header" style={{ fontWeight: 700, background: '#fffbeb', color: '#92400e' }}>
                  <i className="fa-solid fa-2" style={{ marginRight: '0.5rem' }} />
                  ⚠️ Announce Seed Commitment NOW — Before Draw Executes
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7 }}>
                    Post this on YouTube, the website, and social media <strong>right now</strong>. Once announced, the winning
                    seed is cryptographically locked — it cannot be changed by anyone, including RaffleProp staff.
                  </p>
                  <div style={{ background: '#0f172a', color: '#f0c060', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: '1rem', border: '1px solid #fbbf24' }}>
                    <div style={{ color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>SHA-256 Seed Commitment</div>
                    {draw.seedCommitment}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <CopyButton value={draw.seedCommitment} label="Copy Commitment" />
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Open Live Overlay
                    </a>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--warning)' }} />
                    Draw worker is queued — will execute automatically. Page refreshes every 4 seconds.
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2b: LIVE ────────────────────────────────────────────── */}
            {draw?.status === 'LIVE' && (
              <div className="card" style={{ borderColor: '#ef4444', borderWidth: 2 }}>
                <div className="card-header" style={{ fontWeight: 700, background: '#fef2f2', color: '#991b1b' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginRight: 8, animation: 'pulse 1s ease-in-out infinite' }} />
                  Draw In Progress — Do Not Close This Page
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--error)' }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>Worker is selecting the winner…</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Using {campaign?.drawMethod === 'RANDOM_ORG_VERIFIED' ? 'Random.org API' : 'cryptographic RNG + rejection sampling'}. Page refreshes automatically.
                      </div>
                    </div>
                  </div>
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Open Live Overlay for Stream
                  </a>
                </div>
              </div>
            )}

            {/* ── Step 3: COMPLETED ────────────────────────────────────────── */}
            {draw?.status === 'COMPLETED' && (
              <div className="card" style={{ borderColor: '#16a34a', borderWidth: 2 }}>
                <div className="card-header" style={{ fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                  <i className="fa-solid fa-3" style={{ marginRight: '0.5rem' }} />
                  Draw Complete — Announce Winner
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                      { label: 'Winner Ticket ID',     value: draw.winnerTicketId ?? '—', mono: true, color: 'var(--green-primary)' },
                      { label: 'Eligible Tickets',     value: draw.ticketCount?.toLocaleString() ?? '—' },
                      { label: 'Witness',              value: draw.witnessName, sub: draw.witnessTitle },
                      { label: 'Commitment Verified',  value: '✓ Two-phase commitment', color: 'var(--success)' },
                    ].map(({ label, value, mono, color, sub }) => (
                      <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>{label}</div>
                        <div style={{ fontWeight: 700, color: color ?? 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all', fontSize: mono ? '0.85rem' : undefined }}>{value}</div>
                        {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
                      </div>
                    ))}
                  </div>

                  {draw.seedCommitment && (
                    <div style={{ background: '#0f172a', color: '#94a3b8', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: '1.25rem', lineHeight: 1.8 }}>
                      <div><span style={{ color: '#64748b' }}>Commitment: </span><span style={{ color: '#f0c060', wordBreak: 'break-all' }}>{draw.seedCommitment}</span></div>
                      {draw.drawSeed && <div><span style={{ color: '#64748b' }}>Revealed:   </span><span style={{ color: '#a3e635', wordBreak: 'break-all' }}>{draw.drawSeed}</span></div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!draw.publicAnnouncedAt ? (
                      <button type="button" className="btn btn-primary" onClick={handleAnnounce} disabled={actionLoading}>
                        {actionLoading
                          ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Recording…</>
                          : <><i className="fa-solid fa-bullhorn" style={{ marginRight: '0.375rem' }} />Record Public Announcement</>}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>
                        <i className="fa-solid fa-check-circle" style={{ marginRight: '0.375rem' }} />
                        Announced {new Date(draw.publicAnnouncedAt).toLocaleString()}
                      </span>
                    )}
                    {draw.winnerTicketId && <CopyButton value={draw.winnerTicketId} label="Copy Winner ID" />}
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Live Overlay
                    </a>
                    <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '0.375rem' }} />Public Verify
                    </a>
                    <button type="button" className="btn btn-outline btn-sm" onClick={downloadDrawReport}>
                      <i className="fa-solid fa-download" style={{ marginRight: '0.375rem' }} />Draw Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Post-draw compliance ─────────────────────────────── */}
            {(draw?.status === 'COMPLETED' || draw?.status === 'FILED') && (
              <div className="card">
                <div className="card-header" style={{ fontWeight: 700 }}>
                  <i className="fa-solid fa-4" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                  Post-Draw Compliance (FCCPA §124)
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Winner Notification</div>
                      <div style={{ fontWeight: 600, color: draw?.fccpcNotifiedAt ? 'var(--success)' : 'var(--warning)' }}>
                        {draw?.fccpcNotifiedAt ? `Sent ${new Date(draw.fccpcNotifiedAt).toLocaleDateString()}` : 'Pending — 3-day FCCPA deadline'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Form CPC B Filing</div>
                      <div style={{ fontWeight: 600, color: draw?.status === 'FILED' ? 'var(--success)' : 'var(--warning)' }}>
                        {draw?.status === 'FILED' ? 'Filed ✓' : '21-day deadline from draw date'}
                      </div>
                    </div>
                  </div>
                  <Link href={`/admin/post-draw?campaign=${campaignId}`} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-file-arrow-up" style={{ marginRight: '0.375rem' }} />Upload Form CPC B
                  </Link>
                </div>
              </div>
            )}

            {draw?.status === 'FILED' && (
              <div style={{ padding: '1rem 1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', color: '#1e40af', fontWeight: 600, fontSize: '0.875rem' }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />
                Draw fully complete. Form CPC B filed. All FCCPA §124 obligations met.
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}
