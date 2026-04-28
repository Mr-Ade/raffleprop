'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ConfirmTransferButton({
  ticketId,
  ticketNumber,
  bankTransferRef,
  bankTransferProofKey,
  token,
  apiUrl,
}: {
  ticketId: string;
  ticketNumber: string;
  bankTransferRef: string | null;
  bankTransferProofKey: string | null;
  token: string;
  apiUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [action, setAction]   = useState<'confirm' | 'reject'>('confirm');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError]     = useState('');

  async function handleSubmit() {
    if (action === 'reject' && !note.trim()) {
      setError('A rejection note is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/tickets/${ticketId}/confirm-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const json = await res.json() as { success: boolean; data?: { newStatus: string }; error?: string };
      if (!json.success) { setError(json.error ?? 'Failed'); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function viewProof() {
    setProofLoading(true);
    setProofError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/tickets/${ticketId}/proof`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
      if (!json.success || !json.data?.url) { setProofError(json.error ?? 'No proof image found.'); return; }
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setProofError('Network error — please try again.');
    } finally {
      setProofLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
          background: '#fef9c3', color: '#a16207', border: '1px solid #fde047',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
        title="Review this bank transfer"
      >
        <i className="fa-solid fa-building-columns" />
        Review
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 16 }}>

            {/* Header */}
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Review Bank Transfer</h3>
              <button type="button" onClick={() => { setOpen(false); setNote(''); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Ticket info */}
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '0.875rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Ticket</div>
                    <code style={{ fontSize: '0.8rem', color: 'var(--green-primary)', fontWeight: 700 }}>{ticketNumber}</code>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Transfer Ref</div>
                    <div style={{ fontWeight: 600 }}>{bankTransferRef ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                  </div>
                </div>
                {bankTransferProofKey && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                    <button type="button" onClick={viewProof} disabled={proofLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', cursor: 'pointer' }}>
                      {proofLoading
                        ? <><i className="fa-solid fa-spinner fa-spin" />Loading…</>
                        : <><i className="fa-solid fa-image" />View Proof Image</>}
                    </button>
                    {proofError && (
                      <span style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.25rem', display: 'block' }}>{proofError}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action toggle */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Action</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setAction('confirm')}
                    style={{ flex: 1, padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', border: '2px solid', ...(action === 'confirm' ? { background: '#f0fdf4', color: '#166534', borderColor: '#86efac' } : { background: '#fff', color: 'var(--text-muted)', borderColor: 'var(--border)' }) }}>
                    <i className="fa-solid fa-check" style={{ marginRight: '0.375rem' }} />Confirm Payment
                  </button>
                  <button type="button" onClick={() => setAction('reject')}
                    style={{ flex: 1, padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', border: '2px solid', ...(action === 'reject' ? { background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' } : { background: '#fff', color: 'var(--text-muted)', borderColor: 'var(--border)' }) }}>
                    <i className="fa-solid fa-times" style={{ marginRight: '0.375rem' }} />Reject
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  {action === 'reject' ? <>Rejection reason <span style={{ color: '#b91c1c' }}>*</span></> : 'Note (optional)'}
                </label>
                <textarea
                  className="form-input" rows={3}
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder={action === 'reject'
                    ? 'e.g. No matching transfer found in escrow account for this reference…'
                    : 'e.g. Verified against Access Bank statement 16 Apr 2026…'}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {error && (
                <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={loading}
                  onClick={() => { setOpen(false); setNote(''); setError(''); }}>
                  Cancel
                </button>
                <button type="button" disabled={loading || (action === 'reject' && !note.trim())}
                  onClick={handleSubmit}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', border: '1px solid',
                    ...(action === 'confirm'
                      ? { background: '#f0fdf4', color: '#166534', borderColor: '#86efac' }
                      : { background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }),
                  }}>
                  {loading ? '…' : action === 'confirm' ? 'Confirm Payment' : 'Reject Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
