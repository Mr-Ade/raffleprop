'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content">
      <div className="error-page-wrap">
        <div className="container error-page-container">
          <div className="error-icon">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <h1 className="error-page-title">Something went wrong</h1>
          <p className="error-page-desc">
            We hit an unexpected error. Please try again — if the problem persists, contact support.
          </p>
          <div className="error-page-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={reset}
            >
              <i className="fa-solid fa-rotate-right" /> Try Again
            </button>
            <Link href="/" className="btn btn-outline">
              <i className="fa-solid fa-house" /> Go Home
            </Link>
          </div>
          {error.digest && (
            <p className="error-page-digest">Error reference: {error.digest}</p>
          )}
        </div>
      </div>
    </main>
  );
}
