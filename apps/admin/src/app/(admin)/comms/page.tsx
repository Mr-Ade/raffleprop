import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';

export const metadata: Metadata = { title: 'Communications' };

const TEMPLATES = [
  { key: 'winner', label: 'Winner Notification', description: 'Sent to draw winner via email + SMS within 3 days (FCCPA §124)', icon: 'fa-trophy', color: '#fef9c3', iconColor: '#a16207' },
  { key: 'loser', label: 'Participant Update', description: 'Sent to all non-winning participants after draw', icon: 'fa-envelope', color: '#dbeafe', iconColor: '#1d4ed8' },
  { key: 'refund', label: 'Refund Confirmation', description: 'Sent when a refund is processed (FCCPA §123)', icon: 'fa-rotate-left', color: '#dcfce7', iconColor: '#15803d' },
  { key: 'kyc_approved', label: 'KYC Approved', description: 'Sent when admin verifies a user\'s KYC submission', icon: 'fa-id-card', color: '#ede9fe', iconColor: '#7c3aed' },
  { key: 'purchase', label: 'Purchase Receipt', description: 'Sent immediately after successful ticket purchase', icon: 'fa-receipt', color: '#dcfce7', iconColor: '#15803d' },
  { key: 'draw_reminder', label: 'Draw Reminder', description: '24-hour reminder before scheduled draw', icon: 'fa-calendar-check', color: '#fef9c3', iconColor: '#a16207' },
];

export default function CommsPage() {
  return (
    <>
      <AdminPageHeader title="Communications" subtitle="Email and SMS notification templates" />
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {TEMPLATES.map((t) => (
            <div key={t.key} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.iconColor, fontSize: '1.125rem', flexShrink: 0 }}>
                    <i className={`fa-solid ${t.icon}`} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>{t.description}</div>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm btn-full">
                  <i className="fa-solid fa-pen" /> Edit Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
