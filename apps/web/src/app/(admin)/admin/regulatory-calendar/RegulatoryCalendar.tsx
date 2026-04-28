'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ComplianceCampaign {
  id: string;
  title: string;
  propertyState: string;
  propertyLga: string;
  drawDate: string | null;
  fccpcApprovalDate: string | null;
}

interface DbDeadline {
  id: string;
  campaignId: string | null;
  title: string;
  status: string;
  completedAt: string | null;
}

type DeadlineType = 'notify' | 'winner' | 'formcpcb' | 'sellin';
type DeadlineStatus = 'overdue' | 'upcoming' | 'info' | 'complete';
type FilterKey = 'all' | 'overdue' | 'upcoming' | 'sellin' | 'complete';

interface DeadlineItem {
  id: string; // campaignId-type
  campaignId: string;
  campaign: string;
  location: string;
  action: string;
  detail: string;
  date: Date;
  icon: string;
  type: DeadlineType;
  dbId: string | null; // id in RegulatoryDeadline table if exists
  completed: boolean;
}

interface Props { token: string; apiUrl: string; }

// ── Helpers ────────────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function deadlineStatus(date: Date): DeadlineStatus {
  const diff = (date.getTime() - Date.now()) / 86400000;
  if (diff < 0) return 'overdue';
  if (diff <= 30) return 'upcoming';
  return 'info';
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────────
export function RegulatoryCalendar({ token, apiUrl }: Props) {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markError, setMarkError] = useState<{ id: string; msg: string } | null>(null);

  const buildDeadlines = useCallback((
    campaigns: ComplianceCampaign[],
    dbDeadlines: DbDeadline[],
  ): DeadlineItem[] => {
    const items: DeadlineItem[] = [];

    campaigns.forEach(c => {
      const loc = [c.propertyState, c.propertyLga].filter(Boolean).join(' · ');

      if (c.drawDate) {
        const DRAW_EVENTS: Array<{ type: DeadlineType; days: number; action: string; detail: string; icon: string }> = [
          {
            type: 'notify',
            days: -14,
            action: 'Notify FCCPC of draw date',
            detail: 'Written notification to FCCPC of draw date, venue, and method — FCCPA 2018 §124',
            icon: 'fa-bell',
          },
          {
            type: 'winner',
            days: 3,
            action: 'Submit winner details to FCCPC',
            detail: 'Name, contact, ticket number, and verification documents for the draw winner',
            icon: 'fa-user-check',
          },
          {
            type: 'formcpcb',
            days: 21,
            action: 'File Form CPC B — Post-Draw Report',
            detail: 'Complete FCCPC post-draw report: winner confirmation, prize transfer evidence, escrow closure',
            icon: 'fa-file-contract',
          },
        ];

        DRAW_EVENTS.forEach(ev => {
          const itemId = `${c.id}-${ev.type}`;
          const db = dbDeadlines.find(d => d.campaignId === c.id && d.title === ev.action);
          items.push({
            id: itemId,
            campaignId: c.id,
            campaign: c.title,
            location: loc,
            action: ev.action,
            detail: ev.detail,
            date: addDays(c.drawDate!, ev.days),
            icon: ev.icon,
            type: ev.type,
            dbId: db?.id ?? null,
            completed: db?.status === 'COMPLETED',
          });
        });
      }

      if (c.fccpcApprovalDate) {
        const expiryDate = new Date(c.fccpcApprovalDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const action = 'Sell-in Period Expires — FCCPC Re-Approval Required';
        const db = dbDeadlines.find(d => d.campaignId === c.id && d.title === action);
        const approvalFmt = new Date(c.fccpcApprovalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        items.push({
          id: `${c.id}-sellin`,
          campaignId: c.id,
          campaign: c.title,
          location: loc,
          action,
          detail: `FCCPC approval granted ${approvalFmt}. Maximum 12-month sell-in period. Ticket sales must cease and campaign re-submitted to FCCPC after this date if not yet drawn.`,
          date: expiryDate,
          icon: 'fa-hourglass-end',
          type: 'sellin',
          dbId: db?.id ?? null,
          completed: db?.status === 'COMPLETED',
        });
      }
    });

    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items;
  }, []);

  useEffect(() => {
    setFetchError('');
    void Promise.all([
      fetch(`${apiUrl}/api/admin/compliance/campaigns`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json() as Promise<{ success: boolean; data: ComplianceCampaign[] }>),
      fetch(`${apiUrl}/api/admin/compliance/deadlines`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json() as Promise<{ success: boolean; data: DbDeadline[] }>),
    ])
      .then(([camps, dls]) => {
        if (camps.success && dls.success) {
          setDeadlines(buildDeadlines(camps.data, dls.data));
        } else {
          setFetchError('Failed to load regulatory data from the server.');
        }
      })
      .catch(() => setFetchError('Network error — could not load regulatory calendar. Check your connection and refresh.'))
      .finally(() => setLoading(false));
  }, [apiUrl, token, buildDeadlines]);

  async function handleMarkComplete(item: DeadlineItem) {
    setMarkingId(item.id);
    setMarkError(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/compliance/deadlines/ensure-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: item.campaignId,
          title: item.action,
          description: item.detail,
          category: 'FCCPA',
          dueAt: item.date.toISOString(),
        }),
      });
      const json = await res.json() as { success: boolean; data?: { id: string }; error?: string };
      if (!res.ok || !json.success) {
        setMarkError({ id: item.id, msg: json.error ?? 'Failed to mark complete — please try again.' });
        return;
      }
      setDeadlines(prev => prev.map(d =>
        d.id === item.id ? { ...d, completed: true, dbId: json.data?.id ?? d.dbId } : d
      ));
    } catch {
      setMarkError({ id: item.id, msg: 'Network error — please try again.' });
    } finally {
      setMarkingId(null);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const pending = deadlines.filter(d => !d.completed);
  const totalCount = deadlines.length;
  const in7 = pending.filter(d => { const diff = (d.date.getTime() - now.getTime()) / 86400000; return diff >= 0 && diff <= 7; }).length;
  const thisMonth = pending.filter(d => d.date.getMonth() === now.getMonth() && d.date.getFullYear() === now.getFullYear()).length;
  const overdueCount = pending.filter(d => d.date < now).length;
  const sellInSoon = pending.filter(d => d.type === 'sellin' && (d.date.getTime() - now.getTime()) / 86400000 <= 90 && d.date >= now).length;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = deadlines.filter(d => {
    if (filter === 'complete') return d.completed;
    if (filter === 'overdue') return !d.completed && d.date < now;
    if (filter === 'upcoming') return !d.completed && deadlineStatus(d.date) === 'upcoming';
    if (filter === 'sellin') return d.type === 'sellin';
    return true;
  });

  function exportCSV() {
    if (filtered.length === 0) return;
    const headers = 'Campaign,Location,Action,Due Date,Status';
    const rows = filtered.map(d => {
      const status = d.completed ? 'complete' : deadlineStatus(d.date);
      return [d.campaign, d.location, d.action, d.date.toISOString().slice(0, 10), status]
        .map(v => `"${v}"`).join(',');
    }).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'regulatory-calendar.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'upcoming', label: 'Upcoming (30 days)' },
    { key: 'sellin', label: 'Sell-in Expiry' },
    { key: 'complete', label: 'Completed' },
  ];

  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Regulatory Calendar</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            FCCPA + LSLGA deadlines computed from campaign draw dates
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-print" style={{ marginRight: '0.4rem' }} />Print
          </button>
          <button type="button" onClick={exportCSV} className="btn btn-outline btn-sm" disabled={filtered.length === 0}>
            <i className="fa-solid fa-download" style={{ marginRight: '0.4rem' }} />Export
          </button>
        </div>
      </div>

      <div className="admin-content">

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Deadlines', value: totalCount, color: 'var(--green-primary)' },
            { label: 'Due in 7 Days', value: in7, color: 'var(--gold)' },
            { label: 'This Month', value: thisMonth, color: '#2563eb' },
            { label: 'Overdue', value: overdueCount, color: '#dc2626' },
            { label: 'Sell-in Expiring (90d)', value: sellInSoon, color: '#8b5cf6', title: 'Campaigns with FCCPC sell-in expiry within 90 days' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '1rem', borderTop: `4px solid ${s.color}` }} title={s.title}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>{loading ? '…' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FCCPA §124 banner ── */}
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ea580c', marginTop: '0.1rem', flexShrink: 0, fontSize: '1.125rem' }} />
          <div>
            <strong style={{ fontSize: '0.875rem', color: '#9a3412' }}>FCCPA 2018 — Mandatory Post-Draw Obligations</strong>
            <p style={{ fontSize: '0.8125rem', color: '#ea580c', marginTop: '0.25rem', lineHeight: 1.6 }}>
              <strong>14 days before draw:</strong> Notify FCCPC in writing of draw date, venue, and method (FCCPA 2018 §124).<br />
              <strong>3 days after draw:</strong> Submit winner details to FCCPC for verification.<br />
              <strong>21 days after draw:</strong> File Form CPC B post-draw report with FCCPC.<br />
              <strong>12 months from approval:</strong> Sell-in period expires — ticket sales must close and all unsold campaigns returned to FCCPC for re-approval.
            </p>
          </div>
        </div>

        {/* ── Filter buttons ── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Timeline ── */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Deadline Timeline</h3>
            {!loading && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {filtered.length} deadline{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="card-body" style={{ padding: '0 1.5rem' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }} />
                Loading deadlines…
              </div>
            ) : fetchError ? (
              <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, margin: '1rem 0', color: '#b91c1c', fontSize: '0.875rem' }}>
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: '1.25rem', flexShrink: 0 }} />
                <div>
                  <strong>Could not load regulatory calendar</strong>
                  <div style={{ marginTop: '0.25rem', opacity: 0.85 }}>{fetchError}</div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-calendar-check" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', opacity: 0.3 }} />
                No deadlines in this category.
              </div>
            ) : (
              filtered.map(d => {
                const status: DeadlineStatus = d.completed ? 'complete' : deadlineStatus(d.date);
                const diff = Math.round((d.date.getTime() - now.getTime()) / 86400000);
                const dotIcon = d.completed ? 'fa-check' : (status === 'overdue' ? 'fa-exclamation' : (status === 'upcoming' ? 'fa-clock' : d.icon));
                const isMarking = markingId === d.id;

                let dueLabelEl;
                if (d.completed) {
                  dueLabelEl = <span style={{ color: 'var(--success, #16a34a)', fontWeight: 600 }}>Completed</span>;
                } else if (diff < 0) {
                  dueLabelEl = <span style={{ color: '#dc2626', fontWeight: 700 }}>{Math.abs(diff)} days overdue</span>;
                } else if (diff === 0) {
                  dueLabelEl = <span style={{ color: '#dc2626', fontWeight: 700 }}>Due TODAY</span>;
                } else if (diff <= 7) {
                  dueLabelEl = <span style={{ color: '#d97706', fontWeight: 700 }}>Due in {diff} days</span>;
                } else {
                  dueLabelEl = <span style={{ color: 'var(--text-muted)' }}>Due in {diff} days</span>;
                }

                const dotColors: Record<DeadlineStatus, { bg: string; color: string }> = {
                  upcoming: { bg: '#fef9c3', color: '#a16207' },
                  overdue: { bg: '#fee2e2', color: '#dc2626' },
                  complete: { bg: '#dcfce7', color: '#16a34a' },
                  info: { bg: '#eff6ff', color: '#2563eb' },
                };
                const dot = dotColors[status];

                return (
                  <div key={d.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', background: dot.bg, color: dot.color }}>
                      <i className={`fa-solid ${dotIcon}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{d.action}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{d.campaign} — {d.location}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{d.detail}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{fmtDate(d.date)}</div>
                          <div style={{ marginTop: '0.25rem' }}>{dueLabelEl}</div>
                        </div>
                      </div>
                      {!d.completed && (
                        <div>
                          <button
                            type="button"
                            onClick={() => void handleMarkComplete(d)}
                            disabled={isMarking}
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: '0.625rem' }}
                          >
                            <i className={`fa-solid ${isMarking ? 'fa-spinner fa-spin' : 'fa-check'}`} style={{ marginRight: '0.3rem' }} />
                            {isMarking ? 'Saving…' : 'Mark Complete'}
                          </button>
                          {markError?.id === d.id && (
                            <span style={{ fontSize: '0.75rem', color: '#b91c1c', marginLeft: '0.5rem' }}>{markError.msg}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── LSLGA Annual Licence Renewal ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>LSLGA Annual Licence Renewal</h3>
            <span className="badge badge-gold">Lagos Only</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600 }}>Lagos State Lotteries &amp; Gaming Authority</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Licence expires annually. Renewal must be filed before expiry. Fee: ₦575,000 per licence year.
                  Failure to renew results in suspension of all Lagos campaign ticket sales.
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Next Renewal Due</div>
                <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--gold)' }}>31 Dec 2026</div>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} disabled title="File renewal directly with LSLGA — manual process">
                  Start Renewal
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
