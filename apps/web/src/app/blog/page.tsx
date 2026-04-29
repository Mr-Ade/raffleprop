import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { cms } from '@/lib/cms';
import type { CmsPage } from '@/lib/cms';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog — RaffleProp',
  description: 'Nigerian real estate insights, property investment tips, FCCPA compliance guides, and winner stories.',
};

interface Props {
  searchParams: Promise<{ topic?: string; page?: string }>;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function topicColor(topic: string | null | undefined): { bg: string; color: string } {
  if (!topic) return { bg: 'var(--green-100)', color: 'var(--green-primary)' };
  const h = [...topic].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palettes = [
    { bg: '#ede9fe', color: '#6d28d9' },
    { bg: '#dbeafe', color: '#1d4ed8' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#fce7f3', color: '#9d174d' },
    { bg: '#d1fae5', color: '#065f46' },
    { bg: '#ffedd5', color: '#9a3412' },
    { bg: '#e0f2fe', color: '#075985' },
  ];
  return palettes[h % palettes.length]!;
}

// ─── Shared card component ────────────────────────────────────────────────────

function BlogCard({ post, size = 'normal' }: { post: Omit<CmsPage, 'content'>; size?: 'normal' | 'large' }) {
  const { bg: catBg, color: catColor } = topicColor(post.topic);
  const date = new Date(post.updatedAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const imgHeight = size === 'large' ? 240 : 200;

  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <article
        className="blog-card"
        style={{
          display: 'flex', flexDirection: 'column',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', height: '100%',
          transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: imgHeight, flexShrink: 0, overflow: 'hidden' }}>
          {post.heroImage ? (
            <Image
              src={post.heroImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              style={{ objectFit: 'cover', transition: 'transform 0.35s' }}
              className="blog-card-img"
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-newspaper" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.3)' }} />
            </div>
          )}
        </div>

        <div style={{ padding: '1.25rem 1.375rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1 }}>
          {post.topic && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0.2rem 0.625rem',
              background: catBg, color: catColor,
              borderRadius: 100, fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.02em', width: 'fit-content',
            }}>
              {post.topic}
            </span>
          )}

          <h2 style={{
            fontSize: size === 'large' ? '1.125rem' : '1.0625rem',
            fontWeight: 800, color: 'var(--text-primary)',
            lineHeight: 1.35, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {post.title}
          </h2>

          {post.metaDesc && (
            <p style={{
              fontSize: '0.875rem', color: 'var(--text-muted)',
              lineHeight: 1.55, margin: 0,
              display: '-webkit-box', WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {post.metaDesc}
            </p>
          )}

          <div style={{
            marginTop: 'auto', paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <i className="fa-regular fa-calendar" />{date}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--green-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Read <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem' }} />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPage({ searchParams }: Props) {
  const { topic: rawTopic, page: rawPage } = await searchParams;
  const activeTopic = rawTopic ?? null;
  const currentPage = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const POSTS_PER_PAGE = 6;

  const [topics, featuredResult, topicResult] = await Promise.all([
    cms.getTopics(),
    cms.getFeaturedPages(3),
    activeTopic
      ? cms.getPagesPaginated({ topic: activeTopic, page: currentPage, limit: POSTS_PER_PAGE })
      : Promise.resolve(null),
  ]);

  const featuredPosts = featuredResult?.data ?? [];
  const topicPosts    = topicResult?.data ?? [];
  const totalPages    = topicResult?.meta.totalPages ?? 1;
  const totalPosts    = topicResult?.meta.total ?? 0;

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (activeTopic) params.set('topic', activeTopic);
    params.set('page', String(p));
    return `/blog?${params.toString()}`;
  }

  function topicHref(label: string) {
    return `/blog?topic=${encodeURIComponent(label)}`;
  }

  return (
    <main id="main-content">

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '4rem 1.5rem 3rem', paddingTop: 'calc(4rem + 65px)' }}>
        <div className="container">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-newspaper" /> Blog
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#fff', margin: '0.5rem 0 0.75rem', letterSpacing: '-0.03em' }}>
            RaffleProp Blog
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', maxWidth: 520, lineHeight: 1.6 }}>
            Nigerian real estate insights, property tips, FCCPA compliance guides, and winner stories.
          </p>
        </div>
      </div>

      {/* ── Featured posts (shown when no topic filter) ── */}
      {!activeTopic && featuredPosts.length > 0 && (
        <section style={{ padding: '3rem 1.5rem 2rem', borderBottom: '1px solid var(--border-light)' }}>
          <div className="container" style={{ maxWidth: 1100 }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: 4, height: 22, background: 'var(--green-primary)', borderRadius: 2, display: 'block' }} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>Latest Articles</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.75rem',
            }}>
              {featuredPosts.map((post) => (
                <BlogCard key={post.id} post={post} size="large" />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link
                href="#topics"
                style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--green-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Browse all articles <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem' }} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Topics grid ── */}
      {topics.length > 0 && (
        <section id="topics" style={{ padding: '2.5rem 1.5rem', background: activeTopic ? 'var(--bg-secondary)' : 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 1100 }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: 4, height: 22, background: 'var(--green-primary)', borderRadius: 2, display: 'block' }} />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>Browse by Topic</h2>
              </div>
              {activeTopic && (
                <Link href="/blog" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fa-solid fa-xmark" /> Clear filter
                </Link>
              )}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.875rem',
            }}>
              {topics.map((t) => {
                const active = activeTopic === t.label;
                const { bg, color } = topicColor(t.label);
                return (
                  <Link
                    key={t.label}
                    href={active ? '/blog' : topicHref(t.label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      border: active ? '2px solid var(--green-primary)' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius)',
                      background: active ? 'var(--green-50)' : 'var(--card-bg)',
                      textDecoration: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      boxShadow: active ? '0 0 0 3px rgba(13,94,48,0.08)' : 'none',
                    }}
                    className="topic-pill"
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: bg, color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '0.875rem',
                    }}>
                      <i className={`fa-solid ${t.icon || 'fa-tag'}`} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {t.label}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {t.count} {t.count === 1 ? 'article' : 'articles'}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Topic filtered posts ── */}
      {activeTopic && (
        <section style={{ padding: '2.5rem 1.5rem 5rem' }}>
          <div className="container" style={{ maxWidth: 1100 }}>

            {/* Section header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: 4, height: 22, background: 'var(--green-primary)', borderRadius: 2, display: 'block' }} />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>
                  {activeTopic}
                </h2>
              </div>
              {totalPosts > 0 && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {totalPosts} {totalPosts === 1 ? 'article' : 'articles'}
                </span>
              )}
            </div>

            {/* Post grid */}
            {topicPosts.length > 0 ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.75rem',
                }}>
                  {topicPosts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.75rem', marginTop: '3rem',
                  }}>
                    {/* Prev arrow */}
                    {currentPage > 1 ? (
                      <Link
                        href={pageHref(currentPage - 1)}
                        style={{
                          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
                          background: 'var(--card-bg)', color: 'var(--text-primary)',
                          textDecoration: 'none', transition: 'border-color 0.15s',
                          fontSize: '0.875rem',
                        }}
                        aria-label="Previous page"
                        className="pagination-arrow"
                      >
                        <i className="fa-solid fa-chevron-left" />
                      </Link>
                    ) : (
                      <span style={{
                        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
                        background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                        fontSize: '0.875rem', opacity: 0.5,
                      }}>
                        <i className="fa-solid fa-chevron-left" />
                      </span>
                    )}

                    {/* Page indicator */}
                    <span style={{
                      fontSize: '0.9375rem', fontWeight: 700,
                      color: 'var(--text-primary)',
                      padding: '0 0.75rem',
                    }}>
                      Page {currentPage} of {totalPages}
                    </span>

                    {/* Next arrow */}
                    {currentPage < totalPages ? (
                      <Link
                        href={pageHref(currentPage + 1)}
                        style={{
                          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--green-primary)', borderRadius: 'var(--radius)',
                          background: 'var(--green-primary)', color: '#fff',
                          textDecoration: 'none', transition: 'opacity 0.15s',
                          fontSize: '0.875rem',
                        }}
                        aria-label="Next page"
                        className="pagination-arrow"
                      >
                        <i className="fa-solid fa-chevron-right" />
                      </Link>
                    ) : (
                      <span style={{
                        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
                        background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                        fontSize: '0.875rem', opacity: 0.5,
                      }}>
                        <i className="fa-solid fa-chevron-right" />
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', margin: '0 auto 1.25rem',
                }}>
                  <i className="fa-solid fa-pen-nib" style={{ color: 'var(--green-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>No articles yet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  We haven&apos;t published any articles in this topic yet. Check back soon.
                </p>
                <Link href="/blog" className="btn btn-outline btn-sm">
                  Browse all topics
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Empty state (no topics, no filter) ── */}
      {!activeTopic && topics.length === 0 && featuredPosts.length === 0 && (
        <section style={{ padding: '5rem 1.5rem 6rem', textAlign: 'center' }}>
          <div className="container" style={{ maxWidth: 520 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--green-50)', border: '1px solid var(--green-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', margin: '0 auto 1.5rem',
            }}>
              <i className="fa-solid fa-pen-nib" style={{ color: 'var(--green-primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Articles Coming Soon</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
              We&apos;re writing in-depth guides on Nigerian property law, real estate investment, and FCCPA compliance.
            </p>
            <Link href="/campaigns" className="btn btn-primary">
              <i className="fa-solid fa-ticket" style={{ marginRight: '0.5rem' }} />
              Browse Active Campaigns
            </Link>
          </div>
        </section>
      )}

    </main>
  );
}
