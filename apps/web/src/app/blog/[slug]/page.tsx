import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cms } from '@/lib/cms';
import DOMPurify from 'isomorphic-dompurify';

export const revalidate = 600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await cms.getPage(params.slug);
  if (!page) return { title: 'Not Found — RaffleProp' };
  return {
    title: page.metaTitle ?? `${page.title} — RaffleProp Blog`,
    description: page.metaDesc ?? undefined,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const page = await cms.getPage(params.slug);
  if (!page) notFound();

  const html = typeof page.content === 'string'
    ? DOMPurify.sanitize(page.content)
    : '';

  const dateStr = new Date(page.updatedAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <main id="main-content">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '3rem 1.5rem 2.5rem', paddingTop: 'calc(3rem + 65px)' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <Link href="/blog" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
            <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.75rem' }} /> Blog
          </Link>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 900, color: '#fff', margin: '0 0 0.75rem', letterSpacing: '-0.03em' }}>
            {page.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>
            <i className="fa-regular fa-calendar" style={{ marginRight: '0.375rem' }} />
            Updated {dateStr}
          </p>
        </div>
      </div>

      {/* Content */}
      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div
            className="blog-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '3rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/blog" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.375rem' }} />
              All Articles
            </Link>
            <Link href="/campaigns" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-ticket" style={{ marginRight: '0.375rem' }} />
              Browse Campaigns
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
