import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';

export const metadata: Metadata = { title: 'T&C Acceptance Log — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type UserProfile = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  ndprConsentAt: string | null;
  ndprConsentIp: string | null;
  tcAcceptedAt: string | null;
  tcAcceptedIp: string | null;
  createdAt: string;
};

async function getUserProfile(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: UserProfile };
    return json.data ?? null;
  } catch { return null; }
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });
}

function maskIp(ip: string): string {
  // Mask the last octet for privacy display
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = 'xxx';
    return parts.join('.');
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, -1).join(':') + ':xxxx';
  }
  return ip;
}

export default async function TermsLogPage() {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;
  const profile = await getUserProfile(token);

  const initials = user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const LOG_ENTRIES = [
    {
      id: 'tc',
      icon: 'fa-file-contract',
      color: 'var(--green-primary)',
      title: 'Terms & Conditions Accepted',
      version: 'v1.0 (April 2026)',
      timestamp: profile?.tcAcceptedAt ?? null,
      ip: profile?.tcAcceptedIp ?? null,
      docLink: '/terms',
      docLabel: 'View Terms & Conditions',
      description: 'You accepted the RaffleProp Terms & Conditions, which govern ticket purchases, draw conduct, winner selection, and refund policies.',
    },
    {
      id: 'ndpr',
      icon: 'fa-shield-halved',
      color: '#3b82f6',
      title: 'NDPR Data Processing Consent',
      version: 'v1.0 (April 2026)',
      timestamp: profile?.ndprConsentAt ?? null,
      ip: profile?.ndprConsentIp ?? null,
      docLink: '/privacy',
      docLabel: 'View Privacy Policy',
      description: 'You gave informed consent for RaffleProp to collect and process your personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 2019.',
    },
    {
      id: 'account',
      icon: 'fa-user-check',
      color: 'var(--gold)',
      title: 'Account Created',
      version: null,
      timestamp: profile?.createdAt ?? null,
      ip: null,
      docLink: null,
      docLabel: null,
      description: 'Your RaffleProp account was created. Email and phone number registered.',
    },
  ];

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">T&amp;C Acceptance Log</div>
          <div className="portal-mobile-header-sub">Your consent and legal records</div>
        </div>
      </div>

      {/* Page header */}
      <div className="portal-page-header">
        <h1 className="portal-page-title">T&amp;C Acceptance Log</h1>
        <p className="portal-page-subtitle">A permanent record of your legal consents and agreement acceptance timestamps</p>
      </div>

      {/* Legal notice */}
      <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--green-50)', border: '1px solid var(--green-primary)30', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <i className="fa-solid fa-circle-info" style={{ color: 'var(--green-primary)', marginTop: '0.15rem', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Why we keep this record:</strong>{' '}
          Under the Nigeria Data Protection Regulation (NDPR) 2019 and the Federal Competition and Consumer Protection Act (FCCPA), we are required to maintain a verifiable audit trail of your consent to data processing and your acceptance of our Terms & Conditions. This log is permanent and cannot be deleted.
        </div>
      </div>

      {/* Log entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {LOG_ENTRIES.map((entry) => (
          <div key={entry.id} className="stat-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${entry.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${entry.icon}`} style={{ color: entry.color, fontSize: '1.125rem' }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>{entry.title}</h3>
                    {entry.version && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>Document version: {entry.version}</span>
                    )}
                  </div>
                  {entry.timestamp ? (
                    <span style={{ padding: '0.2rem 0.7rem', borderRadius: 99, background: '#dcfce7', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} />
                      Accepted
                    </span>
                  ) : (
                    <span style={{ padding: '0.2rem 0.7rem', borderRadius: 99, background: '#fef9c3', color: '#ca8a04', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                      <i className="fa-solid fa-clock" style={{ marginRight: '0.3rem' }} />
                      Pending
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
                  {entry.description}
                </p>

                {/* Metadata grid */}
                {entry.timestamp && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                        <i className="fa-solid fa-calendar" style={{ marginRight: '0.25rem' }} />
                        Date &amp; Time:
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    {entry.ip && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                          <i className="fa-solid fa-location-dot" style={{ marginRight: '0.25rem' }} />
                          IP Address:
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
                          {maskIp(entry.ip)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                        <i className="fa-solid fa-user" style={{ marginRight: '0.25rem' }} />
                        Account:
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {profile?.email ?? user.email}
                      </span>
                    </div>
                  </div>
                )}

                {entry.docLink && (
                  <Link href={entry.docLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.7rem' }} />
                    {entry.docLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* NDPR rights */}
      <div className="stat-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          <i className="fa-solid fa-scale-balanced" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
          Your Data Rights
        </h3>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Under the NDPR, you have the right to access, correct, and request deletion of your personal data.
          Note that transaction records (ticket purchase history) are exempt from deletion under FCCPA §118 legal obligation grounds.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/ndpr" className="btn btn-primary btn-sm">
            <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.375rem' }} />
            Data Rights Centre
          </Link>
          <Link href="/privacy" className="btn btn-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </>
  );
}
