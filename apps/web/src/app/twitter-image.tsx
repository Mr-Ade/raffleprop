import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';
export const alt = 'RaffleProp — Win a Property in Nigeria From NGN 2,500';

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
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>
            <span style={{ color: '#fff' }}>Raffle</span>
            <span style={{ color: '#F0C040' }}>Prop</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: '-2px',
            lineHeight: 1.1,
            maxWidth: 860,
            marginBottom: 20,
            gap: 12,
          }}
        >
          <span style={{ color: '#fff' }}>Win a Property.</span>
          <span style={{ color: '#F0C040' }}>From NGN 2,500.</span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            maxWidth: 660,
          }}
        >
          <span>Nigeria&apos;s first FCCPC-regulated property raffle. raffleprop.com</span>
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
