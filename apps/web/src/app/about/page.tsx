import type { Metadata } from 'next';
import Link from 'next/link';
import { cms } from '@/lib/cms';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'About Us — RaffleProp',
  description: 'Learn about RaffleProp — Nigeria\'s first FCCPC-regulated property raffle platform. Our mission, values, team, and commitment to full regulatory compliance.',
};

const FALLBACK_VALUES = [
  {
    icon: 'fa-eye',
    title: 'Radical Transparency',
    body: 'Every draw is live-streamed. Every document is published. Every escrow account is named. We have nothing to hide because we built this right from day one.',
  },
  {
    icon: 'fa-scale-balanced',
    title: 'Full Compliance',
    body: 'FCCPC-approved, CAC-registered, SCUML-compliant, NDPR-compliant, LSLGA-licensed for Lagos properties. We don\'t cut corners on regulation.',
  },
  {
    icon: 'fa-handshake',
    title: 'Winner Guaranteed',
    body: 'Once the minimum threshold is hit, a draw always happens and a winner always receives their property. No ifs, no loopholes.',
  },
  {
    icon: 'fa-users',
    title: 'Built for Nigerians',
    body: 'We built RaffleProp to make premium Nigerian property accessible to everyone — not just those who already have millions in the bank.',
  },
];

const FALLBACK_TEAM = [
  {
    initials: 'OA',
    color: '#0D5E30',
    name: 'Oluwafemi Adeyemi',
    role: 'Founder & CEO',
    bio: 'Former real estate developer with 12 years across the Lagos and Abuja property markets. Built RaffleProp to democratise access to Nigerian real estate through regulated, transparent competitions.',
  },
  {
    initials: 'EO',
    color: '#1e40af',
    name: 'Emeka Okafor',
    role: 'Co-founder & CTO',
    bio: 'Software engineer with fintech experience at leading Nigerian payment companies. Leads platform architecture, security infrastructure, and NDPR-compliant data handling.',
  },
  {
    initials: 'TI',
    color: '#a36200',
    name: 'Barr. Tunde Ikenna',
    role: 'Chief Legal & Compliance Officer',
    bio: 'NBA-registered property lawyer with 15 years of real estate law practice in Lagos and Abuja. Oversees every FCCPC filing, draw oversight, winner verification, and regulatory reporting.',
  },
  {
    initials: 'AN',
    color: '#6d28d9',
    name: 'Amaka Nwosu',
    role: 'Head of Property & Acquisitions',
    bio: 'Certified estate surveyor (NIESV) specialising in property valuation, due diligence, and acquisition across Lagos, Abuja, and Port Harcourt. Ensures every campaign property meets strict quality standards.',
  },
];

const FALLBACK_MILESTONES = [
  {
    date: 'Apr 2026',
    heading: 'Company Founded',
    body: 'RaffleProp Ltd incorporated with the Corporate Affairs Commission (RC 9484205) on 13 April 2026 under CAMA 2020. SCUML registration completed, AML/CFT framework put in place.',
  },
  {
    date: 'Q2 2026',
    heading: 'Regulatory Framework Established',
    body: 'FCCPC application submitted for first campaign approval. Legal & compliance framework finalised — including draw procedures, escrow arrangements, and NDPR data-handling policies.',
  },
  {
    date: 'Q3 2026',
    heading: 'Platform Launch',
    body: 'Full platform goes live. Escrow-protected ticket purchases, real-time draw counters, FCCPA §118 digital receipts, and live-streamed draws on YouTube.',
  },
  {
    date: 'Coming Soon',
    heading: 'First Draw',
    body: 'Our first live draw — witnessed by an independent property lawyer and escrow bank representative — will be streamed on YouTube. The first RaffleProp winner will receive a full title-deed property.',
  },
];

export default async function AboutPage() {
  const [settings, cmsTeam, cmsMilestones] = await Promise.all([
    cms.getSettings(),
    cms.getTeam(),
    cms.getMilestones(),
  ]);

  const R2 = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

  // Resolve CMS data with fallbacks
  const values = settings?.aboutValues && settings.aboutValues.length > 0
    ? settings.aboutValues
    : FALLBACK_VALUES;
  const team = cmsTeam.length > 0 ? cmsTeam : FALLBACK_TEAM;
  const milestones = cmsMilestones.length > 0 ? cmsMilestones : FALLBACK_MILESTONES;

  // Mission content from CMS
  const missionHeading = settings?.aboutMission?.heading ?? 'Making Property Ownership Accessible';
  const missionParagraphs: string[] = settings?.aboutMission?.paragraphs && settings.aboutMission.paragraphs.length > 0
    ? settings.aboutMission.paragraphs
    : [
        'Nigerian real estate has always been one of the best wealth-building assets available. But with prime properties in Lagos, Abuja, and Port Harcourt valued at tens of millions of naira, the vast majority of Nigerians — including professionals, diaspora members, and young entrepreneurs — will never be able to acquire them through traditional means.',
        'RaffleProp was built to change that. By creating a transparent, regulated promotional competition around real property, we give any Nigerian the chance to win a genuine title-deed property for as little as ₦2,500 — without any compromise on legality, transparency, or security.',
        'Every draw we run complies fully with the Federal Competition & Consumer Protection Act (FCCPA) 2018, is approved by the FCCPC, and is conducted in public with independent legal witnesses. We believe transparency is not a feature — it is the foundation.',
      ];

  // Company registration info from CMS
  const cacNumber   = settings?.companyInfo?.cacNumber   ?? 'RC 9484205';
  const fccpcRef    = settings?.companyInfo?.fccpcRef    ?? 'Per-campaign';
  const lslgaRef    = settings?.companyInfo?.lslgaRef    ?? 'Lagos properties';
  const scumlRef    = settings?.companyInfo?.scumlRef    ?? 'AML compliant';

  return (
    <main id="main-content">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Our Story</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            About RaffleProp
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 600, lineHeight: 1.6 }}>
            Nigeria&apos;s first FCCPC-regulated property raffle platform — making real estate ownership possible for every Nigerian.
          </p>
        </div>
      </div>

      {/* Mission */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--card-bg)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p className="section-label"><i className="fa-solid fa-bullseye" /> Mission</p>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, margin: '0.5rem 0 1.25rem', letterSpacing: '-0.02em' }}>
            {missionHeading}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {missionParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--bg)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p className="section-label"><i className="fa-solid fa-flag-checkered" /> Track Record</p>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, margin: '0.5rem 0 2rem', letterSpacing: '-0.02em' }}>
            Our Journey So Far
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {milestones.map((m, i) => {
              const date = 'date' in m ? (m as { date: string }).date : ('year' in m ? (m as { year: string }).year : '');
              const body = 'body' in m ? (m as { body: string }).body : ('description' in m ? (m as { description: string }).description : '');
              return (
                <div key={'id' in m ? (m as { id: string }).id : i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1.5rem', paddingBottom: i < milestones.length - 1 ? '2rem' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '0.125rem' }}>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: 800, color: 'var(--green-primary)',
                      background: 'var(--green-50)', border: '1px solid var(--green-100)',
                      borderRadius: 100, padding: '0.2em 0.75em', whiteSpace: 'nowrap',
                    }}>
                      {date}
                    </span>
                    {i < milestones.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border-light)', marginTop: 8, marginRight: '0.5rem', minHeight: 24 }} />
                    )}
                  </div>
                  <div style={{ paddingLeft: '0.25rem', borderLeft: '2px solid var(--green-100)', paddingBottom: i < milestones.length - 1 ? '0.5rem' : 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{m.heading}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p className="section-label" style={{ justifyContent: 'center' }}>Our Values</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, marginTop: '0.5rem', letterSpacing: '-0.02em' }}>What We Stand For</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {(values as Array<{ icon?: string; title?: string; body?: string }>).map((v, i) => (
              <div key={v.title ?? i} style={{
                background: 'var(--bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)', padding: '1.5rem',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.125rem', marginBottom: '1rem',
                }}>
                  <i className={`fa-solid ${v.icon}`} style={{ color: 'var(--green-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{v.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--bg)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p className="section-label" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-people-group" /> The Team
            </p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
              The People Behind RaffleProp
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0.75rem auto 0', fontSize: '0.9375rem', lineHeight: 1.7 }}>
              A team of Nigerian real estate, legal, and technology professionals united by a single goal: making property ownership accessible to every Nigerian.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {(team as Array<{ id?: string; name: string; title?: string; role?: string; bio: string; photoKey?: string | null; initials?: string | null; avatarColor?: string | null; linkedinUrl?: string | null; color?: string }>).map((member) => {
              const photoSrc = member.photoKey ? `${R2}/${member.photoKey}` : null;
              const initials = member.initials ?? member.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
              const color = member.avatarColor ?? member.color ?? 'var(--green-primary)';
              const roleLabel = member.title ?? member.role ?? '';
              const linkedin = member.linkedinUrl ?? ('linkedin' in member ? (member as { linkedin?: string }).linkedin : null);
              return (
                <div key={member.id ?? member.name} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)', padding: '1.75rem',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Avatar */}
                  {photoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photoSrc} alt={member.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }} />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', fontWeight: 800, color: '#fff',
                      letterSpacing: '0.02em', marginBottom: '1rem', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                  )}
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.2rem' }}>{member.name}</h3>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', marginBottom: '0.75rem' }}>{roleLabel}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{member.bio}</p>
                    {linkedin && linkedin !== '#' && (
                      <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--green-primary)', marginTop: '0.75rem', textDecoration: 'none' }}>
                        <i className="fa-brands fa-linkedin" /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Registrations */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--card-bg)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p className="section-label"><i className="fa-solid fa-building-columns" /> Registrations</p>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, margin: '0.5rem 0 1.5rem', letterSpacing: '-0.02em' }}>
            Fully Registered &amp; Compliant
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'CAC Registration', value: cacNumber },
              { label: 'FCCPC Approved', value: fccpcRef },
              { label: 'LSLGA Licensed', value: lslgaRef },
              { label: 'SCUML Registered', value: scumlRef },
              { label: 'NDPR Compliant', value: 'Data protected' },
              { label: 'Escrow Bank', value: 'Published per campaign' },
            ].map((r) => (
              <div key={r.label} style={{
                padding: '1rem 1.25rem',
                background: 'var(--green-50)', border: '1px solid var(--green-100)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--green-primary)', marginTop: '0.25rem' }}>{r.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/trust-legal" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.375rem' }} />
              View Full Trust &amp; Legal Centre
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-banner-section">
        <div className="container">
          <h2 className="cta-banner-title">Ready to Enter?</h2>
          <p className="cta-banner-body">Browse live campaigns and buy tickets in under 5 minutes.</p>
          <div className="cta-banner-btns">
            <Link href="/campaigns" className="btn btn-gold btn-lg">
              <i className="fa-solid fa-ticket" /> Browse Campaigns
            </Link>
            <Link href="/how-it-works" className="btn btn-outline-white btn-lg">
              How It Works
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
