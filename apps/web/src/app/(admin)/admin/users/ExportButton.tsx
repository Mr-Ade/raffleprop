'use client';

import { useState } from 'react';

interface ExportButtonProps {
  apiUrl: string;
  token: string;
}

export function ExportButton({ apiUrl, token }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleExport() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Export failed. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
        ?? `raffleprop-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={handleExport}
        disabled={loading}
      >
        <i className="fa-solid fa-download" style={{ marginRight: '0.4rem' }} />
        {loading ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>{error}</span>}
    </span>
  );
}
