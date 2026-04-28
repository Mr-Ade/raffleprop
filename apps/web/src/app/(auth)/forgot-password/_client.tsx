'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Swallow — always show success for security (never reveal if email exists)
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Raffle<span>Prop</span></div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--green-50)', border: '2px solid var(--green-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0.5rem auto 1.25rem', fontSize: '1.5rem',
            }}>
              <i className="fa-solid fa-envelope-circle-check" style={{ color: 'var(--green-primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.625rem' }}>Check your inbox</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.75rem' }}>
              If <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong> is registered, you&apos;ll
              receive a password reset link shortly. Check your spam folder if it doesn&apos;t arrive within a few minutes.
            </p>
            <Link href="/login" className="btn btn-primary btn-full">Back to Sign In</Link>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">Enter your email to reset your password</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email address <span className="required">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Sending reset link…</>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
              <Link href="/login" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                ← Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
