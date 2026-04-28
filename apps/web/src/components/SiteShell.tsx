'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Routes that have their own full-page layouts (admin panel, user portal).
// The public Header + Footer must NOT appear on these.
const NO_SHELL_PREFIXES = [
  '/admin',
  '/dashboard',
  '/tickets',
  '/profile',
  '/ndpr',
  '/referrals',
  '/notifications',
  '/transactions',
  '/winner',
  '/terms-log',
];

export function SiteShell({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const hideShell = NO_SHELL_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?'),
  );

  if (hideShell) return <>{children}</>;

  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}
