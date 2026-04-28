'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) { setError('Invalid or missing reset token. Please request a new link.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number.'); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError('Password must contain at least one special character.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Reset failed. Your link may have expired — please request a new one.');
        return;
      }

      router.push('/login?reset=1');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">Raffle<span>Prop</span></div>
          <div style={{ color: '#b91c1c', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block' }} />
            Invalid or missing reset token.
          </div>
          <Link href="/forgot-password" className="btn btn-primary btn-full">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Raffle<span>Prop</span></div>
        <p className="auth-subtitle">Choose a new password</p>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              New password <span className="required">*</span>
            </label>
            <div className="password-wrap" suppressHydrationWarning>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                suppressHydrationWarning
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}>
                <i className={showPw ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm" className="form-label">
              Confirm password <span className="required">*</span>
            </label>
            <div className="password-wrap" suppressHydrationWarning>
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                className="form-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                suppressHydrationWarning
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide' : 'Show'}>
                <i className={showConfirm ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
              </button>
            </div>
          </div>

          <p className="form-hint" style={{ marginBottom: '1.25rem' }}>
            Must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.
          </p>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin" /> Resetting…</>
              : 'Reset Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          <Link href="/login" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--green-primary)' }} />
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
