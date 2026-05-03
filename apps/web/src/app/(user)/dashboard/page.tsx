import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';

export const metadata: Metadata = { title: 'My Dashboard — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Ticket = {
  id: string; campaignId: string; quantity: number; totalAmount: number;
  paymentStatus: string; ticketNumber: string; purchasedAt: string;
  campaign: { id: string; slug: string; title: string; drawDate: string | null };
};
type Notification = {
  id: string; type: string; icon: string; title: string;
  message: string; time: string; read: boolean; href: string | null;
};
type ReferralStats = {
  referralCode: string; referralCount: number; referralEarnings: number;
  freeTicketsEarned: number; nextFreeTicketIn: number; progressPercent: number;
};

async function getMyTickets(token: string): Promise<Ticket[]> {
  try {
    const res = await fetch(`${API}/api/tickets`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: { data: Ticket[] } };
    return Array.isArray(json.data?.data) ? json.data.data : [];
  } catch { return []; }
}

async function getReferralStats(token: string): Promise<ReferralStats | null> {
  try {
    const res = await fetch(`${API}/api/users/me/referral-stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: ReferralStats };
    return json.data ?? null;
  } catch { return null; }
}

async function getNotifications(token: string): Promise<Notification[]> {
  try {
    const res = await fetch(`${API}/api/users/me/notifications`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: Notification[] };
    return Array.isArray(json.data) ? json.data.slice(0, 3) : [];
  } catch { return []; }
}

export default async function DashboardPage() {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;

  const [tickets, referral, notifications] = await Promise.all([
    getMyTickets(token),
    getReferralStats(token),
    getNotifications(token),
  ]);

  const activeTickets = tickets.filter((t) => t.paymentStatus === 'SUCCESS');
  const totalSpent = activeTickets.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const uniqueCampaigns = [...new Map(activeTickets.map((t) => [t.campaignId, t])).values()];
  const upcomingDraws = uniqueCampaigns
    .filter((t) => t.campaign.drawDate && new Date(t.campaign.drawDate) > new Date())
    .sort((a, b) => new Date(a.campaign.drawDate!).getTime() - new Date(b.campaign.drawDate!).getTime());

  const initials = user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const NOTIF_COLORS: Record<string, string> = {
    payment: 'var(--green-primary)', draw: 'var(--gold)',
    refund: '#3b82f6', winner: 'var(--gold)', legal: 'var(--text-muted)',
  };

  return (
    <>
      {/* Mobile user header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">Welcome back, {user.fullName.split(' ')[0]}!</div>
          <div className="portal-mobile-header-email">{user.email}</div>
        </div>
        <Link href="/campaigns" className="btn btn-gold btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <i className="fa-solid fa-ticket" /> Buy
        </Link>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 900, letterSpacing: '-0.02em' }}>My Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Track your tickets, draws, and referral earnings.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)' }}>
              <i className="fa-solid fa-ticket" />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Tickets</span>
          </div>
          <div className="stat-value">{activeTickets.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>across all campaigns</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-dark)' }}>
              <i className="fa-solid fa-naira-sign" />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Invested</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.375rem' }}>₦{totalSpent.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
              <i className="fa-solid fa-house" />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Campaigns Entered</span>
          </div>
          <div className="stat-value">{uniqueCampaigns.length}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)' }}>
              <i className="fa-solid fa-users" />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Referral Earnings</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.375rem' }}>₦{(referral?.referralEarnings ?? 0).toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{referral?.referralCount ?? 0} confirmed referrals</div>
        </div>
      </div>

      {/* Active Campaigns */}
      {uniqueCampaigns.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>My Active Campaigns</span>
            <Link href="/tickets" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)' }}>View all tickets →</Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {uniqueCampaigns.slice(0, 4).map((t) => {
              const ticketCount = activeTickets.filter((x) => x.campaignId === t.campaignId).reduce((s, x) => s + x.quantity, 0);
              const drawDate = t.campaign.drawDate ? new Date(t.campaign.drawDate) : null;
              return (
                <div key={t.campaignId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--green-primary), var(--green-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-house" style={{ color: '#fff', fontSize: '0.875rem' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.campaign.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
                      {drawDate && <> · Draw: {drawDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                    </div>
                  </div>
                  <Link href={`/campaigns/${t.campaign.slug}`} style={{ fontSize: '0.75rem', color: 'var(--green-primary)', fontWeight: 600, flexShrink: 0 }}>
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Draws */}
      {upcomingDraws.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            <i className="fa-solid fa-dice" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
            Upcoming Draws
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingDraws.slice(0, 3).map((t) => {
              const drawDate = new Date(t.campaign.drawDate!);
              const daysLeft = Math.ceil((drawDate.getTime() - Date.now()) / 86400000);
              return (
                <div key={t.campaignId} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: daysLeft <= 7 ? '#fee2e2' : 'var(--green-50)', border: `1px solid ${daysLeft <= 7 ? '#fca5a5' : 'var(--green-100)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: daysLeft <= 7 ? '#dc2626' : 'var(--green-primary)', lineHeight: 1 }}>{daysLeft}</span>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>days</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.campaign.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {drawDate.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referral widget */}
      {referral && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              <i className="fa-solid fa-share-nodes" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
              Earn Free Tickets — Share Your Link
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ flex: 1, minWidth: 160, background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)', padding: '0.625rem 1rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--green-primary)', letterSpacing: '0.05em' }}>
                {referral.referralCode}
              </div>
              <a
                href={`https://raffleprop.com/register?ref=${referral.referralCode}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: '#25D366', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                <i className="fa-brands fa-whatsapp" /> Share
              </a>
              <Link href="/referrals" className="btn btn-outline btn-sm">View Dashboard →</Link>
            </div>
            {/* Progress bar */}
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              {referral.referralCount % 5}/5 referrals to next free ticket
            </div>
            <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: `${referral.progressPercent}%`, height: '100%', background: 'var(--green-primary)', borderRadius: 100, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Recent Notifications</span>
            <Link href="/notifications" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)' }}>View all →</Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${NOTIF_COLORS[n.type] ?? 'var(--green-primary)'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${n.icon}`} style={{ color: NOTIF_COLORS[n.type] ?? 'var(--green-primary)', fontSize: '0.875rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.125rem' }}>{n.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: n.message }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent tickets table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Recent Tickets</span>
          <Link href="/tickets" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)' }}>
            View all <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>
        {tickets.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <i className="fa-solid fa-ticket" style={{ fontSize: '2.5rem', color: 'var(--border)', marginBottom: '1rem' }} />
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No tickets yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Browse active campaigns and enter a draw.</p>
            <Link href="/campaigns" className="btn btn-primary btn-sm">Browse Campaigns</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table-responsive">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Campaign</th>
                  <th>Date</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 5).map((t) => (
                  <tr key={t.id}>
                    <td data-label="Ticket #" style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{t.ticketNumber}</td>
                    <td data-label="Campaign" style={{ fontSize: '0.8125rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.campaign?.title ?? '—'}</td>
                    <td data-label="Date">{new Date(t.purchasedAt).toLocaleDateString('en-NG')}</td>
                    <td data-label="Qty">{t.quantity}</td>
                    <td data-label="Amount" style={{ fontWeight: 700 }}>₦{Number(t.totalAmount).toLocaleString()}</td>
                    <td data-label="Status">
                      <span className={`badge ${t.paymentStatus === 'SUCCESS' ? 'badge-green' : t.paymentStatus === 'PENDING' ? 'badge-gold' : 'badge-red'}`}>
                        {t.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
