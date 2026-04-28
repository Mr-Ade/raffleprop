import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';
import BankTransferWidget from '@/components/BankTransferWidget';

export const metadata: Metadata = { title: 'My Tickets — RaffleProp' };

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Ticket {
  id: string;
  ticketNumber: string;
  campaignId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: string;
  paymentGateway: string;
  paymentRef: string;
  receiptNumber: string;
  purchasedAt: string;
  bundleLabel: string | null;
  campaign: { id: string; slug: string; title: string; drawDate: string | null };
}

async function getTickets(token: string): Promise<Ticket[]> {
  try {
    const res = await fetch(`${API_URL}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: { data: Ticket[] } };
    return Array.isArray(json.data?.data) ? json.data.data : [];
  } catch {
    return [];
  }
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  SUCCESS:  { bg: '#dcfce7', color: '#16a34a' },
  PENDING:  { bg: '#fef9c3', color: '#ca8a04' },
  FAILED:   { bg: '#fee2e2', color: '#dc2626' },
  REFUNDED: { bg: '#dbeafe', color: '#2563eb' },
};

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;
  const params = await searchParams;
  const searchTerm = (params.search ?? '').toLowerCase();

  const allTickets = await getTickets(token);

  // Server-side search filter
  const tickets = searchTerm
    ? allTickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(searchTerm) ||
          t.receiptNumber.toLowerCase().includes(searchTerm) ||
          t.campaign?.title?.toLowerCase().includes(searchTerm),
      )
    : allTickets;

  const totalSpent = allTickets.reduce((s, t) => s + Number(t.totalAmount), 0);
  const uniqueCampaigns = new Set(allTickets.map((t) => t.campaignId)).size;
  const initials = user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">My Tickets</div>
          <div className="portal-mobile-header-sub">{allTickets.length} ticket record{allTickets.length !== 1 ? 's' : ''}</div>
        </div>
        <Link href="/campaigns" className="btn btn-gold btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <i className="fa-solid fa-ticket" /> Buy
        </Link>
      </div>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 900, letterSpacing: '-0.02em' }}>My Tickets</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>All your ticket purchases across every campaign.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <Link href="/transactions" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-file-invoice" /> Transaction Records
          </Link>
          <Link href="/campaigns" className="btn btn-gold btn-sm">
            <i className="fa-solid fa-plus" /> Buy More
          </Link>
        </div>
      </div>

      {/* FCCPA §118 notice */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        <i className="fa-solid fa-shield-halved" style={{ color: 'var(--green-primary)', flexShrink: 0, marginTop: '0.1rem' }} />
        <span>
          Each ticket receipt is a <strong>legal document under FCCPA §118</strong>. Records are permanently retained per the Federal Competition &amp; Consumer Protection Act 2018 and cannot be deleted.{' '}
          <Link href="/transactions" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>View full Transaction Records →</Link>
        </span>
      </div>

      {/* Pending bank transfers — client component, shows only when relevant */}
      <BankTransferWidget />

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Tickets', value: allTickets.reduce((s, t) => s + t.quantity, 0), color: 'var(--green-primary)' },
          { label: 'Total Spent', value: `₦${totalSpent.toLocaleString()}`, color: 'var(--text-primary)' },
          { label: 'Campaigns', value: uniqueCampaigns, color: '#2563eb' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form method="GET" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }} />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Search by ticket #, receipt # or campaign…"
            style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.875rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
        {searchTerm && (
          <Link href="/tickets" className="btn btn-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="card">
        {tickets.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <i className="fa-solid fa-ticket" style={{ fontSize: '2.5rem', color: 'var(--border)', marginBottom: '1rem', display: 'block' }} />
            <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {searchTerm ? 'No tickets match your search' : 'No tickets yet'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {searchTerm ? 'Try a different ticket number or campaign name.' : 'Browse active campaigns and enter a draw.'}
            </p>
            {!searchTerm && <Link href="/campaigns" className="btn btn-primary btn-sm">Browse Campaigns</Link>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table-responsive">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Campaign</th>
                  <th>Date</th>
                  <th>Bundle</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                  <th>Gateway</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const st = STATUS_STYLES[t.paymentStatus] ?? STATUS_STYLES['PENDING']!;
                  return (
                    <tr key={t.id}>
                      <td data-label="Ticket #" style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{t.ticketNumber}</td>
                      <td data-label="Campaign" style={{ maxWidth: 180 }}>
                        {t.campaign ? (
                          <Link href={`/campaigns/${t.campaign.slug}`} style={{ color: 'var(--green-primary)', fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 180 }}>
                            {t.campaign.title}
                          </Link>
                        ) : '—'}
                      </td>
                      <td data-label="Date" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{new Date(t.purchasedAt).toLocaleDateString('en-NG')}</td>
                      <td data-label="Bundle" style={{ fontSize: '0.8125rem' }}>{t.bundleLabel ?? '—'}</td>
                      <td data-label="Qty" style={{ textAlign: 'center', fontWeight: 600 }}>{t.quantity}</td>
                      <td data-label="Unit" style={{ whiteSpace: 'nowrap' }}>₦{Number(t.unitPrice).toLocaleString()}</td>
                      <td data-label="Total" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>₦{Number(t.totalAmount).toLocaleString()}</td>
                      <td data-label="Gateway">
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: '#dbeafe', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600 }}>{t.paymentGateway}</span>
                      </td>
                      <td data-label="Status">
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                          {t.paymentStatus}
                        </span>
                      </td>
                      <td data-label="Receipt">
                        {t.paymentStatus === 'SUCCESS' ? (
                          <a
                            href={`/api/tickets/${t.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Receipt ${t.receiptNumber}`}
                            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                          >
                            <i className="fa-solid fa-file-pdf" /> PDF
                          </a>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t.receiptNumber}
                          </span>
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

      {allTickets.length > 0 && (
        <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Showing {tickets.length} of {allTickets.length} total records
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      )}
    </>
  );
}
