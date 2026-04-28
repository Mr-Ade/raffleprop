'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    referralCode: '',
    password: '',
    confirmPassword: '',
    ndprConsent: false,
    termsAccepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill referral code from URL ?ref=CODE
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setForm((prev) => ({ ...prev, referralCode: ref }));
  }, [params]);

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(form.password)) {
      setError('Password must contain at least one special character.');
      return;
    }
    if (!/^\+234[0-9]{10}$/.test(form.phone)) {
      setError('Enter your phone in international format: +234XXXXXXXXXX (e.g. +2348012345678)');
      return;
    }
    if (!form.ndprConsent || !form.termsAccepted) {
      setError('You must accept the Terms and give NDPR consent to continue.');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        ndprConsent: form.ndprConsent,
        tcAccepted: form.termsAccepted,
      };
      if (form.referralCode.trim()) {
        body['referredByCode'] = form.referralCode.trim().toUpperCase();
      }

      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Registration failed. Please try again.');
        return;
      }

      // Registration successful — redirect to phone verification
      router.push(`/verify-phone?phone=${encodeURIComponent(form.phone)}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">Raffle<span>Prop</span></div>
        <p className="auth-subtitle">Create your account — it&apos;s free</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>create with email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Full name <span className="required">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              className="form-input"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="As it appears on your ID"
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email address <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone number <span className="required">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+234 801 234 5678"
              autoComplete="tel"
              required
            />
            <p className="form-hint">Use international format: +234XXXXXXXXXX. An OTP will be sent to verify.</p>
          </div>

          <div className="form-group">
            <label htmlFor="referralCode" className="form-label">
              Referral code <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-gift" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--green-primary)', pointerEvents: 'none' }} />
              <input
                id="referralCode"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                value={form.referralCode}
                onChange={(e) => set('referralCode', e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                autoComplete="off"
                maxLength={12}
              />
            </div>
            <p className="form-hint">Enter a friend&apos;s referral code to help them earn rewards.</p>
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password <span className="required">*</span>
                </label>
                <div className="password-wrap" suppressHydrationWarning>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
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
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm password <span className="required">*</span>
                </label>
                <div className="password-wrap" suppressHydrationWarning>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    suppressHydrationWarning
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    <i className={showConfirm ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                  </button>
                </div>
              </div>
            </div>
            <p className="form-hint" style={{ marginTop: '0.375rem', marginBottom: '0.75rem' }}>
              Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <label className="checkbox-wrap">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => set('termsAccepted', e.target.checked)}
                required
              />
              <span className="checkbox-label">
                I agree to the{' '}
                <Link href="/terms">Terms &amp; Conditions</Link>
                {' '}and{' '}
                <Link href="/privacy">Privacy Policy</Link>
              </span>
            </label>

            <label className="checkbox-wrap">
              <input
                type="checkbox"
                checked={form.ndprConsent}
                onChange={(e) => set('ndprConsent', e.target.checked)}
                required
              />
              <span className="checkbox-label">
                I consent to RaffleProp processing my personal data as described in the{' '}
                <Link href="/privacy">Privacy Policy</Link>
                {' '}in compliance with the NDPR 2019. I understand I may withdraw consent or request
                deletion of my data at any time.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin" /> Creating account…</>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--green-primary)' }} />
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
