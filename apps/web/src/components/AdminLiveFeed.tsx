'use client';

import { useEffect, useState } from 'react';

type FeedTicket = {
  id: string;
  ticketNumber: string;
  quantity: number;
  totalAmount: number;
  purchasedAt: string;
  user: { fullName: string; email: string };
  campaign: { title: string };
};

function secsAgo(dateStr: string) {
  const secs = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function AdminLiveFeed() {
  const [tickets, setTickets] = useState<FeedTicket[]>([]);
  const [tick, setTick] = useState(0);

  async function load() {
    try {
      const res = await fetch('/api/admin/tickets/recent', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json() as { success: boolean; data?: { data: FeedTicket[] } };
      if (json.success && Array.isArray(json.data?.data)) setTickets(json.data.data);
    } catch { /* silent */ }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => { void load(); }, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Refresh relative timestamps every 10s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  void tick;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Purchases</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-primary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          LIVE
        </div>
      </div>

      <div style={{ minHeight: 200, padding: '0.5rem 0' }}>
        {tickets.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No recent purchases
          </div>
        ) : tickets.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              padding: '0.625rem 1.25rem',
              borderBottom: i < tickets.length - 1 ? '1px solid var(--border-light)' : undefined,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
              {t.user.fullName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t.user.fullName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                bought {t.quantity} ticket{t.quantity !== 1 ? 's' : ''} for{' '}
                <strong style={{ color: 'var(--green-primary)' }}>{t.campaign.title}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--green-primary)' }}>
                ₦{Number(t.totalAmount).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {secsAgo(t.purchasedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
