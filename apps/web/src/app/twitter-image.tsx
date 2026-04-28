import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';
export const alt = 'RaffleProp — Win a Property in Nigeria From ₦2,500';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 600,
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            RP
          </div>
          <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
            Raffle<span style={{ color: '#F0C040' }}>Prop</span>
          </span>
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-2px',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 860,
            marginBottom: 20,
          }}
        >
          Win a Property.{' '}
          <span style={{ color: '#F0C040' }}>From ₦2,500.</span>
        </div>

        <div
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            maxWidth: 660,
          }}
        >
          Nigeria&apos;s first FCCPC-regulated property raffle. raffleprop.com
        </div>

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
