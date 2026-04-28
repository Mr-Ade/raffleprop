'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useRef, useMemo } from 'react';

// ── Shared sub-components ────────────────────────────────────────────────────

const NEXT_STEPS = [
  { icon: 'fa-envelope', text: 'Confirmation email sent to your inbox' },
  { icon: 'fa-ticket',   text: 'Ticket number assigned to your account' },
  { icon: 'fa-video',    text: 'Draw date announced — watch live on YouTube' },
  { icon: 'fa-trophy',   text: 'Winner announced and contacted within 3 days of draw' },
];

function NextStepsCard() {
  return (
    <div className="card" style={{ maxWidth: 440, margin: '0 auto 2rem', textAlign: 'left' }}>
      <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
        <i className="fa-solid fa-list-check" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
        What happens next?
      </div>
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {NEXT_STEPS.map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--green-50)', border: '1px solid var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fa-solid ${icon}`} style={{ color: 'var(--green-primary)', fontSize: '0.8125rem' }} />
            </div>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

function EscrowNotice() {
  return (
    <div className="escrow-notice" style={{ textAlign: 'left', maxWidth: 440, margin: '0 auto 2rem' }}>
      <i className="fa-solid fa-shield-halved" />
      <p>
        Your funds are held in an independent escrow account and will only be released to the property owner if the minimum ticket threshold is met.
        Otherwise you&apos;ll receive a <strong>full automatic refund</strong>.
      </p>
    </div>
  );
}

function ActionButtons() {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      <Link href="/tickets" className="btn btn-primary">
        <i className="fa-solid fa-ticket" style={{ marginRight: '0.375rem' }} />
        View My Tickets
      </Link>
      <Link href="/campaigns" className="btn btn-outline">
        <i className="fa-solid fa-house" style={{ marginRight: '0.375rem' }} />
        More Campaigns
      </Link>
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────

function VerifyContent() {
  const params = useSearchParams();

  const paystackRef = params.get('reference') ?? params.get('trxref');
  const flwStatus   = params.get('status');
  const flwRef      = params.get('tx_ref') ?? params.get('transaction_id');

  // Determine initial outcome from URL params.
  // NOTE: Paystack redirects to this URL for ALL charge outcomes (success AND failure) — the
  // actual result is only known via webhook. Show "processing" and poll to auto-update the page.
  // Flutterwave includes the status directly in the redirect URL so it can be trusted immediately.
  const { initialOutcome, paymentRef, gateway } = useMemo(() => {
    if (paystackRef) {
      return { initialOutcome: 'processing' as const, paymentRef: paystackRef, gateway: 'PAYSTACK' as const };
    }
    if (flwRef) {
      const o = flwStatus === 'successful' ? 'success' as const
              : flwStatus === 'cancelled'  ? 'cancelled' as const
              : 'failed' as const;
      return { initialOutcome: o, paymentRef: flwRef, gateway: 'FLUTTERWAVE' as const };
    }
    return { initialOutcome: 'pending' as const, paymentRef: null as null, gateway: null as null };
  }, [paystackRef, flwRef, flwStatus]);

  type Outcome = 'success' | 'processing' | 'failed' | 'cancelled' | 'pending';
  const [outcome, setOutcome]           = useState<Outcome>(initialOutcome);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const stoppedRef = useRef(false);

  // Poll /api/tickets/status every 3 s (max 20 attempts = 60 s) when waiting for Paystack webhook.
  // As soon as the webhook fires and marks the ticket SUCCESS/FAILED, the page auto-updates.
  useEffect(() => {
    if (initialOutcome !== 'processing' || !paymentRef) return;
    if (outcome !== 'processing') return;
    if (pollAttempts >= 20) return;

    stoppedRef.current = false;
    const t = setTimeout(async () => {
      if (stoppedRef.current) return;
      try {
        const res  = await fetch(`/api/tickets/status?ref=${encodeURIComponent(paymentRef)}`);
        const json = await res.json() as { success: boolean; data?: { status: string; ticketNumber: string } };
        if (stoppedRef.current) return;

        if (json.success && json.data?.status === 'SUCCESS') {
          setTicketNumber(json.data.ticketNumber);
          setOutcome('success');
          return;
        }
        if (json.success && json.data?.status === 'FAILED') {
          setOutcome('failed');
          return;
        }
      } catch { /* network hiccup — keep polling */ }

      if (!stoppedRef.current) setPollAttempts(a => a + 1);
    }, 3000);

    return () => { stoppedRef.current = true; clearTimeout(t); };
  }, [outcome, pollAttempts, initialOutcome, paymentRef]);

  // ── Confirmed success (Flutterwave redirect OR Paystack polled) ──────────────
  if (outcome === 'success') {
    return (
      <div className="payment-success-container">
        <div className="payment-success-icon">
          <i className="fa-solid fa-check" />
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Payment Confirmed!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 1.5rem' }}>
          Your payment was successful. A confirmation email with your ticket details has been sent to your inbox.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          {paymentRef && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Payment reference</p>
              <span className="ticket-number-badge">{paymentRef}</span>
            </div>
          )}
          {ticketNumber && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Your ticket number</p>
              <span className="ticket-number-badge" style={{ background: 'var(--green-primary)', color: '#fff', borderColor: 'var(--green-primary)' }}>
                {ticketNumber}
              </span>
            </div>
          )}
        </div>

        <EscrowNotice />
        <NextStepsCard />
        <ActionButtons />

        <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-lock" style={{ marginRight: '0.25rem' }} />
          {gateway === 'FLUTTERWAVE' ? 'Secured by Flutterwave' : 'Secured by Paystack'} · PCI-DSS compliant
        </p>
      </div>
    );
  }

  // ── Paystack redirect — polling for webhook confirmation ─────────────────────
  if (outcome === 'processing') {
    const isTimedOut = pollAttempts >= 20;
    return (
      <div className="payment-success-container">
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fef3c7', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
          <i className={`fa-solid ${isTimedOut ? 'fa-clock' : 'fa-spinner fa-spin'}`} style={{ color: '#d97706' }} />
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Payment Submitted
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 1.25rem' }}>
          {isTimedOut
            ? 'This is taking longer than usual. Your payment may still be processing — check your email or view your tickets below.'
            : "We're confirming your payment with Paystack. This page will update automatically — usually within a minute."}
        </p>

        {/* Live status indicator */}
        {!isTimedOut && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#92400e' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulseDot 1.5s infinite' }} />
            Checking with Paystack{pollAttempts > 0 ? ` (${pollAttempts}/20)` : '…'}
          </div>
        )}

        {paymentRef && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Payment reference</p>
            <span className="ticket-number-badge">{paymentRef}</span>
          </div>
        )}

        <EscrowNotice />
        <NextStepsCard />
        <ActionButtons />

        <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-lock" style={{ marginRight: '0.25rem' }} />
          Secured by Paystack · PCI-DSS compliant
        </p>
      </div>
    );
  }

  // ── Cancelled ────────────────────────────────────────────────────────────────
  if (outcome === 'cancelled') {
    return (
      <div className="payment-success-container">
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fef3c7', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
          <i className="fa-solid fa-xmark" />
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Payment Cancelled
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', lineHeight: 1.65, marginBottom: '2rem' }}>
          You cancelled the payment. No money has been taken from your account.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/campaigns" className="btn btn-primary">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.375rem' }} />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  if (outcome === 'failed') {
    return (
      <div className="payment-success-container">
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fee2e2', border: '2px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
          <i className="fa-solid fa-circle-exclamation" />
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Payment Failed
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', lineHeight: 1.65, marginBottom: '0.75rem' }}>
          Your payment could not be completed. No money has been taken from your account.
        </p>
        {paymentRef && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Reference: <code style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '0.1em 0.4em', borderRadius: 4 }}>{paymentRef}</code>
          </p>
        )}
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 2rem' }}>
          Common causes: insufficient funds, card declined, or session expired. Please try again or contact your bank.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/campaigns" className="btn btn-primary">
            <i className="fa-solid fa-rotate-right" style={{ marginRight: '0.375rem' }} />
            Try Again
          </Link>
          <Link href="/contact" className="btn btn-outline">
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  // ── Pending / no params — direct navigation ──────────────────────────────────
  return (
    <div className="payment-success-container">
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--green-50)', border: '2px solid var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
        <i className="fa-solid fa-spinner fa-spin" />
      </div>
      <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Processing Payment
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', lineHeight: 1.65, marginBottom: '2rem' }}>
        Please wait while we confirm your payment. This usually takes less than a minute.
      </p>
      <Link href="/tickets" className="btn btn-outline">
        Check My Tickets
      </Link>
    </div>
  );
}

export default function PurchaseVerifyPage() {
  return (
    <main id="main-content" style={{ paddingTop: '65px', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%' }}>
        <Suspense fallback={
          <div className="payment-success-container">
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--green-50)', border: '2px solid var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-primary)', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
              <i className="fa-solid fa-spinner fa-spin" />
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </main>
  );
}
