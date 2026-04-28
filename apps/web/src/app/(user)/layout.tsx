import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { PortalSidebarNav, PortalBottomNav } from '@/components/PortalNav';
import type { ReactNode } from 'react';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect('/login?redirect=/dashboard');

  const initials = user.fullName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="portal-layout">
      {/* Desktop sidebar */}
      <aside className="portal-sidebar">
        {/* User info card */}
        <div style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'var(--green-50)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green-primary), var(--green-light))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.125rem', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>

        {/* Client nav — handles active state with usePathname() */}
        <PortalSidebarNav />
      </aside>

      {/* Main content */}
      <div className="portal-main">
        {children}
      </div>

      {/* Mobile bottom nav — client component for active state */}
      <PortalBottomNav />
    </div>
  );
}
