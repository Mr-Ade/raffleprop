'use client';

import { useState } from 'react';

interface Props {
  title: string;
  url: string;
}

export function ShareWidget({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(url);
  const msg = encodeURIComponent(`🏠 Win this property with RaffleProp!\n${title}\n${url}`);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
      <a
        href={`https://wa.me/?text=${msg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm"
        style={{ background: '#25D366', color: '#fff', border: 'none' }}
      >
        <i className="fab fa-whatsapp" /> WhatsApp
      </a>
      <a
        href={`https://x.com/intent/tweet?text=${msg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm"
        style={{ background: '#000', color: '#fff', border: 'none' }}
      >
        <i className="fab fa-x-twitter" /> Twitter/X
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm"
        style={{ background: '#1877F2', color: '#fff', border: 'none' }}
      >
        <i className="fab fa-facebook-f" /> Facebook
      </a>
      <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-link'}`} />
        {copied ? ' Copied!' : ' Copy Link'}
      </button>
    </div>
  );
}
