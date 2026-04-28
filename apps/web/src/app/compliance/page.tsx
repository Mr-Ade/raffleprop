import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Regulatory Compliance — RaffleProp',
  description: 'RaffleProp\'s full regulatory compliance framework — FCCPA 2018, NDPR 2019, AML/SCUML, LSLGA, CAC registration, escrow controls, and technical security.',
};

const CREDENTIALS = [
  { icon: 'fa-building-columns', label: 'CAC Registered', sub: 'RC 9484205' },
  { icon: 'fa-shield-halved', label: 'FCCPC Approved', sub: 'Per FCCPA 2018' },
  { icon: 'fa-money-bill-transfer', label: 'SCUML Registered', sub: 'AML/CFT Compliant' },
  { icon: 'fa-lock', label: 'NDPR Compliant', sub: 'Data Protection 2019' },
  { icon: 'fa-credit-card', label: 'PCI-DSS Payments', sub: 'Paystack · Flutterwave' },
];

const SECTIONS = [
  {
    id: 'cac',
    icon: 'fa-building-columns',
    title: 'Corporate Registration — CAC',
    items: [
      'Incorporated as RaffleProp Ltd with the Corporate Affairs Commission of Nigeria under RC 9484205 on 13 April 2026.',
      'Registered office: 36 Minfa Crescent, Karu, Nigeria.',
      'Annual returns filed with CAC as required by the Companies and Allied Matters Act (CAMA) 2020.',
    ],
  },
  {
    id: 'fccpa',
    icon: 'fa-scale-balanced',
    title: 'FCCPA 2018 — Federal Competition & Consumer Protection Act',
    items: [
      'All campaigns are individually approved by the FCCPC before launch.',
      'Skill question requirement ensures classification as a Promotional Competition, not a lottery.',
      'FCCPA §118 compliant receipt issued for every ticket purchase.',
      'FCCPC notified of draw results within 24 hours per FCCPA §124.',
      'Form CPC B filed within 21 days of each completed draw.',
      'Winner notified within 3 days of draw per FCCPA §123.',
      'All draws live-streamed on YouTube and archived permanently.',
    ],
  },
  {
    id: 'ndpr',
    icon: 'fa-lock',
    title: 'NDPR 2019 — Nigeria Data Protection Regulation',
    items: [
      'Explicit NDPR consent obtained at registration with consent timestamp and IP address recorded.',
      'BVN and NIN encrypted at rest using AES-256-GCM; never stored or transmitted in plain text.',
      'Data access, correction, portability, and deletion rights accessible via account dashboard.',
      'NDPR deletion requests processed within 30 days; ticket records retained per FCCPA §118 legal obligation.',
      'No personal data sold or shared with third parties beyond operational necessity.',
      'Privacy Policy published and maintained per NDPR Article 24.',
      'Data Protection Officer appointed; contact: privacy@raffleprop.com.',
    ],
  },
  {
    id: 'aml',
    icon: 'fa-money-bill-transfer',
    title: 'AML/CFT — Anti-Money Laundering & Counter-Terrorism Financing',
    items: [
      'SCUML-registered (Special Control Unit Against Money Laundering) as a Designated Non-Financial Institution (DNFI).',
      'KYC verification (BVN + NIN matching) required before ticket purchase.',
      'All payments processed exclusively through PCI-DSS compliant gateways (Paystack, Flutterwave).',
      'Suspicious transaction monitoring in place per EFCC Act and CBN AML/CFT Regulations.',
      'Customer Due Diligence (CDD) conducted on all registered users.',
    ],
  },
  {
    id: 'lslga',
    icon: 'fa-map-location-dot',
    title: 'LSLGA — Lagos State Lotteries & Gaming Authority',
    items: [
      'LSLGA licence held for all campaigns involving Lagos State properties.',
      'State-level compliance with the Lagos State Lotteries Act for each applicable campaign.',
      'Campaign-specific state gaming authority approvals obtained prior to ticket sales.',
    ],
  },
  {
    id: 'escrow',
    icon: 'fa-vault',
    title: 'Escrow & Financial Controls',
    items: [
      'All ticket proceeds held in a ring-fenced escrow account at the bank named on each campaign page.',
      'Escrow account number published on every campaign page for full transparency.',
      'Funds released to RaffleProp only after the draw is completed and the FCCPC winner list is verified.',
      'Automatic refund triggered within 3–5 business days if minimum ticket threshold is not reached.',
      'Financial records retained for 7 years for tax and audit compliance.',
    ],
  },
  {
    id: 'security',
    icon: 'fa-shield-halved',
    title: 'Technical Security',
    items: [
      'All data in transit encrypted via TLS 1.3; all HTTP traffic redirected to HTTPS.',
      'BVN and NIN encrypted at rest using AES-256-GCM with keys stored separately from data.',
      'Regulatory documents stored in WORM (write-once, read-many) cloud storage — cannot be modified or deleted.',
      'All data access events recorded in an append-only audit log.',
      'Admin accounts require two-factor authentication (TOTP).',
      'No personally identifiable information (PII) written to application logs in plain text.',
      'Access to personal data restricted on a strict need-to-know basis.',
    ],
  },
];

export default function CompliancePage() {
  return (
    <main id="main-content">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-building-columns" /> Compliance
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            Regulatory Compliance
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 580, lineHeight: 1.6 }}>
            RaffleProp is fully compliant with all applicable Nigerian laws and regulations governing promotional competitions, data protection, anti-money laundering, and consumer protection.
          </p>
        </div>
      </div>

      {/* Credentials strip */}
      <div style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--card-bg)', padding: '1.25rem 1.5rem', overflowX: 'auto' }}>
        <div className="container" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CREDENTIALS.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--green-50)', border: '1px solid var(--green-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem',
              }}>
                <i className={`fa-solid ${c.icon}`} style={{ color: 'var(--green-primary)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.2 }}>{c.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance sections */}
      <section style={{ padding: '4rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {SECTIONS.map((section) => (
              <div key={section.id} id={section.id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)', padding: '1.75rem', scrollMarginTop: '80px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 9, flexShrink: 0,
                    background: 'var(--green-50)', border: '1px solid var(--green-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                  }}>
                    <i className={`fa-solid ${section.icon}`} style={{ color: 'var(--green-primary)' }} />
                  </div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{section.title}</h2>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {section.items.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      <i className="fa-solid fa-check" style={{ color: 'var(--green-primary)', fontSize: '0.7rem', marginTop: '0.4rem', flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Related links */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/trust-legal" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.375rem' }} />
              Trust &amp; Legal Centre
            </Link>
            <Link href="/privacy" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-lock" style={{ marginRight: '0.375rem' }} />
              Privacy Policy
            </Link>
            <Link href="/terms" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-file-contract" style={{ marginRight: '0.375rem' }} />
              Terms &amp; Conditions
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
