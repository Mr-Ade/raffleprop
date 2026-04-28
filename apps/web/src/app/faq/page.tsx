import type { Metadata } from 'next';
import { FaqAccordion } from '@/components/FaqAccordion';
import { cms } from '@/lib/cms';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — RaffleProp',
  description: 'Everything you need to know about RaffleProp — legality, payments, draws, refunds, winner verification, registration, and the referral programme.',
};

const FALLBACK_faqSections = [
  {
    id: 'legality',
    heading: 'Legality & Regulation',
    icon: 'fa-scale-balanced',
    items: [
      {
        q: 'Is RaffleProp legal in Nigeria?',
        a: 'Yes. RaffleProp is structured as a Promotional Competition under Nigerian law — not a lottery — meaning participants must answer a skill question to enter. Our business is CAC-registered (RC 9484205) and all campaigns are approved by the FCCPC before launching.',
      },
      {
        q: 'Which regulators have approved RaffleProp?',
        a: 'All campaigns are reviewed and approved by the Federal Competition & Consumer Protection Commission (FCCPC) under FCCPA 2018. For Lagos properties, we also hold a Lagos State Lotteries & Gaming Authority (LSLGA) licence. Approval certificates are published on each campaign page.',
      },
      {
        q: 'Why is there a skill question?',
        a: "Under Nigerian law, a draw that requires a skill element is classified as a promotional competition rather than a lottery. This means it falls under the FCCPC's jurisdiction rather than the National Lottery Commission, and participants engage based on ability — not purely chance.",
      },
      {
        q: 'Is RaffleProp registered with SCUML?',
        a: 'Yes. RaffleProp is SCUML-registered (Special Control Unit Against Money Laundering) and compliant with Nigerian AML/CFT regulations.',
      },
    ],
  },
  {
    id: 'tickets',
    heading: 'Tickets & Payment',
    icon: 'fa-ticket',
    items: [
      {
        q: 'How do I buy tickets?',
        a: "Go to any active campaign page, select your ticket bundle (1–20 tickets), answer the skill question correctly, and complete payment via Paystack or Flutterwave. Your FCCPA §118 receipt and ticket number are emailed and WhatsApp'd instantly.",
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept card, bank transfer, USSD, and mobile money via Paystack and Flutterwave. Both gateways are PCI-DSS compliant. We never store your card details.',
      },
      {
        q: 'Can I buy more than one ticket?',
        a: 'Yes. We offer bundles from 1 ticket up to 20 tickets per purchase. Bundle deals offer savings of up to 20% vs buying single tickets. You can make multiple purchases in the same campaign.',
      },
      {
        q: 'What is the skill question?',
        a: 'Each campaign has one multiple-choice question about the property or Nigerian real estate. It must be answered correctly to complete your purchase. The question is designed to be fair and answerable by any adult.',
      },
      {
        q: 'Can I get a receipt?',
        a: 'Yes. Every purchase generates a unique FCCPA §118-compliant receipt with your ticket number (e.g. RP-2025-001-04821), campaign details, amount paid, and timestamp. It is emailed and WhatsApp\'d immediately and available in your account dashboard.',
      },
    ],
  },
  {
    id: 'draw',
    heading: 'The Draw',
    icon: 'fa-video',
    items: [
      {
        q: 'How is the winner selected?',
        a: 'Winners are selected using a cryptographically verifiable random number generator (random.org signed seed). The seed is published before the draw so any participant can independently verify the result. We do not use internal RNGs.',
      },
      {
        q: 'Who witnesses the draw?',
        a: 'Every draw is conducted in the presence of an independent property lawyer, a notary public, and a representative from the escrow bank. Their names and credentials are published on the campaign page.',
      },
      {
        q: 'Where can I watch the draw?',
        a: 'All draws are live-streamed on the official RaffleProp YouTube channel. Archived recordings are linked from each campaign page permanently.',
      },
      {
        q: 'What happens if the minimum is not reached?',
        a: 'If the minimum ticket threshold is not reached by the draw date, the campaign is cancelled and all participants receive a 100% refund automatically within 3–5 business days. No request is needed.',
      },
    ],
  },
  {
    id: 'winning',
    heading: 'Winning & Title Transfer',
    icon: 'fa-house-chimney-user',
    items: [
      {
        q: 'What happens when I win?',
        a: 'You will be contacted by our property lawyer within 3 days of the draw. Identity verification (BVN + NIN) is completed to match the ticket purchaser. A Deed of Assignment is then prepared.',
      },
      {
        q: 'Are there any hidden fees for the winner?',
        a: 'No. All legal fees for the Deed of Assignment and title transfer are covered by RaffleProp. The property is transferred to the winner free of any additional charges.',
      },
      {
        q: 'How long does title transfer take?',
        a: "From draw to completed title transfer typically takes 30–60 days depending on the state land registry's processing time. Our property lawyer manages the process and provides regular updates.",
      },
      {
        q: 'Can someone else claim the prize on my behalf?',
        a: 'No. The ticket is tied to the identity of the purchaser (verified via BVN/NIN at registration). The winner must personally complete identity verification before title transfer.',
      },
    ],
  },
  {
    id: 'refunds',
    heading: 'Refunds & Security',
    icon: 'fa-shield-halved',
    items: [
      {
        q: 'When do I get a refund?',
        a: 'Refunds are automatic if: (1) the minimum ticket threshold is not reached, or (2) the campaign is cancelled by RaffleProp for any reason. Refunds are processed within 3–5 business days to the original payment method.',
      },
      {
        q: 'Where is my money held?',
        a: "All ticket sale proceeds are held in a dedicated escrow account at a reputable Nigerian bank, ring-fenced from RaffleProp's operating funds. The specific bank and account number are published on each campaign page.",
      },
      {
        q: 'Is my personal data safe?',
        a: 'Yes. RaffleProp is fully NDPR 2019 compliant. Your BVN/NIN are encrypted at rest using AES-256-GCM. We never share your data with third parties except the escrow bank for identity verification purposes. See our Privacy Policy and NDPR rights page.',
      },
      {
        q: 'Can I request deletion of my data?',
        a: <>Yes. Under the NDPR, you have the right to access, correct, or request deletion of your personal data. Visit your account&apos;s NDPR / Data Rights page or email <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a>. Note: ticket records are retained for regulatory compliance under FCCPA §118 even after account deletion.</>,
      },
    ],
  },
  {
    id: 'account',
    heading: 'Account & Registration',
    icon: 'fa-user-check',
    items: [
      {
        q: 'Do I need an account to buy tickets?',
        a: 'Yes. You need to register with your full name, email address, phone number, and accept our NDPR privacy consent. BVN and NIN are required only at the winner verification stage — not at the point of purchase.',
      },
      {
        q: 'Can Nigerians living abroad (diaspora) participate?',
        a: 'Yes. Any Nigerian citizen, including those living abroad, can register and buy tickets. You will need a valid Nigerian phone number for OTP verification and a valid BVN/NIN for winner identity verification.',
      },
      {
        q: 'What is my BVN/NIN used for?',
        a: 'Your BVN and NIN are used exclusively for winner identity verification — to confirm the winning ticket belongs to the person who purchased it. They are encrypted at rest using AES-256-GCM and are never used for any other purpose or shared beyond the escrow bank for verification.',
      },
      {
        q: 'Can I hold multiple accounts?',
        a: 'No. Each individual may only hold one RaffleProp account. Multiple accounts for the same person are prohibited and will result in disqualification and permanent suspension of all associated accounts.',
      },
    ],
  },
  {
    id: 'referral',
    heading: 'Referral Programme',
    icon: 'fa-people-arrows',
    items: [
      {
        q: 'Does RaffleProp have a referral programme?',
        a: 'Yes. Every registered user receives a unique referral code. When someone you refer purchases tickets, you earn referral credit that is added to your account balance.',
      },
      {
        q: 'How much do I earn per referral?',
        a: 'Referral earnings are calculated as a percentage of each ticket purchase made by someone you referred. The current rate is shown in your account dashboard and may vary by campaign.',
      },
      {
        q: 'How do I use my referral earnings?',
        a: 'Your referral balance accumulates in your account and can be applied as a discount toward your next ticket purchase. Referral credit cannot be withdrawn as cash — it is redeemable against future purchases only.',
      },
      {
        q: 'When are referral earnings credited?',
        a: "Referral earnings are credited to your account immediately after the referred purchase is confirmed (payment successful). They are visible in your dashboard under 'Referral Earnings'.",
      },
    ],
  },
];

// Category icon map — kept in code, not CMS
const CATEGORY_ICONS: Record<string, string> = {
  'Legality & Regulation': 'fa-scale-balanced',
  'Tickets & Payment': 'fa-ticket',
  'The Draw': 'fa-video',
  'Winning & Title Transfer': 'fa-house-chimney-user',
  'Refunds & Security': 'fa-shield-halved',
  'Account & Registration': 'fa-user-check',
  'Referral Programme': 'fa-people-arrows',
};

export default async function FaqPage() {
  const [cmsFaqs, settings] = await Promise.all([
    cms.getFaqs(),
    cms.getSettings(),
  ]);

  const supportEmail = settings?.supportEmail ?? 'hello@raffleprop.com';
  const whatsapp = settings?.whatsappNumber ?? '2348127298167';
  const whatsappUrl = whatsapp.startsWith('http') ? whatsapp : `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`;

  // Build section structure: prefer CMS FAQs (grouped by category), else fallback
  const faqSections = cmsFaqs.length > 0
    ? Object.entries(
        cmsFaqs.reduce<Record<string, { q: string; a: string }[]>>((acc, faq) => {
          const cat = faq.category || 'General';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push({ q: faq.question, a: faq.answer });
          return acc;
        }, {}),
      ).map(([heading, items]) => ({
        id: heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        heading,
        icon: CATEGORY_ICONS[heading] ?? 'fa-circle-question',
        items,
      }))
    : FALLBACK_faqSections;

  return (
    <main id="main-content">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-regular fa-circle-question" /> FAQ
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 560, lineHeight: 1.6 }}>
            Everything you need to know about RaffleProp. Can&apos;t find your answer?{' '}
            <a href={`mailto:${supportEmail}`} style={{ color: '#F0C040', textDecoration: 'underline' }}>Email us</a>.
          </p>
          {/* Quick-jump section links */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {faqSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontSize: '0.8125rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 100, padding: '0.3rem 0.875rem',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                {s.heading}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ sections */}
      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {faqSections.map((section) => (
              <div key={section.heading} id={section.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--green-50)', border: '1px solid var(--green-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem',
                  }}>
                    <i className={`fa-solid ${section.icon}`} style={{ color: 'var(--green-primary)' }} />
                  </div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>{section.heading}</h2>
                </div>
                <FaqAccordion items={section.items} />
              </div>
            ))}
          </div>

          {/* Still have questions */}
          <div style={{
            marginTop: '3rem', padding: '1.75rem',
            background: 'var(--green-50)', border: '1px solid var(--green-100)',
            borderRadius: 'var(--radius-lg)', textAlign: 'center',
          }}>
            <p style={{ fontWeight: 700, marginBottom: '0.375rem' }}>Still have questions?</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Our team responds within 24 hours on business days.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`mailto:${supportEmail}`} className="btn btn-primary btn-sm">
                <i className="fa-solid fa-envelope" style={{ marginRight: '0.375rem' }} />
                {supportEmail}
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                <i className="fa-brands fa-whatsapp" style={{ marginRight: '0.375rem' }} />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
