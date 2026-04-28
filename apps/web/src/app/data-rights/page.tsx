import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NDPR / Data Rights — RaffleProp',
  description: 'Exercise your Nigeria Data Protection Regulation 2019 rights — access, correct, delete, or export your personal data held by RaffleProp. We respond within 30 days.',
};

const RIGHTS = [
  {
    icon: 'fa-file-export',
    title: 'Right to Access',
    body: 'Request a full export of all personal data RaffleProp holds about you, in a machine-readable format.',
    action: 'Request Data Export',
    href: '/ndpr',
  },
  {
    icon: 'fa-pen',
    title: 'Right to Rectification',
    body: 'Update inaccurate or incomplete personal details in your account profile at any time.',
    action: 'Go to Profile',
    href: '/profile',
  },
  {
    icon: 'fa-trash-can',
    title: 'Right to Erasure',
    body: 'Request anonymisation of your personal data. Ticket records are retained for FCCPA §118 compliance.',
    action: 'Request Deletion',
    href: '/ndpr',
  },
  {
    icon: 'fa-arrow-right-arrow-left',
    title: 'Right to Portability',
    body: 'Receive your personal data in a structured, commonly used, machine-readable format (JSON or CSV).',
    action: 'Request Data Export',
    href: '/ndpr',
  },
  {
    icon: 'fa-bell-slash',
    title: 'Withdraw Consent',
    body: 'Opt out of marketing communications at any time. This does not affect processing based on contract or legal obligation.',
    action: 'Manage Preferences',
    href: '/profile',
  },
  {
    icon: 'fa-flag',
    title: 'Right to Complain',
    body: 'If you are not satisfied with our response, lodge a complaint with NITDA, the NDPR supervisory authority.',
    action: 'Visit NITDA',
    href: 'https://nitda.gov.ng',
    external: true,
  },
];

const PROCESS_STEPS = [
  { n: '1', title: 'Submit Your Request', body: 'Email privacy@raffleprop.com or use the links above. Include your full name and the nature of your request.' },
  { n: '2', title: 'Identity Verification', body: 'We verify your identity to ensure we only act on genuine data subject requests. This protects your data from unauthorised requests.' },
  { n: '3', title: 'We Process Your Request', body: 'Our Data Protection Officer reviews and processes your request within 30 days as required by the NDPR 2019.' },
  { n: '4', title: 'Confirmation Sent', body: 'We send written confirmation once your request has been completed, including details of any actions taken.' },
];

export default function NdprPublicPage() {
  return (
    <main id="main-content">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-lock" /> Your Rights
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            NDPR / Data Rights
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 560, lineHeight: 1.6 }}>
            Under the Nigeria Data Protection Regulation 2019, you have the right to access, correct, export, or delete your personal data held by RaffleProp. We respond to all requests within 30 days.
          </p>
        </div>
      </div>

      {/* Rights grid */}
      <section style={{ padding: '4rem 1.5rem 2rem' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <p className="section-label" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Your Rights Under NDPR 2019</p>
          <h2 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.02em' }}>
            Six Rights. All Respected.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {RIGHTS.map((item) => (
              <div key={item.title} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)', padding: '1.5rem',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 10,
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.0625rem', marginBottom: '1rem', flexShrink: 0,
                }}>
                  <i className={`fa-solid ${item.icon}`} style={{ color: 'var(--green-primary)' }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.4rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, flex: 1, marginBottom: '1rem' }}>{item.body}</p>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">{item.action}</a>
                ) : (
                  <Link href={item.href} className="btn btn-outline btn-sm">{item.action}</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How the process works */}
      <section style={{ padding: '2.5rem 1.5rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p className="section-label" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>How It Works</p>
          <h2 style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.02em' }}>
            Exercising Your Rights
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {PROCESS_STEPS.map((step) => (
              <div key={step.n} style={{
                padding: '1.25rem',
                background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--green-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8125rem', fontWeight: 800, marginBottom: '0.875rem',
                }}>
                  {step.n}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>{step.title}</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DPO contact + retention note */}
      <section style={{ padding: '2rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>

          {/* DPO contact */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
            padding: '1.25rem 1.5rem',
            background: 'var(--card-bg)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)', marginBottom: '1rem',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: 'var(--green-50)', border: '1px solid var(--green-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>
              <i className="fa-solid fa-user-shield" style={{ color: 'var(--green-primary)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.2rem' }}>Data Protection Officer</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                For all data rights requests, contact our DPO directly at{' '}
                <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a>.
                {' '}We respond within 30 days as required by NDPR 2019.
              </p>
            </div>
          </div>

          {/* Retention note */}
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--green-50)', border: '1px solid var(--green-100)',
            borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            <i className="fa-solid fa-circle-info" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
            <strong>Note on ticket records:</strong> Ticket and transaction records are retained permanently as required by FCCPA §118. This legal obligation overrides the NDPR right to erasure for regulatory records. All other personal data — name, contact details, BVN/NIN — is anonymised within 30 days of a verified deletion request.
          </div>

          {/* Related links */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/privacy" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-lock" style={{ marginRight: '0.375rem' }} />
              Privacy Policy
            </Link>
            <Link href="/terms" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-file-contract" style={{ marginRight: '0.375rem' }} />
              Terms &amp; Conditions
            </Link>
            <Link href="/compliance" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-building-columns" style={{ marginRight: '0.375rem' }} />
              Regulatory Compliance
            </Link>
            <Link href="/contact" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-envelope" style={{ marginRight: '0.375rem' }} />
              Contact Us
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
