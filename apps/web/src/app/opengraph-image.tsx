import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RaffleProp — Win a Property in Nigeria From ₦2,500';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 60%, #0a3a1e 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle dot-grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Gold accent bar top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #C9A227, #F0C040, #C9A227)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-1px',
            }}
          >
            RP
          </div>
          <span
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-1.5px',
            }}
          >
            Raffle<span style={{ color: '#F0C040' }}>Prop</span>
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-2px',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 900,
            marginBottom: 24,
          }}
        >
          Win a Property.{' '}
          <span style={{ color: '#F0C040' }}>From ₦2,500.</span>
        </div>

        {/* Subheading */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.5,
            marginBottom: 44,
          }}
        >
          Nigeria&apos;s first FCCPC-regulated property raffle platform.
          CAC registered · Escrow protected · Live draws on YouTube.
        </div>

        {/* Trust badges row */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['FCCPC Regulated', 'Escrow Protected', 'Winner Guaranteed'].map((badge) => (
            <div
              key={badge}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 100,
                padding: '10px 22px',
                fontSize: 18,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          ))}
        </div>

        {/* Gold accent bar bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #C9A227, #F0C040, #C9A227)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
