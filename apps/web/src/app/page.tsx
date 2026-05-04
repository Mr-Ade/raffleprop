import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { cms, type CmsStats } from '@/lib/cms';
import { CampaignCard } from '@/components/CampaignCard';
import { StatCounter } from '@/components/StatCounter';
import { FaqAccordion } from '@/components/FaqAccordion';
import { CountdownTimer } from '@/components/CountdownTimer';
import { TestimonialSubmitForm } from '@/components/TestimonialSubmitForm';
import type { Campaign } from '@raffleprop/shared';

function prizeMillion(naira: number): { amount: number; suffix: string } {
  if (naira <= 0) return { amount: 0, suffix: '' };
  const m = Math.floor(naira / 1_000_000);
  return m > 0 ? { amount: m, suffix: 'M+' } : { amount: Math.floor(naira / 1_000), suffix: 'K+' };
}

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await cms.getSettings(60).catch(() => null);
  const homeSeo = settings?.homeSeo;
  return {
    title: homeSeo?.title ?? 'RaffleProp — Win a Property in Nigeria From ₦2,500',
    description:
      homeSeo?.description ??
      "Nigeria's most transparent property raffle platform. Win a real house from ₦2,500. CAC registered, escrow protected, lawyer verified. Live draws on YouTube.",
  };
}

/* ── Static Fallbacks ────────────────────────────── */

const FALLBACK_TRUST_BADGES = [
  { iconClass: 'fa-building-columns', text: 'CAC Registered · RC 9484205' },
  { iconClass: 'fa-shield-halved', text: 'Escrow Protected' },
  { iconClass: 'fa-video', text: 'Live Draw on YouTube' },
  { iconClass: 'fa-scale-balanced', text: 'Lawyer Verified' },
  { iconClass: 'fa-trophy', text: 'Winner Guaranteed' },
  { iconClass: 'fa-rotate-left', text: 'Full Refund if Min Not Met' },
  { iconClass: 'fa-magnifying-glass-dollar', text: 'SCUML Registered · AML Compliant' },
];

const FALLBACK_HOW_IT_WORKS = [
  { id: '1', stepNumber: 1, title: 'Browse Properties', description: 'View our active campaigns, property details, independent valuations, and legal documents.', order: 0, icon: null },
  { id: '2', stepNumber: 2, title: 'Buy Tickets', description: 'Select a bundle (1–20 tickets), answer a simple skill question, and pay securely via Paystack or Flutterwave.', order: 1, icon: null },
  { id: '3', stepNumber: 3, title: 'Watch the Live Draw', description: 'Draws are live-streamed on YouTube with an independent lawyer, notary, and bank escrow representative present.', order: 2, icon: null },
  { id: '4', stepNumber: 4, title: 'Win Your Home', description: 'Winner is verified, Deed of Assignment is prepared by our property lawyer, and title is legally transferred. Zero hidden fees.', order: 3, icon: null },
];

const FALLBACK_FAQS: { q: string; a: string }[] = [
  {
    q: 'Is this legal in Nigeria?',
    a: 'Yes. RaffleProp is structured as a “Promotional Competition” under Nigerian law — not a lottery — meaning we do not require a federal lottery licence. Our business is registered with the Corporate Affairs Commission (CAC). All operations are overseen by an independent property lawyer and escrow is held at a reputable Nigerian bank.',
  },
  {
    q: 'Which regulators have approved this?',
    a: 'All RaffleProp campaigns are reviewed and approved by the Federal Competition & Consumer Protection Commission (FCCPC) under the Federal Competition & Consumer Protection Act 2018 (FCCPA). For Lagos-based properties, we also hold a licence from the Lagos State Lotteries & Gaming Authority (LSLGA). Approval certificates are publicly available on our Trust & Legal Centre.',
  },
  {
    q: 'Where is my money held?',
    a: "All ticket sale proceeds are held in a dedicated, ring-fenced escrow account at a reputable Nigerian bank — separate from RaffleProp's operating funds. The specific escrow bank and account number are published on the Trust & Legal Centre for each campaign. Funds are released to RaffleProp only after the draw is completed and the FCCPC winner list is verified. If the minimum threshold is not reached, all funds are automatically returned.",
  },
  {
    q: 'How do I pay for tickets?',
    a: "We accept Paystack (card/bank transfer/USSD), Flutterwave, and direct bank transfer. All payments are processed through PCI-DSS compliant gateways. We never store your card details.",
  },
];

export default async function HomePage() {
  // Fetch featured campaigns first (pinned), then fill remaining slots by hotScore
  // Also fetch upcoming campaigns for the Coming Soon section, plus CMS content
  const [featuredResp, hotResp, upcomingResp, settings, cmsWinners, cmsTestimonials, cmsBadges, cmsHowItWorks, cmsFaqs, platformStats] = await Promise.all([
    api.getCampaigns({ pageSize: '6', status: 'LIVE', sortBy: 'hotScore', sortDir: 'desc' })
       .catch(() => ({ data: [] as Campaign[], total: 0 })),
    api.getCampaigns({ pageSize: '6', status: 'LIVE', sortBy: 'publishedAt', sortDir: 'desc' })
       .catch(() => ({ data: [] as Campaign[], total: 0 })),
    api.getCampaigns({ pageSize: '3', status: 'UPCOMING', sortBy: 'drawDate', sortDir: 'asc' })
       .catch(() => ({ data: [] as Campaign[], total: 0 })),
    cms.getSettings(60),
    cms.getWinners(),
    cms.getTestimonials(),
    cms.getTrustBadges(),
    cms.getHowItWorks(),
    cms.getFaqs(),
    cms.getStats(),
  ]);

  const stats: CmsStats = platformStats ?? {
    ticketsSoldToday: 0,
    activeCampaigns: 0,
    propertiesWon: 0,
    totalTicketsSold: 0,
    totalPrizeValue: 0,
    prizesAwarded: 0,
  };

  // Resolve CMS data — no fake fallbacks for Winners/Testimonials
  const trustBadges = cmsBadges.length > 0 ? cmsBadges : FALLBACK_TRUST_BADGES;
  const winners = cmsWinners;
  const testimonials = cmsTestimonials;
  const howItWorks = cmsHowItWorks.length > 0 ? cmsHowItWorks : FALLBACK_HOW_IT_WORKS;
  // For FAQs teaser — take first 4 from CMS, else fallback
  const faqTeaser = cmsFaqs.length > 0
    ? cmsFaqs.slice(0, 4).map((f) => ({ q: f.question, a: f.answer }))
    : FALLBACK_FAQS;

  // Hero text from CMS (fall back to hardcoded)
  const heroHeading = settings?.heroSection?.heading ?? 'Win a Property.';
  const heroPriceLine = settings?.heroSection?.subheading ?? null;
  const heroBadgeText = settings?.heroSection?.badgeText ?? null;

  // Stats section from CMS
  const statsSection = settings?.statsSection ?? null;

  // CTA banner from CMS
  const ctaBanner = settings?.ctaBanner ?? null;

  const upcomingCampaigns: Campaign[] = (upcomingResp as { data: Campaign[] }).data ?? [];
  const upcomingTotal: number = (upcomingResp as { total: number }).total ?? 0;
  const UPCOMING_LIMIT = 3;

  // Merge: featured/hot first, deduplicate, cap at 6
  const featuredData: Campaign[] = (featuredResp as { data: Campaign[] }).data ?? [];
  const hotData: Campaign[] = (hotResp as { data: Campaign[] }).data ?? [];
  const seen = new Set<string>();
  const campaigns: Campaign[] = [];
  for (const c of [...featuredData, ...hotData]) {
    if (!seen.has(c.id) && campaigns.length < 6) {
      seen.add(c.id);
      campaigns.push(c);
    }
  }

  const liveCount = (featuredResp as { total: number }).total ?? campaigns.length;
  const featuredCampaign: Campaign | null = campaigns[0] ?? null;

  // Compute real days-to-close from drawDate for each campaign
  function daysUntil(dateStr?: string): number | undefined {
    if (!dateStr) return undefined;
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : undefined;
  }

  // Hero floating card data
  const heroSold = featuredCampaign?.ticketsSold ?? 0;
  const heroTotal = featuredCampaign?.totalTickets ?? 0;
  const heroPct = heroTotal > 0 ? Math.round((heroSold / heroTotal) * 100) : 0;

  return (
    <main id="main-content">

      {/* ── FAQPage structured data ── */}
      {faqTeaser.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqTeaser.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }),
          }}
        />
      )}

      {/* ── HERO ── */}
      <section className="hero-section" style={{ paddingTop: 65 }}>
        <div className="hero-bg">
          <Image
            src="/images/hero-bg.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="hero-overlay" />
        <div className="hero-pattern" />

        <div className="container hero-inner">
          <div style={{ maxWidth: 700 }}>
            {/* Badge */}
            <div className="hero-badge">
              <span className="hero-live-dot" />
              {heroBadgeText
                ? heroBadgeText
                : liveCount > 0
                  ? `Live Campaign Active · ${liveCount} ${liveCount === 1 ? 'Property' : 'Properties'} Available`
                  : 'Coming Soon — Sign Up for Launch'}
            </div>

            {/* H1 */}
            <h1 style={{
              fontSize: 'clamp(2.25rem,5vw,4rem)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}>
              {heroHeading}<br />
              <span className="text-gradient-gold">{heroPriceLine ?? 'From ₦2,500.'}</span>
            </h1>

            <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.8)', maxWidth: 540, lineHeight: 1.7, marginBottom: '2rem' }}>
              Nigeria&apos;s most transparent property raffle platform. CAC registered, escrow protected,
              independently valued. Live draws you can watch and verify.
            </p>

            {/* Live stats row — real-time from DB, always shown */}
            {settings?.heroStats && settings.heroStats.length >= 3 ? (
              <div className="hero-stats-row">
                {settings.heroStats.slice(0, 3).map((stat, i) => {
                  const num = parseFloat(String(stat.value).replace(/[^0-9.]/g, ''));
                  return (
                    <div key={i} style={{ display: 'contents' }}>
                      {i > 0 && <div className="hero-stats-divider" />}
                      <div>
                        <div style={{ fontSize: '1.875rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                          {!isNaN(num) ? <StatCounter to={num} /> : stat.value}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (() => {
              const pa = prizeMillion(stats.prizesAwarded);
              return (
                <div className="hero-stats-row">
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      <StatCounter to={stats.ticketsSoldToday} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>Tickets sold today</div>
                  </div>
                  <div className="hero-stats-divider" />
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      <StatCounter to={stats.activeCampaigns} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>Active campaigns</div>
                  </div>
                  <div className="hero-stats-divider" />
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      ₦<StatCounter to={pa.amount} suffix={pa.suffix} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>In prizes awarded</div>
                  </div>
                </div>
              );
            })()}

            {/* CTAs */}
            <div className="hero-cta-row">
              <Link href="/campaigns" className="btn btn-gold btn-lg">
                <i className="fa-solid fa-ticket" /> View Active Campaigns
              </Link>
              <Link href="/how-it-works" className="btn btn-outline-white btn-lg">
                How It Works <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>
          </div>

          {/* Floating campaign card — desktop only (≥1100px via CSS) */}
          <div
            className="floating hero-float-card"
            style={{
              position: 'absolute',
              right: '5%',
              top: '50%',
            }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.97)',
              borderRadius: 16,
              padding: '1.25rem',
              width: 260,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="live-indicator">
                  <span className="live-dot" />
                  LIVE
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {featuredCampaign ? `${featuredCampaign.propertyState}` : 'Lekki Phase 1'}
                </span>
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                {featuredCampaign ? featuredCampaign.title : '4-Bed Detached Duplex'}
              </div>
              <div className="progress-wrap">
                <div className="progress-fill" style={{ width: `${heroPct}%` }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.375rem', display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>{heroSold.toLocaleString('en-NG')}</strong> / {heroTotal.toLocaleString('en-NG')}</span>
                <span>{heroPct}% sold</span>
              </div>
              <Link
                href={featuredCampaign ? `/campaigns/${featuredCampaign.slug}` : '/campaigns'}
                className="btn btn-primary btn-full"
                style={{ marginTop: '1rem' }}
              >
                Enter Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="trust-bar">
        <div className="container">
          <div className="trust-scroll-wrap">
            <div className="trust-scroll trust-scroll-centered">
              {trustBadges.map((b, i) => (
                <span key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                  <span className="trust-badge">
                    <i className={`fa-solid ${b.iconClass}`} /> {b.text}
                  </span>
                  {i < trustBadges.length - 1 && <span className="trust-badge-divider" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE CAMPAIGNS ── */}
      <section className="section-pad">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="section-label">
                <i className="fa-solid fa-fire" /> Live Now
              </div>
              <h2 className="section-h2" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Active Campaigns</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Buy tickets now — draws are live-streamed and independently verified.
              </p>
            </div>
            <Link href="/campaigns" className="btn btn-outline">
              See All Campaigns <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <i className="fa-solid fa-house-flag" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem' }}>No active campaigns right now. Check back soon.</p>
            </div>
          ) : (
            <div className="campaign-grid">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── STATS — always shown, real-time from DB (falls back to 0) ── */}
      <section className="stats-section">
        <div className="container">
          {statsSection && statsSection.length >= 4 ? (
            // Admin CMS override (e.g. for special campaigns / marketing)
            <div className="stats-grid">
              {statsSection.slice(0, 4).map((stat, i) => {
                const num = parseFloat(String(stat.value).replace(/[^0-9.]/g, ''));
                return (
                  <div key={i}>
                    <div className="stat-number" style={{ color: i === 2 ? 'var(--gold-light)' : '#fff' }}>
                      {!isNaN(num) ? <StatCounter to={num} /> : stat.value}
                    </div>
                    <div className="stat-num-label" style={{ color: 'rgba(255,255,255,0.6)' }}>{stat.label}</div>
                  </div>
                );
              })}
            </div>
          ) : (() => {
            const tpv = prizeMillion(stats.totalPrizeValue);
            const ticketSuffix = stats.totalTicketsSold > 0 ? '+' : '';
            return (
              <div className="stats-grid">
                <div>
                  <div className="stat-number" style={{ color: '#fff' }}>
                    <StatCounter to={stats.propertiesWon} />
                  </div>
                  <div className="stat-num-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Properties Won</div>
                </div>
                <div>
                  <div className="stat-number" style={{ color: '#fff' }}>
                    ₦<StatCounter to={tpv.amount} suffix={tpv.suffix} />
                  </div>
                  <div className="stat-num-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Prize Value</div>
                </div>
                <div>
                  <div className="stat-number" style={{ color: 'var(--gold-light)' }}>
                    <StatCounter to={stats.totalTicketsSold} suffix={ticketSuffix} />
                  </div>
                  <div className="stat-num-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Tickets Sold</div>
                </div>
                <div>
                  <div className="stat-number" style={{ color: '#fff' }}>
                    <StatCounter to={100} suffix="%" />
                  </div>
                  <div className="stat-num-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Refund Rate When Min Missed</div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section-pad" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-list-check" /> Simple Process
            </div>
            <h2 className="section-h2" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>How RaffleProp Works</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0.75rem auto 0' }}>
              Four simple steps to potentially winning your dream home.
            </p>
          </div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '2rem' }}>
            {howItWorks.map((step, i) => (
              <div key={step.id} className="how-step">
                <div className="step-number">{step.stepNumber}</div>
                {i < howItWorks.length - 1 && <div className="step-connector" />}
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.description}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/how-it-works" className="btn btn-outline">
              Full Process Explained <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── UPCOMING CAMPAIGNS ── */}
      {upcomingCampaigns.length > 0 && (
        <section className="section-pad-sm upcoming-section">
          <div className="container">
            {upcomingCampaigns.map((uc) => {
              const bedrooms = typeof uc.bedrooms === 'number' ? `${uc.bedrooms}-Bedroom ` : '';
              const propType = uc.propertyType.charAt(0) + uc.propertyType.slice(1).toLowerCase().replace('_', ' ');
              const worthFmt = '₦' + Number(uc.marketValue).toLocaleString('en-NG', { maximumFractionDigits: 0 });
              const daysLeft = uc.drawDate ? Math.max(0, Math.ceil((new Date(uc.drawDate).getTime() - Date.now()) / 86400000)) : null;
              return (
                <div key={uc.id} className="upcoming-campaign-inner">
                  <div>
                    <div className="section-label">
                      <i className="fa-regular fa-clock" /> Coming Soon
                    </div>
                    <h2 className="section-h2 upcoming-title">{uc.title}</h2>
                    <p className="upcoming-subtitle">
                      {bedrooms}{propType} · Worth <strong>{worthFmt}</strong>
                      {daysLeft !== null && ` · Launching in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                    </p>
                    <p className="upcoming-location">
                      {uc.propertyLga}, {uc.propertyState} State
                    </p>
                    {uc.drawDate && (
                      <div className="upcoming-countdown-wrap">
                        <CountdownTimer endDate={uc.drawDate} />
                      </div>
                    )}
                  </div>
                  <div className="upcoming-campaign-actions">
                    {uc.featuredImageKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? ''}/${uc.featuredImageKey}`}
                        alt={uc.title}
                        className="upcoming-img"
                        loading="lazy"
                        width={480}
                        height={320}
                      />
                    ) : (
                      <div className="upcoming-img upcoming-img-placeholder">
                        <i className="fa-solid fa-house" />
                      </div>
                    )}
                    <Link href={`/campaigns/${uc.slug}`} className="btn btn-gold btn-lg">
                      <i className="fa-regular fa-bell" /> Notify Me When Live
                    </Link>
                  </div>
                </div>
              );
            })}
            {upcomingTotal > UPCOMING_LIMIT && (
              <div className="upcoming-see-all">
                <Link href="/campaigns?status=UPCOMING" className="btn btn-outline">
                  See all {upcomingTotal} upcoming campaigns
                  <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PAST WINNERS — section only renders when real CMS winners exist ── */}
      <section className="section-pad" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-trophy" /> Real Winners
            </div>
            <h2 className="section-h2" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Past Winners</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0.75rem auto 0' }}>
              Every draw is live-streamed, independently witnessed, and publicly archived.
            </p>
          </div>

          {(() => {
            const displayWinners = winners.slice(0, 3);
            const placeholderCount = Math.max(0, 3 - displayWinners.length);
            return (
              <div className="winners-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.75rem' }}>
                {displayWinners.map((w) => {
                  const photoSrc = w.imageKey
                    ? `${process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? ''}/${w.imageKey}`
                    : null;
                  return (
                    <div key={w.id} className="winner-card">
                      <div className="winner-card-image">
                        {photoSrc
                          ? // eslint-disable-next-line @next/next/no-img-element
                            <img src={photoSrc} alt={w.winnerName} loading="lazy" width={400} height={300} />
                          : <div style={{ width: '100%', height: '100%', background: 'var(--green-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                              <i className="fa-solid fa-trophy" style={{ color: 'rgba(255,255,255,0.3)' }} />
                            </div>
                        }
                        <span className="winner-badge">
                          <i className="fa-solid fa-trophy" /> Winner
                        </span>
                        <div className="winner-card-identity">
                          <div>
                            <div className="winner-card-name">{w.winnerName}</div>
                            {w.propertyState && (
                              <div className="winner-card-location">
                                <i className="fa-solid fa-location-dot" style={{ fontSize: '0.6875rem' }} />
                                {w.propertyState}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="winner-card-body">
                        {w.blurb && (
                          <p className="winner-card-quote">
                            &ldquo;{w.blurb.substring(0, 115)}{w.blurb.length > 115 ? '...' : ''}&rdquo;
                          </p>
                        )}
                        <div className="winner-card-meta">
                          <div>
                            <div className="winner-card-prize">Prize value</div>
                            <div className="winner-card-prize-value">{w.prize}</div>
                          </div>
                          <div>
                            <div className="winner-card-property">{w.propertyTitle}</div>
                            {w.drawDate && (
                              <div className="winner-card-date">
                                <i className="fa-regular fa-calendar" style={{ marginRight: '0.25rem' }} />
                                {new Date(w.drawDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: placeholderCount }).map((_, i) => (
                  <div key={`placeholder-${i}`} style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1.5px dashed var(--border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      height: 220,
                      background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--border-light) 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                    }}>
                      <i className="fa-solid fa-hourglass-half" style={{ fontSize: '2.25rem', color: 'var(--border)', opacity: 0.7 }} />
                    </div>
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                        Next Winner — Draw Coming Soon
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                        Our next property draw is underway. The winner will be featured here once the draw is completed and verified.
                      </p>
                      <Link href="/campaigns" style={{ marginTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', textDecoration: 'none' }}>
                        Browse active campaigns →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/winners" className="btn btn-outline">
              View All Winners &amp; Draw Archives <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section-pad" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <i className="fa-regular fa-star" /> Reviews
            </div>
            <h2 className="section-h2" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>What Participants Say</h2>
          </div>

          {testimonials.length > 0 ? (
            <div className="testimonial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
              {testimonials.map((t) => {
                const avatarSrc = t.avatarKey
                  ? `${process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? ''}/${t.avatarKey}`
                  : null;
                const initials = t.authorName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={t.id} className="testimonial-card">
                    <div className="testimonial-stars">{'★'.repeat(Math.min(t.rating, 5))}</div>
                    <p style={{ marginTop: '0.875rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      &ldquo;{t.body}&rdquo;
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                      {avatarSrc
                        ? // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarSrc} alt={t.authorName} className="testimonial-avatar" loading="lazy" width={40} height={40} />
                        : <div className="testimonial-avatar" style={{ background: 'var(--green-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>
                            {initials}
                          </div>
                      }
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.authorName}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t.authorTitle}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="testimonial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  background: 'var(--card-bg)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1.5px dashed var(--border)',
                  padding: '2rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '0.625rem',
                }}>
                  <div style={{ fontSize: '1.75rem', color: 'var(--border)', opacity: 0.7 }}>
                    {'★★★★★'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                    First Review Coming Soon
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    Be among our first participants and share your experience. Every verified purchase is eligible.
                  </p>
                  <Link href="/campaigns" style={{ marginTop: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', textDecoration: 'none' }}>
                    Browse active campaigns →
                  </Link>
                </div>
              ))}
            </div>
          )}

          <TestimonialSubmitForm />
        </div>
      </section>

      {/* ── FAQ TEASER ── */}
      <section className="section-pad" style={{ background: '#fff' }}>
        <div className="container">
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}
            className="faq-section-grid"
          >
            <div>
              <div className="section-label">
                <i className="fa-regular fa-circle-question" /> FAQ
              </div>
              <h2 className="section-h2" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                Frequently Asked Questions
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                We believe in complete transparency. Here are the most common questions from our community.
              </p>
              <Link href="/faq" className="btn btn-primary">
                View All FAQs <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>
            <FaqAccordion items={faqTeaser} />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-banner-section">
        <div className="container">
          <h2 className="cta-banner-title">
            {ctaBanner?.heading ?? 'Ready to Win Your Dream Home?'}
          </h2>
          <p className="cta-banner-body">
            {ctaBanner?.subtext ?? 'Tickets from just ₦2,500. Full refund guaranteed if minimum not reached. Transparent, verified, legitimate.'}
          </p>
          <div className="cta-banner-btns">
            <Link href="/campaigns" className="btn btn-gold btn-lg">
              <i className="fa-solid fa-ticket" /> {ctaBanner?.primaryButtonLabel ?? 'Buy Tickets Now'}
            </Link>
            <Link href="/trust-legal" className="btn btn-outline-white btn-lg">
              <i className="fa-solid fa-shield-halved" /> {ctaBanner?.secondaryButtonLabel ?? 'Our Legal Guarantees'}
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
