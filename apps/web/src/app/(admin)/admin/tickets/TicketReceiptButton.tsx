'use client';

import { useState } from 'react';

export function TicketReceiptButton({
  ticketId,
  token,
  apiUrl,
}: {
  ticketId: string;
  token: string;
  apiUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleView() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/tickets/${ticketId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
      if (!json.success || !json.data?.url) {
        setError(json.error ?? 'Receipt not available.');
        return;
      }
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
    <button
      type="button"
      title="View receipt PDF (15-min link)"
      disabled={loading}
      onClick={handleView}
      style={{
        width: 28, height: 28, borderRadius: 6,
        border: '1px solid var(--border)',
        background: '#fff',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
      }}
    >
      {loading
        ? <i className="fa-solid fa-spinner fa-spin" />
        : <i className="fa-solid fa-file-pdf" />}
    </button>
    {error && <span style={{ fontSize: '0.65rem', color: '#b91c1c', maxWidth: 80, textAlign: 'center', lineHeight: 1.2 }}>{error}</span>}
    </span>
  );
}
