import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#0D5E30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: '-2px',
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
