'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ApproveRefundButton.module.css';

export function ApproveRefundButton({
  refundId,
  amount,
  gateway,
  token,
  apiUrl,
}: {
  refundId: string;
  amount: number;
  gateway: string;
  token: string;
  apiUrl: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<'idle' | 'confirming' | 'loading'>('idle');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleApprove() {
    setStage('loading');
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; error?: string; message?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to approve — please try again.');
        setStage('idle');
        return;
      }
      setSuccessMsg(json.message ?? 'Approved');
      router.refresh();
    } catch {
      setError('Network error — please try again.');
      setStage('idle');
    }
  }

  if (successMsg) {
    return (
      <div className={styles.success}>
        <i className={`fa-solid fa-circle-check ${styles.approveIcon}`} />
        {successMsg}
      </div>
    );
  }

  if (stage === 'confirming') {
    return (
      <div className={styles.confirmWrapper}>
        <div className={styles.confirmText}>
          {gateway === 'BANK_TRANSFER'
            ? `Transfer ₦${amount.toLocaleString()} manually?`
            : `Process ₦${amount.toLocaleString()} via ${gateway}?`}
        </div>
        <div className={styles.confirmRow}>
          <button
            type="button"
            onClick={() => void handleApprove()}
            className={`btn btn-sm ${styles.btnYes}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setStage('idle')}
            className={`btn btn-outline btn-sm ${styles.btnNo}`}
          >
            No
          </button>
        </div>
        {error && <div className={styles.errorText}>{error}</div>}
      </div>
    );
  }

  if (stage === 'loading') {
    return (
      <button
        type="button"
        disabled
        className={`btn btn-sm ${styles.approveBtn}`}
      >
        <i className={`fa-solid fa-spinner fa-spin ${styles.approveIcon}`} />
        Processing…
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setStage('confirming')}
        className={`btn btn-sm ${styles.approveBtn}`}
      >
        <i className={`fa-solid fa-check ${styles.approveIcon}`} />
        Approve
      </button>
      {error && <div className={styles.errorText}>{error}</div>}
    </div>
  );
}
