'use client';

import { useEffect, useRef, useState } from 'react';

interface StatCounterProps {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  /** If true, display the raw suffix without animation (e.g. "100%" stays "100%") */
  static?: boolean;
}

export function StatCounter({
  to,
  prefix = '',
  suffix = '',
  duration = 1500,
  static: isStatic = false,
}: StatCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (isStatic) { setCount(to); return; }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * to));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration, isStatic]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
