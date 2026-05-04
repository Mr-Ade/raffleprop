import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma, CampaignStatus, PaymentGateway } from '@raffleprop/db';
import { Prisma } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { redisCounters, redisCache } from '../../lib/redis';
import { generateSkillQuestions } from '../../services/question-generator.service';
import { getPresignedDownloadUrl } from '../../services/storage.service';

export const adminCampaignsRouter: import('express').Router = Router();
adminCampaignsRouter.use(authenticate, requireAdmin);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const bundleSchema = z.object({
  tickets: z.number().int().min(1),
  price: z.number().min(0),
  label: z.string().min(1),
  savings: z.number().optional(),
});

const skillQuestionItemSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

const createCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  propertyAddress: z.string().min(5),
  propertyState: z.string().min(2),
  propertyLga: z.string().min(2),
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'MIXED_USE']),
  marketValue: z.number().positive(),
  reservePrice: z.number().positive(),
  ticketPrice: z.number().positive(),
  totalTickets: z.number().int().min(100),
  minTickets: z.number().int().min(1),
  fccpcRef: z.string().optional(),
  fctLroRef: z.string().optional(),
  lslgaRef: z.string().optional(),
  escrowBank: z.string().optional(),
  escrowAccountNo: z.string().optional(),
  allowedGateways: z
    .array(z.enum(['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER']))
    .min(1, 'At least one payment gateway must be enabled')
    .default(['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER']),
  // FCCPA §114: at least 5 unique skill questions required
  skillQuestions: z.array(skillQuestionItemSchema).min(5, 'At least 5 skill questions are required (FCCPA §114)'),
  bundles: z.array(bundleSchema).min(1),
  drawDate: z.string().datetime().optional(),
  drawMethod: z.enum(['RANDOM', 'RANDOM_ORG_VERIFIED']).default('RANDOM'),
  // Prisma top-level columns (rich property fields)
  description: z.string().optional(),
  featured: z.boolean().optional(),
  cOfOConfirmed: z.boolean().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  buildingArea: z.number().min(0).optional(),
  propertyFeatures: z.array(z.string()).optional(),
  imageUrls: z.array(z.string()).optional(),
  fccpcApprovalDate: z.string().optional(),
  valuationFirm: z.string().optional(),
  valuationRef: z.string().optional(),
  propertyLawyer: z.string().optional(),
  // Metadata fields (no dedicated Prisma column — stored in skillQuestion.meta)
  toilets: z.number().int().min(0).optional(),
  mapEmbedUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  escrowAccountType: z.string().optional(),
  referralReward: z.number().optional(),
  referralFreeTicketN: z.number().optional(),
  propTypeLabel: z.string().optional(),
});

// ─── GET /api/admin/campaigns ─────────────────────────────────────────────────
adminCampaignsRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt((req.query['page'] as string) ?? '1', 10);
  const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '20', 10), 100);
  const status = req.query['status'] as CampaignStatus | undefined;
  const search = (req.query['search'] as string | undefined)?.trim();
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (search) {
    where['OR'] = [
      { title:         { contains: search, mode: 'insensitive' } },
      { propertyState: { contains: search, mode: 'insensitive' } },
      { propertyLga:   { contains: search, mode: 'insensitive' } },
    ];
  }

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tickets: true } } },
    }),
    prisma.campaign.count({ where }),
  ]);

  const withCounts = await Promise.all(
    campaigns.map(async (c) => {
      const ticketsSold = await redisCounters.getTicketsSold(c.id);
      return { ...c, ticketsSold };
    }),
  );

  res.json({
    success: true,
    data: {
      data: withCounts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ─── GET /api/admin/campaigns/documents ──────────────────────────────────────
adminCampaignsRouter.get('/documents', async (_req: Request, res: Response) => {
  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true, title: true,
      propertyState: true, propertyLga: true,
      status: true,
      documentKeys: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: campaigns });
});

// ─── PATCH /api/admin/campaigns/:id/documents ─────────────────────────────────
adminCampaignsRouter.patch('/:id/documents', async (req: Request, res: Response) => {
  const { docKey, r2Key, issuer, date, ref, expiry } = req.body as {
    docKey: 'cof' | 'nisvReport' | 'surveyPlan' | 'titleClearance';
    r2Key: string;
    issuer: string;
    date: string;
    ref?: string;
    expiry?: string;
  };

  if (!docKey || !r2Key || !issuer || !date) {
    res.status(400).json({ success: false, error: 'docKey, r2Key, issuer, date are required' });
    return;
  }

  const existing = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: { documentKeys: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }

  const current = (existing.documentKeys ?? {}) as Record<string, unknown>;
  const updated = await prisma.campaign.update({
    where: { id: req.params['id'] as string },
    data: {
      documentKeys: {
        ...current,
        [docKey]: { r2Key, issuer, date, ref: ref ?? null, expiry: expiry ?? null },
      } as Prisma.InputJsonValue,
    },
    select: { id: true, documentKeys: true },
  });
  res.json({ success: true, data: updated });
});

// ─── GET /api/admin/campaigns/:id/documents/:docKey ──────────────────────────
adminCampaignsRouter.get('/:id/documents/:docKey', async (req: Request, res: Response) => {
  const validKeys = ['cof', 'nisvReport', 'surveyPlan', 'titleClearance'];
  const docKey = req.params['docKey'] as string;
  if (!validKeys.includes(docKey)) {
    res.status(400).json({ success: false, error: 'Invalid document key' });
    return;
  }
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: { documentKeys: true },
  });
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  const dk = (campaign.documentKeys ?? {}) as Record<string, { r2Key: string } | undefined>;
  const meta = dk[docKey];
  if (!meta?.r2Key) {
    res.status(404).json({ success: false, error: 'Document not uploaded' });
    return;
  }
  const regulatoryKeys = ['cof', 'surveyPlan'];
  const isRegulatory = regulatoryKeys.includes(docKey);
  const url = await getPresignedDownloadUrl(meta.r2Key, isRegulatory, 900);
  res.json({ success: true, data: { url } });
});

// ─── GET /api/admin/campaigns/:id ────────────────────────────────────────────
adminCampaignsRouter.get('/:id', async (req: Request, res: Response) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params['id'] as string } });
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  const ticketsSold = await redisCounters.getTicketsSold(campaign.id);
  res.json({ success: true, data: { ...campaign, ticketsSold } });
});

// ─── POST /api/admin/campaigns ────────────────────────────────────────────────
adminCampaignsRouter.post('/', validate(createCampaignSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createCampaignSchema>;

  // Generate unique slug from title (short random suffix prevents P2002 on duplicate titles)
  const baseSlug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
  const suffix = Math.random().toString(36).slice(2, 7);
  const slug = `${baseSlug}-${suffix}`;

  const {
    skillQuestions,
    allowedGateways,
    // Prisma top-level rich fields
    description, featured, cOfOConfirmed, bedrooms, bathrooms, buildingArea,
    propertyFeatures, imageUrls, fccpcApprovalDate,
    valuationFirm, valuationRef, propertyLawyer,
    // Meta-only fields (no dedicated Prisma column)
    toilets, mapEmbedUrl, videoUrl, escrowAccountType, referralReward, referralFreeTicketN,
    propTypeLabel,
    ...coreBody
  } = body;

  // Store skill questions + meta-only fields in the skillQuestion JSON column
  const skillQuestionData = {
    questions: skillQuestions,
    meta: { toilets, mapEmbedUrl, videoUrl, escrowAccountType, referralReward, referralFreeTicketN, propTypeLabel },
  };

  const campaign = await prisma.campaign.create({
    data: {
      ...coreBody,
      slug,
      skillQuestion: skillQuestionData,
      // Rich property fields stored in proper Prisma columns
      description: description ?? null,
      featured: featured ?? false,
      cOfOConfirmed: cOfOConfirmed ?? null,
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,
      buildingArea: buildingArea ?? null,
      propertyFeatures: propertyFeatures ?? [],
      featuredImageKey: imageUrls?.[0] ?? null,
      galleryKeys: imageUrls ?? [],
      fccpcApprovalDate: fccpcApprovalDate ? new Date(fccpcApprovalDate) : null,
      valuationFirm: valuationFirm ?? null,
      valuationRef: valuationRef ?? null,
      propertyLawyer: propertyLawyer ?? null,
      allowedGateways,
      documentKeys: {},
      createdBy: req.user!.sub,
      drawDate: coreBody.drawDate ? new Date(coreBody.drawDate) : null,
      fccpcRef: coreBody.fccpcRef ?? null,
      lslgaRef: coreBody.lslgaRef ?? null,
      escrowBank: coreBody.escrowBank ?? null,
      escrowAccountNo: coreBody.escrowAccountNo ?? null,
    },
  });

  // Initialise Redis counter
  await redisCounters.setTicketsSold(campaign.id, 0);

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'campaign.created',
      entityType: 'Campaign',
      entityId: campaign.id,
      payload: { title: campaign.title, status: campaign.status, slug: campaign.slug },
      ip: req.ip ?? null,
    },
  });

  res.status(201).json({ success: true, data: campaign });
});

// ─── PUT /api/admin/campaigns/:id ────────────────────────────────────────────
adminCampaignsRouter.put('/:id', validate(createCampaignSchema.partial()), async (req: Request, res: Response) => {
  const existing = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: { status: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  if (existing.status === CampaignStatus.LIVE || existing.status === CampaignStatus.DRAWN) {
    res.status(409).json({ success: false, error: 'Cannot edit a LIVE or DRAWN campaign' });
    return;
  }

  const rawBody = req.body as Record<string, unknown>;

  // Separate out rich property fields and meta-only fields from core Prisma fields
  const {
    skillQuestions,
    allowedGateways: rawAllowedGateways,
    // Prisma top-level rich fields
    description, featured, cOfOConfirmed, bedrooms, bathrooms, buildingArea,
    propertyFeatures, imageUrls, fccpcApprovalDate,
    valuationFirm, valuationRef, propertyLawyer,
    // Meta-only fields
    toilets, mapEmbedUrl, videoUrl, escrowAccountType, referralReward, referralFreeTicketN,
    propTypeLabel,
    drawDate: rawDrawDate,
    ...coreFields
  } = rawBody;

  // Build skillQuestion JSON if questions or meta-only fields are being updated
  let skillQuestionJson: Record<string, unknown> | undefined;
  if (skillQuestions !== undefined || toilets !== undefined || mapEmbedUrl !== undefined ||
      videoUrl !== undefined || escrowAccountType !== undefined ||
      referralReward !== undefined || referralFreeTicketN !== undefined ||
      propTypeLabel !== undefined) {
    const existingRow = await prisma.campaign.findUnique({
      where: { id: req.params['id'] as string },
      select: { skillQuestion: true },
    });
    const existingData = (existingRow?.skillQuestion ?? {}) as Record<string, unknown>;
    const existingMeta = (existingData['meta'] as Record<string, unknown>) ?? {};
    skillQuestionJson = {
      questions: skillQuestions ?? existingData['questions'],
      meta: {
        ...existingMeta,
        ...(toilets !== undefined ? { toilets } : {}),
        ...(mapEmbedUrl !== undefined ? { mapEmbedUrl } : {}),
        ...(videoUrl !== undefined ? { videoUrl } : {}),
        ...(escrowAccountType !== undefined ? { escrowAccountType } : {}),
        ...(referralReward !== undefined ? { referralReward } : {}),
        ...(referralFreeTicketN !== undefined ? { referralFreeTicketN } : {}),
        ...(propTypeLabel !== undefined ? { propTypeLabel } : {}),
      },
    };
  }

  const campaign = await prisma.campaign.update({
    where: { id: req.params['id'] as string },
    data: {
      ...coreFields,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(skillQuestionJson !== undefined ? { skillQuestion: skillQuestionJson as any } : {}),
      ...(rawDrawDate !== undefined
        ? { drawDate: rawDrawDate ? new Date(rawDrawDate as string) : null }
        : {}),
      // Rich property fields → proper Prisma columns
      ...(description !== undefined ? { description: description as string | null } : {}),
      ...(featured !== undefined ? { featured: featured as boolean } : {}),
      ...(cOfOConfirmed !== undefined ? { cOfOConfirmed: cOfOConfirmed as boolean | null } : {}),
      ...(bedrooms !== undefined ? { bedrooms: bedrooms as number | null } : {}),
      ...(bathrooms !== undefined ? { bathrooms: bathrooms as number | null } : {}),
      ...(buildingArea !== undefined ? { buildingArea: buildingArea as number | null } : {}),
      ...(propertyFeatures !== undefined ? { propertyFeatures: propertyFeatures as string[] } : {}),
      ...(imageUrls !== undefined ? { featuredImageKey: (imageUrls as string[])[0] ?? null, galleryKeys: imageUrls as string[] } : {}),
      ...(fccpcApprovalDate !== undefined ? { fccpcApprovalDate: fccpcApprovalDate ? new Date(fccpcApprovalDate as string) : null } : {}),
      ...(valuationFirm !== undefined ? { valuationFirm: valuationFirm as string | null } : {}),
      ...(valuationRef !== undefined ? { valuationRef: valuationRef as string | null } : {}),
      ...(propertyLawyer !== undefined ? { propertyLawyer: propertyLawyer as string | null } : {}),
      ...(rawAllowedGateways !== undefined ? { allowedGateways: rawAllowedGateways as PaymentGateway[] } : {}),
    },
  });

  // Invalidate cached list pages for this campaign's status
  await redisCache.deletePattern('campaigns:*');

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'campaign.updated',
      entityType: 'Campaign',
      entityId: campaign.id,
      payload: { fields: Object.keys(rawBody).filter(k => !['skillQuestions'].includes(k)) },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: campaign });
});

// ─── POST /api/admin/campaigns/:id/publish ───────────────────────────────────
adminCampaignsRouter.post('/:id/publish', async (req: Request, res: Response) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: { status: true, fccpcRef: true, skillQuestion: true, drawDate: true },
  });
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  if (campaign.status !== CampaignStatus.REVIEW) {
    res.status(409).json({
      success: false,
      error: 'Only campaigns in REVIEW status can be published',
    });
    return;
  }
  if (!campaign.fccpcRef) {
    res.status(409).json({ success: false, error: 'FCCPC reference required before publishing' });
    return;
  }

  const updated = await prisma.campaign.update({
    where: { id: req.params['id'] as string },
    data: { status: CampaignStatus.UPCOMING, publishedAt: new Date() },
  });

  await redisCache.deletePattern('campaigns:*');

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'campaign.published',
      entityType: 'Campaign',
      entityId: updated.id,
      payload: { status: CampaignStatus.UPCOMING, fccpcRef: updated.fccpcRef },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── PATCH /api/admin/campaigns/:id/status ───────────────────────────────────
adminCampaignsRouter.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body as { status: CampaignStatus };
  const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
    DRAFT:    ['REVIEW', 'CANCELLED'],
    REVIEW:   ['DRAFT', 'CANCELLED'],           // publish endpoint handles REVIEW → UPCOMING
    UPCOMING: ['LIVE', 'CANCELLED'],            // Go Live or Cancel before sales open
    LIVE:     ['PAUSED', 'CLOSED', 'CANCELLED'],
    PAUSED:   ['LIVE', 'CLOSED', 'CANCELLED'],  // Resume, close, or cancel
    CLOSED:   ['DRAWN'],
    DRAWN:    ['FILED' as CampaignStatus],
    CANCELLED: [],
    FILED:    [],
  } as Record<CampaignStatus, CampaignStatus[]>;

  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: { status: true },
  });
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }

  const allowed = validTransitions[campaign.status] ?? [];
  if (!allowed.includes(status)) {
    res.status(409).json({
      success: false,
      error: `Cannot transition from ${campaign.status} to ${status}`,
    });
    return;
  }

  // When going LIVE, generate the two-phase draw pre-seed.
  // This seed is committed (via its SHA-256 hash) BEFORE any tickets are sold,
  // so the admin cannot grind seeds to pick a preferred winner later.
  const liveExtras = status === CampaignStatus.LIVE ? (() => {
    const drawPreSeed = crypto.randomBytes(32).toString('hex');
    return {
      publishedAt: new Date(),
      drawPreSeed,
      drawPreSeedCommitment: crypto.createHash('sha256').update(drawPreSeed).digest('hex'),
    };
  })() : {};

  const updated = await prisma.campaign.update({
    where: { id: req.params['id'] as string },
    data: {
      status,
      ...liveExtras,
      ...(status === CampaignStatus.CLOSED ? { closedAt: new Date() } : {}),
    },
  });

  // Invalidate all cached campaign list pages
  await redisCache.deletePattern('campaigns:*');

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'campaign.status_changed',
      entityType: 'Campaign',
      entityId: updated.id,
      payload: { from: campaign.status, to: status },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── POST /api/admin/campaigns/:id/generate-questions ────────────────────────
//
// Generates 5 AI-powered skill questions for the campaign using Claude.
// Questions test Nigerian real estate knowledge — not answerable from the
// campaign page, satisfying FCCPA §114 non-trivial skill requirement.
adminCampaignsRouter.post('/:id/generate-questions', async (req: Request, res: Response) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params['id'] as string },
    select: {
      id: true,
      title: true,
      propertyType: true,
      propertyState: true,
      propertyLga: true,
      marketValue: true,
      status: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }

  const count = Math.min(
    Math.max(parseInt((req.body as { count?: string })?.count ?? '5', 10), 5),
    10,
  );

  const questions = await generateSkillQuestions(
    {
      propertyType: campaign.propertyType,
      propertyState: campaign.propertyState,
      propertyLga: campaign.propertyLga,
      marketValue: Number(campaign.marketValue),
      title: campaign.title,
    },
    count,
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'campaign.questions_generated',
      entityType: 'Campaign',
      entityId: campaign.id,
      payload: { count: questions.length, model: 'claude-haiku-4-5-20251001' },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: { questions } });
});
