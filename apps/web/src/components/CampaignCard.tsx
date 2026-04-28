import Link from 'next/link';
import type { Campaign } from '@raffleprop/shared';
import { CountdownTimer } from './CountdownTimer';
import { NotifyMeButton } from './NotifyMeButton';

const MEDIA_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

const STATUS_LABEL: Record<string, string> = {
  LIVE: 'Live Now',
  CLOSED: 'Closed',
  DRAWN: 'Winner Announced',
  REVIEW: 'Coming Soon',
  DRAFT: 'Coming Soon',
  CANCELLED: 'Closed',
};

const STATUS_CLASS: Record<string, string> = {
  LIVE: 'status-active',
  CLOSED: 'status-closed',
  DRAWN: 'status-draw-complete',
  REVIEW: 'status-upcoming',
  DRAFT: 'status-upcoming',
  CANCELLED: 'status-closed',
};

interface CampaignCardProps {
  campaign: Campaign;
  ticketsSold?: number;
  /** days until ticket sale closes (for live campaigns) */
  daysToClose?: number | undefined;
  /** days until campaign goes live (for upcoming) */
  daysToLaunch?: number | undefined;
}

export function CampaignCard({ campaign, ticketsSold, daysToClose, daysToLaunch }: CampaignCardProps) {
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

  const imageUrl = campaign.featuredImageKey
    ? `${MEDIA_URL}/${campaign.featuredImageKey}`
    : null;

  const gradients = [
    'linear-gradient(135deg, #0D5E30 0%, #1a7a42 100%)',
    'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)',
    'linear-gradient(135deg, #1a5e2a 0%, #2d8a4e 100%)',
  ];
  const fallbackGradient = gradients[(campaign.id.charCodeAt(0) ?? 0) % gradients.length];

  return (
    <div className="campaign-card animate-fade-up">
      {/* Card image */}
      <div className="campaign-card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={campaign.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ background: fallbackGradient, width: '100%', height: '100%' }} />
        )}
        <span className={`campaign-status-badge ${STATUS_CLASS[campaign.status] ?? 'status-active'}`}>
          {STATUS_LABEL[campaign.status] ?? campaign.status}
        </span>
      </div>

      {/* Card body */}
      <div className="campaign-card-body">
        <div className="campaign-location">
          <i className="fa-solid fa-location-dot" />
          {campaign.propertyState}, {campaign.propertyLga}
        </div>
        <div className="campaign-card-title">{campaign.title}</div>
        <div className="campaign-worth">
          ₦{marketValue.toLocaleString('en-NG')}
          <small>Independently Valued</small>
        </div>

        {/* Progress + countdown for live / sold out */}
        {(isLive || isSoldOut) && (
          <>
            <div className="progress-wrap">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="ticket-stats">
              <span><strong>{sold.toLocaleString('en-NG')}</strong> / {total.toLocaleString('en-NG')} tickets</span>
              <span>{pct}% sold</span>
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
              <i className="fa-regular fa-clock" style={{ marginRight: '0.375rem' }} />
              {campaign.drawDate
                ? <>Draw: <strong>{new Date(campaign.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></>
                : 'Launching soon'}
            </div>
            {campaign.drawDate && <CountdownTimer endDate={campaign.drawDate} />}
          </>
        )}

        {/* DRAWN — winner reveal block */}
        {isDrawn && (
          <div className="campaign-winner-block">
            <div className="campaign-winner-label">
              <i className="fa-solid fa-trophy" />
              Winner Announced
            </div>
            {campaign.draw?.winnerTicket ? (
              <div className="campaign-winner-ticket">
                Ticket <strong>{campaign.draw.winnerTicket.ticketNumber}</strong>
              </div>
            ) : null}
            {campaign.drawDate && (
              <div className="campaign-winner-date">
                Draw held {new Date(campaign.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
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
              Enter Now <i className="fa-solid fa-arrow-right" />
            </Link>
          )}
          {isUpcoming && <NotifyMeButton campaignId={campaign.id} />}
          {isSoldOut && <span className="badge badge-red">Sold Out</span>}
          {isDrawn && (
            <Link href={`/draw/verify/${campaign.id}`} className="btn btn-outline btn-sm">
              Verify Draw <i className="fa-solid fa-shield-halved" />
            </Link>
          )}
        </div>

        {/* FCCPC badge */}
        {campaign.fccpcRef && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            marginTop: '0.625rem', fontSize: '0.75rem',
            color: 'var(--green-primary)', fontWeight: 600,
          }}>
            <i className="fa-solid fa-shield-halved" style={{ fontSize: '0.6875rem' }} />
            FCCPC Approved &middot;{' '}
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{campaign.fccpcRef}</span>
          </div>
        )}

        {/* Closes in N days — derived from real drawDate */}
        {isLive && campaign.drawDate && (() => {
          const days = Math.ceil((new Date(campaign.drawDate).getTime() - Date.now()) / 86400000);
          return days > 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <i className="fa-regular fa-clock" style={{ marginRight: '0.25rem' }} />
              Ticket sale closes in <strong>{days} day{days !== 1 ? 's' : ''}</strong>
            </div>
          ) : null;
        })()}

        {/* Refund notice — only relevant before draw */}
        {!isDrawn && (
          <div className="refund-notice" style={{ marginTop: '0.75rem' }}>
            <i className="fa-solid fa-shield-halved" />
            <span>Full refund if &lt;{minTickets.toLocaleString('en-NG')} tickets sold</span>
          </div>
        )}
      </div>
    </div>
  );
}
