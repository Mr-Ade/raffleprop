'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { KycQueueEntry } from './page';

interface KycQueueTableProps {
  entries: KycQueueEntry[];
  token: string;
  apiUrl: string;
}

const ID_TYPE_LABELS: Record<string, string> = {
  DRIVERS_LICENCE: "Driver's Licence",
  NATIONAL_ID:     'National ID Card',
  PASSPORT:        'International Passport',
  VOTERS_CARD:     "Voter's Card (PVC)",
  NIN_SLIP:        'NIN Slip',
};

function ViewDocButton({ userId, token, apiUrl }: { userId: string; token: string; apiUrl: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleView() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${userId}/kyc-doc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
      if (!json.success || !json.data?.url) {
        setError(json.error ?? 'Failed to load document.');
        return;
      }
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={handleView}
        disabled={loading}
        title="View identity document (15-min link)"
      >
        {loading
          ? <i className="fa-solid fa-spinner fa-spin" />
          : <><i className="fa-solid fa-file-image" style={{ marginRight: '0.3rem' }} />View Doc</>}
      </button>
      {error && <span style={{ fontSize: '0.7rem', color: '#b91c1c' }}>{error}</span>}
    </span>
  );
}

function KycActionButton({
  userId, action, token, apiUrl, onDone,
}: {
  userId: string; action: 'VERIFIED' | 'REJECTED'; token: string; apiUrl: string; onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  async function submit(notesVal?: string) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${userId}/kyc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: action, notes: notesVal }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setError(json.error ?? 'Failed'); return; }
      setShowRejectForm(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  if (action === 'VERIFIED') {
    return (
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}
        onClick={() => submit()}
        disabled={loading}
      >
        {loading ? '…' : <><i className="fa-solid fa-check" style={{ marginRight: '0.3rem' }} />Approve</>}
      </button>
    );
  }

  if (!showRejectForm) {
    return (
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c' }}
        onClick={() => setShowRejectForm(true)}
      >
        <i className="fa-solid fa-times" style={{ marginRight: '0.3rem' }} />Reject
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, borderRadius: 16 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Reject KYC Submission</h3>
          <button type="button" onClick={() => { setShowRejectForm(false); setNotes(''); setError(''); }}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Reason for rejection <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <textarea
            className="form-input" rows={3} value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Document unclear or does not match submitted details…"
            style={{ resize: 'vertical', marginBottom: '0.75rem' }}
          />
          {error && (
            <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 6, fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" disabled={loading}
              onClick={() => { setShowRejectForm(false); setNotes(''); setError(''); }}>
              Cancel
            </button>
            <button type="button" className="btn btn-sm" disabled={loading || !notes.trim()}
              style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c' }}
              onClick={() => submit(notes.trim())}>
              {loading ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KycQueueTable({ entries: initialEntries, token, apiUrl }: KycQueueTableProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    router.refresh();
  }

  if (entries.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--gold, #f59e0b)' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
          <i className="fa-solid fa-id-card" style={{ color: '#d97706', marginRight: '0.5rem' }} />
          KYC Approval Queue
        </h3>
        <span className="badge badge-gold">{entries.length} pending</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table data-table-responsive">
          <thead>
            <tr>
              <th>User</th>
              <th>Submitted</th>
              <th>ID Type</th>
              <th>BVN</th>
              <th>NIN</th>
              <th>Document</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{e.fullName}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{e.email}</div>
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {e.kycSubmittedAt
                    ? new Date(e.kycSubmittedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td style={{ fontSize: '0.8125rem' }}>
                  {e.kycIdType ? ID_TYPE_LABELS[e.kycIdType] ?? e.kycIdType : (
                    <span style={{ color: 'var(--text-muted)' }}>Not specified</span>
                  )}
                </td>
                <td>
                  {e.hasBvn
                    ? <span className="badge badge-green">Provided</span>
                    : <span className="badge badge-gray">Missing</span>}
                </td>
                <td>
                  {e.hasNin
                    ? <span className="badge badge-green">Provided</span>
                    : <span className="badge badge-gray">Missing</span>}
                </td>
                <td>
                  {e.kycDocumentKey
                    ? <ViewDocButton userId={e.id} token={token} apiUrl={apiUrl} />
                    : <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No file</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <KycActionButton
                      userId={e.id} action="VERIFIED"
                      token={token} apiUrl={apiUrl}
                      onDone={() => removeEntry(e.id)}
                    />
                    <KycActionButton
                      userId={e.id} action="REJECTED"
                      token={token} apiUrl={apiUrl}
                      onDone={() => removeEntry(e.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
