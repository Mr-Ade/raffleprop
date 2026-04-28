'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NdprRequest {
  id: string;
  userId: string;
  requestType: string;
  status: string;
  requestedAt: string;
  dueAt: string;
  notes: string | null;
  user?: { fullName: string; email: string; _count: { tickets: number } } | null;
}

interface NdprRequestsTableProps {
  requests: NdprRequest[];
  token: string;
  apiUrl: string; // e.g. "http://localhost:3001/api/ndpr"
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:     'badge-gold',
  IN_PROGRESS: 'badge-info',
  COMPLETED:   'badge-green',
  REJECTED:    'badge-red',
};

function daysRemaining(dueAt: string): number {
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function DaysCell({ dueAt, status }: { dueAt: string; status: string }) {
  if (status === 'COMPLETED' || status === 'REJECTED') {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  const days = daysRemaining(dueAt);
  if (days < 0) {
    return (
      <span style={{ color: '#b91c1c', fontWeight: 800 }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.25rem' }} />
        {Math.abs(days)}d overdue
      </span>
    );
  }
  if (days <= 5) {
    return <span style={{ color: '#d97706', fontWeight: 700 }}>{days}d left</span>;
  }
  return <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{days}d left</span>;
}

function ProcessButton({
  requestId, userName, token, apiUrl, onDone,
}: {
  requestId: string; userName: string; token: string; apiUrl: string; onDone: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handle() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/requests/${requestId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setError(json.error ?? 'Failed to process request.'); return; }
      setOpen(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', color: '#6d28d9' }}
          onClick={() => setOpen(true)}
          title="Process deletion — anonymise personal data"
        >
          <i className="fa-solid fa-trash" style={{ marginRight: '0.3rem' }} />Process
        </button>
        {error && <span style={{ fontSize: '0.7rem', color: '#b91c1c' }}>{error}</span>}
      </span>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 16 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Process Deletion Request</h3>
              <button type="button" onClick={() => { setOpen(false); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                Anonymise personal identifiers for <strong>{userName}</strong>?
              </p>
              <div style={{ padding: '0.75rem 1rem', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, fontSize: '0.8125rem', color: '#6d28d9', marginBottom: '1rem' }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />
                Financial records (tickets, T&amp;C logs, KYC) will be <strong>retained</strong> under FCCPA §122 and SCUML obligations.
                Only personal identifiers will be anonymised.
              </div>
              {error && (
                <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={loading}
                  onClick={() => { setOpen(false); setError(''); }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', color: '#6d28d9' }}
                  onClick={() => void handle()}
                  disabled={loading}
                >
                  {loading ? 'Processing…' : <><i className="fa-solid fa-trash" style={{ marginRight: '0.3rem' }} />Confirm Process</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DenyButton({
  requestId, userName, token, apiUrl, onDone,
}: {
  requestId: string; userName: string; token: string; apiUrl: string; onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!reason.trim()) { setError('Reason is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setError(json.error ?? 'Failed'); return; }
      setOpen(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c' }}
        onClick={() => setOpen(true)}
        title={`Deny ${userName}'s deletion request`}
      >
        <i className="fa-solid fa-xmark" style={{ marginRight: '0.3rem' }} />Deny
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 16 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Deny Deletion Request</h3>
          <button
            type="button"
            onClick={() => { setOpen(false); setReason(''); setError(''); }}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >×</button>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Denying <strong>{userName}</strong>&apos;s request. They may lodge a complaint with the NDPC.
          </p>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Reason for denial <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <textarea
            className="form-input"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Legal hold under FCCPA §122 — financial records must be retained…"
            style={{ resize: 'vertical', marginBottom: '0.75rem' }}
          />
          {error && (
            <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setOpen(false); setReason(''); setError(''); }} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c' }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Denying…' : 'Confirm Denial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NdprRequestsTable({ requests, token, apiUrl }: NdprRequestsTableProps) {
  const router = useRouter();
  const [list, setList] = useState(requests);

  const openCount = list.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
  const overdueCount = list.filter(r =>
    (r.status === 'PENDING' || r.status === 'IN_PROGRESS') && daysRemaining(r.dueAt) < 0,
  ).length;

  function removeRequest(id: string) {
    setList(prev => prev.filter(r => r.id !== id));
    router.refresh();
  }

  if (list.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid #7c3aed' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>
            <i className="fa-solid fa-user-slash" style={{ marginRight: '0.5rem' }} />
            NDPR Deletion Requests
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Must be actioned within 30 days (NDPR 2019 §3.1(9)). Financial/compliance records preserved under FCCPA §122.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          {overdueCount > 0 && (
            <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.25rem' }} />
              {overdueCount} overdue
            </span>
          )}
          <span className="badge" style={{ background: '#f3e8ff', color: '#6d28d9', border: '1px solid #c4b5fd' }}>
            {openCount} open
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table data-table-responsive">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Requested</th>
              <th>30-day Deadline</th>
              <th>Days Remaining</th>
              <th>Reason</th>
              <th>Open Tickets</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => {
              const isOpen = r.status === 'PENDING' || r.status === 'IN_PROGRESS';
              const ticketCount = r.user?._count.tickets ?? 0;
              const hasTickets = ticketCount > 0;

              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.user?.fullName ?? 'Unknown'}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{r.user?.email ?? r.userId}</div>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{r.requestType}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(r.requestedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isOpen
                      ? new Date(r.dueAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td>
                    <DaysCell dueAt={r.dueAt} status={r.status} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 180 }}>
                    {r.notes ?? '—'}
                  </td>
                  <td>
                    {hasTickets ? (
                      <span
                        className="badge"
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                        title={`${ticketCount} ticket record(s) — legal hold under FCCPA §122`}
                      >
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.25rem' }} />
                        {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="badge badge-gray">None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-gray'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <Link href={`/admin/users/${r.userId}`} className="btn btn-outline btn-sm" title="View user">
                        <i className="fa-solid fa-eye" />
                      </Link>
                      {isOpen && (
                        <>
                          <ProcessButton
                            requestId={r.id}
                            userName={r.user?.fullName ?? 'user'}
                            token={token}
                            apiUrl={apiUrl}
                            onDone={() => removeRequest(r.id)}
                          />
                          <DenyButton
                            requestId={r.id}
                            userName={r.user?.fullName ?? 'user'}
                            token={token}
                            apiUrl={apiUrl}
                            onDone={() => removeRequest(r.id)}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '0.875rem 1.25rem', background: '#faf5ff', borderTop: '1px solid #e9d5ff', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', fontSize: '0.75rem', color: '#6d28d9' }}>
        <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />
        <strong>Legal holds:</strong> Transaction records, T&amp;C logs, and KYC data cannot be deleted while required by FCCPA 2018 §122 or SCUML AML/CFT obligations.
        Only marketing preferences and technical data are fully deletable on request. Users may lodge complaints with the NDPC.
      </div>
    </div>
  );
}
