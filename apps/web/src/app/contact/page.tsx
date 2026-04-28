import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us — RaffleProp',
  description: 'Get in touch with RaffleProp — general enquiries, legal & compliance, privacy, and WhatsApp support. We respond within 24 hours on business days.',
};

const CONTACT_CARDS = [
  {
    iconClass: 'fa-solid fa-envelope',
    label: 'General Enquiries',
    value: 'hello@raffleprop.com',
    href: 'mailto:hello@raffleprop.com',
    note: 'Campaigns, tickets, partnerships',
  },
  {
    iconClass: 'fa-solid fa-shield-halved',
    label: 'Legal & Compliance',
    value: 'legal@raffleprop.com',
    href: 'mailto:legal@raffleprop.com',
    note: 'FCCPC, regulatory, legal matters',
  },
  {
    iconClass: 'fa-solid fa-lock',
    label: 'Privacy & NDPR',
    value: 'privacy@raffleprop.com',
    href: 'mailto:privacy@raffleprop.com',
    note: 'Data access, correction, deletion',
  },
  {
    iconClass: 'fa-brands fa-whatsapp',
    label: 'WhatsApp Support',
    value: '+234 812 729 8167',
    href: 'https://wa.me/2348127298167',
    note: 'Fastest response channel',
  },
];

const SOCIAL_LINKS = [
  { iconClass: 'fa-brands fa-x-twitter', label: 'Twitter / X', href: 'https://twitter.com/raffleprop' },
  { iconClass: 'fa-brands fa-instagram', label: 'Instagram', href: 'https://instagram.com/raffleprop_ng' },
  { iconClass: 'fa-brands fa-facebook-f', label: 'Facebook', href: 'https://facebook.com/raffleprop' },
  { iconClass: 'fa-brands fa-youtube', label: 'YouTube', href: 'https://youtube.com/@raffleprop' },
  { iconClass: 'fa-brands fa-tiktok', label: 'TikTok', href: 'https://tiktok.com/@raffleprop' },
];

export default function ContactPage() {
  return (
    <main id="main-content">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Get in Touch</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            Contact Us
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 540, lineHeight: 1.6 }}>
            We respond to all enquiries within 24 hours on business days (Mon–Fri, 9am–5pm WAT).
          </p>
        </div>
      </div>

      <section style={{ padding: '4rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>

          {/* FAQ nudge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--green-50)', border: '1px solid var(--green-100)',
            borderRadius: 'var(--radius-lg)', marginBottom: '2rem', flexWrap: 'wrap',
          }}>
            <i className="fa-regular fa-circle-question" style={{ color: 'var(--green-primary)', fontSize: '1.25rem', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.125rem' }}>Have a quick question?</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Check our FAQ — most questions about legality, tickets, draws, and refunds are already answered there.</p>
            </div>
            <Link href="/faq" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
              View FAQ
            </Link>
          </div>

          {/* Contact cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {CONTACT_CARDS.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="contact-card"
              >
                <i className={c.iconClass} style={{ color: 'var(--green-primary)', fontSize: '1.25rem', marginBottom: '0.75rem', display: 'block' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{c.label}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--green-primary)', marginBottom: '0.25rem' }}>{c.value}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.note}</div>
              </a>
            ))}
          </div>

          {/* Business hours */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem', marginBottom: '2rem',
          }}>
            {[
              { icon: 'fa-clock', label: 'Business Hours', value: 'Mon–Fri, 9am–5pm WAT' },
              { icon: 'fa-rotate-right', label: 'Response Time', value: 'Within 24 hours' },
              { icon: 'fa-comments', label: 'Fastest Channel', value: 'WhatsApp' },
            ].map((item) => (
              <div key={item.label} style={{
                padding: '1rem 1.25rem',
                background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)', display: 'flex', gap: '0.875rem', alignItems: 'center',
              }}>
                <i className={`fa-solid ${item.icon}`} style={{ color: 'var(--green-primary)', fontSize: '1rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.125rem' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Social media */}
          <div style={{
            padding: '1.5rem',
            background: 'var(--card-bg)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)', marginBottom: '2rem',
          }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Follow Us</p>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.875rem',
                    background: 'var(--bg)', border: '1px solid var(--border-light)',
                    borderRadius: 100, fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--text-secondary)', textDecoration: 'none',
                    transition: 'border-color var(--transition), color var(--transition)',
                  }}
                >
                  <i className={s.iconClass} style={{ color: 'var(--green-primary)' }} />
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Registered office */}
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--green-50)', border: '1px solid var(--green-100)',
            borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            <i className="fa-solid fa-location-dot" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
            <strong>Registered Office:</strong> RaffleProp Ltd, 36 Minfa Crescent, Karu, Nigeria. RC 9484205.
          </div>

        </div>
      </section>
    </main>
  );
}
