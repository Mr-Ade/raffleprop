'use client';

import { useState } from 'react';

interface ExportParams {
  status: string;
  gateway: string;
  campaignId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export function TicketsExportButton({
  token,
  apiUrl,
  params,
}: {
  token: string;
  apiUrl: string;
  params: ExportParams;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleExport() {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams();
      if (params.status     && params.status !== 'all')     p.set('status',     params.status);
      if (params.gateway    && params.gateway !== 'all')    p.set('gateway',    params.gateway);
      if (params.campaignId && params.campaignId !== 'all') p.set('campaignId', params.campaignId);
      if (params.dateFrom)  p.set('dateFrom', params.dateFrom);
      if (params.dateTo)    p.set('dateTo',   params.dateTo);
      if (params.search)    p.set('search',   params.search);

      const res = await fetch(`${apiUrl}/api/admin/tickets/export?${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError('Export failed. Please try again.');
        return;
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `raffleprop-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
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
        {loading
          ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Exporting…</>
          : <><i className="fa-solid fa-file-csv" style={{ marginRight: '0.375rem' }} />Export CSV</>}
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>{error}</span>}
    </span>
  );
}
