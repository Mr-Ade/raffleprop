import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, ContentStatus } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';

export const adminInfluencersRouter: import('express').Router = Router();
adminInfluencersRouter.use(authenticate, requireAdmin);

// ── Schemas ───────────────────────────────────────────────────────────────────

const createInfluencerSchema = z.object({
  name:           z.string().min(2).max(100),
  email:          z.string().email().optional(),
  phone:          z.string().optional(),
  handle:         z.string().optional(),
  platforms:      z.array(z.enum(['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'TWITTER_X', 'FACEBOOK'])).min(1),
  followerCount:  z.number().int().min(0).optional(),
  engagementRate: z.number().min(0).max(100).optional(),
});

const createCampaignLinkSchema = z.object({
  campaignId:    z.string().uuid(),
  campaignTitle: z.string().min(1).max(200),
});

const patchCampaignLinkSchema = z.object({
  agreementSigned:    z.boolean().optional(),
  contentStatus:      z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED']).optional(),
  contentUrl:         z.string().url().nullish(),
  impressions:        z.number().int().min(0).nullish(),
  clicks:             z.number().int().min(0).nullish(),
  conversions:        z.number().int().min(0).nullish(),
});

// ── GET /api/admin/influencers ────────────────────────────────────────────────
adminInfluencersRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const influencers = await prisma.influencer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { campaigns: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ success: true, data: influencers });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load influencers'));
  }
});

// ── POST /api/admin/influencers ───────────────────────────────────────────────
adminInfluencersRouter.post('/', validate(createInfluencerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as z.infer<typeof createInfluencerSchema>;
    const influencer = await prisma.influencer.create({
      data: {
        ...body,
        email:          body.email          ?? null,
        phone:          body.phone          ?? null,
        handle:         body.handle         ?? null,
        followerCount:  body.followerCount  ?? null,
        engagementRate: body.engagementRate ?? null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId:    req.user!.sub,
        action:     'influencer.created',
        entityType: 'Influencer',
        entityId:   influencer.id,
        payload:    { name: influencer.name, platforms: influencer.platforms },
        ip:         req.ip ?? null,
      },
    });
    res.status(201).json({ success: true, data: influencer });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to create influencer'));
  }
});

// ── PUT /api/admin/influencers/:id ────────────────────────────────────────────
adminInfluencersRouter.put(
  '/:id',
  validate(createInfluencerSchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof createInfluencerSchema>;
      const influencer = await prisma.influencer.update({
        where: { id: req.params['id'] as string },
        data: {
          ...body,
          email:          body.email          ?? null,
          phone:          body.phone          ?? null,
          handle:         body.handle         ?? null,
          followerCount:  body.followerCount  ?? null,
          engagementRate: body.engagementRate ?? null,
        },
      });
      res.json({ success: true, data: influencer });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        return next(new AppError(404, 'Influencer not found'));
      }
      next(new AppError(500, 'Failed to update influencer'));
    }
  },
);

// ── POST /api/admin/influencers/:id/campaigns ─────────────────────────────────
adminInfluencersRouter.post(
  '/:id/campaigns',
  validate(createCampaignLinkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof createCampaignLinkSchema>;
      const influencerId = req.params['id'] as string;

      const exists = await prisma.influencer.findUnique({ where: { id: influencerId }, select: { id: true } });
      if (!exists) return next(new AppError(404, 'Influencer not found'));

      const link = await prisma.influencerCampaign.create({
        data: { influencerId, campaignId: body.campaignId, campaignTitle: body.campaignTitle },
      });
      res.status(201).json({ success: true, data: link });
    } catch (err) {
      next(err instanceof AppError ? err : new AppError(500, 'Failed to link campaign'));
    }
  },
);

// ── PATCH /api/admin/influencers/campaigns/:linkId ────────────────────────────
adminInfluencersRouter.patch(
  '/campaigns/:linkId',
  validate(patchCampaignLinkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof patchCampaignLinkSchema>;
      const link = await prisma.influencerCampaign.update({
        where: { id: req.params['linkId'] as string },
        data: body,
      });
      res.json({ success: true, data: link });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        return next(new AppError(404, 'Campaign link not found'));
      }
      next(new AppError(500, 'Failed to update campaign link'));
    }
  },
);

// ── DELETE /api/admin/influencers/campaigns/:linkId ───────────────────────────
// Must be defined BEFORE /:id to avoid route conflict
adminInfluencersRouter.delete(
  '/campaigns/:linkId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.influencerCampaign.delete({
        where: { id: req.params['linkId'] as string },
      });
      res.json({ success: true });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        return next(new AppError(404, 'Campaign link not found'));
      }
      next(new AppError(500, 'Failed to remove campaign link'));
    }
  },
);

// ── DELETE /api/admin/influencers/:id ─────────────────────────────────────────
adminInfluencersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const influencer = await prisma.influencer.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!influencer) return next(new AppError(404, 'Influencer not found'));

    await prisma.influencerCampaign.deleteMany({ where: { influencerId: id } });
    await prisma.influencer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId:    req.user!.sub,
        action:     'influencer.deleted',
        entityType: 'Influencer',
        entityId:   id,
        payload:    { name: influencer.name },
        ip:         req.ip ?? null,
      },
    });
    res.json({ success: true });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to delete influencer'));
  }
});
