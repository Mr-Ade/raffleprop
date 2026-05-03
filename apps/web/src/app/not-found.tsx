import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found | RaffleProp',
};

export default function NotFound() {
  return (
    <main id="main-content">
      <div className="error-page-wrap">
        <div className="container error-page-container">
          <div className="error-page-code">404</div>
          <h1 className="error-page-title">Page Not Found</h1>
          <p className="error-page-desc">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="error-page-actions">
            <Link href="/campaigns" className="btn btn-primary">
              <i className="fa-solid fa-ticket" /> Browse Campaigns
            </Link>
            <Link href="/" className="btn btn-outline">
              <i className="fa-solid fa-house" /> Go Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
