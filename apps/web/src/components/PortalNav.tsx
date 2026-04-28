'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';

type NavItem =
  | { type: 'link'; href: string; icon: string; label: string; gold?: boolean }
  | { type: 'divider'; label: string };

const NAV_ITEMS: NavItem[] = [
  { type: 'link', href: '/dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
  { type: 'link', href: '/tickets', icon: 'fa-ticket', label: 'My Tickets' },
  { type: 'link', href: '/transactions', icon: 'fa-file-invoice', label: 'Transaction Records' },
  { type: 'link', href: '/referrals', icon: 'fa-users', label: 'Referrals' },
  { type: 'link', href: '/notifications', icon: 'fa-bell', label: 'Notifications' },
  { type: 'divider', label: 'Legal & Privacy' },
  { type: 'link', href: '/terms-log', icon: 'fa-file-contract', label: 'T&C Acceptance Log' },
  { type: 'link', href: '/ndpr', icon: 'fa-shield-halved', label: 'Data Rights Centre' },
  { type: 'divider', label: 'Account' },
  { type: 'link', href: '/profile', icon: 'fa-user', label: 'Profile & KYC' },
  { type: 'link', href: '/winner', icon: 'fa-trophy', label: 'Winner Portal', gold: true },
];

const BOTTOM_NAV = [
  { href: '/dashboard', icon: 'fa-gauge-high', label: 'Home' },
  { href: '/tickets', icon: 'fa-ticket', label: 'Tickets' },
  { href: '/referrals', icon: 'fa-users', label: 'Referrals' },
  { href: '/notifications', icon: 'fa-bell', label: 'Alerts' },
  { href: '/profile', icon: 'fa-user', label: 'Profile' },
];

export function PortalSidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <nav>
        {NAV_ITEMS.map((item, idx) =>
          item.type === 'divider' ? (
            <div
              key={`div-${idx}`}
              style={{
                fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0.875rem 0.75rem 0.25rem',
              }}
            >
              {item.label}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`portal-nav-item${pathname === item.href ? ' active' : ''}`}
              style={item.gold && pathname !== item.href ? { color: 'var(--gold)' } : undefined}
            >
              <i
                className={`fa-solid ${item.icon}`}
                style={item.gold && pathname !== item.href ? { color: 'var(--gold)' } : undefined}
              />
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)', marginTop: '1rem' }}>
        <Link
          href="/campaigns"
          className="portal-nav-item"
        >
          <i className="fa-solid fa-magnifying-glass" />
          Browse Campaigns
        </Link>
        <LogoutButton
          className="portal-nav-item"
          style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none',
            cursor: 'pointer', color: '#dc2626', fontFamily: 'inherit', fontSize: 'inherit',
          }}
        />
      </div>
    </>
  );
}

export function PortalBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="portal-bottom-nav" aria-label="Mobile navigation">
      {BOTTOM_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`pbn-item${pathname === item.href ? ' active' : ''}`}
        >
          <i className={`fa-solid ${item.icon}`} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
