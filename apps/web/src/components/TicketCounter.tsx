'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  campaignId: string;
  totalTickets: number;
  initialSold: number;
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const POLL_INTERVAL = 15_000; // fallback polling every 15s

export function TicketCounter({ campaignId, totalTickets, initialSold }: Props) {
  const [sold, setSold] = useState(initialSold);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fallback: poll the count endpoint
  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/campaigns/${campaignId}/tickets/count`);
        if (!res.ok) return;
        const data = await res.json() as { data?: { ticketsSold?: number } };
        const count = data.data?.ticketsSold;
        if (typeof count === 'number') setSold(count);
      } catch { /* network error — keep current count */ }
    }, POLL_INTERVAL);
  }

  useEffect(() => {
    const url = `${API}/api/campaigns/${campaignId}/tickets/sse`;

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setLive(true);
        // Stop polling if SSE connected
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as { ticketsSold?: number };
          if (typeof data.ticketsSold === 'number') setSold(data.ticketsSold);
        } catch { /* ignore malformed frame */ }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setLive(false);
        startPolling(); // SSE failed — fall back to polling
      };
    } catch {
      // EventSource not supported or URL invalid — go straight to polling
      startPolling();
    }

    return () => {
      esRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const pct = totalTickets > 0 ? Math.min(Math.round((sold / totalTickets) * 100), 100) : 0;
  const remaining = Math.max(0, totalTickets - sold);
  const progressClass = pct >= 90 ? 'progress-fill danger' : pct >= 70 ? 'progress-fill gold' : 'progress-fill';

  return (
    <div>
      {/* Sold / total header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {sold.toLocaleString()}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {' '}of {totalTickets.toLocaleString()} sold
          </span>
        </span>
        <span style={{
          fontSize: '0.875rem', fontWeight: 700,
          color: pct >= 90 ? 'var(--error)' : pct >= 70 ? 'var(--warning)' : 'var(--green-primary)',
        }}>
          {pct}% filled
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-wrap">
        <div
          className={progressClass}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% of tickets sold`}
        />
      </div>

      {/* Stats row */}
      <div className="ticket-stats" style={{ marginTop: '0.375rem' }}>
        <span>
          <strong style={{ color: remaining < 100 ? 'var(--error)' : 'var(--text-primary)' }}>
            {remaining.toLocaleString()}
          </strong>
          {' '}remaining
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {pct >= 80 && (
            <span className="live-indicator">
              <span className="live-dot" />
              Selling fast
            </span>
          )}
          {live && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
              Live
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
