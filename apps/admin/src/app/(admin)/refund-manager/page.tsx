import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Refund Manager' };

interface RefundRow { id: string; ticketId: string; userId: string; campaignId: string; amount: number; reason: string; status: string; createdAt: string; processedAt: string | null; }

async function getRefunds(token: string) {
  try { return await adminFetch<{ data: RefundRow[]; total: number }>('/api/admin/refunds', { token, cache: 'no-store' }); }
  catch { return { data: [], total: 0 }; }
}

const REASON_LABEL: Record<string, string> = {
  CAMPAIGN_CANCELLED: 'Campaign Cancelled',
  MINIMUM_NOT_REACHED: 'Min. Not Reached',
  USER_REQUEST: 'User Request',
};

export default async function RefundManagerPage() {
  const token = (await getAdminToken())!;
  const { data: refunds, total } = await getRefunds(token);
  const pending = refunds.filter((r) => r.status === 'PENDING').length;

  return (
    <>
      <AdminPageHeader title="Refund Manager" subtitle={`${total} total · ${pending} pending`} />
      <div className="admin-content">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Refund ID</th><th>Amount</th><th>Reason</th><th>Status</th><th>Requested</th><th>Processed</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {refunds.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No refund requests</td></tr>
                ) : refunds.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{r.id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 700 }}>₦{Number(r.amount).toLocaleString()}</td>
                    <td>{REASON_LABEL[r.reason] ?? r.reason}</td>
                    <td><span className={`badge ${r.status === 'COMPLETED' ? 'badge-green' : r.status === 'PENDING' ? 'badge-gold' : r.status === 'PROCESSING' ? 'badge-blue' : 'badge-red'}`}>{r.status}</span></td>
                    <td>{new Date(r.createdAt).toLocaleDateString('en-NG')}</td>
                    <td>{r.processedAt ? new Date(r.processedAt).toLocaleDateString('en-NG') : '—'}</td>
                    <td>
                      {r.status === 'PENDING' && (
                        <button className="btn btn-primary btn-sm">Approve</button>
                      )}
                    </td>
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
