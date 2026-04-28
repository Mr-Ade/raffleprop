'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CampaignOption {
  id: string;
  title: string;
  status: string;
  ticketCount: number;
}

interface StatsData {
  allUsers: number;
  newsletter: number;
  allTicketHolders: number;
  campaigns: CampaignOption[];
}

interface Broadcast {
  id: string;
  subject: string;
  body: string;
  audience: string;
  campaignId: string | null;
  campaignTitle: string | null;
  sentCount: number;
  failCount: number;
  status: string;
  createdAt: string;
}

interface HistoryPage {
  data: Broadcast[];
  total: number;
  page: number;
  totalPages: number;
}

type AudienceKey = 'ALL_USERS' | 'NEWSLETTER' | 'CAMPAIGN_TICKETS' | 'ALL_TICKET_HOLDERS';

const AUDIENCE_LABELS: Record<AudienceKey, string> = {
  ALL_USERS:          'All Registered Users',
  NEWSLETTER:         'Newsletter Subscribers',
  CAMPAIGN_TICKETS:   'Campaign Ticket Holders',
  ALL_TICKET_HOLDERS: 'All Ticket Holders (ever)',
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  SENT:    { cls: 'badge-green', label: 'Sent' },
  PARTIAL: { cls: 'badge-gold',  label: 'Partial' },
  FAILED:  { cls: 'badge-red',   label: 'Failed' },
};

const BODY_MAX = 5000;
const LARGE_AUDIENCE_THRESHOLD = 500;

// ── Component ─────────────────────────────────────────────────────────────────
export function CommsClient({ token, apiUrl }: { token: string; apiUrl: string }) {
  const [tab, setTab] = useState<'compose' | 'history'>('compose');

  // Compose state
  const [subject, setSubject]         = useState('');
  const [body, setBody]               = useState('');
  const [audience, setAudience]       = useState<AudienceKey>('ALL_TICKET_HOLDERS');
  const [campaignId, setCampaignId]   = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  // Stats
  const [stats, setStats]           = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // History
  const [history, setHistory]             = useState<HistoryPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError]   = useState('');
  const [historyPage, setHistoryPage]     = useState(1);
  const [expandedRow, setExpandedRow]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/comms/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ success: boolean; data: StatsData }>)
      .then(j => {
        if (j.success) setStats(j.data);
        else setStatsError('Failed to load audience stats.');
      })
      .catch(() => setStatsError('Could not reach the server. Audience counts unavailable.'))
      .finally(() => setStatsLoading(false));
  }, [apiUrl, token]);

  const loadHistory = useCallback((page: number) => {
    setHistoryLoading(true);
    setHistoryError('');
    fetch(`${apiUrl}/api/admin/comms/broadcasts?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ success: boolean; data: HistoryPage }>)
      .then(j => {
        if (j.success) { setHistory(j.data); setHistoryPage(page); }
        else setHistoryError('Failed to load broadcast history.');
      })
      .catch(() => setHistoryError('Could not reach the server.'))
      .finally(() => setHistoryLoading(false));
  }, [apiUrl, token]);

  function switchTab(t: 'compose' | 'history') {
    setTab(t);
    if (t === 'history' && !history) loadHistory(1);
  }

  function recipientCount(): number | null {
    if (!stats) return null;
    if (audience === 'ALL_USERS') return stats.allUsers;
    if (audience === 'NEWSLETTER') return stats.newsletter;
    if (audience === 'ALL_TICKET_HOLDERS') return stats.allTicketHolders;
    if (audience === 'CAMPAIGN_TICKETS') {
      return stats.campaigns.find(c => c.id === campaignId)?.ticketCount ?? null;
    }
    return null;
  }

  const count   = recipientCount();
  const canSend = subject.trim().length > 0
    && body.trim().length > 0
    && body.length <= BODY_MAX
    && (audience !== 'CAMPAIGN_TICKETS' || campaignId !== '');

  const isLargeAudience = count !== null && count > LARGE_AUDIENCE_THRESHOLD;

  async function handleSend() {
    setSending(true);
    setSendError('');
    setConfirmSend(false);
    try {
      const res = await fetch(`${apiUrl}/api/admin/comms/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, body, audience, campaignId: campaignId || undefined }),
      });
      const json = await res.json() as { success: boolean; message?: string; error?: string };
      if (!res.ok || !json.success) {
        setSendError(json.error ?? 'Failed to send broadcast — please try again.');
        return;
      }
      setSuccessMsg(json.message ?? 'Broadcast sent.');
      setSubject('');
      setBody('');
      setHistory(null); // force history reload next visit
    } catch {
      setSendError('Network error — check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Comms Hub</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Send email broadcasts to users, ticket holders, or subscribers
          </p>
        </div>
      </div>

      <div className="admin-content">

        {/* ── Audience stat cards ── */}
        {statsError ? (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#92400e' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
            {statsError}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'All Users',       value: stats?.allUsers,         color: 'var(--green-primary)' },
              { label: 'Newsletter Subs', value: stats?.newsletter,       color: '#2563eb' },
              { label: 'Ticket Holders',  value: stats?.allTicketHolders, color: '#8b5cf6' },
              { label: 'Campaigns',       value: stats?.campaigns.length, color: 'var(--gold)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: '1rem', borderTop: `4px solid ${s.color}` }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>
                  {statsLoading ? '…' : (s.value ?? 0).toLocaleString()}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['compose', 'history'] as const).map(t => (
            <button key={t} type="button"
              onClick={() => switchTab(t)}
              className={tab === t ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
            >
              <i className={`fa-solid ${t === 'compose' ? 'fa-pen-to-square' : 'fa-clock-rotate-left'}`}
                style={{ marginRight: '0.4rem' }} />
              {t === 'compose' ? 'Compose' : 'History'}
              {t === 'history' && history && (
                <span className="badge-count" style={{ marginLeft: '0.4rem' }}>{history.total}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── COMPOSE TAB ── */}
        {tab === 'compose' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '1.5rem', alignItems: 'flex-start' }}>

            {/* Left — message form */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-envelope" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                  New Broadcast
                </h3>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {successMsg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', color: '#166534', fontSize: '0.875rem', fontWeight: 600 }}>
                    <i className="fa-solid fa-circle-check" />
                    {successMsg}
                    <button type="button" onClick={() => setSuccessMsg('')}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                  </div>
                )}

                {/* Subject */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject line <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Draw reminder — 3 Bedroom Lekki Phase 1"
                    maxLength={200}
                  />
                  <p className="form-hint" style={{ color: subject.length > 180 ? '#dc2626' : undefined }}>
                    {subject.length}/200 characters
                    {subject.length > 60 && subject.length <= 200 && (
                      <span style={{ marginLeft: '0.5rem', color: '#b45309' }}>· Best under 60 for inbox display</span>
                    )}
                  </p>
                </div>

                {/* Body */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Message body <span className="required">*</span></label>
                  <textarea
                    className="form-input"
                    rows={10}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder={`Write your message here. Each paragraph will be formatted automatically.\n\nExample:\nThe draw for our Lekki Phase 1 property is scheduled for 15 May 2026 at 2PM.\n\nJoin us live on our YouTube channel. Good luck!`}
                    style={{ resize: 'vertical', fontFamily: 'inherit', borderColor: body.length > BODY_MAX ? '#dc2626' : undefined }}
                  />
                  <p className="form-hint" style={{ color: body.length > BODY_MAX ? '#dc2626' : body.length > BODY_MAX * 0.9 ? '#b45309' : undefined }}>
                    {body.length.toLocaleString()}/{BODY_MAX.toLocaleString()} characters
                    {body.length > BODY_MAX && ' — message too long'}
                  </p>
                  <p className="form-hint">Plain text — each line break becomes a paragraph. No HTML needed.</p>
                </div>

                {sendError && (
                  <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#b91c1c' }}>
                    <i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.375rem' }} />
                    {sendError}
                  </div>
                )}

                {/* Large audience warning */}
                {isLargeAudience && !confirmSend && canSend && (
                  <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: '#92400e' }}>
                    <i className="fa-solid fa-clock" style={{ marginRight: '0.375rem' }} />
                    <strong>Large audience:</strong> Sending to {count!.toLocaleString()} recipients may take 30–60 seconds. Keep this page open until confirmed.
                  </div>
                )}

                {/* Send / Confirm */}
                {!confirmSend ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canSend || sending}
                    onClick={() => setConfirmSend(true)}
                  >
                    <i className="fa-solid fa-paper-plane" style={{ marginRight: '0.5rem' }} />
                    Send Broadcast
                    {count !== null && ` to ${count.toLocaleString()} recipient${count !== 1 ? 's' : ''}`}
                  </button>
                ) : (
                  <div style={{ padding: '1rem', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e', marginBottom: '0.5rem' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
                      Confirm: send to {count !== null ? count.toLocaleString() : '?'} recipient{count !== 1 ? 's' : ''}?
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#78350f', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                      This cannot be undone. Every recipient will receive the email immediately.
                      {isLargeAudience && ' This may take up to a minute — do not close the page.'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-primary btn-sm"
                        disabled={sending} onClick={() => void handleSend()}>
                        {sending
                          ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Sending…</>
                          : <><i className="fa-solid fa-paper-plane" style={{ marginRight: '0.375rem' }} />Yes, Send Now</>}
                      </button>
                      <button type="button" className="btn btn-outline btn-sm"
                        disabled={sending} onClick={() => setConfirmSend(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right — audience selector + tips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-users" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                    Audience
                  </h3>
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {(Object.keys(AUDIENCE_LABELS) as AudienceKey[]).map(key => {
                    let hint = '';
                    if (key === 'ALL_USERS' && stats) hint = `${stats.allUsers.toLocaleString()} registered users`;
                    if (key === 'NEWSLETTER' && stats) hint = `${stats.newsletter.toLocaleString()} subscribers`;
                    if (key === 'ALL_TICKET_HOLDERS' && stats) hint = `${stats.allTicketHolders.toLocaleString()} users with paid tickets`;
                    if (key === 'CAMPAIGN_TICKETS') hint = 'Select a specific campaign below';
                    return (
                      <label key={key} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                        cursor: 'pointer', padding: '0.625rem', borderRadius: 'var(--radius)',
                        border: `2px solid ${audience === key ? 'var(--green-primary)' : 'var(--border)'}`,
                        background: audience === key ? 'var(--green-50)' : '#fff',
                        transition: 'all 0.15s',
                      }}>
                        <input type="radio" name="audience" value={key} checked={audience === key}
                          onChange={() => { setAudience(key); if (key !== 'CAMPAIGN_TICKETS') setCampaignId(''); }}
                          style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{AUDIENCE_LABELS[key]}</div>
                          {hint && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{hint}</div>}
                        </div>
                      </label>
                    );
                  })}

                  {/* Campaign picker */}
                  {audience === 'CAMPAIGN_TICKETS' && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8125rem' }}>Campaign <span className="required">*</span></label>
                      {stats?.campaigns.length === 0 ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No campaigns available.</p>
                      ) : (
                        <select className="form-input" value={campaignId}
                          onChange={e => setCampaignId(e.target.value)}
                          style={{ fontSize: '0.8125rem' }}>
                          <option value="">— Select campaign —</option>
                          {(stats?.campaigns ?? []).map(c => (
                            <option key={c.id} value={c.id}>
                              {c.title} · {c.ticketCount.toLocaleString()} tickets · {c.status}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem', color: '#166534' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />Best practices
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.9 }}>
                  <li>Keep subject lines under 60 characters</li>
                  <li>One clear call-to-action per message</li>
                  <li>Use ticket holders for draw reminders</li>
                  <li>Use newsletter for campaign launches</li>
                  <li>All emails include an unsubscribe footer</li>
                </ul>
              </div>

              {/* Compliance notice */}
              <div style={{ padding: '0.875rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.6 }}>
                <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.375rem' }} />
                <strong>NDPR compliant:</strong> Every broadcast includes an unsubscribe link and your CAC registration (RC 9484205) in the email footer.
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Sent Broadcasts
                {history && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>({history.total.toLocaleString()} total)</span>}
              </h3>
              {!historyLoading && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => loadHistory(historyPage)}>
                  <i className="fa-solid fa-rotate-right" style={{ marginRight: '0.375rem' }} />Refresh
                </button>
              )}
            </div>

            {historyError && (
              <div style={{ margin: '1rem 1.5rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#b91c1c' }}>
                <i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.375rem' }} />
                {historyError}
                <button type="button" onClick={() => loadHistory(1)}
                  style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8125rem' }}>
                  Retry
                </button>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              {historyLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }} />
                  Loading history…
                </div>
              ) : !history || history.data.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-envelope-open" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem', opacity: 0.3 }} />
                  No broadcasts sent yet.
                </div>
              ) : (
                <>
                  <table className="data-table data-table-responsive">
                    <thead>
                      <tr>
                        <th>Subject / Body</th>
                        <th>Audience</th>
                        <th style={{ textAlign: 'right' }}>Sent</th>
                        <th style={{ textAlign: 'right' }}>Failed</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.data.map(b => {
                        const badge        = STATUS_BADGE[b.status] ?? { cls: 'badge-gray', label: b.status };
                        const audienceLabel = AUDIENCE_LABELS[b.audience as AudienceKey] ?? b.audience;
                        const isExpanded   = expandedRow === b.id;
                        const preview      = b.body.length > 120 ? b.body.slice(0, 120) + '…' : b.body;
                        return (
                            <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedRow(isExpanded ? null : b.id)}>
                              <td style={{ maxWidth: 320 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.subject}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  {isExpanded ? b.body : preview}
                                </div>
                                <button type="button" onClick={e => { e.stopPropagation(); setExpandedRow(isExpanded ? null : b.id); }}
                                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.7rem', color: 'var(--green-primary)', cursor: 'pointer', marginTop: '0.2rem' }}>
                                  {isExpanded ? 'Show less ▲' : 'Show more ▼'}
                                </button>
                              </td>
                              <td style={{ fontSize: '0.8125rem' }}>
                                {audienceLabel}
                                {b.campaignTitle && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.campaignTitle}</div>
                                )}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--green-primary)', textAlign: 'right' }}>{b.sentCount.toLocaleString()}</td>
                              <td style={{ color: b.failCount > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: b.failCount > 0 ? 700 : 400, textAlign: 'right' }}>
                                {b.failCount.toLocaleString()}
                              </td>
                              <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(b.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {history.totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                      <button type="button" className="btn btn-outline btn-sm"
                        disabled={historyPage <= 1 || historyLoading}
                        onClick={() => loadHistory(historyPage - 1)}>
                        <i className="fa-solid fa-chevron-left" style={{ marginRight: '0.25rem' }} />Prev
                      </button>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Page {historyPage} of {history.totalPages}
                      </span>
                      <button type="button" className="btn btn-outline btn-sm"
                        disabled={historyPage >= history.totalPages || historyLoading}
                        onClick={() => loadHistory(historyPage + 1)}>
                        Next<i className="fa-solid fa-chevron-right" style={{ marginLeft: '0.25rem' }} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
