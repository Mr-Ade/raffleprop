import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';
import type { Campaign } from '@raffleprop/shared';

export const metadata: Metadata = { title: 'Campaigns' };

async function getCampaigns(token: string) {
  try {
    return await adminFetch<{ data: Campaign[]; total: number }>('/api/admin/campaigns', { token, cache: 'no-store' });
  } catch { return { data: [], total: 0 }; }
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray', REVIEW: 'badge-blue', LIVE: 'badge-green',
  CLOSED: 'badge-gray', DRAWN: 'badge-purple', CANCELLED: 'badge-red',
};

export default async function CampaignsPage() {
  const token = (await getAdminToken())!;
  const { data: campaigns, total } = await getCampaigns(token);

  return (
    <>
      <AdminPageHeader
        title="Campaigns"
        subtitle={`${total} total campaigns`}
        action={<Link href="/campaigns/new" className="btn btn-primary btn-sm"><i className="fa-solid fa-plus" /> New Campaign</Link>}
      />
      <div className="admin-content">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>State</th>
                  <th>Ticket Price</th>
                  <th>Total Tickets</th>
                  <th>Draw Date</th>
                  <th>FCCPC Ref</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No campaigns yet</td></tr>
                ) : campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.title}</td>
                    <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-gray'}`}>{c.status}</span></td>
                    <td>{c.propertyState}</td>
                    <td>₦{Number(c.ticketPrice).toLocaleString()}</td>
                    <td>{c.totalTickets.toLocaleString()}</td>
                    <td>{c.drawDate ? new Date(c.drawDate).toLocaleDateString('en-NG') : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{c.fccpcRef ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <Link href={`/campaigns/${c.id}`} className="btn btn-outline btn-sm" title="Edit">
                          <i className="fa-solid fa-pen" />
                        </Link>
                        {c.status === 'REVIEW' && (
                          <Link href={`/campaigns/${c.id}?action=publish`} className="btn btn-primary btn-sm">
                            Publish
                          </Link>
                        )}
                      </div>
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
