'use client';

import * as Sentry from '@sentry/nextjs';

// Initialise at module load time — synchronous, no useEffect delay.
// NEXT_PUBLIC_* vars are inlined at build time; if undefined here the
// env var was missing from Railway when the build ran.
if (typeof window !== 'undefined') {
  Sentry.init({
    dsn: 'https://16ff221c8a168f9d050f64a91af1f1b5@o4511325701210112.ingest.de.sentry.io/4511325995597904',
    environment: process.env['NODE_ENV'] ?? 'production',
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });
}

export function SentryInit() {
  return null;
}
