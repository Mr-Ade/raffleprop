'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const WEB = process.env['NEXT_PUBLIC_WEB_URL'] ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrawStatus {
  campaign: {
    id: string;
    title: string;
    totalTickets: number;
    minTickets: number;
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

function authHeaders(): HeadersInit {
  const token =
    document.cookie.match(/rp_access=([^;]+)/)?.[1] ??
    localStorage.getItem('rp_access') ??
    '';
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
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
      {status === 'LIVE' && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#dc2626', marginRight: 5, animation: 'pulse 1s ease-in-out infinite' }} />}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DrawPage() {
  const { campaignId } = useParams<{ campaignId: string }>();

  const [status, setStatus] = useState<DrawStatus | null>(null);
  const [loadError, setLoadError] = useState('');

  // Initiate form state
  const [witnessName, setWitnessName] = useState('');
  const [witnessTitle, setWitnessTitle] = useState('');

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch status ─────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/draws/${campaignId}/status`, {
        headers: authHeaders(),
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

    // Poll while draw is active (not yet completed/filed)
    pollRef.current = setInterval(() => {
      const drawStatus = status?.draw?.status;
      if (drawStatus === 'COMPLETED' || drawStatus === 'FILED') {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      fetchStatus();
    }, 4000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus, status?.draw?.status]);

  // ── Initiate draw ─────────────────────────────────────────────────────────────
  async function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`${API}/api/admin/draws/${campaignId}/initiate`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ witnessName: witnessName.trim(), witnessTitle: witnessTitle.trim() }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { draw: { id: string }; seedCommitment: string; instruction: string };
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? 'Initiation failed');
      setActionSuccess(
        `Draw initiated. Seed commitment: ${json.data?.seedCommitment ?? ''} — announce this publicly NOW before the draw executes.`,
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
        headers: authHeaders(),
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

  const draw = status?.draw;
  const campaign = status?.campaign;
  const drawStatus = draw?.status ?? 'NONE';

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Draw Management</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.125rem 0 0' }}>
            {campaign?.title ?? `Campaign ${campaignId}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {draw && <StatusBadge status={draw.status} />}
          <a
            href={`${WEB}/draw/live/${campaignId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />
            Live Overlay
          </a>
          {drawStatus === 'COMPLETED' && (
            <a
              href={`${WEB}/draw/verify/${campaignId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '0.375rem' }} />
              Verify
            </a>
          )}
        </div>
      </div>

      <div className="admin-content">

        {/* ── Load error ── */}
        {loadError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{loadError}
          </div>
        )}

        {/* ── Action feedback ── */}
        {actionSuccess && (
          <div style={{ padding: '0.875rem 1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', marginBottom: '1.5rem', fontWeight: 600, color: '#166534', fontSize: '0.875rem', wordBreak: 'break-all' }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />{actionSuccess}
          </div>
        )}
        {actionError && (
          <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', marginBottom: '1.5rem', fontWeight: 600, color: '#991b1b', fontSize: '0.875rem' }}>
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

            {/* ── Campaign snapshot ──────────────────────────────────────────── */}
            <div className="card">
              <div className="card-header" style={{ fontWeight: 700 }}>Campaign Snapshot</div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Status', value: campaign?.status },
                    { label: 'Tickets Sold', value: status.ticketsSold.toLocaleString() },
                    { label: 'Minimum Required', value: campaign?.minTickets.toLocaleString() },
                    { label: 'Total Tickets', value: campaign?.totalTickets.toLocaleString() },
                    { label: 'Draw Method', value: campaign?.drawMethod === 'RANDOM_ORG_VERIFIED' ? 'Random.org' : 'Crypto RNG' },
                    {
                      label: 'Threshold',
                      value: status.meetsMinimum ? '✓ Met' : '✗ Not met',
                      color: status.meetsMinimum ? 'var(--success)' : 'var(--error)',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
                      <div style={{ fontWeight: 700, color: color ?? 'var(--text-primary)' }}>{value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Step 1: Initiate (show when no draw or PENDING) ────────────── */}
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
                      Minimum ticket threshold not met ({status.ticketsSold}/{campaign?.minTickets}). Cannot initiate draw — trigger refunds instead.
                    </div>
                  )}

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
                    Initiating the draw locks a cryptographic seed commitment which must be announced
                    publicly before the draw executes. An independent witness is required (FCCPA §124).
                  </p>

                  <form onSubmit={handleInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">
                          Witness Name <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          value={witnessName}
                          onChange={(e) => setWitnessName(e.target.value)}
                          placeholder="e.g. Funmilayo Okonkwo"
                          required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                          Independent witness present at the draw (FCCPA §124)
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          Witness Title / Organisation <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          value={witnessTitle}
                          onChange={(e) => setWitnessTitle(e.target.value)}
                          placeholder="e.g. FCCPA Compliance Officer"
                          required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                          Their role or organisation
                        </span>
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={actionLoading || !status.meetsMinimum || !witnessName.trim() || !witnessTitle.trim()}
                      >
                        {actionLoading
                          ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Initiating…</>
                          : <><i className="fa-solid fa-play" style={{ marginRight: '0.375rem' }} />Initiate Draw</>
                        }
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Step 2: Seed commitment (SCHEDULED — announce before worker runs) ── */}
            {draw?.status === 'SCHEDULED' && draw.seedCommitment && (
              <div className="card" style={{ borderColor: '#fbbf24', borderWidth: 2 }}>
                <div className="card-header" style={{ fontWeight: 700, background: '#fffbeb', color: '#92400e' }}>
                  <i className="fa-solid fa-2" style={{ marginRight: '0.5rem' }} />
                  ⚠️ Announce Seed Commitment NOW — Before Draw Executes
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7 }}>
                    Post this commitment publicly on YouTube, the website, and social media <strong>immediately</strong>.
                    Once announced, the winning seed is cryptographically locked — it cannot be changed
                    even by RaffleProp staff.
                  </p>
                  <div style={{ background: '#0f172a', color: '#f0c060', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: '1rem', border: '1px solid #fbbf24' }}>
                    <div style={{ color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>SHA-256 Seed Commitment</div>
                    {draw.seedCommitment}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <CopyButton value={draw.seedCommitment} label="Copy Commitment" />
                    <a href={`${WEB}/draw/live/${campaignId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Open Live Overlay
                    </a>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--warning)' }} />
                    Draw worker is queued — will execute automatically. This page refreshes every 4 seconds.
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2b: LIVE — draw worker running ───────────────────────── */}
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
                        Using {campaign?.drawMethod === 'RANDOM_ORG_VERIFIED' ? 'Random.org API' : 'cryptographic RNG + rejection sampling'}.
                        This page refreshes automatically.
                      </div>
                    </div>
                  </div>
                  <a href={`${WEB}/draw/live/${campaignId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Open Live Overlay for Stream
                  </a>
                </div>
              </div>
            )}

            {/* ── Step 3: Result — COMPLETED ────────────────────────────────── */}
            {draw?.status === 'COMPLETED' && (
              <div className="card" style={{ borderColor: '#16a34a', borderWidth: 2 }}>
                <div className="card-header" style={{ fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                  <i className="fa-solid fa-3" style={{ marginRight: '0.5rem' }} />
                  Draw Complete — Announce Winner
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Winner Ticket ID</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all', color: 'var(--green-primary)' }}>{draw.winnerTicketId ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Eligible Tickets</div>
                      <div style={{ fontWeight: 700 }}>{draw.ticketCount?.toLocaleString() ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Witness</div>
                      <div style={{ fontWeight: 700 }}>{draw.witnessName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{draw.witnessTitle}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Commitment Verified</div>
                      <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                        <i className="fa-solid fa-shield-check" style={{ marginRight: '0.375rem' }} />sha256(drawSeed) === seedCommitment ✓
                      </div>
                    </div>
                  </div>

                  {draw.seedCommitment && (
                    <div style={{ background: '#0f172a', color: '#94a3b8', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div><span style={{ color: '#64748b' }}>Seed Commitment: </span><span style={{ color: '#f0c060', wordBreak: 'break-all' }}>{draw.seedCommitment}</span></div>
                        {draw.drawSeed && <div><span style={{ color: '#64748b' }}>Revealed Seed:   </span><span style={{ color: '#a3e635', wordBreak: 'break-all' }}>{draw.drawSeed}</span></div>}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!draw.publicAnnouncedAt ? (
                      <button
                        className="btn btn-primary"
                        onClick={handleAnnounce}
                        disabled={actionLoading}
                      >
                        {actionLoading
                          ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Recording…</>
                          : <><i className="fa-solid fa-bullhorn" style={{ marginRight: '0.375rem' }} />Record Public Announcement</>
                        }
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>
                        <i className="fa-solid fa-check-circle" style={{ marginRight: '0.375rem' }} />
                        Announced {new Date(draw.publicAnnouncedAt).toLocaleString()}
                      </span>
                    )}
                    {draw.winnerTicketId && <CopyButton value={draw.winnerTicketId} label="Copy Winner ID" />}
                    <a href={`${WEB}/draw/live/${campaignId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />Live Overlay
                    </a>
                    <a href={`${WEB}/draw/verify/${campaignId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '0.375rem' }} />Public Verify Page
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Post-draw compliance ───────────────────────────────── */}
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
                        {draw?.fccpcNotifiedAt
                          ? `Sent ${new Date(draw.fccpcNotifiedAt).toLocaleDateString()}`
                          : 'Pending — 3-day deadline'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.375rem' }}>Form CPC B Filing</div>
                      <div style={{ fontWeight: 600, color: draw?.status === 'FILED' ? 'var(--success)' : 'var(--warning)' }}>
                        {draw?.status === 'FILED' ? 'Filed ✓' : '21-day deadline from draw completion'}
                      </div>
                    </div>
                  </div>
                  <a href="/admin/post-draw" className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-file-arrow-up" style={{ marginRight: '0.375rem' }} />Upload Form CPC B
                  </a>
                </div>
              </div>
            )}

            {/* ── Draw FILED ─────────────────────────────────────────────────── */}
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
