import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/session';
import { TicketCounter } from '@/components/TicketCounter';
import { PurchaseWidget } from '@/components/PurchaseWidget';
import { GalleryLightbox } from '@/components/GalleryLightbox';
import { CampaignHeroCarousel } from '@/components/CampaignHeroCarousel';
import { CountdownTimer } from '@/components/CountdownTimer';
import { ShareWidget } from '@/components/ShareWidget';
import { CampaignCard } from '@/components/CampaignCard';
import type { Campaign, CampaignDocumentKeys } from '@raffleprop/shared';

const MEDIA_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';
const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://raffleprop.com';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const response = await api.getCampaigns({ pageSize: '100' });
    return response.data.map((c: Campaign) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const campaign = await api.getCampaign(slug);
    const desc = campaign.description ??
      `Win ${campaign.title} worth ₦${Number(campaign.marketValue).toLocaleString()} at ${campaign.propertyAddress}. Tickets from ₦${Number(campaign.ticketPrice).toLocaleString()}.`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: campaign.title,
      description: desc,
      image: campaign.featuredImageKey ? [`${MEDIA_URL}/${campaign.featuredImageKey}`] : [],
      offers: {
        '@type': 'Offer',
        priceCurrency: 'NGN',
        price: Number(campaign.ticketPrice).toFixed(2),
        availability: campaign.status === 'LIVE'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
        url: `${SITE_URL}/campaigns/${campaign.slug}`,
      },
      ...(campaign.drawDate ? {
        event: {
          '@type': 'Event',
          name: `${campaign.title} — Live Draw`,
          startDate: campaign.drawDate,
          location: {
            '@type': 'Place',
            name: campaign.propertyAddress,
            address: {
              '@type': 'PostalAddress',
              addressLocality: campaign.propertyLga,
              addressRegion: campaign.propertyState,
              addressCountry: 'NG',
            },
          },
        },
      } : {}),
    };

    return {
      title: campaign.title,
      description: desc,
      openGraph: {
        title: campaign.title,
        description: desc,
        images: campaign.featuredImageKey ? [`${MEDIA_URL}/${campaign.featuredImageKey}`] : [],
      },
      other: {
        'application/ld+json': JSON.stringify(jsonLd),
      },
    };
  } catch {
    return { title: 'Campaign Not Found' };
  }
}

export const revalidate = 30;

const STATUS_LABEL: Record<string, string> = {
  LIVE: 'Live Now',
  CLOSED: 'Closed',
  DRAWN: 'Winner Announced',
  REVIEW: 'Coming Soon',
  DRAFT: 'Coming Soon',
  CANCELLED: 'Cancelled',
};

const STATUS_CLASS: Record<string, string> = {
  LIVE: 'status-active',
  CLOSED: 'status-closed',
  DRAWN: 'status-draw-complete',
  REVIEW: 'status-upcoming',
  DRAFT: 'status-upcoming',
  CANCELLED: 'status-closed',
};

const DOC_META: Record<keyof CampaignDocumentKeys, { label: string; icon: string }> = {
  titleDeed: { label: 'Title Deed / C of O', icon: 'fa-file-contract' },
  surveyPlan: { label: 'Survey Plan', icon: 'fa-map' },
  fccpcCert: { label: 'FCCPC Certificate', icon: 'fa-certificate' },
  lslgaCert: { label: 'LSLGA Licence', icon: 'fa-id-card' },
  escrowAgreement: { label: 'Escrow Agreement', icon: 'fa-handshake' },
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  LAND: 'Land',
  MIXED_USE: 'Mixed Use',
};

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAccessToken();

  let campaign: Campaign & { ticketsSold?: number };
  try {
    campaign = await api.getCampaign(slug) as Campaign & { ticketsSold?: number };
  } catch {
    notFound();
  }

  const [ticketCountData, relatedResponse] = await Promise.all([
    api.getTicketCount(campaign.id).catch(() => ({ ticketsSold: campaign.ticketsSold ?? 0 })),
    api.getCampaigns({ status: 'LIVE', pageSize: '7' }).catch(() => ({ data: [] as Campaign[] })),
  ]);
  const soldCount = ticketCountData.ticketsSold;

  // Up to 3 other campaigns, same state first, then any other state, exclude self
  const relatedCampaigns = relatedResponse.data
    .filter((c: Campaign) => c.id !== campaign.id)
    .sort((a: Campaign, b: Campaign) => {
      const aMatch = a.propertyState === campaign.propertyState ? 0 : 1;
      const bMatch = b.propertyState === campaign.propertyState ? 0 : 1;
      return aMatch - bMatch;
    })
    .slice(0, 3);

  const docs = campaign.documentKeys as CampaignDocumentKeys | null;
  const isLive = campaign.status === 'LIVE';
  const isDrawn = campaign.status === 'DRAWN';
  const marketValue = Number(campaign.marketValue);
  const ticketPrice = Number(campaign.ticketPrice);

  const availableDocs = docs
    ? (Object.entries(docs) as [keyof CampaignDocumentKeys, string | undefined][]).filter(([, v]) => !!v)
    : [];

  const campaignUrl = `${SITE_URL}/campaigns/${campaign.slug}`;

  // Build compliance badges (shown on one row)
  const complianceBadges: { icon: string; label: string; ref?: string; color: string; bg: string; border: string }[] = [];
  if (campaign.fccpcRef) {
    complianceBadges.push({ icon: 'fa-shield-halved', label: 'FCCPC Approved', ref: campaign.fccpcRef, color: 'var(--green-primary)', bg: 'var(--green-50)', border: 'var(--green-100)' });
  }
  if (campaign.lslgaRef) {
    complianceBadges.push({ icon: 'fa-id-card', label: 'Lottery Board Licensed', ref: campaign.lslgaRef, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' });
  }
  if (campaign.escrowBank) {
    complianceBadges.push({ icon: 'fa-building-columns', label: `Escrow: ${campaign.escrowBank}`, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' });
  }
  if (campaign.valuationFirm) {
    complianceBadges.push({ icon: 'fa-certificate', label: `NIESV Valued`, ref: campaign.valuationFirm, color: '#b45309', bg: '#fffbeb', border: '#fde68a' });
  }
  if (campaign.cOfOConfirmed) {
    complianceBadges.push({ icon: 'fa-file-contract', label: 'C of O Confirmed', color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7' });
  }

  return (
    <div style={{ paddingTop: '65px' }}>

      {/* ── HERO CAROUSEL ── */}
      <CampaignHeroCarousel
        images={[
          ...(campaign.featuredImageKey ? [campaign.featuredImageKey] : []),
          ...campaign.galleryKeys,
        ]}
        title={campaign.title}
      >
        {/* Status badge */}
        <span className={`campaign-status-badge ${STATUS_CLASS[campaign.status] ?? 'status-active'}`}>
          {STATUS_LABEL[campaign.status] ?? campaign.status}
        </span>

        {/* FCCPC badge overlay */}
        {campaign.fccpcRef && (
          <div style={{
            position: 'absolute', bottom: '3.5rem', right: '1rem',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            borderRadius: 100, padding: '0.3rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-primary)',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}>
            <i className="fa-solid fa-shield-halved" />
            FCCPC · {campaign.fccpcRef}
          </div>
        )}
      </CampaignHeroCarousel>

      {/* ── COMPLIANCE BADGES — one horizontal row ── */}
      {complianceBadges.length > 0 && (
        <div className="container" style={{ marginTop: '0.875rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {complianceBadges.map((b) => (
              <div key={b.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.35rem 0.75rem',
                background: b.bg, border: `1px solid ${b.border}`,
                borderRadius: 100,
                fontSize: '0.75rem', fontWeight: 700, color: b.color,
                whiteSpace: 'nowrap',
              }}>
                <i className={`fa-solid ${b.icon}`} style={{ fontSize: '0.7rem' }} />
                {b.label}
                {b.ref && <span style={{ opacity: 0.7, fontWeight: 500 }}>· {b.ref}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MOBILE BUY CTA (≤480px only) ── */}
      <div className="mobile-buy-cta-wrap">
        <div className="container">
          <a
            href="#purchase-widget"
            className="btn btn-gold btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <i className="fa-solid fa-ticket" /> Buy Tickets — From ₦{ticketPrice.toLocaleString()}
          </a>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '1.75rem', paddingBottom: '4rem' }}>
        <div className="campaign-detail-grid">

          {/* ════════════ LEFT COLUMN ════════════ */}
          <div>

            {/* Breadcrumb */}
            <nav style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
              <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.625rem' }} />
              <Link href="/campaigns" style={{ color: 'var(--text-muted)' }}>Campaigns</Link>
              <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.625rem' }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.title}</span>
            </nav>

            {/* ── VALUATION BADGE ── */}
            {(campaign.valuationFirm || campaign.marketValue) && (
              <div style={{
                background: 'linear-gradient(135deg,#0D5E30,#15803d)',
                borderRadius: 12, padding: '1rem 1.25rem',
                color: '#fff', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '0.875rem',
              }}>
                <i className="fa-solid fa-certificate" style={{ fontSize: '2rem', opacity: 0.8, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    Independent NIESV Valuation
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    ₦{marketValue.toLocaleString()} market value
                    {campaign.valuationFirm && ` · ${campaign.valuationFirm}`}
                    {campaign.valuationRef && ` · Ref: ${campaign.valuationRef}`}
                  </div>
                  {availableDocs.some(([k]) => k === 'titleDeed') && (
                    <a
                      href={`/api/documents/${docs!.titleDeed}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: '#fde68a', marginTop: '0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <i className="fa-solid fa-download" /> Download Valuation Certificate
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Title + location + C of O */}
            {campaign.subtitle && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.375rem' }}>
                {campaign.subtitle}
              </div>
            )}
            <h1 style={{ fontSize: 'clamp(1.375rem,3vw,2rem)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {campaign.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div className="campaign-location" style={{ fontSize: '0.9375rem', margin: 0 }}>
                <i className="fa-solid fa-location-dot" />
                {campaign.propertyAddress}, {campaign.propertyState}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green-primary)' }}>
                ₦{marketValue.toLocaleString()}
              </div>
            </div>

            {/* ── DESCRIPTION ── */}
            {campaign.description && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-align-left" style={{ color: 'var(--green-primary)' }} />
                  About This Property
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
                    {campaign.description}
                  </p>
                </div>
              </div>
            )}

            {/* ── GALLERY ── */}
            {campaign.galleryKeys.length > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-regular fa-images" style={{ color: 'var(--green-primary)' }} />
                  Photos &amp; Videos
                  <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {campaign.galleryKeys.length} item{campaign.galleryKeys.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="card-body" style={{ paddingTop: '0.75rem' }}>
                  <GalleryLightbox galleryKeys={campaign.galleryKeys} title={campaign.title} />
                </div>
              </div>
            )}

            {/* ── PROPERTY SPECS GRID ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-house-chimney" style={{ color: 'var(--green-primary)' }} />
                Property Details
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="spec-details-grid">

                  {/* Row 1 — Address + Type */}
                  <div className="spec-details-cell spec-details-border-r spec-details-border-b">
                    <div className="spec-details-label"><i className="fa-solid fa-location-dot spec-icon" />Address</div>
                    <div className="spec-details-val">{campaign.propertyAddress}, {campaign.propertyState}</div>
                  </div>
                  <div className="spec-details-cell spec-details-border-b">
                    <div className="spec-details-label"><i className="fa-solid fa-tag spec-icon" />Property Type</div>
                    <div className="spec-details-val">{PROPERTY_TYPE_LABEL[campaign.propertyType] ?? campaign.propertyType}</div>
                  </div>

                  {/* Row 2 — Market Value + Location */}
                  <div className="spec-details-cell spec-details-border-r spec-details-border-b">
                    <div className="spec-details-label"><i className="fa-solid fa-naira-sign spec-icon" />Market Value</div>
                    <div className="spec-details-val" style={{ color: 'var(--green-primary)', fontWeight: 700 }}>
                      ₦{marketValue.toLocaleString()}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>independently valued</span>
                    </div>
                  </div>
                  <div className="spec-details-cell spec-details-border-b">
                    <div className="spec-details-label"><i className="fa-solid fa-map-pin spec-icon" />State / LGA</div>
                    <div className="spec-details-val">{campaign.propertyState} · {campaign.propertyLga}</div>
                  </div>

                  {/* Row 3 — Bedrooms + Bathrooms (conditional) */}
                  {campaign.bedrooms != null && (
                    <>
                      <div className="spec-details-cell spec-details-border-r spec-details-border-b">
                        <div className="spec-details-label"><i className="fa-solid fa-bed spec-icon" />Bedrooms</div>
                        <div className="spec-details-val">{campaign.bedrooms} bedroom{campaign.bedrooms !== 1 ? 's' : ''}</div>
                      </div>
                      <div className="spec-details-cell spec-details-border-b">
                        <div className="spec-details-label"><i className="fa-solid fa-bath spec-icon" />Bathrooms</div>
                        <div className="spec-details-val">{campaign.bathrooms ?? '—'} bathroom{(campaign.bathrooms ?? 0) !== 1 ? 's' : ''}</div>
                      </div>
                    </>
                  )}

                  {/* Row 4 — Building + Land Area (conditional) */}
                  {campaign.buildingArea != null && (
                    <>
                      <div className="spec-details-cell spec-details-border-r spec-details-border-b">
                        <div className="spec-details-label"><i className="fa-solid fa-ruler-combined spec-icon" />Building Area</div>
                        <div className="spec-details-val">{campaign.buildingArea.toLocaleString()} sqm</div>
                      </div>
                      <div className="spec-details-cell spec-details-border-b">
                        <div className="spec-details-label"><i className="fa-solid fa-expand spec-icon" />Land Area</div>
                        <div className="spec-details-val">{campaign.landArea ? `${campaign.landArea.toLocaleString()} sqm` : '—'}</div>
                      </div>
                    </>
                  )}

                  {/* Row 5 — Title + Parking */}
                  <div className="spec-details-cell spec-details-border-r spec-details-border-b">
                    <div className="spec-details-label"><i className="fa-solid fa-file-contract spec-icon" />Title</div>
                    <div className="spec-details-val" style={{ color: campaign.cOfOConfirmed ? 'var(--success)' : undefined }}>
                      {campaign.cOfOConfirmed
                        ? <><i className="fa-solid fa-check" style={{ marginRight: '0.25rem', fontSize: '0.7rem' }} />C of O Confirmed</>
                        : 'Pending verification'}
                    </div>
                  </div>
                  <div className="spec-details-cell spec-details-border-b">
                    <div className="spec-details-label"><i className="fa-solid fa-car spec-icon" />Parking</div>
                    <div className="spec-details-val">
                      {campaign.parkingSpaces != null
                        ? `${campaign.parkingSpaces} space${campaign.parkingSpaces !== 1 ? 's' : ''}`
                        : '—'}
                    </div>
                  </div>

                  {/* Row 6 — Draw Date + Draw Method */}
                  {campaign.drawDate && (
                    <div className="spec-details-cell spec-details-border-r spec-details-border-b">
                      <div className="spec-details-label"><i className="fa-regular fa-calendar spec-icon" />Draw Date</div>
                      <div className="spec-details-val">
                        {new Date(campaign.drawDate).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  <div className={`spec-details-cell spec-details-border-b${campaign.drawDate ? '' : ' spec-details-border-r'}`}>
                    <div className="spec-details-label"><i className="fa-solid fa-shuffle spec-icon" />Draw Method</div>
                    <div className="spec-details-val" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {campaign.drawMethod === 'RANDOM_ORG_VERIFIED'
                        ? <><i className="fa-solid fa-check-double" style={{ color: 'var(--success)', fontSize: '0.7rem' }} />Random.org Verified</>
                        : <><i className="fa-solid fa-shuffle" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }} />Random Draw</>}
                    </div>
                  </div>

                  {/* Row 7 — Min tickets + Escrow bank */}
                  <div className="spec-details-cell spec-details-border-r">
                    <div className="spec-details-label"><i className="fa-solid fa-ticket spec-icon" />Min. Tickets for Draw</div>
                    <div className="spec-details-val">{campaign.minTickets.toLocaleString()} of {campaign.totalTickets.toLocaleString()}</div>
                  </div>
                  <div className="spec-details-cell">
                    <div className="spec-details-label"><i className="fa-solid fa-building-columns spec-icon" />Escrow Bank</div>
                    <div className="spec-details-val">{campaign.escrowBank ?? 'Pending'}</div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── PROPERTY FEATURES ── */}
            {campaign.propertyFeatures?.length > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-star" style={{ color: 'var(--gold)' }} />
                  Property Features
                </div>
                <div className="card-body">
                  <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, margin: 0, padding: 0 }} id="spec-features">
                    {campaign.propertyFeatures.map((feat) => (
                      <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', fontSize: '0.75rem', flexShrink: 0 }} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── REGULATORY DOCUMENTS ── */}
            {availableDocs.length > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-folder-open" style={{ color: 'var(--green-primary)' }} />
                  Regulatory Documents
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {availableDocs.map(([key, docKey]) => {
                    const meta = DOC_META[key];
                    return (
                      <a
                        key={key}
                        href={`/api/documents/${docKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-link"
                      >
                        <div className="doc-link-icon">
                          <i className={`fa-solid ${meta.icon}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{meta.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View document</div>
                        </div>
                        <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }} />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── REFUND GUARANTEE ── */}
            <div className="card" style={{ marginBottom: '1.5rem', border: '1.5px solid #fde68a', background: '#fffbeb' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef9c3', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fa-solid fa-rotate-left" style={{ color: '#92400e' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: '#78350f', marginBottom: '0.25rem' }}>
                    100% Refund Guarantee
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: 1.6 }}>
                    If fewer than <strong>{campaign.minTickets.toLocaleString()}</strong> tickets are sold, this draw does not proceed and every ticket holder receives a <strong>full automatic refund</strong> — no questions asked.
                    {campaign.escrowBank && <> Funds are held in escrow at <strong>{campaign.escrowBank}</strong> throughout.</>}
                  </p>
                </div>
              </div>
            </div>

            {/* ── HOW THE DRAW WORKS ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-timeline" style={{ color: 'var(--green-primary)' }} />
                How the Draw Works
              </div>
              <div className="card-body">
                <div className="draw-timeline">

                  <div className="draw-step">
                    <div className="draw-step-icon" style={{ background: 'var(--green-50)', border: '2px solid var(--green-100)' }}>
                      <i className="fa-solid fa-ticket" style={{ color: 'var(--green-primary)' }} />
                    </div>
                    <div className="draw-step-connector" />
                    <div className="draw-step-body">
                      <div className="draw-step-title">Ticket Sales Close</div>
                      <div className="draw-step-desc">
                        Sales end once all {campaign.totalTickets.toLocaleString()} tickets are sold or on the draw date, whichever comes first.
                        A minimum of <strong>{campaign.minTickets.toLocaleString()}</strong> tickets must be sold — otherwise every buyer receives a full automatic refund.
                      </div>
                    </div>
                  </div>

                  <div className="draw-step">
                    <div className="draw-step-icon" style={{ background: '#f0f9ff', border: '2px solid #bae6fd' }}>
                      <i className="fa-solid fa-scale-balanced" style={{ color: '#0369a1' }} />
                    </div>
                    <div className="draw-step-connector" />
                    <div className="draw-step-body">
                      <div className="draw-step-title">Independent Witness Verified</div>
                      <div className="draw-step-desc">
                        An accredited lawyer and a neutral third-party witness are engaged to oversee and certify the entire draw process — ensuring no manipulation is possible.
                      </div>
                    </div>
                  </div>

                  <div className="draw-step">
                    <div className="draw-step-icon" style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>
                      <i className="fa-brands fa-youtube" style={{ color: '#dc2626' }} />
                    </div>
                    <div className="draw-step-connector" />
                    <div className="draw-step-body">
                      <div className="draw-step-title">Live Draw on YouTube</div>
                      <div className="draw-step-desc">
                        The draw is conducted live on the RaffleProp YouTube channel.
                        {campaign.drawMethod === 'RANDOM_ORG_VERIFIED'
                          ? ' A cryptographically signed seed from Random.org is used, making the result independently verifiable.'
                          : ' A tamper-proof random number generator selects the winning ticket number on screen.'}
                      </div>
                    </div>
                  </div>

                  <div className="draw-step draw-step-last">
                    <div className="draw-step-icon" style={{ background: '#fffbeb', border: '2px solid #fde68a' }}>
                      <i className="fa-solid fa-trophy" style={{ color: '#b45309' }} />
                    </div>
                    <div className="draw-step-body">
                      <div className="draw-step-title">Winner Notified Within 3 Days</div>
                      <div className="draw-step-desc">
                        The winner is notified by phone and email within 3 days of the draw (FCCPA §124 compliant).
                        FCCPC is notified simultaneously. Property transfer and handover is coordinated within 30 days.
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── LOCATION MAP ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--green-primary)' }} />
                Location
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{
                  height: 250,
                  background: 'linear-gradient(135deg,#e5e7eb,#f3f4f6)',
                  borderRadius: '0 0 14px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)',
                }}>
                  <i className="fa-solid fa-map-location-dot" style={{ fontSize: '2.5rem', color: 'var(--green-primary)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{campaign.propertyAddress}, {campaign.propertyState}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${campaign.propertyAddress}, ${campaign.propertyState}, Nigeria`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fa-solid fa-external-link-alt" /> Open in Google Maps
                  </a>
                </div>
              </div>
            </div>

            {/* ── SHARE SECTION ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-share-nodes" style={{ color: 'var(--green-primary)' }} />
                Share This Campaign
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Share with friends and help spread the word. Every share increases your chances as more people join.
                </p>
                <ShareWidget title={campaign.title} url={campaignUrl} />
              </div>
            </div>

            {/* Winner announcement for drawn campaigns */}
            {isDrawn && (
              <div className="card" style={{ background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', border: '1.5px solid #c4b5fd', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <i className="fa-solid fa-trophy" style={{ fontSize: '2rem', color: '#7c3aed', marginBottom: '0.75rem', display: 'block' }} />
                  <p style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#5b21b6', marginBottom: '0.375rem' }}>Draw Completed!</p>
                  <p style={{ fontSize: '0.875rem', color: '#6d28d9' }}>
                    The winner has been announced and notified. Check our{' '}
                    <Link href="/winners" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' }}>Winners page</Link>
                    {' '}for the full draw archive and verification.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* ════════════ RIGHT COLUMN ════════════ */}
          <div id="purchase-widget" style={{ position: 'sticky', top: '85px' }}>

            {/* Ticket price header */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Ticket Price
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green-primary)', lineHeight: 1 }}>
                      ₦{ticketPrice.toLocaleString()}
                      <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.375rem' }}>/ ticket</span>
                    </div>
                  </div>
                  {campaign.fccpcRef && (
                    <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--green-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-shield-halved" />
                      FCCPC
                    </div>
                  )}
                </div>

                {/* Live ticket counter */}
                {isLive && (
                  <TicketCounter
                    campaignId={campaign.id}
                    totalTickets={campaign.totalTickets}
                    initialSold={soldCount}
                  />
                )}
              </div>
            </div>

            {/* Winning odds (FCCPA §115 mandatory disclosure) */}
            {isLive && (
              <div style={{
                background: '#fefce8', border: '1px solid #fde68a',
                borderRadius: 'var(--radius)', padding: '0.625rem 0.875rem',
                marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e',
              }}>
                <i className="fa-solid fa-dice" style={{ marginRight: '0.375rem' }} />
                <strong>Current odds of winning: 1 in {(campaign.totalTickets - soldCount).toLocaleString()}.</strong>{' '}
                This changes as tickets are sold.
              </div>
            )}

            {/* Countdown to draw */}
            {campaign.drawDate && isLive && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body">
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <i className="fa-regular fa-clock" />
                    Time to Draw
                  </div>
                  <CountdownTimer endDate={campaign.drawDate} />
                </div>
              </div>
            )}

            {/* Purchase widget */}
            <PurchaseWidget campaign={campaign} token={token ?? null} />

            {/* Trust signals */}
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { icon: 'fa-shield-halved', text: 'Escrow-protected payments' },
                { icon: 'fa-rotate-left', text: `Full refund if <${campaign.minTickets.toLocaleString()} tickets sold` },
                { icon: 'fa-video', text: 'Live draw on YouTube' },
                { icon: 'fa-scale-balanced', text: 'Independent lawyer & witness' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <i className={`fa-solid ${icon}`} style={{ color: 'var(--green-primary)', width: 16, textAlign: 'center', flexShrink: 0 }} />
                  {text}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── MORE CAMPAIGNS ── */}
        <section style={{ marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div className="section-label" style={{ marginBottom: '0.375rem' }}>
                <i className="fa-solid fa-house-circle-check" style={{ marginRight: '0.375rem' }} />
                Other Draws
              </div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                More Campaigns You May Like
              </h2>
            </div>
            <Link href="/campaigns" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
              View All Campaigns <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          <div className="related-campaigns-grid">
            {relatedCampaigns.map((c: Campaign) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
            {/* Placeholder slots to fill the 3-column row */}
            {Array.from({ length: Math.max(0, 3 - relatedCampaigns.length) }).map((_, i) => (
              <div key={`placeholder-${i}`} className="related-campaign-placeholder">
                <i className="fa-solid fa-house" />
                <p>More campaigns<br />coming soon</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
