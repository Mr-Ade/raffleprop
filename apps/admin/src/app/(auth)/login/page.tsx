'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../../../app/globals.css';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const IS_PROD = process.env['NODE_ENV'] === 'production';

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${IS_PROD ? '; Secure' : ''}`;
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as {
        success: boolean;
        data?: { requiresTwoFactor?: boolean; accessToken?: string; refreshToken?: string };
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Invalid credentials.');
        return;
      }

      if (data.data?.requiresTwoFactor) {
        // Admin — needs TOTP
        setStep('totp');
      } else if (data.data?.accessToken) {
        // Non-admin login — reject
        setError('This portal is for administrators only.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, totpCode }),
      });
      const data = await res.json() as {
        success: boolean;
        data?: { accessToken: string; refreshToken: string };
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Invalid authentication code.');
        return;
      }

      // Set admin token in httpOnly cookie via API route
      await fetch('/api/auth/set-admin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.data),
      });

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: '#0f1f14' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0D5E30', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
            Raffle<span style={{ color: '#C8922A' }}>Prop</span>
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
            Admin Console
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
            {error}
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={handleCredentials}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input id="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@raffleprop.com" autoComplete="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Checking…</> : 'Continue'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotp}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.5rem', color: '#0D5E30' }}>
                <i className="fa-solid fa-mobile-screen-button" />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#374151' }}>
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>

            <div className="form-group">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="form-input"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.15em' }}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading || totpCode.length < 6}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Verifying…</> : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
              style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
