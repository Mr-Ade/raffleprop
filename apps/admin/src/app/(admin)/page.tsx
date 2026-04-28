import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Dashboard' };

interface Stats {
  totalUsers: number;
  activeCampaigns: number;
  totalTicketsSold: number;
  totalRevenue: number;
  pendingKyc: number;
  pendingRefunds: number;
}

async function getStats(token: string): Promise<Stats | null> {
  try {
    return await adminFetch<Stats>('/api/admin/stats', { token, cache: 'no-store' });
  } catch { return null; }
}

export default async function DashboardPage() {
  const token = (await getAdminToken())!;
  const stats = await getStats(token);

  return (
    <>
      <AdminPageHeader title="Dashboard" subtitle="RaffleProp operations overview" />
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: 'fa-users', color: '#dbeafe', iconColor: '#1d4ed8' },
            { label: 'Active Campaigns', value: stats?.activeCampaigns ?? '—', icon: 'fa-house', color: '#dcfce7', iconColor: '#15803d' },
            { label: 'Tickets Sold', value: stats?.totalTicketsSold?.toLocaleString() ?? '—', icon: 'fa-ticket', color: '#fef9c3', iconColor: '#a16207' },
            { label: 'Revenue', value: stats ? `₦${Number(stats.totalRevenue).toLocaleString()}` : '—', icon: 'fa-naira-sign', color: '#dcfce7', iconColor: '#15803d' },
            { label: 'Pending KYC', value: stats?.pendingKyc ?? '—', icon: 'fa-id-card', color: '#ede9fe', iconColor: '#7c3aed' },
            { label: 'Pending Refunds', value: stats?.pendingRefunds ?? '—', icon: 'fa-rotate-left', color: '#fee2e2', iconColor: '#b91c1c' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.iconColor, fontSize: '1.125rem' }}>
                  <i className={`fa-solid ${s.icon}`} />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header" style={{ fontWeight: 700 }}>Quick Actions</div>
          <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/campaigns/new" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus" /> New Campaign
            </a>
            <a href="/users" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-users" /> Review KYC
            </a>
            <a href="/refund-manager" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-rotate-left" /> Process Refunds
            </a>
            <a href="/compliance" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-scale-balanced" /> Compliance
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
