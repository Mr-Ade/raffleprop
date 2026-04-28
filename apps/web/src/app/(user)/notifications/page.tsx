import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Notifications — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Notification = {
  id: string;
  type: string;
  icon: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  href: string | null;
};

async function getNotifications(token: string): Promise<Notification[]> {
  try {
    const res = await fetch(`${API}/api/users/me/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: Notification[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch { return []; }
}

const TYPE_COLORS: Record<string, string> = {
  payment: 'var(--green-primary)',
  draw: 'var(--gold)',
  refund: '#3b82f6',
  winner: 'var(--gold)',
  legal: 'var(--text-muted)',
};

const TYPE_LABELS: Record<string, string> = {
  payment: 'Payment',
  draw: 'Draw',
  refund: 'Refund',
  winner: 'Winner',
  legal: 'Legal',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default async function NotificationsPage() {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;
  const notifications = await getNotifications(token);

  const initials = user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  // Group by type for filter counts
  const counts: Record<string, number> = { all: notifications.length };
  for (const n of notifications) {
    counts[n.type] = (counts[n.type] ?? 0) + 1;
  }

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">Notifications</div>
          <div className="portal-mobile-header-sub">{notifications.length} alert{notifications.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Page header */}
      <div className="portal-page-header">
        <h1 className="portal-page-title">Notifications</h1>
        <p className="portal-page-subtitle">Activity alerts for your tickets, draws, and refunds</p>
      </div>

      {/* Summary chips */}
      {notifications.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {Object.entries(TYPE_LABELS).filter(([type]) => (counts[type] ?? 0) > 0).map(([type, label]) => (
            <span key={type} style={{ padding: '0.3rem 0.75rem', borderRadius: 99, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontSize: '0.78rem', fontWeight: 600, color: TYPE_COLORS[type] ?? 'var(--text-muted)' }}>
              {label} ({counts[type]})
            </span>
          ))}
        </div>
      )}

      {/* Notification list */}
      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-bell-slash" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No notifications yet</p>
            <p style={{ fontSize: '0.875rem' }}>Activity from your tickets, draws, and refunds will appear here.</p>
            <Link href="/campaigns" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', marginTop: '1rem' }}>Browse Campaigns</Link>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  alignItems: 'flex-start',
                  borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-light)' : 'none',
                  background: n.read ? 'transparent' : 'var(--green-50)',
                  transition: 'background 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${TYPE_COLORS[n.type] ?? 'var(--text-muted)'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${n.icon}`} style={{ color: TYPE_COLORS[n.type] ?? 'var(--text-muted)', fontSize: '1rem' }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{n.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.time)}</span>
                  </div>
                  <p
                    style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: n.message }}
                  />
                  {n.href && (
                    <Link href={n.href} style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.775rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                      View details <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                    </Link>
                  )}
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-primary)', flexShrink: 0, marginTop: '0.35rem' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      {notifications.length > 0 && (
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Notifications are generated from your ticket purchases, refunds, and upcoming draws. They are not stored permanently.
        </p>
      )}
    </>
  );
}
