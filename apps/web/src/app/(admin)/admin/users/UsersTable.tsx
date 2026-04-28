'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminUser } from './page';

interface UsersTableProps {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  kyc: string;
  status: string;
  sortBy: string;
  token: string;
  apiUrl: string;
  sortOptions: { value: string; label: string }[];
}

const KYC_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  VERIFIED:  { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  SUBMITTED: { bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  PENDING:   { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  REJECTED:  { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
};

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function userStatus(u: AdminUser): 'banned' | 'flagged' | 'deleted' | 'active' {
  if (u.bannedAt) return 'banned';
  if (u.deletedAt) return 'deleted';
  if (u.flaggedAt) return 'flagged';
  return 'active';
}

function KycPill({ status }: { status: string }) {
  const c = (KYC_COLOR[status] ?? KYC_COLOR['PENDING'])!;
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

function StatusPill({ u }: { u: AdminUser }) {
  const st = userStatus(u);
  if (st === 'banned')
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', whiteSpace: 'nowrap' }}>
      <i className="fa-solid fa-ban" />Banned</span>;
  if (st === 'deleted')
    return <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>Deleted</span>;
  if (st === 'flagged')
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', whiteSpace: 'nowrap' }}>
      <i className="fa-solid fa-flag" />Flagged</span>;
  if (u.role === 'SUPER_ADMIN')
    return <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', whiteSpace: 'nowrap' }}>Super Admin</span>;
  if (u.role === 'ADMIN')
    return <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', whiteSpace: 'nowrap' }}>Admin</span>;
  return <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>Active</span>;
}

function ActionButton({
  userId, action, token, apiUrl, onDone,
}: {
  userId: string; action: 'ban' | 'unban' | 'flag' | 'unflag';
  token: string; apiUrl: string; onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmBan, setConfirmBan] = useState(false);

  const cfg: Record<string, { icon: string; title: string; bg: string; color: string; border: string }> = {
    ban:    { icon: 'fa-ban',   title: 'Ban',    bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
    unban:  { icon: 'fa-check', title: 'Unban',  bg: '#f0fdf4', color: '#166534', border: '#86efac' },
    flag:   { icon: 'fa-flag',  title: 'Flag',   bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    unflag: { icon: 'fa-flag',  title: 'Unflag', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  };
  const c = cfg[action]!;

  async function handle() {
    setLoading(true);
    setError('');
    setConfirmBan(false);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? 'Action failed'); return; }
      onDone();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (action === 'ban' && confirmBan) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600, whiteSpace: 'nowrap' }}>Ban user?</span>
        <span style={{ display: 'inline-flex', gap: '0.2rem' }}>
          <button type="button" disabled={loading} onClick={() => void handle()}
            style={{ padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Yes
          </button>
          <button type="button" onClick={() => setConfirmBan(false)}
            style={{ padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.7rem', background: '#f3f4f6', border: '1px solid #d1d5db', cursor: 'pointer' }}>
            No
          </button>
        </span>
        {error && <span style={{ fontSize: '0.7rem', color: '#b91c1c', maxWidth: 80, lineHeight: 1.2 }}>{error}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      <button
        type="button"
        title={c.title}
        disabled={loading}
        onClick={action === 'ban' ? () => setConfirmBan(true) : () => void handle()}
        style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`,
          background: c.bg, color: c.color, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', flexShrink: 0,
        }}
      >
        {loading
          ? <i className="fa-solid fa-spinner fa-spin" />
          : <i className={`fa-solid ${c.icon}`} />}
      </button>
      {error && <span style={{ fontSize: '0.7rem', color: '#b91c1c', maxWidth: 80, lineHeight: 1.2 }}>{error}</span>}
    </span>
  );
}

// ─── Column header styles ─────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '0.625rem 0.875rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  color: 'var(--text-muted)',
  background: '#f9fafb',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  textAlign: 'left' as const,
};

const TD: React.CSSProperties = {
  padding: '0.75rem 0.875rem',
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-light)',
  verticalAlign: 'middle',
};

export function UsersTable({
  users: initialUsers, total, page, totalPages,
  search, kyc, status, sortBy, token, apiUrl, sortOptions,
}: UsersTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [confirmBulkBan, setConfirmBulkBan] = useState(false);
  const [bulkError, setBulkError] = useState('');

  function toggleOne(id: string, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(initialUsers.map(u => u.id)) : new Set());
  }

  const allChecked = initialUsers.length > 0 && initialUsers.every(u => selected.has(u.id));
  const someChecked = selected.size > 0;

  function refresh() {
    startTransition(() => { router.refresh(); });
    setSelected(new Set());
  }

  async function bulkAction(action: 'ban' | 'unban' | 'flag' | 'unflag') {
    const ids = Array.from(selected);
    if (action === 'ban' && !confirmBulkBan) { setConfirmBulkBan(true); return; }
    setConfirmBulkBan(false);
    setBulkLoading(action);
    setBulkError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, action }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setBulkError(json.error ?? 'Bulk action failed. Please try again.'); return; }
      refresh();
    } catch {
      setBulkError('Network error. Please try again.');
    } finally {
      setBulkLoading(null);
    }
  }

  async function bulkExport() {
    const ids = Array.from(selected);
    setBulkLoading('export');
    setBulkError('');
    try {
      const params = new URLSearchParams();
      ids.forEach(id => params.append('ids', id));
      const res = await fetch(`${apiUrl}/api/admin/users/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setBulkError('Export failed. Please try again.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raffleprop-users-selected-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setBulkError('Network error. Please try again.');
    } finally {
      setBulkLoading(null);
    }
  }

  const pageLink = (p: number) =>
    `/admin/users?search=${encodeURIComponent(search)}&kyc=${kyc}&status=${status}&sortBy=${sortBy}&page=${p}`;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>

      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.125rem' }}>All Users</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {total.toLocaleString('en-NG')} total · showing page {page}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" action="/admin/users" style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" name="search" defaultValue={search}
          placeholder="Search name, email or phone…"
          className="form-input"
          style={{ flex: '1 1 180px', minWidth: 0 }}
        />
        <select name="kyc" defaultValue={kyc} className="form-select" style={{ flex: '0 0 150px' }}>
          <option value="all">All KYC</option>
          <option value="VERIFIED">Verified</option>
          <option value="SUBMITTED">Pending Review</option>
          <option value="PENDING">Not Submitted</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select name="status" defaultValue={status} className="form-select" style={{ flex: '0 0 130px' }}>
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="FLAGGED">Flagged</option>
          <option value="BANNED">Banned</option>
        </select>
        <select name="sortBy" defaultValue={sortBy} className="form-select" style={{ flex: '0 0 145px' }}>
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm">Apply</button>
        {(search || kyc !== 'all' || status !== 'all' || sortBy !== 'createdAt') && (
          <Link href="/admin/users" className="btn btn-outline btn-sm">Clear</Link>
        )}
      </form>

      {/* Bulk actions bar */}
      {someChecked && (
        <div style={{ padding: '0.625rem 1.25rem', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400e' }}>{selected.size} selected</span>
          <div style={{ width: 1, height: 16, background: '#fcd34d', margin: '0 0.25rem' }} />
          {[
            { key: 'export', label: 'Export', icon: 'fa-download', fn: bulkExport },
            { key: 'flag',   label: 'Flag',   icon: 'fa-flag',     fn: () => bulkAction('flag') },
            { key: 'unflag', label: 'Unflag', icon: 'fa-flag',     fn: () => bulkAction('unflag') },
            { key: 'unban',  label: 'Unban',  icon: 'fa-check',    fn: () => bulkAction('unban') },
          ].map(btn => (
            <button key={btn.key} type="button" className="btn btn-outline btn-sm"
              disabled={bulkLoading !== null} onClick={btn.fn}>
              {bulkLoading === btn.key
                ? <i className="fa-solid fa-spinner fa-spin" />
                : <><i className={`fa-solid ${btn.icon}`} style={{ marginRight: '0.3rem' }} />{btn.label}</>}
            </button>
          ))}
          {!confirmBulkBan && (
            <button type="button" className="btn btn-outline btn-sm" disabled={bulkLoading !== null}
              onClick={() => bulkAction('ban')}>
              <i className="fa-solid fa-ban" style={{ marginRight: '0.3rem' }} />
              {bulkLoading === 'ban' ? <i className="fa-solid fa-spinner fa-spin" /> : 'Ban'}
            </button>
          )}
          {confirmBulkBan && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: 600, color: '#b91c1c' }}>
              Ban {selected.size} user(s)?
              <button type="button" className="btn btn-sm" disabled={bulkLoading !== null}
                style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => bulkAction('ban')}>
                Yes
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setConfirmBulkBan(false)}
                style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}>
                No
              </button>
            </span>
          )}
          <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}
            onClick={() => { setSelected(new Set()); setBulkError(''); }}>
            Deselect all
          </button>
          {bulkError && (
            <span style={{ width: '100%', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.3rem' }} />
              {bulkError}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="data-table" style={{ minWidth: 860 }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ minWidth: 210 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 130 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>
                <input type="checkbox" checked={allChecked}
                  onChange={e => toggleAll(e.target.checked)} title="Select all" />
              </th>
              <th style={TH}>User</th>
              <th style={TH}>Phone</th>
              <th style={TH}>Joined</th>
              <th style={{ ...TH, textAlign: 'center' }}>Tickets</th>
              <th style={TH}>Spent</th>
              <th style={{ ...TH, textAlign: 'center' }}>Refs</th>
              <th style={TH}>KYC</th>
              <th style={TH}>Status</th>
              <th style={TH}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-users" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }} />
                  No users match the current filters.
                </td>
              </tr>
            )}
            {initialUsers.map(u => {
              const st = userStatus(u);
              const avatarBg = st === 'banned' ? '#fca5a5' : st === 'flagged' ? '#fcd34d' : 'var(--green-primary)';
              const avatarColor = st === 'flagged' ? '#78350f' : '#fff';
              return (
                <tr key={u.id} style={{ opacity: st === 'deleted' ? 0.5 : 1 }}>
                  {/* Checkbox */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <input type="checkbox" checked={selected.has(u.id)}
                      onChange={e => toggleOne(u.id, e.target.checked)} />
                  </td>

                  {/* User — avatar + name + email */}
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: avatarBg, color: avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {initials(u.fullName)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                          {u.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {u.phone}
                    {u.phoneVerified && (
                      <i className="fa-solid fa-circle-check" title="Verified"
                        style={{ color: 'var(--success)', marginLeft: '0.3rem', fontSize: '0.7rem' }} />
                    )}
                  </td>

                  {/* Joined */}
                  <td style={{ ...TD, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Tickets */}
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 600 }}>
                    {u._count.tickets}
                  </td>

                  {/* Total spent */}
                  <td style={{ ...TD, fontWeight: 600, color: u.totalSpent > 0 ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                    {u.totalSpent > 0 ? `₦${u.totalSpent.toLocaleString('en-NG')}` : '—'}
                  </td>

                  {/* Referrals */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {u.referralCount > 0 ? u.referralCount : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                  </td>

                  {/* KYC */}
                  <td style={TD}><KycPill status={u.kycStatus} /></td>

                  {/* Status */}
                  <td style={TD}><StatusPill u={u} /></td>

                  {/* Actions */}
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                      <Link href={`/admin/users/${u.id}`} title="View user"
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                        <i className="fa-solid fa-eye" />
                      </Link>
                      {u.kycStatus === 'SUBMITTED' && (
                        <Link href={`/admin/users/${u.id}?review=kyc`} title="Review KYC"
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fde047', background: '#fef9c3', color: '#a16207', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                          <i className="fa-solid fa-id-card" />
                        </Link>
                      )}
                      {!u.flaggedAt && !u.bannedAt && !u.deletedAt && (
                        <ActionButton userId={u.id} action="flag" token={token} apiUrl={apiUrl} onDone={refresh} />
                      )}
                      {u.flaggedAt && !u.bannedAt && (
                        <ActionButton userId={u.id} action="unflag" token={token} apiUrl={apiUrl} onDone={refresh} />
                      )}
                      {!u.bannedAt && !u.deletedAt && u.role === 'USER' && (
                        <ActionButton userId={u.id} action="ban" token={token} apiUrl={apiUrl} onDone={refresh} />
                      )}
                      {u.bannedAt && (
                        <ActionButton userId={u.id} action="unban" token={token} apiUrl={apiUrl} onDone={refresh} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {page > 1 && (
              <Link href={pageLink(page - 1)} className="btn btn-outline btn-sm">
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.7rem' }} />
              </Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Link key={p} href={pageLink(p)}
                  className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minWidth: 34, textAlign: 'center' }}>{p}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link href={pageLink(page + 1)} className="btn btn-outline btn-sm">
                <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem' }} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
