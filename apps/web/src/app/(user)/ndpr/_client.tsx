'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session-client';
import Link from 'next/link';

export default function NdprPage() {
  const { user } = useSession();
  const [downloading, setDownloading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgIsError, setMsgIsError] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteMsgIsError, setDeleteMsgIsError] = useState(false);

  const initials = (user?.fullName ?? '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  async function downloadData() {
    setDownloading(true);
    try {
      const res = await fetch('/api/ndpr/my-data');
      if (!res.ok) throw new Error();
      const json = await res.json() as { success: boolean; data?: unknown };
      if (!json.success) throw new Error();
      const blob = new Blob([JSON.stringify(json.data ?? json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raffleprop-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsgIsError(false);
      setMsg('Your data export has been downloaded.');
    } catch {
      setMsgIsError(true);
      setMsg('Export failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function requestDeletion() {
    if (!confirmed) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/ndpr/delete-request', { method: 'POST' });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setDeleteMsgIsError(false);
        setDeleteMsg('Your deletion request has been submitted. Your account data will be anonymised within 30 days. Ticket records are retained for regulatory compliance (FCCPA §118).');
      } else {
        setDeleteMsgIsError(true);
        setDeleteMsg(data.error ?? 'Request failed.');
      }
    } catch {
      setDeleteMsgIsError(true);
      setDeleteMsg('Network error. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">Data Rights Centre</div>
          <div className="portal-mobile-header-sub">Manage your NDPR data rights</div>
        </div>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          <i className="fa-solid fa-shield-halved" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
          Data Rights Centre
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Manage your personal data rights under the Nigeria Data Protection Regulation (NDPR) 2019
        </p>
      </div>

      {/* NDPR banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <i className="fa-solid fa-circle-info" style={{ color: '#3b82f6', flexShrink: 0, marginTop: '0.125rem' }} />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Under the <strong>Nigeria Data Protection Regulation (NDPR) 2019</strong> and the <strong>Nigeria Data Protection Act 2023</strong>, you have the right to access, correct, delete, and transfer your personal data. RaffleProp must respond to all data rights requests within <strong>30 days</strong>. Note: certain data (FCCPA §118 transaction records, T&amp;C acceptance logs) must be retained regardless of deletion requests — these will be noted in your response.
        </div>
      </div>

      {/* Access / Export */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
          <i className="fa-solid fa-download" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
          Access My Data (NDPR Article 2.6)
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Download all personal data RaffleProp holds about you — account details, tickets,
            transactions, KYC status, and communications — as a JSON file.
          </p>
          {msg && (
            <div style={{ padding: '0.75rem 1rem', background: msgIsError ? '#fee2e2' : '#dcfce7', border: `1px solid ${msgIsError ? '#fca5a5' : '#86efac'}`, borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem', color: msgIsError ? '#b91c1c' : '#166534' }}>
              {msgIsError && <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />}
              {msg}
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={downloadData} disabled={downloading}>
            {downloading ? (
              <><i className="fa-solid fa-spinner fa-spin" /> Preparing export…</>
            ) : (
              <><i className="fa-solid fa-download" /> Download My Data</>
            )}
          </button>
        </div>
      </div>

      {/* Deletion */}
      <div className="card">
        <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--error)' }}>
          <i className="fa-solid fa-trash" style={{ marginRight: '0.5rem' }} />
          Request Account Deletion (NDPR Article 2.10)
        </div>
        <div className="card-body">
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid var(--warning)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#92400e', lineHeight: 1.6 }}>
            <strong>Important:</strong> Account deletion anonymises your personal details (name, email, phone).
            However, ticket and transaction records are retained permanently under our legal obligation
            to comply with FCCPA §118. This is lawful under NDPR Schedule 1 — Legal Obligation basis.
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Your deletion request will be processed within <strong>30 days</strong>. You will receive
            an email confirmation once complete.
          </p>

          {deleteMsg ? (
            <div style={{ padding: '1rem', background: deleteMsgIsError ? '#fee2e2' : '#dcfce7', border: `1px solid ${deleteMsgIsError ? '#fca5a5' : '#86efac'}`, borderRadius: 'var(--radius)', fontSize: '0.875rem', color: deleteMsgIsError ? '#b91c1c' : '#166534', lineHeight: 1.7 }}>
              {deleteMsgIsError && <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />}
              {deleteMsg}
            </div>
          ) : (
            <>
              <label className="checkbox-wrap" style={{ marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span className="checkbox-label">
                  I understand that my account will be anonymised and I will lose access to RaffleProp.
                  Ticket records will be retained for legal compliance.
                </span>
              </label>
              <button
                type="button"
                className="btn btn-full"
                style={{ background: 'var(--error)', color: '#fff', opacity: confirmed ? 1 : 0.55 }}
                onClick={requestDeletion}
                disabled={!confirmed || requesting}
              >
                {requesting ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</>
                ) : (
                  'Request Account Deletion'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
