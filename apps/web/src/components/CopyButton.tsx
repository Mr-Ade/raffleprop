'use client';

import { useState } from 'react';

export function CopyButton({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className} style={style}>
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
