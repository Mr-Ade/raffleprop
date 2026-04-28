'use client';

import { useState } from 'react';
import type { Campaign } from '@raffleprop/shared';

interface Props {
  campaign: Campaign & { ticketsSold?: number };
  token: string | null;
}

type Bundle = { label: string; tickets: number; price: number; popular?: boolean };
type SkillQuestion = { question: string; options: string[]; correctIndex: number };
type SkillQuestionStore = { questions?: SkillQuestion[] } | SkillQuestion;

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/** Pick one question at random from the pool. Falls back to the legacy single-question format. */
function pickRandomQuestion(raw: unknown): SkillQuestion {
  const store = raw as SkillQuestionStore;
  // New format: { questions: [...] }
  if (store && typeof store === 'object' && 'questions' in store && Array.isArray(store.questions) && store.questions.length > 0) {
    const pool = store.questions;
    return pool[Math.floor(Math.random() * pool.length)]!;
  }
  // Legacy format: single { question, options, correctIndex }
  return raw as SkillQuestion;
}

export function PurchaseWidget({ campaign, token }: Props) {
  const bundles = campaign.bundles as Bundle[];
  // Pick a random question from the pool once on mount — so each visitor gets a different question
  const [skillQ] = useState<SkillQuestion>(() => pickRandomQuestion(campaign.skillQuestion));

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [customQty, setCustomQty] = useState('');
  const [skillAnswer, setSkillAnswer] = useState<number | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const qty = selectedBundle?.tickets ?? (parseInt(customQty, 10) || 0);
  const unitPrice = Number(campaign.ticketPrice);
  const totalPrice = selectedBundle ? Number(selectedBundle.price) : qty * unitPrice;
  const normalPrice = qty * unitPrice;
  const savings = normalPrice - totalPrice;

  async function initiatePayment() {
    // Fixed validation: check if skillAnswer is null (was previously `!skillAnswer === null` which is always false)
    if (skillAnswer === null) {
      setError('Please answer the skill question.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please accept the terms & conditions to proceed.');
      return;
    }
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/tickets/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          quantity: qty,
          bundleLabel: selectedBundle?.label ?? null,
          skillAnswer,
          gateway: 'PAYSTACK',
        }),
      });

      const data = await res.json() as {
        success: boolean;
        data?: { authorizationUrl: string };
        error?: string;
      };

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setError(data.error ?? 'Payment initiation failed. Please try again.');
        return;
      }

      window.location.href = data.data!.authorizationUrl;
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const isLive = campaign.status === 'LIVE';

  if (!isLive) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <i className="fa-regular fa-clock" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'block' }} />
        <p style={{ fontWeight: 700, marginBottom: '0.375rem' }}>Campaign not yet open</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Ticket sales open when this campaign goes live.
        </p>
      </div>
    );
  }

  const stepDots = [1, 2, 3] as const;
  const stepLabels = ['Choose tickets', 'Skill question', 'Payment'];

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      {/* Step indicator */}
      <div className="purchase-steps-indicator">
        {stepDots.map((s, i) => (
          <div key={s} style={{ display: 'contents' }}>
            <div className={`p-step-dot${step === s ? ' active' : step > s ? ' done' : ''}`}>
              {step > s ? <i className="fa-solid fa-check" style={{ fontSize: '0.625rem' }} /> : s}
            </div>
            {i < 2 && <div className={`p-step-line${step > s ? ' done' : ''}`} />}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
        {stepLabels.map((label, i) => (
          <span key={label} style={{ color: step >= i + 1 ? 'var(--green-primary)' : 'var(--text-muted)' }}>
            {label}
          </span>
        ))}
      </div>

      {/* ── Step 1: Bundle selection ── */}
      {step === 1 && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Select a ticket bundle</h3>

          {bundles.length > 0 ? (
            <div className="bundle-grid" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {bundles.map((b) => (
                <div
                  key={b.label}
                  className={`bundle-card${selectedBundle?.label === b.label ? ' selected' : ''}`}
                  onClick={() => { setSelectedBundle(b); setCustomQty(''); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedBundle(b); setCustomQty(''); } }}
                >
                  {b.popular && <span className="bundle-popular">Popular</span>}
                  <div className="bundle-qty">{b.tickets}</div>
                  <div className="bundle-label">ticket{b.tickets !== 1 ? 's' : ''}</div>
                  <div className="bundle-price">₦{Number(b.price).toLocaleString()}</div>
                  {b.tickets > 1 && (
                    <div className="bundle-saving">
                      Save ₦{(b.tickets * unitPrice - Number(b.price)).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">Or enter a custom quantity (max 100)</label>
            <input
              type="number"
              min={1}
              max={100}
              className="form-input"
              value={customQty}
              onChange={(e) => { setCustomQty(e.target.value); setSelectedBundle(null); }}
              placeholder="e.g. 3"
            />
          </div>

          {qty > 0 && (
            <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {qty} ticket{qty !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--green-primary)' }}>
                  ₦{totalPrice.toLocaleString()}
                </span>
              </div>
              {savings > 0 && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600, marginTop: '0.25rem' }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: '0.25rem' }} />
                  You save ₦{savings.toLocaleString()} vs buying individually
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={() => setStep(2)}
            disabled={qty < 1}
          >
            Continue <i className="fa-solid fa-arrow-right" />
          </button>
        </>
      )}

      {/* ── Step 2: Skill question ── */}
      {step === 2 && (
        <>
          <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <i className="fa-solid fa-circle-info" style={{ color: 'var(--green-primary)', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 500, lineHeight: 1.6 }}>
              Nigerian law (FCCPA §34) requires a skill question for promotional draws to prevent pure lottery classification.
              You must answer correctly to qualify.
            </p>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>{skillQ.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
            {skillQ.options.map((opt, i) => {
              const isSelected = skillAnswer === i;
              const isCorrect = isSelected && i === skillQ.correctIndex;
              const isWrong = isSelected && i !== skillQ.correctIndex;
              return (
                <label
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    border: `2px solid ${isCorrect ? 'var(--success)' : isWrong ? 'var(--error)' : isSelected ? 'var(--green-primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                    background: isCorrect ? '#f0fdf4' : isWrong ? '#fef2f2' : isSelected ? 'var(--green-50)' : 'var(--card-bg)',
                    transition: 'all var(--transition)',
                    fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text-primary)',
                  }}
                >
                  <input
                    type="radio"
                    name="skillAnswer"
                    value={i}
                    checked={isSelected}
                    onChange={() => setSkillAnswer(i)}
                    style={{ accentColor: 'var(--green-primary)', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{opt}</span>
                  {isCorrect && <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', flexShrink: 0 }} />}
                  {isWrong && <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--error)', flexShrink: 0 }} />}
                </label>
              );
            })}
          </div>

          {/* Wrong answer feedback */}
          {skillAnswer !== null && skillAnswer !== skillQ.correctIndex && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#991b1b', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Incorrect answer. Please try again — you must answer correctly to purchase tickets for this draw.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setStep(1); setSkillAnswer(null); }}>
              <i className="fa-solid fa-arrow-left" /> Back
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => setStep(3)}
              disabled={skillAnswer === null || skillAnswer !== skillQ.correctIndex}
            >
              Continue <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Payment confirmation ── */}
      {step === 3 && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Confirm &amp; Pay</h3>

          {/* Order summary */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--border-light)' }}>
            <div className="spec-row">
              <span className="spec-key">Campaign</span>
              <span className="spec-val" style={{ textAlign: 'right', maxWidth: '60%' }}>{campaign.title}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Tickets</span>
              <span className="spec-val">{qty} ticket{qty !== 1 ? 's' : ''}</span>
            </div>
            {selectedBundle && (
              <div className="spec-row">
                <span className="spec-key">Bundle</span>
                <span className="spec-val">{selectedBundle.label}</span>
              </div>
            )}
            {savings > 0 && (
              <div className="spec-row">
                <span className="spec-key" style={{ color: 'var(--success)' }}>Bundle saving</span>
                <span className="spec-val" style={{ color: 'var(--success)', fontWeight: 700 }}>
                  −₦{savings.toLocaleString()}
                </span>
              </div>
            )}
            {campaign.drawDate && (
              <div className="spec-row">
                <span className="spec-key">Draw date</span>
                <span className="spec-val">
                  {new Date(campaign.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            <div className="spec-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <span className="spec-key" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--green-primary)' }}>
                ₦{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Escrow notice */}
          <div className="escrow-notice" style={{ marginBottom: '1.25rem' }}>
            <i className="fa-solid fa-shield-halved" />
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.6 }}>
              Your payment is held in an independent escrow account at {campaign.escrowBank ?? 'a reputable Nigerian bank'} until the draw is completed.
              If the minimum of {campaign.minTickets.toLocaleString()} tickets is not sold, a <strong>full refund is automatically processed</strong>.
            </p>
          </div>

          {/* Terms & Conditions */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ accentColor: 'var(--green-primary)', marginTop: '2px', flexShrink: 0, width: 16, height: 16 }}
            />
            I have read and agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-primary)', fontWeight: 600, textDecoration: 'underline' }}>
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-primary)', fontWeight: 600, textDecoration: 'underline' }}>
              Privacy Policy
            </a>.
          </label>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)} disabled={loading}>
              <i className="fa-solid fa-arrow-left" /> Back
            </button>
            <button
              className="btn btn-gold"
              style={{ flex: 1 }}
              onClick={initiatePayment}
              disabled={loading || !agreedToTerms}
            >
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Processing…</>
                : <><i className="fa-solid fa-lock" /> Pay ₦{totalPrice.toLocaleString()}</>
              }
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
            <i className="fa-solid fa-lock" style={{ marginRight: '0.25rem' }} />
            Secured by Paystack · PCI-DSS compliant
          </p>
        </>
      )}
    </div>
  );
}
