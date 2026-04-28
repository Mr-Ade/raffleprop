import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SiteShell } from '@/components/SiteShell';
import { cms } from '@/lib/cms';

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://raffleprop.com'),
  title: {
    default: 'RaffleProp — Win Property Through Fair Raffles',
    template: '%s | RaffleProp',
  },
  description:
    'RaffleProp is a FCCPC-regulated property raffle platform. Win your dream home through transparent, compliant ticket draws.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'RaffleProp',
    title: 'RaffleProp — Win a Property in Nigeria From ₦2,500',
    description:
      "Nigeria's most transparent property raffle platform. CAC registered, escrow protected, lawyer verified. Live draws on YouTube.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaffleProp — Win a Property in Nigeria From ₦2,500',
    description:
      "Nigeria's first FCCPC-regulated property raffle. Win your dream home from ₦2,500.",
    site: '@raffleprop',
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await cms.getSettings(300).catch(() => null);
  const banner = settings?.maintenanceBanner?.trim() ?? null;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Self-hosted Inter font */}
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/inter.css" />
        {/* Self-hosted Font Awesome 6.5.1 */}
        <link rel="stylesheet" href="/fa/css/all.min.css" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {banner && (
          <div role="alert" style={{
            background: '#1a1a1a', color: '#fff', textAlign: 'center',
            padding: '0.625rem 1.5rem', fontSize: '0.8125rem', fontWeight: 500,
            lineHeight: 1.4, zIndex: 9999, position: 'relative',
          }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: '0.5rem', color: '#F0C040' }} />
            {banner}
          </div>
        )}
        <SiteShell header={<Header />} footer={<Footer />}>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
