import type { Metadata } from 'next';
import Link from 'next/link';
import { getAccessToken } from '@/lib/session';
import AdminDashboardCharts from '@/components/AdminDashboardChartsNoSsr';
import AdminLiveFeed from '@/components/AdminLiveFeed';
import AdminRefreshButton from '@/components/AdminRefreshButton';

export const metadata: Metadata = { title: 'Admin Dashboard — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type AdminStats = {
  totalRevenue: number;
  ticketsSoldToday: number;
  registeredUsers: number;
  activeCampaigns: number;
  pendingRefunds: number;
  pendingKyc: number;
};

type Campaign = {
  id: string;
  title: string;
  propertyState: string;
  status: string;
  totalTickets: number;
  ticketPrice: number;
  ticketsSold?: number;
};

async function getAdminStats(token: string): Promise<AdminStats | null> {
  try {
    const res = await fetch(`${API}/api/admin/tickets/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: AdminStats };
    return json.data ?? null;
  } catch { return null; }
}

async function getCampaigns(token: string): Promise<Campaign[]> {
  try {
    const res = await fetch(`${API}/api/admin/campaigns?limit=10&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: { data: Campaign[] } };
    return json.data?.data ?? [];
  } catch { return []; }
}

export default async function AdminDashboardPage() {
  const token = (await getAccessToken())!;
  const [stats, campaigns] = await Promise.all([
    getAdminStats(token),
    getCampaigns(token),
  ]);

  const revenue = stats?.totalRevenue ?? 0;
  const ticketsToday = stats?.ticketsSoldToday ?? 0;
  const users = stats?.registeredUsers ?? 0;
  const activeCampaigns = stats?.activeCampaigns ?? campaigns.filter(c => c.status === 'LIVE').length;
  const pendingRefunds = stats?.pendingRefunds ?? 0;
  const pendingKyc = stats?.pendingKyc ?? 0;

  const KPI_CARDS = [
    { label: 'Total Revenue', value: `₦${(revenue / 1_000_000).toFixed(1)}M`, icon: 'fa-naira-sign', color: 'var(--green-primary)', change: null, up: false },
    { label: 'Tickets Sold Today', value: ticketsToday.toLocaleString(), icon: 'fa-ticket', color: 'var(--gold)', change: 'today so far', up: false },
    { label: 'Registered Users', value: users.toLocaleString(), icon: 'fa-users', color: 'var(--info)', change: 'total accounts', up: false },
    { label: 'Active Campaigns', value: String(activeCampaigns), icon: 'fa-trophy', color: 'var(--success)', change: null, up: false },
  ];

  const liveCampaignCount = campaigns.filter(c => c.status === 'LIVE').length;
  const fccpcFee = liveCampaignCount * 850_000;
  const lslgaFee = 575_000;
  const totalFees = fccpcFee + lslgaFee;
  const ratioPercent = revenue > 0 ? ((totalFees / revenue) * 100).toFixed(1) : null;
  const ratioLabel = revenue > 0
    ? `₦${(totalFees / 1_000_000).toFixed(3)}M total fees / ₦${(revenue / 1_000_000).toFixed(1)}M revenue`
    : 'No revenue recorded yet';

  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Revenue Dashboard</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Live data · Admin view</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="live-indicator"><span className="live-dot" /> LIVE</div>
          <AdminRefreshButton />
        </div>
      </div>

      <div className="admin-content">

        {/* Action alerts */}
        {(pendingRefunds > 0 || pendingKyc > 0) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {pendingRefunds > 0 && (
              <Link href="/admin/refund-manager" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#92400e', fontWeight: 600, textDecoration: 'none' }}>
                <i className="fa-solid fa-rotate-left" />
                {pendingRefunds} pending refund{pendingRefunds !== 1 ? 's' : ''}
              </Link>
            )}
            {pendingKyc > 0 && (
              <Link href="/admin/users" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#1e40af', fontWeight: 600, textDecoration: 'none' }}>
                <i className="fa-solid fa-id-card" />
                {pendingKyc} KYC review{pendingKyc !== 1 ? 's' : ''} pending
              </Link>
            )}
          </div>
        )}

        {/* KPI stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {KPI_CARDS.map((card) => (
            <div key={card.label} className="stat-card" style={{ borderLeft: `4px solid ${card.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <i className={`fa-solid ${card.icon}`} style={{ color: card.color, fontSize: '1.125rem' }} />
              </div>
              <div className="stat-value">{card.value}</div>
              {card.change && (
                <div className={`stat-change${card.up ? ' up' : ''}`}>
                  {card.up && <i className="fa-solid fa-arrow-trend-up" />}
                  {' '}{card.change}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Regulatory cost trackers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <i className="fa-solid fa-shield-halved" style={{ color: 'var(--green-primary)', fontSize: '1rem' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>FCCPC Monitoring Fees</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {fccpcFee > 0 ? `₦${fccpcFee.toLocaleString()}` : '—'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>₦850,000 per active campaign ({liveCampaignCount} active)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.625rem' }}>
              {campaigns.filter(c => c.status === 'LIVE').map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{c.title.slice(0, 30)}{c.title.length > 30 ? '…' : ''}</span>
                  <span className="badge badge-green">Active</span>
                </div>
              ))}
              {campaigns.filter(c => c.status === 'LIVE').length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No active campaigns</span>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <i className="fa-solid fa-building-columns" style={{ color: '#3b82f6', fontSize: '1rem' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>LSLGA Levy (Lagos)</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>₦575,000</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Lagos campaigns only · Annual licence due Dec 31</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.625rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Annual Licence Renewal 2026</span>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Due 31 Dec</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <i className="fa-solid fa-chart-pie" style={{ color: 'var(--gold)', fontSize: '1rem' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Regulatory Cost Ratio</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {ratioPercent != null ? `${ratioPercent}%` : '—'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>of gross revenue consumed by regulatory fees</div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: ratioPercent != null ? `${Math.min(Number(ratioPercent), 100)}%` : '0%', borderRadius: 4, background: 'var(--gold)' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>{ratioLabel}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <i className="fa-solid fa-vault" style={{ color: 'var(--text-muted)', fontSize: '1rem' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escrow Balance</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {revenue > 0 ? `₦${(revenue * 0.96 / 1_000_000).toFixed(1)}M` : '—'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>All ticket proceeds secured in escrow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.625rem', fontSize: '0.8125rem' }}>
              <i className="fa-solid fa-circle-check" style={{ color: 'var(--green-primary)' }} />
              <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>Escrow account verified</span>
            </div>
          </div>
        </div>

        {/* Charts — client component */}
        <AdminDashboardCharts />

        {/* Campaign progress */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Campaign Progress</h3>
            <Link href="/admin/campaigns" className="btn btn-outline btn-sm">Manage Campaigns →</Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {campaigns.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>No campaigns yet.</p>
            )}
            {campaigns.map((c, i) => {
              const sold = c.ticketsSold ?? 0;
              const pct = c.totalTickets > 0 ? Math.round((sold / c.totalTickets) * 100) : 0;
              const rev = sold * Number(c.ticketPrice);
              const statusColor = c.status === 'LIVE' ? 'badge-green' : c.status === 'DRAFT' ? 'badge-gray' : 'badge-gold';
              return (
                <div key={c.id}>
                  {i > 0 && <div className="divider" style={{ marginBottom: '1rem' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {c.title} — <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{c.propertyState}</span>
                        </div>
                        <span className={`badge ${statusColor}`}>{c.status}</span>
                      </div>
                      <div className="progress-wrap">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                        <span>{sold.toLocaleString()} / {c.totalTickets.toLocaleString()} tickets</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--green-primary)' }}>
                        ₦{(rev / 1_000_000).toFixed(2)}M
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>revenue</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Purchase Feed — client component */}
        <AdminLiveFeed />

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { href: '/admin/users', icon: 'fa-users', label: 'Manage Users', color: 'var(--info)' },
            { href: '/admin/tickets', icon: 'fa-ticket', label: 'Ticket Registry', color: 'var(--gold)' },
            { href: '/admin/compliance', icon: 'fa-shield-halved', label: 'FCCPC Approvals', color: 'var(--green-primary)' },
            { href: '/admin/draw', icon: 'fa-dice', label: 'Draw Manager', color: '#8b5cf6' },
            { href: '/admin/refund-manager', icon: 'fa-rotate-left', label: 'Refund Manager', color: '#ef4444' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem', padding: '1.25rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', textDecoration: 'none', textAlign: 'center' }}>
              <i className={`fa-solid ${item.icon}`} style={{ fontSize: '1.375rem', color: item.color }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</span>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}
