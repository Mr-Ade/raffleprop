'use client';

import { useEffect, useState } from 'react';

interface PendingTicket {
  id: string;
  ticketNumber: string;
  totalAmount: number;
  bankTransferRef: string | null;
  purchasedAt: string;
  campaign: { title: string };
}

interface TicketState {
  ref: string;
  submitting: boolean;
  submitted: boolean;
  error: string;
  uploading: boolean;
  uploadedName: string;
  uploadError: string;
  proofUploaded: boolean;
}

export default function BankTransferWidget() {
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [states, setStates] = useState<Record<string, TicketState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/tickets/bank-transfer-pending', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json() as { success: boolean; data?: PendingTicket[] };
        const list = Array.isArray(json.data) ? json.data : [];
        setTickets(list);
        const init: Record<string, TicketState> = {};
        for (const t of list) {
          init[t.id] = { ref: t.bankTransferRef ?? '', submitting: false, submitted: !!t.bankTransferRef, error: '', uploading: false, uploadedName: '', uploadError: '', proofUploaded: false };
        }
        setStates(init);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setState(id: string, patch: Partial<TicketState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
  }

  async function submitRef(ticket: PendingTicket) {
    const s = states[ticket.id];
    if (!s || !s.ref.trim()) return;
    setState(ticket.id, { submitting: true, error: '' });
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/bank-transfer-ref`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankTransferRef: s.ref.trim() }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        setState(ticket.id, { submitted: true, submitting: false });
      } else {
        setState(ticket.id, { error: json.error ?? 'Submission failed.', submitting: false });
      }
    } catch {
      setState(ticket.id, { error: 'Network error. Please try again.', submitting: false });
    }
  }

  async function uploadProof(ticket: PendingTicket, file: File) {
    setState(ticket.id, { uploading: true, uploadError: '' });
    try {
      const mimeType = file.type || 'image/jpeg';
      const urlRes = await fetch(`/api/tickets/${ticket.id}/bank-transfer-proof-url?mimeType=${encodeURIComponent(mimeType)}`);
      const urlData = await urlRes.json() as { success: boolean; data?: { uploadUrl: string; key: string }; error?: string };
      if (!urlData.success || !urlData.data) throw new Error(urlData.error ?? 'Failed to get upload URL');

      const putRes = await fetch(urlData.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': mimeType },
      });
      if (!putRes.ok) throw new Error('Upload failed');

      setState(ticket.id, { uploading: false, uploadedName: file.name, proofUploaded: true });
    } catch (err) {
      setState(ticket.id, { uploading: false, uploadError: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }

  if (loading || tickets.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '1.75rem', border: '2px solid #fde68a' }}>
      <div className="card-header" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <i className="fa-solid fa-clock" style={{ color: '#d97706' }} />
        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#92400e' }}>
          Pending Bank Transfer{tickets.length > 1 ? 's' : ''} ({tickets.length})
        </span>
      </div>

      <div style={{ padding: '0.5rem 0' }}>
        <div style={{ padding: '0.625rem 1.25rem 0', fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.6 }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />
          Submit your bank transfer reference number and upload your proof of payment so our team can confirm your ticket.
        </div>

        {tickets.map((ticket) => {
          const s = states[ticket.id];
          if (!s) return null;
          return (
            <div key={ticket.id} style={{ padding: '1rem 1.25rem', borderTop: '1px solid #fde68a', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{ticket.campaign.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ticket.ticketNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: 'var(--green-primary)', fontSize: '1.0625rem' }}>₦{Number(ticket.totalAmount).toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(ticket.purchasedAt).toLocaleDateString('en-NG')}</div>
                </div>
              </div>

              {s.submitted ? (
                <div style={{ padding: '0.6rem 0.875rem', background: '#dcfce7', borderRadius: 8, fontSize: '0.875rem', color: '#166534', marginBottom: '0.75rem' }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '0.375rem' }} />
                  Reference submitted: <strong>{s.ref}</strong>. Awaiting admin confirmation.
                </div>
              ) : (
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                    Bank Transfer Reference Number
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={s.ref}
                      onChange={(e) => setState(ticket.id, { ref: e.target.value })}
                      placeholder="e.g. FBN2024042112345"
                      style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.875rem' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void submitRef(ticket)}
                      disabled={s.submitting || !s.ref.trim()}
                    >
                      {s.submitting ? <i className="fa-solid fa-spinner fa-spin" /> : 'Submit'}
                    </button>
                  </div>
                  {s.error && <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--error)' }}>{s.error}</div>}
                </div>
              )}

              {/* Proof upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                  Proof of Payment <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(screenshot or receipt)</span>
                </label>
                {s.proofUploaded ? (
                  <div style={{ padding: '0.5rem 0.75rem', background: '#dcfce7', borderRadius: 8, fontSize: '0.8125rem', color: '#166534' }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '0.375rem' }} />
                    {s.uploadedName} uploaded successfully.
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', border: '1px dashed var(--border-light)', borderRadius: 8, cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.125rem', color: 'var(--green-primary)' }} />
                    {s.uploading ? (
                      <span><i className="fa-solid fa-spinner fa-spin" /> Uploading…</span>
                    ) : (
                      <span>Click to upload image (JPG, PNG, PDF)</span>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      disabled={s.uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadProof(ticket, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
                {s.uploadError && <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--error)' }}>{s.uploadError}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
