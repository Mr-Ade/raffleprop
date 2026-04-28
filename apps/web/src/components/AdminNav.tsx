'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';

const MAIN_NAV = [
  { key: '/admin/dashboard',      icon: 'fa-gauge-high',      label: 'Dashboard' },
  { key: '/admin/campaigns',      icon: 'fa-trophy',          label: 'Campaigns' },
  { key: '/admin/draw',           icon: 'fa-dice',            label: 'Draw Manager',      badge: '1' },
  { key: '/admin/users',          icon: 'fa-users',           label: 'Users' },
  { key: '/admin/tickets',        icon: 'fa-ticket',          label: 'Ticket Registry' },
  { key: '/admin/content',        icon: 'fa-pen-to-square',   label: 'Content Manager' },
  { key: '/admin/comms',          icon: 'fa-envelope',        label: 'Comms Hub' },
];

const COMPLIANCE_NAV = [
  { key: '/admin/calculator',         icon: 'fa-calculator',        label: 'Profit Calculator' },
  { key: '/admin/compliance',         icon: 'fa-shield-halved',     label: 'FCCPC Approvals' },
  { key: '/admin/regulatory-calendar',icon: 'fa-calendar-check',    label: 'Reg. Calendar' },
  { key: '/admin/property-manager',   icon: 'fa-folder-open',       label: 'Property Manager' },
  { key: '/admin/post-draw',          icon: 'fa-file-circle-check', label: 'Post-Draw Filing', badge: '2' },
  { key: '/admin/refund-manager',     icon: 'fa-rotate-left',       label: 'Refund Manager' },
];

const OPERATIONS_NAV = [
  { key: '/admin/influencers', icon: 'fa-star', label: 'Influencer Hub' },
];

interface NavItem {
  key: string;
  icon: string;
  label: string;
  badge?: string;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.key || pathname.startsWith(item.key + '/');
  return (
    <Link
      href={item.key}
      className={`admin-nav-item${active ? ' active' : ''}`}
    >
      <i className={`fa-solid ${item.icon}`} />
      <span>{item.label}</span>
      {item.badge && <span className="badge-count">{item.badge}</span>}
    </Link>
  );
}

export function AdminSidebarNav({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside id="admin-sidebar">
      {/* Logo */}
      <div className="admin-sidebar-logo">
        <div className="logo-text">Raffle<span>Prop</span></div>
        <div className="logo-sub">Admin Panel</div>
      </div>

      {/* Navigation */}
      <nav className="admin-nav">
        <div className="admin-nav-label">Main Menu</div>
        {MAIN_NAV.map((item) => <NavLink key={item.key} item={item} pathname={pathname} />)}

        <div className="admin-nav-label" style={{ marginTop: '1.5rem' }}>Compliance</div>
        {COMPLIANCE_NAV.map((item) => <NavLink key={item.key} item={item} pathname={pathname} />)}

        {OPERATIONS_NAV.length > 0 && (
          <>
            <div className="admin-nav-label" style={{ marginTop: '1.5rem' }}>Operations</div>
            {OPERATIONS_NAV.map((item) => <NavLink key={item.key} item={item} pathname={pathname} />)}
          </>
        )}

        <div className="admin-nav-label" style={{ marginTop: '1.5rem' }}>System</div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="admin-nav-item">
          <i className="fa-solid fa-arrow-up-right-from-square" />
          <span>View Website</span>
        </a>
        <a href="/trust-legal" className="admin-nav-item">
          <i className="fa-solid fa-scale-balanced" />
          <span>Legal Centre</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-user-card">
          <div className="admin-user-avatar">{initials}</div>
          <div>
            <div className="admin-user-name">{userName}</div>
            <div className="admin-user-role">{userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</div>
          </div>
        </div>
        <LogoutButton
          className="admin-nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', justifyContent: 'flex-start' }}
        />
      </div>
    </aside>
  );
}

export function AdminBottomNav() {
  const pathname = usePathname();

  const BOTTOM = [
    { key: '/admin/dashboard',  icon: 'fa-gauge-high',    label: 'Dashboard' },
    { key: '/admin/campaigns',  icon: 'fa-trophy',        label: 'Campaigns' },
    { key: '/admin/draw',       icon: 'fa-dice',          label: 'Draw' },
    { key: '/admin/users',      icon: 'fa-users',         label: 'Users' },
    { key: '/admin/tickets',    icon: 'fa-ticket',        label: 'Tickets' },
    { key: '/admin/compliance', icon: 'fa-shield-halved', label: 'Compliance' },
  ];

  return (
    <nav className="admin-bottom-nav" aria-label="Admin mobile navigation">
      {BOTTOM.map((item) => {
        const active = pathname === item.key || pathname.startsWith(item.key + '/');
        return (
          <Link key={item.key} href={item.key} className={`abn-item${active ? ' active' : ''}`}>
            <i className={`fa-solid ${item.icon}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
