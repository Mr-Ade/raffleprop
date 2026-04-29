import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cms, type CmsPage } from '@/lib/cms';
import DOMPurify from 'isomorphic-dompurify';

export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await cms.getPage(slug);
  if (!page) return { title: 'Not Found — RaffleProp' };
  return {
    title: page.metaTitle ?? `${page.title} — RaffleProp Blog`,
    description: page.metaDesc ?? undefined,
  };
}

function extractFirstImage(html: string): { src: string; alt: string } | null {
  const match = html.match(/<img[^>]+src="([^"]+)"(?:[^>]+alt="([^"]*)")?/);
  if (!match?.[1]) return null;
  return { src: match[1], alt: match[2] ?? '' };
}

function stripFirstImage(html: string): string {
  return html.replace(/<img[^>]+>/, '');
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [page, allPages] = await Promise.all([
    cms.getPage(slug),
    cms.getPages().catch(() => [] as Omit<CmsPage, 'content'>[]),
  ]);

  if (!page) notFound();

  const rawHtml = typeof page.content === 'string' ? page.content : '';
  const heroImg = extractFirstImage(rawHtml);
  const bodyHtml = DOMPurify.sanitize(heroImg ? stripFirstImage(rawHtml) : rawHtml);

  const dateStr = new Date(page.updatedAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const related = allPages
    .filter((p) => p.slug !== page.slug)
    .slice(0, 3);

  return (
    <main id="main-content">

      {/* Hero */}
      <div className="blog-post-hero">
        <div className="container blog-post-hero-container">
          <Link href="/blog" className="blog-post-back">
            <i className="fa-solid fa-arrow-left" /> All Articles
          </Link>
          <h1 className="blog-post-title">{page.title}</h1>
          {page.metaDesc && (
            <p className="blog-post-desc">{page.metaDesc}</p>
          )}
          <p className="blog-post-date">
            <i className="fa-regular fa-calendar" />
            Updated {dateStr}
          </p>
        </div>
      </div>

      {/* Hero image */}
      {heroImg && (
        <div className="blog-post-img-wrap">
          <div className="container blog-post-img-container">
            <div className="blog-post-img-inner">
              <Image
                src={heroImg.src}
                alt={heroImg.alt || page.title}
                fill
                priority
                sizes="(max-width: 860px) 100vw, 820px"
                className="blog-fill-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* Article body */}
      <section className="blog-post-body-section">
        <div className="container blog-post-body-container">
          <div
            className="blog-body"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          <div className="blog-post-footer">
            <Link href="/blog" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-arrow-left" /> All Articles
            </Link>
            <Link href="/campaigns" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-ticket" /> Browse Campaigns
            </Link>
          </div>
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="blog-related-section">
          <div className="container blog-related-container">
            <p className="blog-related-label">More Articles</p>
            <div className="blog-related-grid">
              {related.map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="related-card">
                  {r.heroImage && (
                    <div className="related-card-img">
                      <Image
                        src={r.heroImage}
                        alt={r.title}
                        fill
                        sizes="260px"
                        className="blog-fill-img"
                      />
                    </div>
                  )}
                  <p className="related-card-title">{r.title}</p>
                  <p className="related-card-cta">
                    Read <i className="fa-solid fa-arrow-right" />
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
