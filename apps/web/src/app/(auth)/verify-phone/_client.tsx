'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useRef, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function maskPhone(phone: string) {
  // E.g. +2348012345678 → +234 *** *** 5678
  if (phone.length < 6) return phone;
  const last4 = phone.slice(-4);
  return `${phone.slice(0, 4)} *** *** ${last4}`;
}

function VerifyPhoneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get('phone') ?? '';

  if (!phone) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">Raffle<span>Prop</span></div>
          <div style={{ color: '#b91c1c', margin: '1.5rem 0' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }} />
            No phone number provided.
          </div>
          <Link href="/register" className="btn btn-primary btn-full">Back to Registration</Link>
        </div>
      </div>
    );
  }

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleDigit(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Enter the 6-digit code.'); return; }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json() as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Invalid or expired code.');
        return;
      }

      // Verified — redirect to login with success flag
      router.push('/login?verified=1');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Could not resend code. Please try again.');
        return;
      }
      setSuccess('A new code has been sent to your phone.');
    } catch {
      setError('Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--green-50)', border: '2px solid var(--green-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem', fontSize: '1.75rem', color: 'var(--green-primary)',
        }}>
          <i className="fa-solid fa-mobile-screen-button" />
        </div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Verify your phone
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          We sent a 6-digit code to{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>
            {phone ? maskPhone(phone) : 'your phone number'}
          </strong>.
          Enter it below.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#166534' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="otp-inputs" style={{ marginBottom: '1.5rem' }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="otp-input"
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || digits.join('').length < 6}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin" /> Verifying…</>
            ) : (
              'Verify Phone'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Didn&apos;t receive a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{ color: 'var(--green-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          <Link href="/login" style={{ color: 'var(--text-muted)' }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--green-primary)' }} />
        </div>
      </div>
    }>
      <VerifyPhoneForm />
    </Suspense>
  );
}
