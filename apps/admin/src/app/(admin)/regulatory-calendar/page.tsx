import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Regulatory Calendar' };

interface CalEntry { id: string; type: string; dueDate: string; status: string; campaignTitle?: string; }

async function getCalendar(token: string) {
  try { return await adminFetch<CalEntry[]>('/api/admin/compliance/calendar', { token, cache: 'no-store' }); }
  catch { return []; }
}

export default async function RegulatoryCalendarPage() {
  const token = (await getAdminToken())!;
  const entries = await getCalendar(token);
  const now = new Date();

  // Group by month
  const byMonth: Record<string, CalEntry[]> = {};
  for (const e of entries) {
    const key = new Date(e.dueDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' });
    (byMonth[key] ??= []).push(e);
  }

  return (
    <>
      <AdminPageHeader title="Regulatory Calendar" subtitle="FCCPA §118/§123/§124 and NDPR filing deadlines" />
      <div className="admin-content">
        {Object.keys(byMonth).length === 0 ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-calendar-check" style={{ fontSize: '2.5rem', marginBottom: '1rem' }} />
              <p>No upcoming regulatory deadlines.</p>
            </div>
          </div>
        ) : Object.entries(byMonth).map(([month, items]) => (
          <div key={month} className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-calendar" style={{ color: 'var(--green-primary)' }} />
              {month}
              <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{items.length}</span>
            </div>
            <div style={{ padding: '0 1.5rem' }}>
              {items.map((e) => {
                const due = new Date(e.dueDate);
                const isOverdue = due < now && e.status !== 'COMPLETED';
                return (
                  <div key={e.id} className="spec-row" style={{ alignItems: 'flex-start', paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <i className={`fa-solid fa-circle-dot`} style={{ color: isOverdue ? 'var(--error)' : e.status === 'COMPLETED' ? 'var(--success)' : 'var(--warning)', fontSize: '0.625rem', marginTop: '0.2rem' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.type.replace(/_/g, ' ')}</div>
                        {e.campaignTitle && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{e.campaignTitle}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: isOverdue ? 700 : 400, color: isOverdue ? 'var(--error)' : 'var(--text-secondary)' }}>
                        {due.toLocaleDateString('en-NG')}
                      </span>
                      <span className={`badge ${e.status === 'COMPLETED' ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-gold'}`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
