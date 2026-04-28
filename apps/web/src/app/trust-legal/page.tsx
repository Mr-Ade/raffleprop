import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trust & Legal Centre — RaffleProp',
  description: 'RaffleProp\'s legal guarantees, regulatory approvals, escrow details, and compliance documentation.',
};

export default function TrustLegalPage() {
  return (
    <main id="main-content">
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-shield-halved" /> Legal
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            Trust &amp; Legal Centre
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 580, lineHeight: 1.6 }}>
            Every legal protection, regulatory approval, and compliance document in one place.
          </p>
        </div>
      </div>

      <section style={{ padding: '4rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: 'fa-building-columns', title: 'CAC Registration', body: 'RaffleProp Ltd is registered with the Corporate Affairs Commission under RC 9484205.', badge: 'RC 9484205' },
              { icon: 'fa-gavel', title: 'FCCPC Approval', body: 'Every campaign is individually reviewed and approved by the FCCPC before launch under FCCPA 2018.', badge: 'Per Campaign' },
              { icon: 'fa-bank', title: 'Escrow Protected', body: 'All ticket proceeds are held in a ring-fenced escrow account at a named Nigerian bank, published per campaign.', badge: 'Fully Segregated' },
              { icon: 'fa-scale-balanced', title: 'Independent Lawyer', body: 'Each draw is conducted in the presence of an independent NBA-registered property lawyer.', badge: 'Every Draw' },
              { icon: 'fa-magnifying-glass-dollar', title: 'SCUML Registered', body: 'RaffleProp is registered with the Special Control Unit Against Money Laundering and fully AML/CFT compliant.', badge: 'AML Compliant' },
              { icon: 'fa-lock', title: 'NDPR Compliant', body: 'Your personal data is protected under the Nigeria Data Protection Regulation 2019. BVN/NIN are AES-256 encrypted.', badge: 'NDPR 2019' },
            ].map((item) => (
              <div key={item.title} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)', padding: '1.5rem',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', marginBottom: '1rem',
                }}>
                  <i className={`fa-solid ${item.icon}`} style={{ color: 'var(--green-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '0.75rem' }}>{item.body}</p>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-primary)', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.2em 0.625em' }}>{item.badge}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '3rem', textAlign: 'center', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/how-it-works" className="btn btn-primary">
              <i className="fa-solid fa-circle-play" style={{ marginRight: '0.375rem' }} />
              How the Draw Works
            </Link>
            <Link href="/faq" className="btn btn-outline">
              <i className="fa-solid fa-circle-question" style={{ marginRight: '0.375rem' }} />
              Read the FAQ
            </Link>
          </div>

          {/* Related legal documents */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/compliance" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-building-columns" style={{ marginRight: '0.375rem' }} />
              Regulatory Compliance
            </Link>
            <Link href="/terms" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-file-contract" style={{ marginRight: '0.375rem' }} />
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-lock" style={{ marginRight: '0.375rem' }} />
              Privacy Policy
            </Link>
            <Link href="/data-rights" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-file-export" style={{ marginRight: '0.375rem' }} />
              NDPR / Data Rights
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
