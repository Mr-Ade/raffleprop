import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { api } from '@/lib/api';
import { cms } from '@/lib/cms';
import { CampaignCard } from '@/components/CampaignCard';
import { CampaignNotifyForm } from '@/components/CampaignNotifyForm';

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://raffleprop.com';

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL',  label: 'Commercial' },
  { value: 'LAND',        label: 'Land / Plot' },
  { value: 'MIXED_USE',   label: 'Mixed Use' },
];

const STATES = [
  'Abuja (FCT)', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
  'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi',
  'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
  'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
].sort();

const SORT_OPTIONS = [
  { value: 'publishedAt:desc', label: 'Newest First' },
  { value: 'publishedAt:asc', label: 'Oldest First' },
  { value: 'hotScore:desc', label: 'Hot / Trending' },
  { value: 'ticketPrice:asc', label: 'Price: Low to High' },
  { value: 'ticketPrice:desc', label: 'Price: High to Low' },
  { value: 'drawDate:asc', label: 'Draw Date: Soonest' },
  { value: 'drawDate:desc', label: 'Draw Date: Latest' },
  { value: 'closingSoon', label: 'Closing Soon' },
];

const EMPTY_RESPONSE = { data: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };

interface SearchParams {
  page?: string;
  state?: string;
  propertyType?: string;
  search?: string;
  sort?: string;
  tab?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const settings = await cms.getSettings(300).catch(() => null);
  const seo = settings?.campaignsSeo;
  const liveCount = await api.getCampaigns({ status: 'LIVE', pageSize: '1' })
    .then((r) => r.total)
    .catch(() => 0);

  const activeTab = sp.tab === 'upcoming' ? 'upcoming' : sp.tab === 'past' ? 'past' : 'live';
  const currentPage = parseInt(sp.page ?? '1', 10);

  const defaultTitle = liveCount > 0
    ? `Browse ${liveCount} Active Property Campaigns | Win Real Estate in Nigeria | RaffleProp`
    : 'Property Campaigns | Win Real Estate in Nigeria | RaffleProp';
  const defaultDesc = liveCount > 0
    ? `Browse ${liveCount} FCCPC-regulated property promotional competitions on RaffleProp. Tickets from ₦2,500. 100% refund if minimum not met. Live-streamed draws, independently verified.`
    : 'Browse FCCPC-regulated property promotional competitions on RaffleProp. Tickets from ₦2,500. 100% refund if minimum not met. Live-streamed draws, independently verified.';

  const title = seo?.title ?? defaultTitle;
  const description = seo?.description ?? defaultDesc;

  const canonicalUrl = `${SITE_URL}/campaigns`;
  const paginatedUrl = currentPage > 1 ? `${SITE_URL}/campaigns?page=${currentPage}` : canonicalUrl;
  const prevUrl = currentPage > 1 ? (currentPage === 2 ? canonicalUrl : `${SITE_URL}/campaigns?page=${currentPage - 1}`) : null;
  const nextUrl = null; // populated server-side only when we know totalPages; safe to omit

  return {
    title,
    description,
    alternates: {
      canonical: paginatedUrl,
      ...(prevUrl ? { prev: prevUrl } : {}),
      ...(nextUrl ? { next: nextUrl } : {}),
    },
    robots: { index: activeTab === 'live', follow: true },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title,
      description,
      siteName: 'RaffleProp',
      images: [{ url: `${SITE_URL}/og-campaigns.jpg`, width: 1200, height: 630, alt: 'RaffleProp — Win Real Estate in Nigeria' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-campaigns.jpg`],
    },
  };
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const activeTab = sp.tab === 'upcoming' ? 'upcoming' : sp.tab === 'past' ? 'past' : 'live';

  const sortRaw = sp.sort ?? 'publishedAt:desc';
  const isClosingSoon = sortRaw === 'closingSoon';
  const [sortBy, sortDir] = isClosingSoon ? ['drawDate', 'asc'] : sortRaw.split(':');

  const query: Record<string, string> = {};
  if (sp.page) query['page'] = sp.page;
  if (sp.state) query['state'] = sp.state;
  if (sp.propertyType) query['propertyType'] = sp.propertyType;
  if (sp.search) query['search'] = sp.search;
  query['status'] = activeTab === 'upcoming' ? 'UPCOMING' : activeTab === 'past' ? 'DRAWN' : 'LIVE';
  if (activeTab === 'past') {
    query['sortBy'] = 'drawDate';
    query['sortDir'] = 'desc';
  } else if (isClosingSoon) {
    query['closingSoon'] = 'true';
  } else {
    if (sortBy && ['publishedAt', 'ticketPrice', 'drawDate', 'hotScore'].includes(sortBy)) {
      query['sortBy'] = sortBy;
    }
    if (sortDir && ['asc', 'desc'].includes(sortDir)) {
      query['sortDir'] = sortDir;
    }
  }

  // Graceful error handling — never show raw error page
  const [response, settings] = await Promise.all([
    api.getCampaigns(query).catch(() => EMPTY_RESPONSE),
    cms.getSettings(300).catch(() => null),
  ]);

  const pageContent = settings?.campaignsPageContent;
  const currentPage = response.page ?? 1;
  const totalPages = response.totalPages ?? 1;
  const hasFilters = !!(sp.state || sp.propertyType || sp.search);

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params: Record<string, string> = {};
    if (sp.state) params['state'] = sp.state;
    if (sp.propertyType) params['propertyType'] = sp.propertyType;
    if (sp.search) params['search'] = sp.search;
    if (sp.sort && sp.sort !== 'publishedAt:desc') params['sort'] = sp.sort;
    if (activeTab !== 'live') params['tab'] = activeTab;
    if (activeTab === 'past') { delete params['sort']; }
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === '') delete params[k];
      else params[k] = v;
    });
    const qs = new URLSearchParams(params).toString();
    return qs ? `/campaigns?${qs}` : '/campaigns';
  }

  // JSON-LD: BreadcrumbList + ItemList
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Campaigns', item: `${SITE_URL}/campaigns` },
    ],
  };

  const itemListJsonLd = response.data.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Active Property Campaigns — RaffleProp',
    url: `${SITE_URL}/campaigns`,
    numberOfItems: response.total,
    itemListElement: response.data.map((c, i) => ({
      '@type': 'ListItem',
      position: (currentPage - 1) * 12 + i + 1,
      name: c.title,
      url: `${SITE_URL}/campaigns/${c.slug}`,
      item: {
        '@type': 'Product',
        name: c.title,
        description: `Win ${c.title} worth ₦${Number(c.marketValue).toLocaleString()} at ${c.propertyAddress}`,
        image: c.featuredImageKey ? `${process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? ''}/${c.featuredImageKey}` : undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'NGN',
          price: Number(c.ticketPrice).toFixed(2),
          availability: c.status === 'LIVE' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          url: `${SITE_URL}/campaigns/${c.slug}`,
          validThrough: c.drawDate ?? undefined,
        },
      },
    })),
  } : null;

  const headingText = pageContent?.heading ?? 'Property Campaigns';
  const subheadingText = pageContent?.subheading ?? null;
  const emptyHeading = pageContent?.emptyStateHeading ?? null;
  const emptyBody = pageContent?.emptyStateBody ?? null;

  return (
    <main id="main-content">
      <Script
        id="ld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <Script
          id="ld-itemlist"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      {/* Page header */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Browse</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            {headingText}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 560, lineHeight: 1.6 }}>
            {subheadingText ?? (
              activeTab === 'upcoming'
                ? `${response.total} propert${response.total !== 1 ? 'ies' : 'y'} launching soon. Register your interest now.`
                : activeTab === 'past'
                ? `${response.total} completed draw${response.total !== 1 ? 's' : ''}. Every winner is publicly verifiable.`
                : `${response.total} FCCPC-regulated propert${response.total !== 1 ? 'ies' : 'y'} available. All draws are live-streamed and independently verified.`
            )}
          </p>
        </div>
      </div>

      {/* Status tab bar */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }} role="tablist" aria-label="Campaign status">
            {([
              { label: 'Live Now', key: 'live' },
              { label: 'Upcoming', key: 'upcoming' },
              { label: 'Past Draws', key: 'past' },
            ] as const).map(({ label, key }) => {
              const isActive = key === activeTab;
              // Preserve all active filters when switching tabs
              const tabHref = buildQuery({ tab: key === 'live' ? undefined : key, page: undefined });
              const count = isActive ? response.total : null;
              return (
                <Link
                  key={key}
                  href={tabHref}
                  role="tab"
                  aria-selected={isActive}
                  style={{
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--green-primary)' : 'var(--text-muted)',
                    borderBottom: isActive ? '2.5px solid var(--green-primary)' : '2.5px solid transparent',
                    cursor: isActive ? 'default' : 'pointer',
                    whiteSpace: 'nowrap' as const,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    userSelect: 'none' as const,
                    textDecoration: 'none',
                  }}
                >
                  {label}
                  {count !== null && (
                    <span style={{
                      background: isActive ? 'var(--green-primary)' : 'var(--text-muted)',
                      color: '#fff',
                      borderRadius: 100,
                      padding: '0.1em 0.55em',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      lineHeight: 1.6,
                    }}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: '2.5rem 1.5rem 5rem' }}>
        <div className="container">
          {/* Filters row — hidden for past draws */}
          <form method="get" style={{ display: activeTab === 'past' ? 'none' : 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
            {activeTab !== 'live' && <input type="hidden" name="tab" value={activeTab} />}
            <input
              name="search"
              type="search"
              defaultValue={sp.search ?? ''}
              placeholder="Search by title or location…"
              className="form-input"
              style={{ flex: '1 1 200px', minWidth: 0 }}
              aria-label="Search campaigns"
            />
            <select name="state" aria-label="Filter by state" defaultValue={sp.state ?? ''} className="form-select" style={{ flex: '0 1 150px', minWidth: 130 }}>
              <option value="">All States</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select name="propertyType" aria-label="Filter by property type" defaultValue={sp.propertyType ?? ''} className="form-select" style={{ flex: '0 1 180px', minWidth: 150 }}>
              <option value="">All Property Types</option>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select name="sort" aria-label="Sort campaigns" defaultValue={sortRaw} className="form-select" style={{ flex: '0 1 200px', minWidth: 160 }}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-sliders" style={{ marginRight: '0.375rem' }} aria-hidden="true" />
              Apply
            </button>
            {hasFilters && (
              <Link href={buildQuery({ state: undefined, propertyType: undefined, search: undefined, page: undefined })} className="btn btn-outline btn-sm">
                <i className="fa-solid fa-xmark" style={{ marginRight: '0.375rem' }} aria-hidden="true" />
                Clear
              </Link>
            )}
          </form>

          {/* Active filter chips */}
          {hasFilters && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }} aria-label="Active filters">
              {sp.state && (
                <Link href={buildQuery({ state: undefined, page: undefined })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', textDecoration: 'none' }}>
                  {sp.state} <i className="fa-solid fa-xmark" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                </Link>
              )}
              {sp.propertyType && (
                <Link href={buildQuery({ propertyType: undefined, page: undefined })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', textDecoration: 'none' }}>
                  {PROPERTY_TYPES.find((t) => t.value === sp.propertyType)?.label ?? sp.propertyType} <i className="fa-solid fa-xmark" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                </Link>
              )}
              {sp.search && (
                <Link href={buildQuery({ search: undefined, page: undefined })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)', textDecoration: 'none' }}>
                  &ldquo;{sp.search}&rdquo; <i className="fa-solid fa-xmark" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          {/* Results count + sort summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {response.total === 0 ? 'No campaigns found' : (
                <>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{response.data.length}</strong>
                  {response.total > response.data.length && <> of <strong style={{ color: 'var(--text-primary)' }}>{response.total}</strong></>}
                  {' '}campaign{response.total !== 1 ? 's' : ''}
                </>
              )}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <i className="fa-solid fa-arrow-up-arrow-down" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
              {SORT_OPTIONS.find((o) => o.value === sortRaw)?.label ?? (activeTab === 'upcoming' ? 'Upcoming' : 'Newest First')}
            </p>
          </div>

          {/* Campaign grid */}
          {response.data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <i className="fa-solid fa-house-flag" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }} aria-hidden="true" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {emptyHeading ?? (
                  hasFilters ? 'No campaigns match your filters'
                  : activeTab === 'upcoming' ? 'No upcoming campaigns right now'
                  : activeTab === 'past' ? 'No completed draws yet'
                  : 'No live campaigns right now'
                )}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1rem', maxWidth: 420, margin: '0 auto 1rem' }}>
                {emptyBody ?? (
                  hasFilters ? 'Try adjusting your filters or search terms.'
                  : activeTab === 'live' ? 'The next campaign is being prepared. Sign up below to be notified when it launches.'
                  : 'Check back after the first draw.'
                )}
              </p>
              {hasFilters && (
                <Link href={buildQuery({ state: undefined, propertyType: undefined, search: undefined, page: undefined })} className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }}>
                  Clear Filters
                </Link>
              )}
            </div>
          ) : (
            <div className="campaign-grid">
              {response.data.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem', flexWrap: 'wrap' }}>
              {currentPage > 1 && (
                <Link
                  href={buildQuery({ page: String(currentPage - 1) })}
                  className="btn btn-outline btn-sm"
                  aria-label="Previous page"
                  rel="prev"
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '0.375rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1 }}>…</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildQuery({ page: String(p) })}
                      className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-outline'}`}
                      aria-current={p === currentPage ? 'page' : undefined}
                    >
                      {p}
                    </Link>
                  )
                )}
              {currentPage < totalPages && (
                <Link
                  href={buildQuery({ page: String(currentPage + 1) })}
                  className="btn btn-outline btn-sm"
                  aria-label="Next page"
                  rel="next"
                >
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* ── REGULATORY DISCLOSURES ── */}
      <section style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border-light)', padding: '2rem 1.5rem' }} aria-label="Regulatory disclosures">
        <div className="container">
          {/* Page-level regulatory disclaimer */}
          <div style={{
            background: 'var(--green-50)', border: '1px solid var(--green-100)',
            borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
            marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            <p style={{ margin: '0 0 0.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.375rem', color: 'var(--green-primary)' }} aria-hidden="true" />
              Regulatory Notice
            </p>
            <p style={{ margin: 0 }}>
              <strong>RaffleProp Ltd (RC 9484205)</strong> is regulated by the Federal Competition and Consumer Protection Commission (FCCPC) and the FCT Lottery Regulatory Office (FCT-LRO).
              All campaigns are individually licensed. These are promotional competitions under the Federal Competition and Consumer Protection Act (FCCPA) — not gambling.
              FCCPC approval reference is displayed on every campaign card.
              Questions? <a href="/contact" style={{ color: 'var(--green-primary)' }}>Contact us</a> or email <a href="mailto:support@raffleprop.com" style={{ color: 'var(--green-primary)' }}>support@raffleprop.com</a>.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {/* 18+ warning */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', maxWidth: 280 }}>
              <span style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: '#fef2f2', border: '1.5px solid #fecaca',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 900, color: '#dc2626',
              }}>
                18+
              </span>
              <span>This platform is for participants aged 18 and over. Promotional competitions are not gambling. Please participate responsibly.</span>
            </div>

            {/* Skill question notice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', maxWidth: 280 }}>
              <i className="fa-solid fa-pencil" style={{ marginTop: '0.2rem', color: 'var(--green-primary)', flexShrink: 0 }} aria-hidden="true" />
              <span>A skill question must be answered correctly at checkout (FCCPA §114). No purchase is necessary to enter — see <a href="/how-it-works" style={{ color: 'var(--green-primary)' }}>How It Works</a>.</span>
            </div>

            {/* Refund guarantee */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', maxWidth: 280 }}>
              <i className="fa-solid fa-rotate-left" style={{ marginTop: '0.2rem', color: 'var(--green-primary)', flexShrink: 0 }} aria-hidden="true" />
              <span>If the minimum ticket threshold is not met, every participant receives a <strong>100% automatic refund</strong> — no claims required.</span>
            </div>

            {/* ARCON / advertising disclosure */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', maxWidth: 280 }}>
              <i className="fa-solid fa-circle-info" style={{ marginTop: '0.2rem', color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
              <span>Property values shown are independent NIESV valuations. Promotional material complies with Advertising Regulatory Council of Nigeria (ARCON) guidelines.</span>
            </div>
          </div>

          {/* Legal links */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <Link href="/terms" style={{ color: 'var(--green-primary)' }}>Terms &amp; Conditions</Link>
            <Link href="/privacy" style={{ color: 'var(--green-primary)' }}>Privacy Policy</Link>
            <Link href="/trust-legal" style={{ color: 'var(--green-primary)' }}>Trust &amp; Legal</Link>
            <Link href="/how-it-works" style={{ color: 'var(--green-primary)' }}>How It Works</Link>
            <Link href="/faq" style={{ color: 'var(--green-primary)' }}>FAQ</Link>
            <a href="https://fccpc.gov.ng" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>FCCPC <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.65rem' }} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      {/* ── BE FIRST TO KNOW ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0D5E30 0%, #0a3a1e 100%)',
        padding: '4rem 0',
      }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.375rem',
          }}>
            <i className="fa-regular fa-bell" style={{ color: '#fff' }} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              Be First to Know About New Campaigns
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', margin: 0, maxWidth: 480 }}>
              Get notified when new properties are listed. No spam — only campaign announcements.
            </p>
          </div>
          <CampaignNotifyForm />
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            <i className="fa-solid fa-lock" style={{ marginRight: '0.25rem' }} aria-hidden="true" />
            Your email is never shared. Unsubscribe any time.
          </p>
        </div>
      </section>
    </main>
  );
}
