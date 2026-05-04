import Link from 'next/link';
import type { Campaign } from '@raffleprop/shared';
import { CountdownTimer } from './CountdownTimer';
import { NotifyMeButton } from './NotifyMeButton';

const MEDIA_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

const STATUS_LABEL: Record<string, string> = {
  LIVE:      'Live Now',
  UPCOMING:  'Coming Soon',
  PAUSED:    'Paused',
  CLOSED:    'Closed',
  DRAWN:     'Winner Announced',
  REVIEW:    'Coming Soon',
  DRAFT:     'Coming Soon',
  CANCELLED: 'Closed',
};

const STATUS_CLASS: Record<string, string> = {
  LIVE:      'status-active',
  UPCOMING:  'status-upcoming',
  PAUSED:    'status-upcoming',
  CLOSED:    'status-closed',
  DRAWN:     'status-draw-complete',
  REVIEW:    'status-upcoming',
  DRAFT:     'status-upcoming',
  CANCELLED: 'status-closed',
};

const CLOSING_SOON_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

interface CampaignCardProps {
  campaign: Campaign;
  ticketsSold?: number;
}

export function CampaignCard({ campaign, ticketsSold }: CampaignCardProps) {
  const sold = ticketsSold ?? campaign.ticketsSold ?? 0;
  const total = campaign.totalTickets;
  const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
  const marketValue = Number(campaign.marketValue);
  const ticketPrice = Number(campaign.ticketPrice);
  const minTickets = campaign.minTickets ?? 0;

  const isLive = campaign.status === 'LIVE';
  const isUpcoming = campaign.status === 'REVIEW' || campaign.status === 'UPCOMING' || campaign.status === 'DRAFT';
  const isSoldOut = campaign.status === 'CLOSED' && sold >= total;
  const isDrawn = campaign.status === 'DRAWN';

  // CLOSING SOON: live campaign with draw date within 48 hours
  const isClosingSoon = isLive && campaign.drawDate
    ? (new Date(campaign.drawDate).getTime() - Date.now()) < CLOSING_SOON_THRESHOLD_MS
    : false;

  const imageUrl = campaign.featuredImageKey
    ? `${MEDIA_URL}/${campaign.featuredImageKey}`
    : null;

  // Descriptive alt text for accessibility and SEO
  const imageAlt = campaign.featuredImageKey
    ? `${campaign.title} — ${campaign.propertyLga}, ${campaign.propertyState}`
    : '';

  const gradients = [
    'linear-gradient(135deg, #0D5E30 0%, #1a7a42 100%)',
    'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)',
    'linear-gradient(135deg, #1a5e2a 0%, #2d8a4e 100%)',
  ];
  const fallbackGradient = gradients[(campaign.id.charCodeAt(0) ?? 0) % gradients.length];

  // Winning odds — FCCPA §115 mandatory disclosure on any ticket-offer surface
  const oddsN = total - sold;
  const oddsText = oddsN > 0 ? `1 in ${oddsN.toLocaleString('en-NG')}` : null;

  const isLagos = campaign.propertyState?.toLowerCase().includes('lagos');

  return (
    <article className="campaign-card animate-fade-up" aria-label={campaign.title}>
      {/* Card image */}
      <div className="campaign-card-image">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt}
            loading="lazy"
            width={480}
            height={320}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ background: fallbackGradient, width: '100%', height: '100%' }} aria-hidden="true" />
        )}

        {/* Status badge */}
        <span className={`campaign-status-badge ${STATUS_CLASS[campaign.status] ?? 'status-active'}`}>
          {isClosingSoon ? 'Closing Soon' : (STATUS_LABEL[campaign.status] ?? campaign.status)}
        </span>

        {isClosingSoon && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            background: '#dc2626', color: '#fff', borderRadius: 100,
            padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 800,
          }}>
            ⏰ Closing Soon
          </span>
        )}
        {campaign.featured && !isClosingSoon && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            background: 'var(--gold)', color: '#fff', borderRadius: 100,
            padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          }}>
            <i className="fa-solid fa-star" style={{ fontSize: '0.6rem' }} aria-hidden="true" />
            Featured
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="campaign-card-body">
        <div className="campaign-location">
          <i className="fa-solid fa-location-dot" aria-hidden="true" />
          {campaign.propertyState}, {campaign.propertyLga}
        </div>

        <h2 className="campaign-card-title">{campaign.title}</h2>

        <div className="campaign-worth">
          ₦{marketValue.toLocaleString('en-NG')}
          <small>Independently Valued</small>
        </div>

        {/* Progress + countdown for live / sold out */}
        {(isLive || isSoldOut) && (
          <>
            <div className="progress-wrap" aria-label={`${pct}% of tickets sold`}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="ticket-stats">
              <span><strong>{sold.toLocaleString('en-NG')}</strong> / {total.toLocaleString('en-NG')} tickets</span>
              <span>{(total - sold).toLocaleString('en-NG')} remaining</span>
            </div>
            {campaign.drawDate && <CountdownTimer endDate={campaign.drawDate} />}
          </>
        )}

        {/* Upcoming notice + countdown */}
        {isUpcoming && (
          <>
            <div style={{
              margin: '0.875rem 0', padding: '0.75rem',
              background: '#fef9c3', border: '1px solid #fde68a',
              borderRadius: 8, fontSize: '0.875rem', color: '#92400e', fontWeight: 500,
            }}>
              <i className="fa-regular fa-clock" style={{ marginRight: '0.375rem' }} aria-hidden="true" />
              {campaign.drawDate
                ? <>Draw: <strong>{new Date(campaign.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })}</strong></>
                : 'Launching soon'}
            </div>
            {campaign.drawDate && <CountdownTimer endDate={campaign.drawDate} />}
          </>
        )}

        {/* DRAWN — winner reveal block */}
        {isDrawn && (
          <div className="campaign-winner-block">
            <div className="campaign-winner-label">
              <i className="fa-solid fa-trophy" aria-hidden="true" />
              Winner Announced
            </div>
            {campaign.draw?.winnerTicket ? (
              <div className="campaign-winner-ticket">
                Ticket <strong>{campaign.draw.winnerTicket.ticketNumber}</strong>
              </div>
            ) : null}
            {campaign.drawDate && (
              <div className="campaign-winner-date">
                Draw held {new Date(campaign.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })}
              </div>
            )}
          </div>
        )}

        {/* Price row + CTA */}
        <div className="campaign-price-row">
          <div className="campaign-price">
            ₦{ticketPrice.toLocaleString('en-NG')} <small>per ticket</small>
          </div>
          {isLive && (
            <Link href={`/campaigns/${campaign.slug}`} className="btn btn-primary btn-sm">
              Enter Now <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          )}
          {isUpcoming && <NotifyMeButton campaignId={campaign.id} />}
          {isSoldOut && <span className="badge badge-red">Sold Out</span>}
          {isDrawn && (
            <Link href={`/draw/verify/${campaign.id}`} className="btn btn-outline btn-sm">
              Verify Draw <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Winning odds — FCCPA §115 mandatory disclosure */}
        {isLive && oddsText && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            marginTop: '0.5rem', fontSize: '0.75rem',
            color: '#92400e', fontWeight: 600,
            background: '#fefce8', border: '1px solid #fde68a',
            borderRadius: 6, padding: '0.3rem 0.625rem',
          }}>
            <i className="fa-solid fa-dice" style={{ fontSize: '0.6875rem' }} aria-hidden="true" />
            Current odds: <strong>{oddsText}</strong>
          </div>
        )}

        {/* Regulatory reference row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
          {campaign.fccpcRef && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.7rem', color: 'var(--green-primary)', fontWeight: 700,
              background: 'var(--green-50)', border: '1px solid var(--green-100)',
              borderRadius: 100, padding: '0.2rem 0.5rem',
            }}>
              <i className="fa-solid fa-shield-halved" style={{ fontSize: '0.6rem' }} aria-hidden="true" />
              FCCPC <span style={{ fontFamily: 'monospace' }}>{campaign.fccpcRef}</span>
            </div>
          )}
          {campaign.fctLroRef && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.7rem', color: '#0369a1', fontWeight: 700,
              background: '#f0f9ff', border: '1px solid #bae6fd',
              borderRadius: 100, padding: '0.2rem 0.5rem',
            }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '0.6rem' }} aria-hidden="true" />
              FCT-LRO <span style={{ fontFamily: 'monospace' }}>{campaign.fctLroRef}</span>
            </div>
          )}
          {isLagos && campaign.lslgaRef && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700,
              background: '#f5f3ff', border: '1px solid #ddd6fe',
              borderRadius: 100, padding: '0.2rem 0.5rem',
            }}>
              <i className="fa-solid fa-id-badge" style={{ fontSize: '0.6rem' }} aria-hidden="true" />
              LSLGA <span style={{ fontFamily: 'monospace' }}>{campaign.lslgaRef}</span>
            </div>
          )}
        </div>

        {/* Closes in N days — derived from real drawDate */}
        {isLive && campaign.drawDate && (() => {
          const days = Math.ceil((new Date(campaign.drawDate).getTime() - Date.now()) / 86400000);
          return days > 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <i className="fa-regular fa-clock" style={{ marginRight: '0.25rem' }} aria-hidden="true" />
              Ticket sale closes in <strong>{days} day{days !== 1 ? 's' : ''}</strong>
            </div>
          ) : null;
        })()}

        {/* Refund notice — only relevant before draw */}
        {!isDrawn && (
          <div className="refund-notice" style={{ marginTop: '0.75rem' }}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" />
            <span>Full refund if &lt;{minTickets.toLocaleString('en-NG')} tickets sold</span>
          </div>
        )}
      </div>
    </article>
  );
}
