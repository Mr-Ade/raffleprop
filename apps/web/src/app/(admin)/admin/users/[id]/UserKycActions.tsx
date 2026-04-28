'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface UserKycActionsProps {
  userId: string;
  kycStatus: string;
  token: string;
  autoOpen?: boolean;
}

export function UserKycActions({ userId, kycStatus, token, autoOpen = false }: UserKycActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  async function viewDocument() {
    setDocLoading(true);
    setDocError('');
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/kyc-doc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
      if (!json.success || !json.data?.url) {
        setDocError(json.error ?? 'Failed to load document.');
        return;
      }
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setDocError('Network error — please try again.');
    } finally {
      setDocLoading(false);
    }
  }

  const canReview = kycStatus === 'SUBMITTED';

  async function handleDecision(status: 'VERIFIED' | 'REJECTED') {
    setError('');
    if (status === 'REJECTED' && !notes.trim()) {
      setError('Please provide rejection notes so the user knows why their KYC was rejected.');
      return;
    }
    setLoading(status === 'VERIFIED' ? 'approve' : 'reject');
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, notes: notes.trim() || undefined }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) {
        setError(json.error ?? 'Failed to update KYC status.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>KYC Verification</h3>
        {canReview && !open && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#a16207' }}
            onClick={() => setOpen(true)}
          >
            <i className="fa-solid fa-id-card" style={{ marginRight: '0.375rem' }} />
            Review Submission
          </button>
        )}
      </div>

      {!open && (
        <div style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {canReview ? (
            <div>
              <i className="fa-solid fa-id-card" style={{ color: '#a16207', fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }} />
              KYC documents submitted — awaiting review.
            </div>
          ) : (
            <div>
              <i className="fa-solid fa-circle-check" style={{ color: 'var(--green-primary)', fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }} />
              KYC {kycStatus.toLowerCase()}. No action needed.
            </div>
          )}
        </div>
      )}

      {open && canReview && (
        <div style={{ padding: '1.25rem' }}>
          <div style={{ padding: '0.75rem', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
            Verify the user&apos;s identity documents before approving. This action is logged and irreversible.
          </div>

          {/* View document */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={viewDocument}
              disabled={docLoading}
              title="Open identity document in new tab (15-min link)"
            >
              {docLoading
                ? <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />
                : <i className="fa-solid fa-file-image" style={{ marginRight: '0.375rem' }} />}
              {docLoading ? 'Loading…' : 'View Identity Document'}
            </button>
            {docError && (
              <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: '#b91c1c' }}>{docError}</div>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Notes (required for rejection)
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for rejection or reviewer comments…"
              style={{ resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ padding: '0.625rem 0.875rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.875rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setOpen(false); setNotes(''); setError(''); }}
              disabled={loading !== null}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c' }}
              onClick={() => handleDecision('REJECTED')}
              disabled={loading !== null}
            >
              {loading === 'reject' ? 'Rejecting…' : (
                <><i className="fa-solid fa-xmark" style={{ marginRight: '0.375rem' }} />Reject</>
              )}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleDecision('VERIFIED')}
              disabled={loading !== null}
            >
              {loading === 'approve' ? 'Approving…' : (
                <><i className="fa-solid fa-check" style={{ marginRight: '0.375rem' }} />Approve KYC</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
