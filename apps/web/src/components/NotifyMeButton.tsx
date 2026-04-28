'use client';

import { useRef, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export function NotifyMeButton({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<'idle' | 'open' | 'loading' | 'done' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function openForm() {
    setState('open');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Subscription failed');
      setState('done');
    } catch {
      setErrorMsg('Could not subscribe. Please try again.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <button type="button" className="btn btn-outline btn-sm" disabled>
        <i className="fa-solid fa-check" style={{ marginRight: '0.375rem', color: 'var(--green-primary)' }} />
        You&apos;re on the list!
      </button>
    );
  }

  if (state === 'open' || state === 'loading' || state === 'error') {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            padding: '0.375rem 0.625rem', fontSize: '0.8125rem',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            outline: 'none', width: 170,
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={state === 'loading'}>
          {state === 'loading'
            ? <i className="fa-solid fa-spinner fa-spin" />
            : 'Notify Me'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setState('idle')}
          style={{ padding: '0.375rem 0.5rem' }}>
          <i className="fa-solid fa-xmark" />
        </button>
        {state === 'error' && (
          <p style={{ fontSize: '0.75rem', color: '#dc2626', width: '100%', marginTop: '0.25rem' }}>{errorMsg}</p>
        )}
      </form>
    );
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={openForm} data-campaign={campaignId}>
      <i className="fa-regular fa-bell" style={{ marginRight: '0.375rem' }} />
      Notify Me
    </button>
  );
}
