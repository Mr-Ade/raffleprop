'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { useSession } from '@/lib/session-client';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Tab = 'email' | 'phone';
type PhoneStep = 'enter' | 'verify';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';
  const verified    = params.get('verified') === '1';
  const pwdReset    = params.get('reset') === '1';
  const { refresh } = useSession();

  const [tab, setTab] = useState<Tab>('email');

  // ── Email/password state ───────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Phone OTP state ────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
  const [resendCountdown, setResendCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function startResendTimer() {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((n) => {
        if (n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  async function finishLogin(accessToken: string, refreshToken: string) {
    const setTokenRes = await fetch('/api/auth/set-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken }),
    });
    if (!setTokenRes.ok) {
      throw new Error('Failed to establish session. Please try again.');
    }
    await refresh();

    // Decode the JWT (no verify needed — server will verify on every request)
    // to decide where to redirect without an extra round-trip.
    let destination = redirect;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]!)) as { role?: string };
      if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') {
        destination = '/admin/dashboard';
      }
    } catch { /* fallthrough to default redirect */ }

    router.push(destination);
    router.refresh();
  }

  // ── Email login ────────────────────────────────────────────────────────────
  async function handleEmailSubmit(e: FormEvent) {
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
        data?: { accessToken: string; refreshToken: string; requiresTwoFa?: boolean };
        error?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Invalid email or password.');
        return;
      }
      if (data.data?.requiresTwoFa) {
        setError('This account requires two-factor authentication. Please contact support to complete sign-in.');
        return;
      }
      await finishLogin(data.data!.accessToken, data.data!.refreshToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Cannot reach the server. Make sure the API is running and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Phone OTP: send ────────────────────────────────────────────────────────
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\+234[0-9]{10}$/.test(phone)) {
      setError('Enter your phone in international format: +234XXXXXXXXXX');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to send OTP. Please try again.');
        return;
      }
      setPhoneStep('verify');
      startResendTimer();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Phone OTP: verify ──────────────────────────────────────────────────────
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json() as {
        success: boolean;
        data?: { accessToken: string; refreshToken: string };
        error?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Invalid or expired OTP. Please try again.');
        return;
      }
      await finishLogin(data.data!.accessToken, data.data!.refreshToken);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCountdown > 0) return;
    setError('');
    setOtp('');
    try {
      await fetch(`${API}/api/auth/login-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      startResendTimer();
    } catch { /* silent */ }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Raffle<span>Prop</span></div>
        <p className="auth-subtitle">Sign in to your account</p>

        {verified && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#166534' }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />
            Phone verified! Sign in to access your account.
          </div>
        )}

        {pwdReset && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#166534' }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />
            Password reset successfully. Sign in with your new password.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>sign in with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem' }}>
          {(['email', 'phone'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(''); setPhoneStep('enter'); setOtp(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.15s',
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? 'var(--green-primary)' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <i className={`fa-solid ${t === 'email' ? 'fa-envelope' : 'fa-mobile-screen-button'}`} style={{ marginRight: '0.4rem' }} />
              {t === 'email' ? 'Email' : 'Phone OTP'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
            {error}
          </div>
        )}

        {/* ── Email / Password form ─────────────────────────────────────────── */}
        {tab === 'email' && (
          <form onSubmit={handleEmailSubmit}>
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

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <div className="password-wrap" suppressHydrationWarning>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  suppressHydrationWarning
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
              <Link href="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── Phone OTP: enter phone ────────────────────────────────────────── */}
        {tab === 'phone' && phoneStep === 'enter' && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label htmlFor="loginPhone" className="form-label">
                Phone number <span className="required">*</span>
              </label>
              <input
                id="loginPhone"
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                autoComplete="tel"
                required
              />
              <p className="form-hint">Use international format: +234 801 234 5678. We&apos;ll send a one-time code.</p>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Sending…</> : (
                <><i className="fa-solid fa-paper-plane" style={{ marginRight: '0.5rem' }} />Send OTP</>
              )}
            </button>
          </form>
        )}

        {/* ── Phone OTP: enter code ─────────────────────────────────────────── */}
        {tab === 'phone' && phoneStep === 'verify' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <i className="fa-solid fa-mobile-screen-button" style={{ fontSize: '1.5rem', color: 'var(--green-primary)' }} />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Enter the 6-digit code sent to
              </p>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{phone}</p>
            </div>

            <div className="form-group">
              <label htmlFor="otpCode" className="form-label">
                Verification code <span className="required">*</span>
              </label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                className="form-input"
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.25rem', fontWeight: 700 }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || otp.length < 6}
              style={{ marginBottom: '0.875rem' }}
            >
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Verifying…</> : 'Verify & Sign In'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer', color: resendCountdown > 0 ? 'var(--text-muted)' : 'var(--green-primary)', fontWeight: 600, padding: 0 }}
                onClick={handleResendOtp}
                disabled={resendCountdown > 0}
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                onClick={() => { setPhoneStep('enter'); setOtp(''); setError(''); }}
              >
                Change number
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--green-primary)' }} />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
