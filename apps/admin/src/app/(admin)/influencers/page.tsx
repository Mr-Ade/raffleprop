import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Influencers' };

interface Influencer { id: string; name: string; handle: string; platform: string; followerCount: number; commissionRate: number; totalEarnings: number; isActive: boolean; }

async function getInfluencers(token: string) {
  try { return await adminFetch<Influencer[]>('/api/admin/influencers', { token, cache: 'no-store' }); }
  catch { return []; }
}

export default async function InfluencersPage() {
  const token = (await getAdminToken())!;
  const influencers = await getInfluencers(token);

  return (
    <>
      <AdminPageHeader title="Influencer Program" subtitle={`${influencers.length} influencers`}
        action={<button className="btn btn-primary btn-sm"><i className="fa-solid fa-plus" /> Add Influencer</button>} />
      <div className="admin-content">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Platform</th><th>Handle</th><th>Followers</th><th>Commission</th><th>Earnings</th><th>Status</th></tr>
              </thead>
              <tbody>
                {influencers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No influencers yet</td></tr>
                ) : influencers.map((inf) => (
                  <tr key={inf.id}>
                    <td style={{ fontWeight: 600 }}>{inf.name}</td>
                    <td><span className="badge badge-blue">{inf.platform}</span></td>
                    <td style={{ color: 'var(--green-primary)' }}>@{inf.handle}</td>
                    <td>{inf.followerCount?.toLocaleString() ?? '—'}</td>
                    <td>{inf.commissionRate}%</td>
                    <td style={{ fontWeight: 700 }}>₦{Number(inf.totalEarnings).toLocaleString()}</td>
                    <td><span className={`badge ${inf.isActive ? 'badge-green' : 'badge-gray'}`}>{inf.isActive ? 'Active' : 'Inactive'}</span></td>
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
