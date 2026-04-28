import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Transaction Records — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Refund = { id: string; status: string; amount: number; processedAt: string | null };
type Transaction = {
  id: string;
  ticketNumber: string;
  receiptNumber: string;
  paymentRef: string;
  paymentGateway: string;
  paymentStatus: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchasedAt: string;
  campaign: { id: string; slug: string; title: string };
  refund: Refund | null;
};

type TransactionsResponse = {
  data: Transaction[];
  total: number;
  totalPaid: number;
  successCount: number;
  refundCount: number;
  page: number;
  pageSize: number;
};

async function getTransactions(
  token: string,
  params: { page?: number; year?: string; search?: string } = {}
): Promise<TransactionsResponse> {
  try {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.year) qs.set('year', params.year);
    if (params.search) qs.set('search', params.search);
    qs.set('pageSize', '20');
    const res = await fetch(`${API}/api/tickets/transactions?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { data: [], total: 0, totalPaid: 0, successCount: 0, refundCount: 0, page: 1, pageSize: 20 };
    const json = await res.json() as { success: boolean; data: TransactionsResponse };
    return json.data ?? { data: [], total: 0, totalPaid: 0, successCount: 0, refundCount: 0, page: 1, pageSize: 20 };
  } catch { return { data: [], total: 0, totalPaid: 0, successCount: 0, refundCount: 0, page: 1, pageSize: 20 }; }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  SUCCESS:   { bg: '#dcfce7', color: '#16a34a', label: 'Success' },
  PENDING:   { bg: '#fef9c3', color: '#ca8a04', label: 'Pending' },
  FAILED:    { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
  REFUNDED:  { bg: '#dbeafe', color: '#2563eb', label: 'Refunded' },
};

const REFUND_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING:    { bg: '#fef9c3', color: '#ca8a04' },
  PROCESSING: { bg: '#dbeafe', color: '#2563eb' },
  COMPLETED:  { bg: '#dcfce7', color: '#16a34a' },
  FAILED:     { bg: '#fee2e2', color: '#dc2626' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface PageProps {
  searchParams: Promise<{ year?: string; search?: string; page?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;
  const params = await searchParams;

  const year = params.year;
  const search = params.search;
  const page = parseInt(params.page ?? '1', 10);

  const txData = await getTransactions(token, {
    page,
    ...(year !== undefined && { year }),
    ...(search !== undefined && { search }),
  });
  const transactions = txData.data;
  const totalPages = Math.ceil(txData.total / txData.pageSize);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const initials = user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">Transaction Records</div>
          <div className="portal-mobile-header-sub">{txData.total} record{txData.total !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Page header */}
      <div className="portal-page-header">
        <h1 className="portal-page-title">Transaction Records</h1>
        <p className="portal-page-subtitle">Complete history of all your ticket purchases and payment activity</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Transactions', value: txData.total, icon: 'fa-file-invoice', color: 'var(--text-primary)' },
          { label: 'Total Paid', value: `₦${(txData.totalPaid ?? 0).toLocaleString()}`, icon: 'fa-naira-sign', color: 'var(--green-primary)' },
          { label: 'Successful', value: txData.successCount, icon: 'fa-circle-check', color: '#16a34a' },
          { label: 'Refunds', value: txData.refundCount, icon: 'fa-rotate-left', color: '#2563eb' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <i className={`fa-solid ${s.icon}`} style={{ fontSize: '1.25rem', color: s.color, marginBottom: '0.5rem', display: 'block' }} />
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }} />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by ticket #, ref, or campaign..."
            style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.875rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>
        <select
          name="year"
          defaultValue={year ?? ''}
          style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.875rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm">Filter</button>
        {(search || year) && (
          <Link href="/transactions" className="btn btn-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-file-invoice" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {search || year ? 'No transactions match your filter' : 'No transactions yet'}
            </p>
            <p style={{ fontSize: '0.875rem' }}>
              {search || year ? 'Try adjusting your search or year filter.' : 'Your ticket purchase history will appear here.'}
            </p>
            {!search && !year && (
              <Link href="/campaigns" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', marginTop: '1rem' }}>Browse Campaigns</Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
                  {['Date', 'Campaign', 'Ticket #', 'Receipt #', 'Qty', 'Amount', 'Gateway', 'Status', 'Refund'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const st = STATUS_STYLES[tx.paymentStatus] ?? STATUS_STYLES['PENDING']!;
                  return (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: idx < transactions.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 0.15s' }}
                    >
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {formatDate(tx.purchasedAt)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '200px' }}>
                        <Link href={`/campaigns/${tx.campaign.slug}`} style={{ color: 'var(--green-primary)', fontWeight: 600, fontSize: '0.825rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {tx.campaign.title}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.775rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {tx.ticketNumber}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.775rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {tx.receiptNumber}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                        {tx.quantity}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--green-primary)', whiteSpace: 'nowrap' }}>
                        ₦{Number(tx.totalAmount).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <i className="fa-solid fa-credit-card" style={{ marginRight: '0.25rem', fontSize: '0.75rem' }} />
                        {tx.paymentGateway}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {tx.refund ? (
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: (REFUND_STATUS_STYLES[tx.refund.status] ?? REFUND_STATUS_STYLES['PENDING']!).bg, color: (REFUND_STATUS_STYLES[tx.refund.status] ?? REFUND_STATUS_STYLES['PENDING']!).color, fontSize: '0.75rem', fontWeight: 700 }}>
                            {tx.refund.status}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--border-light)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {page > 1 && (
            <Link
              href={`/transactions?page=${page - 1}${year ? `&year=${year}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              className="btn btn-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
            >
              <i className="fa-solid fa-chevron-left" /> Prev
            </Link>
          )}
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/transactions?page=${page + 1}${year ? `&year=${year}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              className="btn btn-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
            >
              Next <i className="fa-solid fa-chevron-right" />
            </Link>
          )}
        </div>
      )}

      {/* FCCPA note */}
      <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.25rem' }} />
        All transaction records are permanently retained per FCCPA §118 requirements and cannot be deleted.
      </p>
    </>
  );
}
