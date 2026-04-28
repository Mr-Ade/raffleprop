/**
 * Public content API — no authentication required.
 * All responses include cache headers for CDN/ISR edge caching.
 * Filters: published=true / enabled=true only.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@raffleprop/db';
import { AppError } from '../middleware/errorHandler';

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

publicContentRouter.get('/pages', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=120');
    const pages = await prisma.contentPage.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, slug: true, title: true, metaTitle: true, metaDesc: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: pages });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load pages'));
  }
});

publicContentRouter.get('/pages/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=120');
    const slug = req.params['slug'] as string;
    const page = await prisma.contentPage.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true, slug: true, title: true, content: true, metaTitle: true, metaDesc: true, updatedAt: true },
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
