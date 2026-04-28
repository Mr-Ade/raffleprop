import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Compliance' };

interface Deadline { id: string; campaignId: string; type: string; dueDate: string; status: string; description: string; }

async function getDeadlines(token: string) {
  try { return await adminFetch<Deadline[]>('/api/admin/compliance/deadlines', { token, cache: 'no-store' }); }
  catch { return []; }
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  WINNER_NOTIFICATION: { label: 'Winner Notification (3 days)', icon: 'fa-bell' },
  CPCB_FORM: { label: 'Form CPC B Filing (21 days)', icon: 'fa-file-contract' },
  FCCPC_FILING: { label: 'FCCPC Filing', icon: 'fa-building-columns' },
  ESCROW_RELEASE: { label: 'Escrow Release', icon: 'fa-vault' },
};

export default async function CompliancePage() {
  const token = (await getAdminToken())!;
  const deadlines = await getDeadlines(token);
  const overdue = deadlines.filter((d) => d.status === 'OVERDUE').length;
  const upcoming = deadlines.filter((d) => d.status === 'PENDING').length;

  return (
    <>
      <AdminPageHeader title="Compliance" subtitle={`${overdue} overdue · ${upcoming} upcoming`} />
      <div className="admin-content">
        {overdue > 0 && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderLeft: '4px solid var(--error)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--error)', fontSize: '1.25rem' }} />
            <p style={{ fontWeight: 700, color: '#991b1b' }}>{overdue} overdue deadline{overdue !== 1 ? 's' : ''} require immediate attention.</p>
          </div>
        )}

        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Type</th><th>Campaign</th><th>Due Date</th><th>Status</th><th>Description</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {deadlines.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No compliance deadlines</td></tr>
                ) : deadlines.map((d) => {
                  const typeInfo = TYPE_LABELS[d.type];
                  const isOverdue = d.status === 'OVERDUE';
                  return (
                    <tr key={d.id} style={{ background: isOverdue ? '#fff5f5' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className={`fa-solid ${typeInfo?.icon ?? 'fa-circle-dot'}`} style={{ color: isOverdue ? 'var(--error)' : 'var(--green-primary)' }} />
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{typeInfo?.label ?? d.type}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{d.campaignId.slice(0, 8)}…</td>
                      <td style={{ fontWeight: isOverdue ? 700 : 400, color: isOverdue ? 'var(--error)' : undefined }}>
                        {new Date(d.dueDate).toLocaleDateString('en-NG')}
                      </td>
                      <td><span className={`badge ${d.status === 'COMPLETED' ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-gold'}`}>{d.status}</span></td>
                      <td style={{ fontSize: '0.875rem' }}>{d.description}</td>
                      <td>
                        {d.status !== 'COMPLETED' && (
                          <button className="btn btn-primary btn-sm">Mark Done</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
