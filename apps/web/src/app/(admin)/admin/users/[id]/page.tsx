import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { UserKycActions } from './UserKycActions';
import { ChangeRoleButton } from './ChangeRoleButton';

export const metadata: Metadata = { title: 'User Detail — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  kycStatus: string;
  role: string;
  referralCode: string;
  referralCount: number;
  referralEarnings: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  ndprConsentAt: string | null;
  bannedAt: string | null;
  flaggedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  _count: { tickets: number };
  tickets: {
    id: string;
    ticketNumber: string;
    campaignId: string;
    totalAmount: string;
    paymentStatus: string;
    purchasedAt: string;
  }[];
};

const KYC_BADGE: Record<string, string> = {
  VERIFIED: 'badge-green',
  SUBMITTED: 'badge-gold',
  PENDING:   'badge-gray',
  REJECTED:  'badge-red',
};

const PAYMENT_BADGE: Record<string, string> = {
  SUCCESS:  'badge-green',
  PENDING:  'badge-gold',
  FAILED:   'badge-red',
  REFUNDED: 'badge-gray',
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [token, session] = await Promise.all([getAccessToken(), getServerSession()]);
  if (!token) notFound();
  const openKycPanel = sp.review === 'kyc';
  const isSuperAdmin = session?.role === 'SUPER_ADMIN';
  const clientApiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  let user: UserDetail | null = null;
  try {
    const res = await fetch(`${API}/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error('Failed to fetch user');
    const json = await res.json() as { success: boolean; data: UserDetail };
    user = json.data;
  } catch {
    notFound();
  }

  if (!user) notFound();

  const totalSpent = user.tickets
    .filter(t => t.paymentStatus === 'SUCCESS')
    .reduce((sum, t) => sum + Number(t.totalAmount), 0);

  return (
    <>
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin/users" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.375rem' }} />
            Users
          </Link>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{user.fullName}</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>User ID: {user.id}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {user.deletedAt && <span className="badge badge-red">Deleted</span>}
          {user.bannedAt && <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}><i className="fa-solid fa-ban" style={{ marginRight: '0.3rem' }} />Banned</span>}
          {user.flaggedAt && !user.bannedAt && <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}><i className="fa-solid fa-flag" style={{ marginRight: '0.3rem' }} />Flagged</span>}
          <span className={`badge ${KYC_BADGE[user.kycStatus] ?? 'badge-gray'}`}>{user.kycStatus}</span>
          {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
            <span className="badge badge-green">{user.role}</span>
          )}
        </div>
      </div>

      <div className="admin-content">

        {/* Profile header */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--green-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, flexShrink: 0,
            }}>
              {initials(user.fullName)}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{user.fullName}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{user.email}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {user.phone}
                {user.phoneVerified && (
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--green-primary)', marginLeft: '0.375rem', fontSize: '0.75rem' }} title="Phone verified" />
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              <div>Registered {new Date(user.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              {user.ndprConsentAt && (
                <div style={{ marginTop: '0.25rem' }}>
                  NDPR consent {new Date(user.ndprConsentAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Tickets Purchased', value: user._count.tickets, color: 'var(--green-primary)' },
            { label: 'Total Spent', value: `₦${totalSpent.toLocaleString('en-NG')}`, color: 'var(--green-primary)' },
            { label: 'Referrals Made', value: user.referralCount, color: 'var(--info)' },
            { label: 'Referral Earnings', value: `₦${Number(user.referralEarnings).toLocaleString('en-NG')}`, color: 'var(--info)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '1rem', borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: '1.375rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="admin-chart-grid-1-1" style={{ alignItems: 'start', marginBottom: 0 }}>

          {/* Account details */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Account Details</h3>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {[
                { label: 'Email', value: user.email, verified: user.emailVerified },
                { label: 'Phone', value: user.phone, verified: user.phoneVerified },
                { label: 'Role', value: user.role },
                { label: 'Referral Code', value: user.referralCode, mono: true },
                { label: 'KYC Status', value: user.kycStatus, badge: KYC_BADGE[user.kycStatus] },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.875rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  {row.badge ? (
                    <span className={`badge ${row.badge}`}>{row.value}</span>
                  ) : (
                    <span style={{ fontWeight: 600, fontFamily: row.mono ? 'monospace' : undefined }}>
                      {row.value}
                      {row.verified !== undefined && (
                        <i className={`fa-solid fa-circle-${row.verified ? 'check' : 'xmark'}`}
                          style={{ color: row.verified ? 'var(--green-primary)' : 'var(--danger)', marginLeft: '0.375rem', fontSize: '0.75rem' }} />
                      )}
                    </span>
                  )}
                </div>
              ))}
              {user.deletedAt && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c', fontWeight: 600 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
                  Account deleted {new Date(user.deletedAt).toLocaleDateString('en-NG')}
                </div>
              )}
              {isSuperAdmin && (
                <ChangeRoleButton
                  userId={user.id}
                  currentRole={user.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN'}
                  isSelf={session!.id === user.id}
                  token={token!}
                  apiUrl={clientApiUrl}
                />
              )}
            </div>
          </div>

          {/* KYC Review panel */}
          {user.kycStatus === 'SUBMITTED' || openKycPanel ? (
            <UserKycActions
              userId={user.id}
              kycStatus={user.kycStatus}
              token={token}
              autoOpen={openKycPanel && user.kycStatus === 'SUBMITTED'}
            />
          ) : (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>KYC Verification</h3>
              </div>
              <div style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {user.kycStatus === 'VERIFIED' && (
                  <div>
                    <i className="fa-solid fa-circle-check" style={{ color: 'var(--green-primary)', fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }} />
                    KYC verified. No action needed.
                  </div>
                )}
                {user.kycStatus === 'PENDING' && (
                  <div>
                    <i className="fa-solid fa-clock" style={{ color: 'var(--warning)', fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }} />
                    User has not submitted KYC documents yet.
                  </div>
                )}
                {user.kycStatus === 'REJECTED' && (
                  <div>
                    <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--danger)', fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }} />
                    KYC was rejected. User must resubmit.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent tickets */}
        {user.tickets.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Recent Tickets</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Last {user.tickets.length} ticket{user.tickets.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket Number</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {user.tickets.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.ticketNumber}</td>
                      <td style={{ fontWeight: 600 }}>₦{Number(t.totalAmount).toLocaleString('en-NG')}</td>
                      <td>
                        <span className={`badge ${PAYMENT_BADGE[t.paymentStatus] ?? 'badge-gray'}`}>
                          {t.paymentStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {new Date(t.purchasedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
