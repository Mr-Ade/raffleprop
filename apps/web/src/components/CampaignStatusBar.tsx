'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CopyButton } from './CopyButton';
import styles from './CampaignStatusBar.module.css';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', REVIEW: 'Under Review', UPCOMING: 'Upcoming',
  LIVE: 'Live', PAUSED: 'Paused', CLOSED: 'Closed',
  DRAWN: 'Drawn', FILED: 'Filed', CANCELLED: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'badge-gray', REVIEW: 'badge-gold', UPCOMING: 'badge-info',
  LIVE: 'badge-green', PAUSED: 'badge-gold', CLOSED: 'badge-gray',
  DRAWN: 'badge-green', FILED: 'badge-green', CANCELLED: 'badge-red',
};

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Props {
  campaignId: string;
  status: string;
  fccpcRef?: string | null;
  token: string;
}

export default function CampaignStatusBar({ campaignId, status, fccpcRef, token }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [preSeedCommitment, setPreSeedCommitment] = useState<string | null>(null);

  async function changeStatus(newStatus: string) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json() as { success: boolean; data?: { drawPreSeedCommitment?: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Status change failed');
      if (newStatus === 'LIVE' && json.data?.drawPreSeedCommitment) {
        setPreSeedCommitment(json.data.drawPreSeedCommitment);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function publishCampaign() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/campaigns/${campaignId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Publish failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (preSeedCommitment) {
    return (
      <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 10, padding: '1rem 1.25rem', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#d97706', fontSize: '1.1rem' }} />
          <strong style={{ color: '#92400e', fontSize: '0.9375rem' }}>Campaign is now LIVE — announce this commitment immediately</strong>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#78350f', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          Post this hash publicly right now (YouTube description, website trust page, social media) <strong>before any tickets are purchased</strong>.
          It proves the draw seed was fixed before sales opened and cannot be manipulated.
        </p>
        <div style={{ fontFamily: 'monospace', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#92400e', wordBreak: 'break-all', marginBottom: '0.75rem' }}>
          {preSeedCommitment}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <CopyButton text={preSeedCommitment} />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => { setPreSeedCommitment(null); router.refresh(); }}
          >
            <i className="fa-solid fa-check" style={{ marginRight: '0.375rem' }} />I have announced this publicly
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Status badge */}
        <span className={`badge ${STATUS_COLOR[status] ?? 'badge-gray'}`}
          style={{ fontSize: '0.8125rem', padding: '0.3rem 0.875rem' }}>
          {STATUS_LABEL[status] ?? status}
        </span>

        {/* Action buttons */}
        {status === 'DRAFT' && (
          <button type="button" onClick={() => changeStatus('REVIEW')} disabled={saving} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '0.375rem' }} />Submit for Review
          </button>
        )}
        {status === 'REVIEW' && (<>
          <button type="button" onClick={() => changeStatus('DRAFT')} disabled={saving} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.375rem' }} />Back to Draft
          </button>
          <button type="button" onClick={publishCampaign} disabled={saving || !fccpcRef} className="btn btn-primary btn-sm"
            title={!fccpcRef ? 'FCCPC reference required to publish' : ''}>
            <i className="fa-solid fa-calendar-check" style={{ marginRight: '0.375rem' }} />Publish as Upcoming
          </button>
        </>)}
        {status === 'UPCOMING' && (
          <button type="button" onClick={() => changeStatus('LIVE')} disabled={saving} className="btn btn-primary btn-sm">
            <i className="fa-solid fa-rocket" style={{ marginRight: '0.375rem' }} />Go Live
          </button>
        )}
        {status === 'DRAWN' && (
          <Link href={`/admin/post-draw?campaign=${campaignId}`} className="btn btn-primary btn-sm">
            <i className="fa-solid fa-file-circle-check" style={{ marginRight: '0.375rem' }} />Post-Draw Filing
          </Link>
        )}
        {status === 'LIVE' && (<>
          <button type="button" onClick={() => changeStatus('PAUSED')} disabled={saving} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-pause" style={{ marginRight: '0.375rem' }} />Pause
          </button>
          <button type="button" onClick={() => changeStatus('CLOSED')} disabled={saving} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-lock" style={{ marginRight: '0.375rem' }} />Close Campaign
          </button>
        </>)}
        {status === 'PAUSED' && (<>
          <button type="button" onClick={() => changeStatus('LIVE')} disabled={saving} className="btn btn-primary btn-sm">
            <i className="fa-solid fa-play" style={{ marginRight: '0.375rem' }} />Resume
          </button>
          <button type="button" onClick={() => changeStatus('CLOSED')} disabled={saving} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-lock" style={{ marginRight: '0.375rem' }} />Close Campaign
          </button>
        </>)}
        {['DRAFT', 'REVIEW', 'UPCOMING', 'LIVE', 'PAUSED'].includes(status) && !confirmCancel && (
          <button type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={saving} className="btn btn-sm"
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
            <i className="fa-solid fa-ban" style={{ marginRight: '0.375rem' }} />Cancel
          </button>
        )}
        {['DRAFT', 'REVIEW', 'UPCOMING', 'LIVE', 'PAUSED'].includes(status) && confirmCancel && (
          <span className={styles.cancelConfirm}>
            Cancel campaign?
            <button type="button" onClick={() => { setConfirmCancel(false); void changeStatus('CANCELLED'); }} disabled={saving}
              className={`btn btn-sm ${styles.cancelYes}`}>
              Yes
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} disabled={saving}
              className={`btn btn-sm btn-outline ${styles.cancelNo}`}>
              No
            </button>
          </span>
        )}

        {saving && <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} />}
      </div>

      {error && (
        <div style={{ fontSize: '0.8125rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <i className="fa-solid fa-circle-xmark" />{error}
        </div>
      )}
    </div>
  );
}
