'use client';

import { useCallback, useEffect, useState } from 'react';

const MEDIA_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
function isVideo(key: string) {
  return VIDEO_EXTS.some((ext) => key.toLowerCase().endsWith(ext));
}

function MediaThumb({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  const video = isVideo(src);
  return (
    <button type="button" onClick={onClick} className="hero-mosaic-thumb" aria-label={`View ${alt} fullscreen`}>
      {video ? (
        <>
          <video src={src} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-play" style={{ color: '#0D5E30', fontSize: '0.75rem', marginLeft: '2px' }} />
            </div>
          </div>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
    </button>
  );
}

interface Props {
  images: string[];
  title: string;
  children?: React.ReactNode;
}

export function CampaignHeroCarousel({ images, title, children }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const closeLb = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft')  setLightbox((i) => i !== null ? Math.max(0, i - 1) : null);
      if (e.key === 'ArrowRight') setLightbox((i) => i !== null ? Math.min(images.length - 1, i + 1) : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, closeLb, images.length]);

  // ── No images fallback ──────────────────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div className="campaign-detail-hero-img">
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#0D5E30,#0a3a1e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '4rem' }}>
          <i className="fa-solid fa-house" />
        </div>
        {children}
      </div>
    );
  }

  // ── 1 image — full-width single ────────────────────────────────────────────
  if (images.length === 1) {
    return (
      <>
        <div className="campaign-detail-hero-img" style={{ position: 'relative' }}>
          <MediaThumb src={`${MEDIA_URL}/${images[0]!}`} alt={title} onClick={() => setLightbox(0)} />
          {children}
        </div>
        {lightbox !== null && <Lightbox images={images} title={title} index={lightbox} onClose={closeLb} onNav={setLightbox} />}
      </>
    );
  }

  // ── 2 images — 50/50 split ─────────────────────────────────────────────────
  if (images.length === 2) {
    return (
      <>
        <div className="campaign-detail-hero-img hero-mosaic-2" style={{ position: 'relative' }}>
          <div className="hero-mosaic-cell-main">
            <MediaThumb src={`${MEDIA_URL}/${images[0]!}`} alt={`${title} — 1`} onClick={() => setLightbox(0)} />
          </div>
          <div className="hero-mosaic-cell-side">
            <MediaThumb src={`${MEDIA_URL}/${images[1]!}`} alt={`${title} — 2`} onClick={() => setLightbox(1)} />
          </div>
          {children}
        </div>
        {lightbox !== null && <Lightbox images={images} title={title} index={lightbox} onClose={closeLb} onNav={setLightbox} />}
      </>
    );
  }

  // ── 3+ images — hero left + 2-slot right panel ─────────────────────────────
  const right1 = images[1]!;
  const right2 = images[2]!;
  const extra = images.length - 3; // count beyond the 3 shown

  return (
    <>
      <div className="campaign-detail-hero-img hero-mosaic-3" style={{ position: 'relative' }}>

        {/* Large hero image — left */}
        <div className="hero-mosaic-cell-main">
          <MediaThumb src={`${MEDIA_URL}/${images[0]!}`} alt={`${title} — featured`} onClick={() => setLightbox(0)} />
        </div>

        {/* Right column — two stacked images */}
        <div className="hero-mosaic-cell-right">
          {/* Top-right */}
          <div className="hero-mosaic-cell-half">
            <MediaThumb src={`${MEDIA_URL}/${right1}`} alt={`${title} — 2`} onClick={() => setLightbox(1)} />
          </div>

          {/* Bottom-right — may have +N overlay */}
          <div className="hero-mosaic-cell-half" style={{ position: 'relative' }}>
            <MediaThumb src={`${MEDIA_URL}/${right2}`} alt={`${title} — 3`} onClick={() => setLightbox(2)} />
            {extra > 0 && (
              <button
                type="button"
                onClick={() => setLightbox(3)}
                className="hero-mosaic-more-overlay"
                aria-label={`View ${extra} more photos`}
              >
                <i className="fa-regular fa-images" style={{ fontSize: '1.25rem', marginBottom: '0.3rem', display: 'block' }} />
                +{extra} more
              </button>
            )}
          </div>
        </div>

        {/* View all button — bottom-right of the entire mosaic */}
        <button
          type="button"
          onClick={() => setLightbox(0)}
          className="hero-mosaic-view-all"
          aria-label="View all photos"
        >
          <i className="fa-regular fa-images" style={{ marginRight: '0.4rem' }} />
          View all {images.length} photos
        </button>

        {/* Overlaid badges (status, FCCPC, etc.) */}
        {children}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox images={images} title={title} index={lightbox} onClose={closeLb} onNav={setLightbox} />
      )}

      <style>{`
        /* Mosaic grid layouts */
        .hero-mosaic-2,
        .hero-mosaic-3 {
          display: flex !important;
          gap: 3px;
          overflow: hidden;
        }
        .hero-mosaic-cell-main {
          flex: 3;
          min-width: 0;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        /* 2-image: equal split */
        .hero-mosaic-2 .hero-mosaic-cell-main { flex: 1; }
        .hero-mosaic-2 .hero-mosaic-cell-side  { flex: 1; height: 100%; position: relative; overflow: hidden; }

        /* 3-image: 60/40 split */
        .hero-mosaic-3 .hero-mosaic-cell-main  { flex: 3; }
        .hero-mosaic-cell-right {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .hero-mosaic-cell-half {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        /* Shared thumb button */
        .hero-mosaic-thumb {
          display: block;
          width: 100%; height: 100%;
          position: relative;
          background: none;
          border: none;
          padding: 0;
          cursor: zoom-in;
          overflow: hidden;
        }
        .hero-mosaic-thumb::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0);
          transition: background 0.2s;
        }
        .hero-mosaic-thumb:hover::after { background: rgba(0,0,0,0.12); }

        /* +N more overlay */
        .hero-mosaic-more-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(2px);
          color: #fff;
          font-weight: 700;
          font-size: 1.0625rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .hero-mosaic-more-overlay:hover { background: rgba(0,0,0,0.68); }

        /* "View all X photos" pill */
        .hero-mosaic-view-all {
          position: absolute;
          bottom: 0.875rem;
          right: 0.875rem;
          z-index: 3;
          background: rgba(255,255,255,0.93);
          backdrop-filter: blur(6px);
          border: none;
          border-radius: 8px;
          padding: 0.4rem 0.875rem;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #111;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .hero-mosaic-view-all:hover { background: #fff; transform: translateY(-1px); }

        /* Mobile: collapse to single image */
        @media (max-width: 640px) {
          .hero-mosaic-2,
          .hero-mosaic-3 { display: block !important; }
          .hero-mosaic-cell-right,
          .hero-mosaic-2 .hero-mosaic-cell-side,
          .hero-mosaic-more-overlay { display: none; }
          .hero-mosaic-cell-main { height: 100%; }
          .hero-mosaic-view-all { font-size: 0.75rem; padding: 0.3rem 0.625rem; }
        }
      `}</style>
    </>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ images, title, index, onClose, onNav }: {
  images: string[];
  title: string;
  index: number;
  onClose: () => void;
  onNav: (idx: number | ((i: number | null) => number | null)) => void;
}) {
  const key = images[index]!;
  return (
    <div className="gallery-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button type="button" className="gallery-lb-close" onClick={onClose} aria-label="Close">
        <i className="fa-solid fa-xmark" />
      </button>

      <button
        type="button"
        className="gallery-lb-nav gallery-lb-prev"
        onClick={(e) => { e.stopPropagation(); onNav((i) => i !== null ? Math.max(0, i - 1) : 0); }}
        disabled={index === 0}
        aria-label="Previous"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      <div className="gallery-lb-img" onClick={(e) => e.stopPropagation()}>
        {isVideo(key) ? (
          <video key={key} src={`${MEDIA_URL}/${key}`} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, outline: 'none' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key} src={`${MEDIA_URL}/${key}`} alt={`${title} — ${index + 1}`} />
        )}
      </div>

      <button
        type="button"
        className="gallery-lb-nav gallery-lb-next"
        onClick={(e) => { e.stopPropagation(); onNav((i) => i !== null ? Math.min(images.length - 1, i + 1) : 0); }}
        disabled={index === images.length - 1}
        aria-label="Next"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>

      <div className="gallery-lb-counter">
        {isVideo(key) && <i className="fa-solid fa-video" style={{ marginRight: '0.375rem', fontSize: '0.75rem' }} />}
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
