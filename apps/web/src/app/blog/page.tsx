import type { Metadata } from 'next';
import Link from 'next/link';
import { cms } from '@/lib/cms';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blog — RaffleProp',
  description: 'Nigerian real estate insights, property investment tips, FCCPA compliance guides, and RaffleProp winner stories. Launching soon.',
};

const FALLBACK_TOPICS = [
  { icon: 'fa-house-chimney', label: 'Lagos Property Market' },
  { icon: 'fa-scale-balanced', label: 'FCCPA Explained' },
  { icon: 'fa-building-columns', label: 'Land Title Types in Nigeria' },
  { icon: 'fa-map-location-dot', label: 'Best Areas to Buy in Abuja' },
  { icon: 'fa-trophy', label: 'Winner Stories' },
  { icon: 'fa-file-contract', label: 'Deed of Assignment Guide' },
  { icon: 'fa-piggy-bank', label: 'Property Investment Tips' },
  { icon: 'fa-globe-africa', label: 'Diaspora Property Ownership' },
];

const RELATED_LINKS = [
  { icon: 'fa-trophy', label: 'Read Winner Stories', sub: 'Meet verified RaffleProp winners', href: '/winners' },
  { icon: 'fa-circle-question', label: 'Browse the FAQ', sub: '21 questions on legality, draws & refunds', href: '/faq' },
  { icon: 'fa-circle-play', label: 'How It Works', sub: 'Four steps from ticket to title deed', href: '/how-it-works' },
  { icon: 'fa-ticket', label: 'Active Campaigns', sub: 'Browse current properties', href: '/campaigns' },
];

const FALLBACK_SOCIAL = [
  { iconClass: 'fa-brands fa-x-twitter', label: 'Twitter / X', href: 'https://twitter.com/raffleprop' },
  { iconClass: 'fa-brands fa-instagram', label: 'Instagram', href: 'https://instagram.com/raffleprop' },
  { iconClass: 'fa-brands fa-youtube', label: 'YouTube', href: 'https://youtube.com/@raffleprop' },
  { iconClass: 'fa-brands fa-tiktok', label: 'TikTok', href: 'https://tiktok.com/@raffleprop' },
];

export default async function BlogPage() {
  const [settings, posts] = await Promise.all([
    cms.getSettings().catch(() => null),
    cms.getPages().catch(() => []),
  ]);

  const supportEmail = settings?.supportEmail ?? 'hello@raffleprop.com';

  // Blog topics from CMS or fallback
  const topics = settings?.blogTopics && settings.blogTopics.length > 0
    ? settings.blogTopics
    : FALLBACK_TOPICS;

  // Social links from CMS or fallback
  const socialLinks = [
    settings?.twitterUrl   && { iconClass: 'fa-brands fa-x-twitter',  label: 'Twitter / X', href: settings.twitterUrl },
    settings?.instagramUrl && { iconClass: 'fa-brands fa-instagram',   label: 'Instagram',   href: settings.instagramUrl },
    settings?.youtubeUrl   && { iconClass: 'fa-brands fa-youtube',     label: 'YouTube',     href: settings.youtubeUrl },
    settings?.tiktokUrl    && { iconClass: 'fa-brands fa-tiktok',      label: 'TikTok',      href: settings.tiktokUrl },
  ].filter(Boolean) as { iconClass: string; label: string; href: string }[];

  const displaySocial = socialLinks.length > 0 ? socialLinks : FALLBACK_SOCIAL;

  return (
    <main id="main-content">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-newspaper" /> Blog
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            RaffleProp Blog
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 520, lineHeight: 1.6 }}>
            Nigerian real estate insights, property tips, FCCPA compliance guides, campaign updates, and winner stories.
          </p>
        </div>
      </div>

      {/* Posts grid or Coming Soon */}
      {posts.length > 0 ? (
        <section style={{ padding: '3rem 1.5rem 2rem' }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} style={{
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  padding: '1.375rem 1.5rem',
                  background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)', textDecoration: 'none', color: 'inherit',
                  transition: 'border-color 0.18s',
                }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>{post.title}</p>
                  {post.metaDesc && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{post.metaDesc}</p>}
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <i className="fa-regular fa-calendar" style={{ marginRight: '0.3rem' }} />
                    {new Date(post.updatedAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section style={{ padding: '4rem 1.5rem 2rem' }}>
          <div className="container" style={{ textAlign: 'center', maxWidth: 540 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--green-50)', border: '1px solid var(--green-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', margin: '0 auto 1.5rem',
            }}>
              <i className="fa-solid fa-pen-nib" style={{ color: 'var(--green-primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Articles Launching Soon</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.75rem' }}>
              We&apos;re writing in-depth guides on Nigerian property law, real estate investment, and FCCPA compliance — written by our in-house property lawyer and estate surveyor. Follow us to be the first to know when we publish.
            </p>

            {/* Follow for updates */}
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {displaySocial.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.875rem',
                    background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                    borderRadius: 100, fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--text-secondary)', textDecoration: 'none',
                  }}
                >
                  <i className={s.iconClass} style={{ color: 'var(--green-primary)' }} />
                  {s.label}
                </a>
              ))}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 0 }}>
              Or email <a href={`mailto:${supportEmail}`} style={{ color: 'var(--green-primary)' }}>{supportEmail}</a> to be notified when the blog launches.
            </p>
          </div>
        </section>
      )}

      {/* Upcoming topics */}
      <section style={{ padding: '2rem 1.5rem' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Topics We&apos;re Covering
          </p>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {topics.map((t) => (
              <span key={t.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                background: 'var(--green-50)', border: '1px solid var(--green-100)',
                borderRadius: 100, fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--green-primary)',
              }}>
                <i className={`fa-solid ${t.icon}`} style={{ fontSize: '0.75rem' }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* In the meantime */}
      <section style={{ padding: '2.5rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            In the Meantime
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {RELATED_LINKS.map((r) => (
              <Link key={r.label} href={r.href} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '1.125rem 1.25rem',
                background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)', textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem',
                }}>
                  <i className={`fa-solid ${r.icon}`} style={{ color: 'var(--green-primary)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.2rem' }}>{r.label}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{r.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
