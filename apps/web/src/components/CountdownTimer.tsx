'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** end date as ISO string OR number of days from now */
  endDate?: string;
  daysFromNow?: number;
}

function computeEnd(props: Props): Date {
  if (props.endDate) return new Date(props.endDate);
  const d = new Date();
  d.setDate(d.getDate() + (props.daysFromNow ?? 0));
  return d;
}

function calcParts(end: Date) {
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

const LABELS = ['Days', 'Hrs', 'Min', 'Sec'] as const;

export function CountdownTimer(props: Props) {
  const [end] = useState(() => computeEnd(props));
  const [mounted, setMounted] = useState(false);
  const [parts, setParts] = useState<ReturnType<typeof calcParts>>(null);

  useEffect(() => {
    setMounted(true);
    setParts(calcParts(end));
    const id = setInterval(() => setParts(calcParts(end)), 1000);
    return () => clearInterval(id);
  }, [end]);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Before hydration: render the same skeleton on server and client to avoid mismatch.
  if (!mounted) {
    return (
      <div className="countdown-row">
        {LABELS.map((label) => (
          <div key={label} className="countdown-unit">
            <span className="c-val value">--</span>
            <span className="label">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Countdown has expired after mount.
  if (!parts) {
    return (
      <div className="countdown-row">
        <span style={{ color: '#dc2626', fontWeight: 700 }}>Draw in Progress</span>
      </div>
    );
  }

  return (
    <div className="countdown-row">
      <div className="countdown-unit">
        <span className="c-val value">{pad(parts.d)}</span>
        <span className="label">Days</span>
      </div>
      <div className="countdown-unit">
        <span className="c-val value">{pad(parts.h)}</span>
        <span className="label">Hrs</span>
      </div>
      <div className="countdown-unit">
        <span className="c-val value">{pad(parts.m)}</span>
        <span className="label">Min</span>
      </div>
      <div className="countdown-unit">
        <span className="c-val value">{pad(parts.s)}</span>
        <span className="label">Sec</span>
      </div>
    </div>
  );
}
