'use client';

import { useState, useTransition } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export function TestimonialSubmitForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ authorName: '', authorTitle: '', body: '', rating: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function set(k: keyof typeof form, v: string | number) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/api/content/testimonials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const json = await res.json() as { success: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? 'Submission failed');
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    });
  }

  return (
    <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
      {!open ? (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setOpen(true)}
          style={{ fontSize: '0.9375rem' }}
        >
          <i className="fa-regular fa-star" style={{ marginRight: '0.5rem' }} />
          Share Your Experience
        </button>
      ) : submitted ? (
        <div style={{
          maxWidth: 520, margin: '0 auto', padding: '2rem',
          borderRadius: 'var(--radius-lg)', background: 'var(--green-50)',
          border: '1px solid var(--green-primary)',
        }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', color: 'var(--green-primary)', marginBottom: '0.75rem', display: 'block' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Thank you!</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem' }}>
            Your review has been submitted and will appear here once approved by our team.
          </p>
        </div>
      ) : (
        <div style={{
          maxWidth: 520, margin: '0 auto', padding: '2rem',
          borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)', textAlign: 'left',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>
              <i className="fa-regular fa-star" style={{ marginRight: '0.5rem', color: 'var(--gold)' }} />
              Share Your Experience
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.25rem' }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Star rating */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Your Rating
              </label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => set('rating', star)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem',
                      fontSize: '1.5rem', color: star <= form.rating ? 'var(--gold)' : 'var(--border-light)',
                      transition: 'color 0.15s',
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Chukwuemeka Obi"
                value={form.authorName}
                onChange={(e) => set('authorName', e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)', background: 'var(--bg)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Location / title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Location <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. Lagos, Nigeria"
                value={form.authorTitle}
                onChange={(e) => set('authorTitle', e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)', background: 'var(--bg)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Review body */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Your Review <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={4}
                placeholder="Tell others about your experience with RaffleProp..."
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)', background: 'var(--bg)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>
                {form.body.length}/500
              </div>
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.8375rem', margin: 0, padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 'var(--radius-md)' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={pending || !form.authorName.trim() || form.body.length < 10}>
                {pending
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</>
                  : <><i className="fa-solid fa-paper-plane" /> Submit Review</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
