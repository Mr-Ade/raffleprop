'use client';

import { useState, useId } from 'react';

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const uid = useId();

  return (
    <div>
      {items.map((item, i) => {
        const answerId = `${uid}-answer-${i}`;
        const isOpen = open === i;
        return (
          <div key={i} className={`faq-item${isOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="faq-question"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen ? 'true' : 'false'}
              aria-controls={answerId}
            >
              {item.q}
              <i className="fa-solid fa-chevron-down faq-icon" />
            </button>
            <div
              id={answerId}
              className="faq-answer"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="faq-answer-inner">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
