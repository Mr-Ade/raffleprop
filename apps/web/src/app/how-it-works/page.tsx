import type { Metadata } from 'next';
import Link from 'next/link';
import { cms, type CmsHowItWorksStep } from '@/lib/cms';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'How It Works — RaffleProp',
  description: 'Learn exactly how RaffleProp works — from browsing properties to winning your dream home. FCCPC-regulated, escrow-protected, fully transparent.',
};

interface FallbackStep {
  id: string;
  stepNumber: number;
  icon: string;
  title: string;
  summary: string;
  details: string[];
  color: string;
  order: number;
}

const STEP_COLORS = ['#0D5E30', '#C9A227', '#0D5E30', '#C9A227'];

const FALLBACK_STEPS: FallbackStep[] = [
  {
    id: 'fb-1', stepNumber: 1, order: 0,
    icon: 'fa-magnifying-glass',
    title: 'Browse Active Campaigns',
    summary: 'View every property in detail before spending a naira.',
    details: [
      'Each campaign page shows the full property address, independent NIESV valuation, floor plans, gallery photos, and all legal documents.',
      "You can verify the FCCPC approval certificate, see the escrow bank and account number, and review the property lawyer's details — all before buying a ticket.",
      'Filter by state, property type, ticket price, or draw date to find the right campaign for you.',
    ],
    color: '#0D5E30',
  },
  {
    id: 'fb-2', stepNumber: 2, order: 1,
    icon: 'fa-ticket',
    title: 'Buy Your Tickets',
    summary: 'Select a bundle, answer one skill question, and pay securely.',
    details: [
      'Choose from our ticket bundles (1 ticket to 20 tickets) — bundle deals offer savings of up to 20% vs single tickets.',
      'You must correctly answer a simple skill-based question about the property or Nigerian real estate. This is a legal requirement under FCCPA to classify the draw as a promotional competition rather than a lottery.',
      'Pay securely via Paystack (card, bank transfer, USSD) or Flutterwave. All payments are PCI-DSS compliant. We never store your card details.',
      "Your FCCPA §118 receipt is generated instantly and emailed + WhatsApp'd to you. Your unique ticket number (e.g. RP-2025-001-04821) is your draw entry.",
    ],
    color: '#C9A227',
  },
  {
    id: 'fb-3', stepNumber: 3, order: 2,
    icon: 'fa-video',
    title: 'Watch the Live Draw',
    summary: 'Every draw is live-streamed, witnessed, and independently verified.',
    details: [
      'On draw day, RaffleProp hosts a live stream on YouTube. The draw is conducted in the presence of an independent property lawyer, a notary public, and a representative from the escrow bank.',
      'We use a cryptographically verifiable random number generator (random.org signed seed) to select the winning ticket number. The seed is published before the draw so anyone can verify the result.',
      'The full live stream is archived permanently on our YouTube channel and linked from the campaign page.',
      'The FCCPC is notified of the winner within 24 hours of the draw as required by FCCPA §124.',
    ],
    color: '#0D5E30',
  },
  {
    id: 'fb-4', stepNumber: 4, order: 3,
    icon: 'fa-house-chimney-user',
    title: 'Win & Take Ownership',
    summary: 'Winner is verified and legal title is transferred with zero hidden fees.',
    details: [
      'The winning ticket holder is contacted by our property lawyer within 3 days of the draw. Identity verification (BVN + NIN) is completed to match the ticket purchaser.',
      'A Deed of Assignment is prepared by our property lawyer. The escrow funds are released to RaffleProp only after the deed is signed and title transfer is initiated.',
      'All legal fees for the Deed of Assignment and title transfer are covered by RaffleProp — zero hidden costs for the winner.',
      'The full process from draw to title transfer takes 30–60 days depending on the property state\'s land registry processing time.',
    ],
    color: '#C9A227',
  },
];

const GUARANTEE_ITEMS = [
  {
    icon: 'fa-rotate-left',
    title: 'Full Refund Guarantee',
    body: 'If the minimum ticket threshold is not reached by the draw date, every participant receives a 100% refund automatically. No need to request it.',
  },
  {
    icon: 'fa-shield-halved',
    title: 'Escrow Protection',
    body: 'All funds are held in a ring-fenced escrow account at a reputable Nigerian bank, separate from RaffleProp\'s operating account. The bank details are published on every campaign page.',
  },
  {
    icon: 'fa-scale-balanced',
    title: 'Independent Legal Oversight',
    body: 'An independent property lawyer oversees every draw. The lawyer\'s name, firm, and NBA registration number are published on the campaign page.',
  },
  {
    icon: 'fa-trophy',
    title: 'Winner Guaranteed',
    body: 'If the minimum is reached, a winner is always drawn. RaffleProp cannot cancel a campaign once the minimum threshold has been hit.',
  },
];

export default async function HowItWorksPage() {
  const cmsSteps: CmsHowItWorksStep[] = await cms.getHowItWorks().catch(() => []);
  const usingCms = cmsSteps.length > 0;

  return (
    <main id="main-content">
      {/* Page header */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3.5rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>The Process</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 1rem', letterSpacing: '-0.03em' }}>
            How RaffleProp Works
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: 600 }}>
            Four clear steps from discovering a property to holding the title deed.
            Every step is transparent, regulated, and independently verified.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
            <Link href="/campaigns" className="btn btn-gold">
              <i className="fa-solid fa-ticket" style={{ marginRight: '0.375rem' }} />
              View Active Campaigns
            </Link>
            <Link href="/faq" className="btn btn-outline-white">
              Read the FAQ <i className="fa-solid fa-arrow-right" style={{ marginLeft: '0.375rem' }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Steps — CMS-driven when available, rich fallback otherwise */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {usingCms ? cmsSteps.map((step, i) => {
              const color = STEP_COLORS[i % STEP_COLORS.length] ?? '#0D5E30';
              return (
                <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.375rem', flexShrink: 0,
                      boxShadow: `0 4px 20px ${color}40`,
                    }}>
                      <i className={`fa-solid ${step.icon ?? 'fa-circle-check'}`} />
                    </div>
                    {i < cmsSteps.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border-light)', marginTop: 8, minHeight: 32 }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < cmsSteps.length - 1 ? '1rem' : 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Step {String(step.stepNumber).padStart(2, '0')}
                    </span>
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.375rem', letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
                      {step.title}
                    </h2>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            }) : FALLBACK_STEPS.map((step, i) => (
              <div key={step.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '2rem',
              }}>
                {/* Step number + connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: step.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.375rem', flexShrink: 0,
                    boxShadow: `0 4px 20px ${step.color}40`,
                  }}>
                    <i className={`fa-solid ${step.icon}`} />
                  </div>
                  {i < FALLBACK_STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: 'var(--border-light)', marginTop: 8, minHeight: 32 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: i < FALLBACK_STEPS.length - 1 ? '1rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: step.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Step {String(step.stepNumber).padStart(2, '0')}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.375rem', letterSpacing: '-0.02em' }}>
                    {step.title}
                  </h2>
                  <p style={{ fontSize: '1rem', color: 'var(--green-primary)', fontWeight: 600, marginBottom: '1rem' }}>
                    {step.summary}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {step.details.map((detail, j) => (
                      <li key={j} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        <i className="fa-solid fa-check" style={{ color: 'var(--green-primary)', fontSize: '0.75rem', marginTop: '0.35rem', flexShrink: 0 }} />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '4rem 1.5rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p className="section-label" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-shield-halved" /> Built-in Protections
            </p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.02em', marginTop: '0.5rem' }}>
              Your Money is Always Protected
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0.75rem auto 0', fontSize: '1rem' }}>
              Every safeguard below is contractually enforced by escrow and independently verified — not just a promise.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {GUARANTEE_ITEMS.map((item) => (
              <div key={item.title} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.125rem', marginBottom: '1rem',
                }}>
                  <i className={`fa-solid ${item.icon}`} style={{ color: 'var(--green-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regulatory section */}
      <section style={{ padding: '4rem 1.5rem', background: '#fff' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p className="section-label">
            <i className="fa-solid fa-building-columns" /> Legal Framework
          </p>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: '0.5rem 0 1rem' }}>
            Why This is Fully Legal in Nigeria
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              {
                q: 'Is this a lottery?',
                a: 'No. RaffleProp is structured as a Promotional Competition under Nigerian law. The skill question requirement means it is classified as a competition, not a lottery, and therefore does not require a National Lottery Commission licence.',
              },
              {
                q: 'Which federal regulator oversees this?',
                a: 'The Federal Competition & Consumer Protection Commission (FCCPC) regulates promotional competitions under FCCPA 2018. Every RaffleProp campaign must receive FCCPC approval before launching, and all draws are conducted in accordance with FCCPA §118–§124.',
              },
              {
                q: 'What about state-level regulations?',
                a: 'For properties in Lagos State, we also hold a licence from the Lagos State Lotteries & Gaming Authority (LSLGA). Requirements for other states are assessed per-campaign and disclosed on each campaign page.',
              },
              {
                q: 'How is RaffleProp registered?',
                a: 'RaffleProp Ltd is registered with the Corporate Affairs Commission (CAC) under RC 9484205. We are also SCUML-registered (Special Control Unit Against Money Laundering) and AML-compliant.',
              },
            ].map((item) => (
              <div key={item.q} style={{ borderLeft: '3px solid var(--green-primary)', paddingLeft: '1.25rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{item.q}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.a}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2rem' }}>
            <Link href="/faq" className="btn btn-outline">
              Read Full FAQ <i className="fa-solid fa-arrow-right" style={{ marginLeft: '0.375rem' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-banner-section">
        <div className="container">
          <h2 className="cta-banner-title">Ready to Enter Your First Campaign?</h2>
          <p className="cta-banner-body">
            Browse live campaigns, read the property details, and buy tickets in under 5 minutes.
          </p>
          <div className="cta-banner-btns">
            <Link href="/campaigns" className="btn btn-gold btn-lg">
              <i className="fa-solid fa-ticket" /> Browse Campaigns
            </Link>
            <Link href="/faq" className="btn btn-outline-white btn-lg">
              <i className="fa-regular fa-circle-question" /> Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
