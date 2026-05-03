import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cms, type CmsPage } from '@/lib/cms';

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

  if (!page) return notFound();

  const rawHtml = typeof page.content === 'string' ? page.content : '';
  const heroImg = extractFirstImage(rawHtml);
  const bodyHtml = heroImg ? stripFirstImage(rawHtml) : rawHtml;

  let dateStr = '';
  try {
    dateStr = new Date(page.updatedAt).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    dateStr = page.updatedAt ? String(page.updatedAt).slice(0, 10) : '';
  }

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

      {/* Hero image — use plain <img> because the src may be a relative /blog/images/... path
          or a data: URL, neither of which works reliably with next/image fill mode. */}
      {heroImg && (
        <div className="blog-post-img-wrap">
          <div className="container blog-post-img-container">
            <div className="blog-post-img-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImg.src}
                alt={heroImg.alt || page.title}
                loading="eager"
                className="blog-fill-img blog-hero-img-native"
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.heroImage} alt={r.title} className="blog-fill-img blog-hero-img-native" />
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
