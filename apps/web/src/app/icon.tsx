import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: '#0D5E30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-1px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          RP
        </span>
      </div>
    ),
    { ...size },
  );
}
