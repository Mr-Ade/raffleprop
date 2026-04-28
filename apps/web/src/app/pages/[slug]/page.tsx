import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { cms, type CmsPage } from '@/lib/cms';

export const revalidate = 600;

// ─── Block types ──────────────────────────────────────────────────────────────

interface HeadingBlock { type: 'heading'; level?: 1 | 2 | 3 | 4; text: string }
interface TextBlock    { type: 'text'; html?: string; text?: string }
interface ImageBlock   { type: 'image'; key: string; alt?: string; caption?: string }
interface DividerBlock { type: 'divider' }
interface CalloutBlock { type: 'callout'; variant?: 'info' | 'warning' | 'success'; text: string }
interface ListBlock    { type: 'list'; style?: 'bullet' | 'ordered'; items: string[] }

type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | DividerBlock
  | CalloutBlock
  | ListBlock
  | { type: string; [key: string]: unknown };

const R2_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

// ─── Block renderers ──────────────────────────────────────────────────────────

function RenderBlock({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case 'heading': {
      const b = block as HeadingBlock;
      const level = b.level ?? 2;
      const style: React.CSSProperties = {
        fontWeight: 800,
        marginTop: '2rem',
        marginBottom: '0.75rem',
        letterSpacing: '-0.02em',
        fontSize: level === 1 ? '2rem' : level === 2 ? '1.5rem' : level === 3 ? '1.2rem' : '1.05rem',
      };
      if (level === 1) return <h1 style={style}>{b.text}</h1>;
      if (level === 2) return <h2 style={style}>{b.text}</h2>;
      if (level === 3) return <h3 style={style}>{b.text}</h3>;
      return <h4 style={style}>{b.text}</h4>;
    }

    case 'text': {
      const b = block as TextBlock;
      if (b.html) {
        return (
          <div
            style={{ lineHeight: 1.75, marginBottom: '1rem', color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.html) }}
          />
        );
      }
      return (
        <p style={{ lineHeight: 1.75, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          {b.text}
        </p>
      );
    }

    case 'image': {
      const b = block as ImageBlock;
      const src = b.key.startsWith('http') ? b.key : `${R2_URL}/${b.key}`;
      return (
        <figure style={{ margin: '2rem 0', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={b.alt ?? ''}
            style={{ maxWidth: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}
          />
          {b.caption && (
            <figcaption style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {b.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'divider':
      return (
        <hr
          key={index}
          style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '2.5rem 0' }}
        />
      );

    case 'callout': {
      const b = block as CalloutBlock;
      const variant = b.variant ?? 'info';
      const colors = {
        info:    { bg: '#eff6ff', border: '#bfdbfe', icon: 'fa-circle-info',         iconColor: '#3b82f6' },
        warning: { bg: '#fffbeb', border: '#fde68a', icon: 'fa-triangle-exclamation', iconColor: '#d97706' },
        success: { bg: 'var(--green-50)', border: 'var(--green-100)', icon: 'fa-circle-check', iconColor: 'var(--green-primary)' },
      }[variant];
      return (
        <div style={{
          background: colors.bg, border: `1px solid ${colors.border}`,
          borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          margin: '1.5rem 0',
        }}>
          <i className={`fa-solid ${colors.icon}`} style={{ color: colors.iconColor, marginTop: '0.2rem', flexShrink: 0 }} />
          <p style={{ margin: 0, lineHeight: 1.65, fontSize: '0.9375rem' }}>{b.text}</p>
        </div>
      );
    }

    case 'list': {
      const b = block as ListBlock;
      const Tag = b.style === 'ordered' ? 'ol' : 'ul';
      return (
        <Tag style={{ paddingLeft: '1.5rem', margin: '1rem 0', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
          {b.items.map((item, i) => <li key={i} style={{ marginBottom: '0.375rem' }}>{item}</li>)}
        </Tag>
      );
    }

    default:
      return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const page = await cms.getPage(slug);
  if (!page) return { title: 'Page Not Found' };
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDesc ?? undefined,
  };
}

export default async function CmsPageRoute(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page: CmsPage | null = await cms.getPage(slug);
  if (!page) notFound();

  const blocks: Block[] = Array.isArray(page.content)
    ? (page.content as Block[])
    : [];

  const updatedDate = new Date(page.updatedAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <main id="main-content">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)',
        padding: '4rem 1.5rem 3rem',
        paddingTop: 'calc(4rem + 65px)',
      }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)',
              textDecoration: 'none', marginBottom: '1.25rem',
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.75rem' }} />
            Back to Home
          </Link>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900,
            color: '#fff', margin: '0 0 0.75rem', letterSpacing: '-0.03em',
          }}>
            {page.title}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
            Last updated {updatedDate}
          </p>
        </div>
      </div>

      {/* Content */}
      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          {blocks.length > 0 ? (
            blocks.map((block, i) => <RenderBlock key={i} block={block} index={i} />)
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              This page has no content yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
