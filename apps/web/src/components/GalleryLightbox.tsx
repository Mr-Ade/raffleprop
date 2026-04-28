'use client';

import { useCallback, useEffect, useState } from 'react';

const MEDIA_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

function isVideo(key: string) {
  const lower = key.toLowerCase();
  return VIDEO_EXTS.some((ext) => lower.endsWith(ext));
}

interface Props {
  galleryKeys: string[];
  title: string;
}

export function GalleryLightbox({ galleryKeys, title }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((i) => (i !== null && i < galleryKeys.length - 1 ? i + 1 : i));
  }, [galleryKeys.length]);

  useEffect(() => {
    if (open === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') setOpen((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === 'ArrowRight') setOpen((i) => (i !== null && i < galleryKeys.length - 1 ? i + 1 : i));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close, galleryKeys.length]);

  if (galleryKeys.length === 0) return null;

  const visibleKeys = galleryKeys.slice(0, 4);
  const extra = galleryKeys.length - 4;

  const videoCount = galleryKeys.filter(isVideo).length;
  const imageCount = galleryKeys.length - videoCount;

  return (
    <>
      {/* Media type counts */}
      {galleryKeys.length > 0 && (videoCount > 0) && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.625rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {imageCount > 0 && (
            <span><i className="fa-regular fa-image" style={{ marginRight: '0.25rem' }} />{imageCount} photo{imageCount !== 1 ? 's' : ''}</span>
          )}
          {videoCount > 0 && (
            <span><i className="fa-solid fa-video" style={{ marginRight: '0.25rem', color: 'var(--green-primary)' }} />{videoCount} video{videoCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      <div className={`gallery-grid gallery-grid-${Math.min(visibleKeys.length, 4)}`}>
        {visibleKeys.map((key, i) => {
          const video = isVideo(key);
          return (
            <button
              key={key}
              className="gallery-thumb"
              onClick={() => setOpen(i)}
              aria-label={`View ${video ? 'video' : 'photo'} ${i + 1} of ${galleryKeys.length}`}
            >
              {video ? (
                /* Video thumbnail — muted preview frame */
                <>
                  <video
                    src={`${MEDIA_URL}/${key}`}
                    muted
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Play icon overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className="fa-solid fa-play" style={{ color: '#0D5E30', fontSize: '0.875rem', marginLeft: '2px' }} />
                    </div>
                  </div>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${MEDIA_URL}/${key}`} alt={`${title} — photo ${i + 1}`} loading="lazy" />
              )}
              {i === 3 && extra > 0 && (
                <div className="gallery-more-overlay">
                  <span>+{extra} more</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {open !== null && (
        <div className="gallery-lightbox" onClick={close} role="dialog" aria-modal="true" aria-label="Media viewer">
          {/* Close */}
          <button type="button" className="gallery-lb-close" onClick={close} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>

          {/* Prev */}
          <button
            className="gallery-lb-nav gallery-lb-prev"
            onClick={prev}
            disabled={open === 0}
            aria-label="Previous"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>

          {/* Media */}
          {(() => {
            const currentKey = galleryKeys[open]!;
            return (
              <div className="gallery-lb-img" onClick={(e) => e.stopPropagation()}>
                {isVideo(currentKey) ? (
                  <video
                    key={currentKey}
                    src={`${MEDIA_URL}/${currentKey}`}
                    controls
                    autoPlay
                    style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, outline: 'none' }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${MEDIA_URL}/${currentKey}`} alt={`${title} — ${open + 1}`} />
                )}
              </div>
            );
          })()}

          {/* Next */}
          <button
            className="gallery-lb-nav gallery-lb-next"
            onClick={next}
            disabled={open === galleryKeys.length - 1}
            aria-label="Next"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>

          {/* Counter + type indicator */}
          <div className="gallery-lb-counter">
            {isVideo(galleryKeys[open]!) && (
              <i className="fa-solid fa-video" style={{ marginRight: '0.375rem', fontSize: '0.75rem' }} />
            )}
            {open + 1} / {galleryKeys.length}
          </div>
        </div>
      )}
    </>
  );
}
