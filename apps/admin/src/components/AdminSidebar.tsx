'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminUser } from '@/lib/session';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/', icon: 'fa-gauge-high', label: 'Dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/campaigns', icon: 'fa-house', label: 'Campaigns' },
      { href: '/draw', icon: 'fa-dice', label: 'Draws' },
      { href: '/tickets', icon: 'fa-ticket', label: 'Tickets' },
      { href: '/users', icon: 'fa-users', label: 'Users' },
      { href: '/refund-manager', icon: 'fa-rotate-left', label: 'Refunds' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/compliance', icon: 'fa-scale-balanced', label: 'Compliance' },
      { href: '/regulatory-calendar', icon: 'fa-calendar-check', label: 'Regulatory Calendar' },
      { href: '/post-draw', icon: 'fa-file-contract', label: 'Post-Draw Filing' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/influencers', icon: 'fa-star', label: 'Influencers' },
      { href: '/comms', icon: 'fa-envelope', label: 'Communications' },
      { href: '/calculator', icon: 'fa-calculator', label: 'Calculator' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/content', icon: 'fa-pen-to-square', label: 'Content Pages' },
      { href: '/property-manager', icon: 'fa-building', label: 'Property Manager' },
    ],
  },
] as const;

interface Props {
  user: AdminUser;
}

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/login';
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside id="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="logo-text">Raffle<span>Prop</span></div>
        <div className="logo-sub">Admin Console</div>
      </div>

      <nav className="admin-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="admin-nav-label">{section.label}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item${isActive(item.href) ? ' active' : ''}`}
              >
                <i className={`fa-solid ${item.icon}`} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-user-card">
          <div className="admin-user-avatar">
            {user.fullName?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="admin-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.fullName}
            </div>
            <div className="admin-user-role">{user.role.replace('_', ' ')}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem', flexShrink: 0 }}
            aria-label="Logout"
          >
            <i className="fa-solid fa-right-from-bracket" />
          </button>
        </div>
      </div>
    </aside>
  );
}
