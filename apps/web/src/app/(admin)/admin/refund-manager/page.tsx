import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { ApproveRefundButton } from './ApproveRefundButton';

export const metadata: Metadata = { title: 'Refund Manager — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type RefundUser = { fullName: string; email: string; phone: string };
type RefundTicket = { ticketNumber: string; receiptNumber: string; paymentRef: string; paymentGateway: string };
type RefundCampaign = { title: string; slug: string };

type Refund = {
  id: string;
  amount: string | number;
  reason: string;
  status: string;
  gatewayRef: string | null;
  processedAt: string | null;
  createdAt: string;
  user: RefundUser;
  ticket: RefundTicket;
  campaign: RefundCampaign;
};

type RefundsResponse = { data: Refund[]; total: number; page: number; totalPages: number };

async function getRefunds(token: string, status: string, page: number): Promise<RefundsResponse | null> {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status !== 'all') params.set('status', status);
    const res = await fetch(`${API}/api/admin/refunds?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: RefundsResponse };
    return json.data ?? null;
  } catch { return null; }
}

async function getPendingStats(token: string): Promise<{ count: number; totalAmount: number }> {
  try {
    const res = await fetch(`${API}/api/admin/refunds?status=PENDING&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { count: 0, totalAmount: 0 };
    const json = await res.json() as { success: boolean; data: RefundsResponse };
    const refunds = json.data?.data ?? [];
    return {
      count: json.data?.total ?? refunds.length,
      totalAmount: refunds.reduce((s, r) => s + Number(r.amount), 0),
    };
  } catch { return { count: 0, totalAmount: 0 }; }
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  PENDING:    { cls: 'badge-gold',  label: 'Pending' },
  PROCESSING: { cls: 'badge-gold',  label: 'Processing' },
  COMPLETED:  { cls: 'badge-green', label: 'Completed' },
  FAILED:     { cls: 'badge-red',   label: 'Failed' },
};

const REASON_LABEL: Record<string, string> = {
  CAMPAIGN_CANCELLED: 'Campaign Cancelled',
  MINIMUM_NOT_REACHED: 'Min. Threshold Not Met',
  USER_REQUEST: 'User Request',
};

export default async function AdminRefundManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const sp = await searchParams;
  const token = (await getAccessToken()) ?? '';
  const status = sp.status ?? 'all';
  const page = parseInt(sp.page ?? '1', 10);
  const [result, pendingStats] = await Promise.all([
    getRefunds(token, status, page),
    getPendingStats(token),
  ]);
  const refunds = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const pendingCount = pendingStats.count;
  const totalPending = pendingStats.totalAmount;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Refund Manager</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            FCCPA §123 — 100% refund obligation · {total} total refunds
          </p>
        </div>
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#92400e' }}>
            <i className="fa-solid fa-triangle-exclamation" />
            {pendingCount} pending · ₦{(totalPending / 1_000_000).toFixed(2)}M owed
          </div>
        )}
      </div>

      <div className="admin-content">

        {/* FCCPA notice */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#ea580c', fontSize: '1.125rem', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#c2410c', marginBottom: '0.25rem' }}>FCCPA §123 — Mandatory Refund Obligation</div>
            <p style={{ fontSize: '0.8rem', color: '#9a3412', margin: 0 }}>
              Refunds must be issued to all ticket holders when a campaign is cancelled or fails to meet the minimum ticket threshold.
              Refunds must be processed within 7 business days of campaign closure. Failure to comply carries penalties under FCCPA 2018.
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>All Refunds</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['all', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const).map((s) => (
                <Link key={s} href={`/admin/refund-manager?status=${s}`}
                  className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                >
                  {s === 'all' ? 'All' : (STATUS_BADGE[s]?.label ?? s)}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table-responsive">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Campaign</th>
                  <th>Ticket #</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Gateway</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No refunds found.
                    </td>
                  </tr>
                )}
                {refunds.map((r) => {
                  const statusInfo = STATUS_BADGE[r.status] ?? { cls: 'badge-gray', label: r.status };
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.user.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.user.email}</div>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        <Link href={`/campaigns/${r.campaign.slug}`} target="_blank" style={{ color: 'var(--green-primary)' }}>
                          {r.campaign.title.length > 25 ? r.campaign.title.slice(0, 25) + '…' : r.campaign.title}
                        </Link>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.ticket.ticketNumber}</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>₦{Number(r.amount).toLocaleString()}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{r.ticket.paymentGateway}</span>
                      </td>
                      <td><span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        {r.status === 'PENDING' && (
                          <ApproveRefundButton
                            refundId={r.id}
                            amount={Number(r.amount)}
                            gateway={r.ticket.paymentGateway}
                            token={token}
                            apiUrl={API}
                          />
                        )}
                        {r.status !== 'PENDING' && r.gatewayRef && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {r.gatewayRef.slice(0, 12)}…
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {page > 1 && (
                  <Link href={`/admin/refund-manager?status=${status}&page=${page - 1}`} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-chevron-left" />
                  </Link>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <Link key={p} href={`/admin/refund-manager?status=${status}&page=${p}`}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                      style={{ minWidth: 36 }}>{p}</Link>
                  );
                })}
                {page < totalPages && (
                  <Link href={`/admin/refund-manager?status=${status}&page=${page + 1}`} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-chevron-right" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
