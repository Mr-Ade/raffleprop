'use client';

import { useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type State = 'idle' | 'loading' | 'success' | 'error';

export function CampaignNotifyForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

      if (res.ok) {
        setState('success');
        setEmail('');
      } else {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0.625rem', padding: '1.25rem 0',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--green-50)', border: '2px solid var(--green-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fa-solid fa-check" style={{ color: 'var(--green-primary)', fontSize: '1.25rem' }} />
        </div>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>You&apos;re on the list!</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
          We&apos;ll email you as soon as a new campaign launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setState('idle'); }}
          placeholder="Your email address"
          className="form-input"
          style={{ flex: '1 1 200px', minWidth: 0 }}
          disabled={state === 'loading'}
          aria-label="Email address for campaign notifications"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={state === 'loading' || !email.trim()}
          style={{ flexShrink: 0 }}
        >
          {state === 'loading'
            ? <><i className="fa-solid fa-spinner fa-spin" /> Subscribing…</>
            : <><i className="fa-regular fa-bell" style={{ marginRight: '0.375rem' }} />Notify Me</>
          }
        </button>
      </div>

      {state === 'error' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--error)', margin: 0 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.25rem' }} />
          {errorMsg}
        </p>
      )}
    </form>
  );
}
