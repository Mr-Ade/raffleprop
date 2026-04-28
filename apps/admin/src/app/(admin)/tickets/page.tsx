import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Tickets' };

interface TicketRow { id: string; ticketNumber: string; receiptNumber: string; campaignId: string; quantity: number; totalAmount: number; paymentStatus: string; paymentGateway: string; purchasedAt: string; }

async function getTickets(token: string) {
  try { return await adminFetch<{ data: TicketRow[]; total: number }>('/api/admin/tickets?pageSize=50', { token, cache: 'no-store' }); }
  catch { return { data: [], total: 0 }; }
}

export default async function TicketsPage() {
  const token = (await getAdminToken())!;
  const { data: tickets, total } = await getTickets(token);

  return (
    <>
      <AdminPageHeader title="Tickets" subtitle={`${total} total ticket records (FCCPA §118 permanent)`} />
      <div className="admin-content">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Ticket #</th><th>Receipt #</th><th>Campaign</th><th>Qty</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tickets</td></tr>
                ) : tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem' }}>{t.ticketNumber}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{t.receiptNumber}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{t.campaignId.slice(0, 8)}…</td>
                    <td>{t.quantity}</td>
                    <td style={{ fontWeight: 700 }}>₦{Number(t.totalAmount).toLocaleString()}</td>
                    <td><span className="badge badge-blue">{t.paymentGateway}</span></td>
                    <td><span className={`badge ${t.paymentStatus === 'SUCCESS' ? 'badge-green' : t.paymentStatus === 'PENDING' ? 'badge-gold' : 'badge-red'}`}>{t.paymentStatus}</span></td>
                    <td>{new Date(t.purchasedAt).toLocaleDateString('en-NG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
