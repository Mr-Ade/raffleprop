import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Admin — RaffleProp', template: '%s | RaffleProp Admin' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Inter', -apple-system, sans-serif", background: '#F8F9FA', color: '#111827', lineHeight: 1.6, WebkitFontSmoothing: 'antialiased' }}>
        {children}
      </body>
    </html>
  );
}
