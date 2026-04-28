import type { Metadata } from 'next';
import Link from 'next/link';
import { cms, type CmsWinner } from '@/lib/cms';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Past Winners — RaffleProp',
  description: 'Meet the verified RaffleProp winners. Every draw is live-streamed, independently witnessed, and publicly archived.',
};

const R2_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

const FALLBACK_WINNERS: CmsWinner[] = [];

function WinnerInitialsAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div style={{
      width: '100%', minHeight: 240,
      background: 'linear-gradient(135deg, #0D5E30, #1a8a48)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '5rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '-0.04em' }}>
        {initials}
      </span>
    </div>
  );
}

export default async function WinnersPage() {
  const winners = await cms.getWinners().catch(() => FALLBACK_WINNERS);
  const display = winners;

  const totalPrize = display
    .map((w) => {
      const raw = (w.prize ?? '').replace(/[₦,\s+MmKk]/g, '');
      const n = parseFloat(raw);
      return isNaN(n) ? 0 : n;
    })
    .reduce((a, b) => a + b, 0);

  return (
    <main id="main-content">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-trophy" /> Verified Winners
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            Past Winners &amp; Draw Archives
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 560, lineHeight: 1.6 }}>
            Every draw is live-streamed on YouTube, witnessed by an independent lawyer, and permanently archived. Winners are verified and legally transferred title.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-light)', padding: '1.5rem' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Winners', value: String(display.length) },
              { label: 'Total Prize Value', value: totalPrize > 0 ? `₦${totalPrize.toLocaleString('en-NG')}` : `₦${display.length * 30000000}+` },
              { label: 'Draws Completed', value: String(display.length) },
              { label: 'Refund Rate', value: '100%' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--green-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Winners list */}
      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div className="container">
          {display.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-trophy" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1.25rem', display: 'block' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>First Draw Coming Soon</h2>
              <p style={{ fontSize: '0.9375rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
                Our first property draw is underway. Winners will be announced here once the draw is completed and verified.
              </p>
              <Link href="/campaigns" className="btn btn-gold">
                <i className="fa-solid fa-ticket" style={{ marginRight: '0.5rem' }} />Browse Active Campaigns
              </Link>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {display.map((w) => {
              const drawDateFormatted = w.drawDate
                ? new Date(w.drawDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
                : null;

              return (
                <div key={w.id} style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }} className="winner-detail-card">
                  {/* Photo */}
                  <div style={{ position: 'relative', minHeight: 240 }}>
                    {w.imageKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${R2_URL}/${w.imageKey}`}
                        alt={w.winnerName}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <WinnerInitialsAvatar name={w.winnerName} />
                    )}
                    <span style={{
                      position: 'absolute', top: 12, left: 12,
                      background: 'linear-gradient(135deg,#C9A227,#F0C040)',
                      color: '#000', borderRadius: 100, padding: '0.25rem 0.625rem',
                      fontSize: '0.75rem', fontWeight: 800,
                    }}>
                      <i className="fa-solid fa-trophy" style={{ marginRight: '0.25rem' }} />Winner
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{w.winnerName}</h2>
                      {w.propertyState && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-location-dot" style={{ marginRight: '0.25rem' }} />
                          {w.propertyState}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property Won</div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{w.propertyTitle}</div>
                      </div>
                      {w.prize && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prize Value</div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--green-primary)' }}>{w.prize}</div>
                        </div>
                      )}
                      {drawDateFormatted && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Draw Date</div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{drawDateFormatted}</div>
                        </div>
                      )}
                    </div>
                    {w.blurb && (
                      <blockquote style={{
                        margin: '0 0 1.25rem',
                        padding: '0.875rem 1rem',
                        background: 'var(--green-50)',
                        borderLeft: '3px solid var(--green-primary)',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.7,
                        fontStyle: 'italic',
                      }}>
                        &ldquo;{w.blurb}&rdquo;
                      </blockquote>
                    )}
                    {w.drawArchiveUrl && (
                      <a
                        href={w.drawArchiveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm winner-archive-btn"
                      >
                        <i className="fa-brands fa-youtube" />
                        Watch Draw Archive
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-banner-section">
        <div className="container">
          <h2 className="cta-banner-title">You Could Be Next</h2>
          <p className="cta-banner-body">Browse active campaigns and buy tickets from ₦2,500. Full refund if minimum not reached.</p>
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
