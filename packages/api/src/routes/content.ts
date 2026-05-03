/**
 * Public content API — no authentication required.
 * All responses include cache headers for CDN/ISR edge caching.
 * Filters: published=true / enabled=true only.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@raffleprop/db';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

export const publicContentRouter: Router = Router();

const CACHE = 'public, s-maxage=300, stale-while-revalidate=60';

function cache(res: Response) {
  res.setHeader('Cache-Control', CACHE);
}

// ─── Site Settings (non-sensitive subset) ────────────────────────────────────

publicContentRouter.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      res.json({ success: true, data: null });
      return;
    }
    const { id: _id, updatedAt: _updatedAt, updatedBy: _updatedBy, ...publicSettings } = settings;
    res.json({ success: true, data: publicSettings });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load settings'));
  }
});

// ─── FAQs ─────────────────────────────────────────────────────────────────────

publicContentRouter.get('/faqs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const faqs = await prisma.faq.findMany({
      where: { published: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
      select: { id: true, question: true, answer: true, category: true, order: true },
    });
    res.json({ success: true, data: faqs });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load FAQs'));
  }
});

// ─── Testimonials ─────────────────────────────────────────────────────────────

publicContentRouter.get('/testimonials', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const testimonials = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }],
      select: {
        id: true,
        authorName: true,
        authorTitle: true,
        body: true,
        rating: true,
        avatarKey: true,
        featured: true,
        order: true,
      },
    });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load testimonials'));
  }
});

// ─── Winner Stories ───────────────────────────────────────────────────────────

publicContentRouter.get('/winners', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const winners = await prisma.winnerStory.findMany({
      where: { published: true },
      orderBy: [{ featured: 'desc' }, { drawDate: 'desc' }],
      select: {
        id: true,
        winnerName: true,
        propertyState: true,
        propertyTitle: true,
        prize: true,
        blurb: true,
        imageKey: true,
        drawDate: true,
        drawArchiveUrl: true,
        featured: true,
      },
    });
    res.json({ success: true, data: winners });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load winners'));
  }
});

// ─── Trust Badges ─────────────────────────────────────────────────────────────

publicContentRouter.get('/trust-badges', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const badges = await prisma.trustBadge.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' },
      select: { id: true, text: true, iconClass: true, order: true },
    });
    res.json({ success: true, data: badges });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load trust badges'));
  }
});

// ─── How It Works ─────────────────────────────────────────────────────────────

publicContentRouter.get('/how-it-works', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const steps = await prisma.howItWorksStep.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      select: { id: true, stepNumber: true, icon: true, title: true, description: true, order: true },
    });
    res.json({ success: true, data: steps });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load steps'));
  }
});

// ─── Team Members ─────────────────────────────────────────────────────────────

publicContentRouter.get('/team', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const team = await prisma.teamMember.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        title: true,
        bio: true,
        photoKey: true,
        initials: true,
        avatarColor: true,
        linkedinUrl: true,
        order: true,
      },
    });
    res.json({ success: true, data: team });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load team'));
  }
});

// ─── Company Milestones ───────────────────────────────────────────────────────

publicContentRouter.get('/milestones', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    cache(res);
    const milestones = await prisma.companyMilestone.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      select: { id: true, year: true, heading: true, description: true, order: true },
    });
    res.json({ success: true, data: milestones });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load milestones'));
  }
});

// ─── CMS Pages ────────────────────────────────────────────────────────────────

function extractHeroImage(content: unknown): string | null {
  if (typeof content !== 'string') return null;
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  return match?.[1] ?? null;
}

// GET /api/content/pages?topic=X&page=1&limit=6&featured=3
publicContentRouter.get('/pages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    const topic    = typeof req.query['topic']    === 'string' ? req.query['topic']    : undefined;
    const page     = Math.max(1, parseInt(typeof req.query['page']     === 'string' ? req.query['page']     : '1',  10) || 1);
    const limit    = Math.min(50, parseInt(typeof req.query['limit']   === 'string' ? req.query['limit']   : '20', 10) || 20);
    const featured = parseInt(typeof req.query['featured'] === 'string' ? req.query['featured'] : '0', 10) || 0;

    const where = {
      status: 'PUBLISHED' as const,
      ...(topic ? { topic } : {}),
    };
    const select = { id: true, slug: true, title: true, topic: true, metaTitle: true, metaDesc: true, updatedAt: true, content: true };

    // Featured mode: return first N without pagination meta
    if (featured > 0) {
      const rows = await (prisma.contentPage as any).findMany({
        where,
        select,
        orderBy: { updatedAt: 'desc' as const },
        take: featured,
      }) as Array<{ content: unknown; [key: string]: unknown }>;
      const result = rows.map(({ content, ...rest }) => ({ ...rest, heroImage: extractHeroImage(content) }));
      res.json({ success: true, data: result, meta: { total: result.length, page: 1, limit: featured, totalPages: 1 } });
      return;
    }

    const [total, rows] = await Promise.all([
      (prisma.contentPage as any).count({ where }),
      (prisma.contentPage as any).findMany({
        where,
        select,
        orderBy: { updatedAt: 'desc' as const },
        skip: (page - 1) * limit,
        take: limit,
      }) as Promise<Array<{ content: unknown; [key: string]: unknown }>>,
    ]);

    const result = (rows as Array<{ content: unknown; [key: string]: unknown }>).map(({ content, ...rest }) => ({
      ...rest,
      heroImage: extractHeroImage(content),
    }));

    res.json({
      success: true,
      data: result,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load pages'));
  }
});

// GET /api/content/topics — topics from settings + post count per topic
publicContentRouter.get('/topics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60');
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' }, select: { blogTopics: true } });
    const rawTopics = (settings?.blogTopics ?? []) as Array<{ icon?: string; label?: string }>;

    // Count published posts per topic in one query
    const counts = await (prisma.contentPage as any).groupBy({
      by: ['topic'],
      where: { status: 'PUBLISHED', topic: { not: null } },
      _count: { _all: true },
    }) as Array<{ topic: string | null; _count: { _all: number } }>;

    const countMap: Record<string, number> = {};
    for (const row of counts) {
      if (row.topic) countMap[row.topic] = row._count._all;
    }

    const topics = rawTopics
      .filter((t) => t.label)
      .map((t) => ({ icon: t.icon ?? '', label: t.label!, count: countMap[t.label!] ?? 0 }));

    res.json({ success: true, data: topics });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load topics'));
  }
});

publicContentRouter.get('/pages/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=120');
    const slug = req.params['slug'] as string;
    const page = await (prisma.contentPage as any).findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true, slug: true, title: true, topic: true, content: true, metaTitle: true, metaDesc: true, updatedAt: true },
    });
    if (!page) {
      res.status(404).json({ success: false, error: 'Page not found' });
      return;
    }
    res.json({ success: true, data: page });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load page'));
  }
});

// ─── Blog Comments ────────────────────────────────────────────────────────────

// GET /api/content/pages/:slug/comments — public, no auth
publicContentRouter.get('/pages/:slug/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const slug = req.params['slug'] as string;
    const comments = await (prisma.blogComment as any).findMany({
      where: { pageSlug: slug, approved: true, parentId: null },
      orderBy: { createdAt: 'desc' as const },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, fullName: true } },
        replies: {
          where: { approved: true },
          orderBy: { createdAt: 'asc' as const },
          select: {
            id: true,
            body: true,
            createdAt: true,
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    res.json({ success: true, data: comments });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load comments'));
  }
});

// POST /api/content/pages/:slug/comments — authenticated users only
publicContentRouter.post('/pages/:slug/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params['slug'] as string;
    const body = typeof req.body['body'] === 'string' ? req.body['body'].trim() : '';
    if (!body || body.length > 2000) {
      throw new AppError(400, 'Comment body must be between 1 and 2000 characters');
    }
    const page = await (prisma.contentPage as any).findFirst({ where: { slug, status: 'PUBLISHED' }, select: { slug: true } });
    if (!page) throw new AppError(404, 'Blog post not found');

    const comment = await (prisma.blogComment as any).create({
      data: { pageSlug: slug, userId: req.user!.sub, body },
      select: {
        id: true, body: true, createdAt: true,
        user: { select: { id: true, fullName: true } },
        replies: true,
      },
    });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to post comment'));
  }
});

// POST /api/content/comments/:id/reply — authenticated users only
publicContentRouter.post('/comments/:id/reply', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parentId = req.params['id'] as string;
    const body = typeof req.body['body'] === 'string' ? req.body['body'].trim() : '';
    if (!body || body.length > 2000) {
      throw new AppError(400, 'Reply body must be between 1 and 2000 characters');
    }
    const parent = await (prisma.blogComment as any).findUnique({ where: { id: parentId }, select: { id: true, pageSlug: true, parentId: true } });
    if (!parent) throw new AppError(404, 'Comment not found');
    // Only allow one level of nesting
    if (parent.parentId) throw new AppError(400, 'Cannot reply to a reply');

    const reply = await (prisma.blogComment as any).create({
      data: { pageSlug: parent.pageSlug, userId: req.user!.sub, body, parentId },
      select: {
        id: true, body: true, createdAt: true,
        user: { select: { id: true, fullName: true } },
      },
    });
    res.status(201).json({ success: true, data: reply });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to post reply'));
  }
});
