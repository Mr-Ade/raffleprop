import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

export const adminContentRouter: import('express').Router = Router();
adminContentRouter.use(authenticate, requireAdmin);

// ─── Site Settings ────────────────────────────────────────────────────────────

const heroStatItem  = z.object({ label: z.string(), value: z.string() });
const valueItem     = z.object({ icon: z.string(), title: z.string(), body: z.string() });
const topicItem     = z.object({ icon: z.string(), label: z.string() });

const siteSettingsSchema = z.object({
  siteName:          z.string().min(1).max(100).optional(),
  tagline:           z.string().max(200).optional().nullable(),
  supportEmail:      z.string().email().optional().nullable(),
  supportPhone:      z.string().max(30).optional().nullable(),
  whatsappNumber:    z.string().max(30).optional().nullable(),
  twitterUrl:        z.string().url().optional().nullable(),
  instagramUrl:      z.string().url().optional().nullable(),
  facebookUrl:       z.string().url().optional().nullable(),
  youtubeUrl:        z.string().url().optional().nullable(),
  tiktokUrl:         z.string().url().optional().nullable(),
  linkedinUrl:       z.string().url().optional().nullable(),
  maintenanceMode:   z.boolean().optional(),
  maintenanceBanner: z.string().max(500).optional().nullable(),
  footerTagline:     z.string().max(300).optional().nullable(),
  termsUrl:          z.string().url().optional().nullable(),
  privacyUrl:        z.string().url().optional().nullable(),
  // Homepage sections
  heroSection:         z.object({ badgeText: z.string(), heading: z.string(), subheading: z.string() }).optional().nullable(),
  heroStats:           z.array(heroStatItem).length(3).optional().nullable(),
  statsSection:        z.array(heroStatItem).length(4).optional().nullable(),
  ctaBanner:           z.object({ heading: z.string(), subtext: z.string(), primaryButtonLabel: z.string(), secondaryButtonLabel: z.string() }).optional().nullable(),
  notificationSection: z.object({ heading: z.string(), subtext: z.string() }).optional().nullable(),
  // Company / compliance
  companyInfo: z.object({
    cacNumber: z.string().optional(), fccpcRef: z.string().optional(),
    lslgaRef: z.string().optional(), scumlRef: z.string().optional(),
    brandDescription: z.string().optional(), paymentNote: z.string().optional(),
    copyrightText: z.string().optional(), lawyerName: z.string().optional(),
    lawyerFirm: z.string().optional(), dpoName: z.string().optional(),
    privacyEmail: z.string().optional(),
    registeredAddress: z.string().optional(),
    legalName: z.string().optional(),
  }).optional().nullable(),
  // About page
  aboutMission: z.object({ heading: z.string(), paragraphs: z.array(z.string()) }).optional().nullable(),
  aboutValues:  z.array(valueItem).optional().nullable(),
  // Blog
  blogTopics: z.array(topicItem).optional().nullable(),
  // Document vault
  documentVault: z.array(z.object({
    slot:   z.string(),
    label:  z.string(),
    url:    z.string().url().optional().nullable(),
    r2Key:  z.string().optional().nullable(),
  })).optional().nullable(),
});

// GET /api/admin/content/settings
adminContentRouter.get('/settings', async (_req: Request, res: Response) => {
  const settings = await prisma.siteSettings.upsert({
    where:  { id: 'global' },
    update: {},
    create: { id: 'global' },
  });
  res.json({ success: true, data: settings });
});

// PUT /api/admin/content/settings
adminContentRouter.put('/settings', validate(siteSettingsSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof siteSettingsSchema>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = await prisma.siteSettings.upsert({
    where:  { id: 'global' },
    update: { ...body, updatedBy: req.user!.sub } as any,
    create: { id: 'global', ...body, updatedBy: req.user!.sub } as any,
  });
  res.json({ success: true, data: settings });
});

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const faqSchema = z.object({
  question:  z.string().min(5).max(500),
  answer:    z.string().min(10),
  category:  z.string().max(100).default('General'),
  order:     z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});

adminContentRouter.get('/faqs', async (req: Request, res: Response) => {
  const category = req.query['category'] as string | undefined;
  const faqs = await prisma.faq.findMany({
    where:   category ? { category } : {},
    orderBy: [{ category: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ success: true, data: faqs });
});

adminContentRouter.post('/faqs', validate(faqSchema), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faq = await prisma.faq.create({
    data: { ...(req.body as z.infer<typeof faqSchema>), createdBy: req.user!.sub } as any,
  });
  res.status(201).json({ success: true, data: faq });
});

adminContentRouter.put('/faqs/:id', validate(faqSchema.partial()), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faq = await prisma.faq.update({ where: { id: req.params['id'] as string }, data: req.body as any });
  res.json({ success: true, data: faq });
});

adminContentRouter.delete('/faqs/:id', async (req: Request, res: Response) => {
  await prisma.faq.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/faqs/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.faq.update({ where: { id: item.id }, data: { order: item.order } })));
  res.json({ success: true });
});

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonialSchema = z.object({
  authorName:  z.string().min(2).max(100),
  authorTitle: z.string().max(100).optional().nullable(),
  avatarKey:   z.string().optional().nullable(),
  body:        z.string().min(10).max(1000),
  rating:      z.number().int().min(1).max(5).default(5),
  published:   z.boolean().default(false),
  featured:    z.boolean().default(false),
  order:       z.number().int().min(0).default(0),
});

adminContentRouter.get('/testimonials', async (_req: Request, res: Response) => {
  const testimonials = await prisma.testimonial.findMany({
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: testimonials });
});

adminContentRouter.post('/testimonials', validate(testimonialSchema), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testimonial = await prisma.testimonial.create({ data: req.body as any });
  res.status(201).json({ success: true, data: testimonial });
});

adminContentRouter.put('/testimonials/:id', validate(testimonialSchema.partial()), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testimonial = await prisma.testimonial.update({ where: { id: req.params['id'] as string }, data: req.body as any });
  res.json({ success: true, data: testimonial });
});

adminContentRouter.delete('/testimonials/:id', async (req: Request, res: Response) => {
  await prisma.testimonial.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/testimonials/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.testimonial.update({ where: { id: item.id }, data: { order: item.order } })));
  res.json({ success: true });
});

// ─── Winner Stories ───────────────────────────────────────────────────────────

const winnerStorySchema = z.object({
  winnerName:    z.string().min(2).max(100),
  propertyTitle: z.string().min(3).max(200),
  propertyState: z.string().optional().nullable(),
  prize:         z.string().max(100).optional().nullable(),
  drawDate:      z.string().datetime().optional().nullable(),
  imageKey:      z.string().optional().nullable(),
  blurb:          z.string().max(500).optional().nullable(),
  drawArchiveUrl: z.string().url().optional().nullable(),
  published:      z.boolean().default(false),
  featured:       z.boolean().default(false),
  order:          z.number().int().min(0).default(0),
  campaignId:     z.string().optional().nullable(),
});

adminContentRouter.get('/winners', async (_req: Request, res: Response) => {
  const winners = await prisma.winnerStory.findMany({
    orderBy: [{ featured: 'desc' }, { order: 'asc' }],
  });
  res.json({ success: true, data: winners });
});

adminContentRouter.post('/winners', validate(winnerStorySchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof winnerStorySchema>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winner = await prisma.winnerStory.create({
    data: { ...body, drawDate: body.drawDate ? new Date(body.drawDate) : null } as any,
  });
  res.status(201).json({ success: true, data: winner });
});

adminContentRouter.put('/winners/:id', validate(winnerStorySchema.partial()), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof winnerStorySchema>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winner = await prisma.winnerStory.update({
    where: { id: req.params['id'] as string },
    data: { ...body, ...(body.drawDate !== undefined ? { drawDate: body.drawDate ? new Date(body.drawDate) : null } : {}) } as any,
  });
  res.json({ success: true, data: winner });
});

adminContentRouter.delete('/winners/:id', async (req: Request, res: Response) => {
  await prisma.winnerStory.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/winners/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.winnerStory.update({ where: { id: item.id }, data: { order: item.order } as any })));
  res.json({ success: true });
});

// ─── Trust Badges ─────────────────────────────────────────────────────────────

const trustBadgeSchema = z.object({
  text:      z.string().min(1).max(200),
  iconClass: z.string().min(1).max(100),
  order:     z.number().int().min(0).default(0),
  enabled:   z.boolean().default(true),
});

adminContentRouter.get('/trust-badges', async (_req: Request, res: Response) => {
  const items = await prisma.trustBadge.findMany({ orderBy: { order: 'asc' } });
  res.json({ success: true, data: items });
});

adminContentRouter.post('/trust-badges', validate(trustBadgeSchema), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.trustBadge.create({ data: req.body as any });
  res.status(201).json({ success: true, data: item });
});

adminContentRouter.put('/trust-badges/:id', validate(trustBadgeSchema.partial()), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.trustBadge.update({ where: { id: req.params['id'] as string }, data: req.body as any });
  res.json({ success: true, data: item });
});

adminContentRouter.delete('/trust-badges/:id', async (req: Request, res: Response) => {
  await prisma.trustBadge.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/trust-badges/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.trustBadge.update({ where: { id: item.id }, data: { order: item.order } })));
  res.json({ success: true });
});

// ─── How It Works Steps ───────────────────────────────────────────────────────

const howItWorksStepSchema = z.object({
  stepNumber:  z.number().int().min(1).max(20),
  icon:        z.string().max(100).optional().nullable(),
  title:       z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  order:       z.number().int().min(0).default(0),
  published:   z.boolean().default(true),
});

adminContentRouter.get('/how-it-works', async (_req: Request, res: Response) => {
  const items = await prisma.howItWorksStep.findMany({ orderBy: { order: 'asc' } });
  res.json({ success: true, data: items });
});

adminContentRouter.post('/how-it-works', validate(howItWorksStepSchema), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.howItWorksStep.create({ data: req.body as any });
  res.status(201).json({ success: true, data: item });
});

adminContentRouter.put('/how-it-works/:id', validate(howItWorksStepSchema.partial()), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.howItWorksStep.update({ where: { id: req.params['id'] as string }, data: req.body as any });
  res.json({ success: true, data: item });
});

adminContentRouter.delete('/how-it-works/:id', async (req: Request, res: Response) => {
  await prisma.howItWorksStep.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/how-it-works/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.howItWorksStep.update({ where: { id: item.id }, data: { order: item.order } })));
  res.json({ success: true });
});

// ─── Team Members ─────────────────────────────────────────────────────────────

const teamMemberSchema = z.object({
  name:        z.string().min(2).max(100),
  title:       z.string().min(1).max(150),
  bio:         z.string().min(10).max(2000),
  photoKey:    z.string().optional().nullable(),
  initials:    z.string().max(3).optional().nullable(),
  avatarColor: z.string().max(20).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  order:       z.number().int().min(0).default(0),
  published:   z.boolean().default(true),
});

adminContentRouter.get('/team', async (_req: Request, res: Response) => {
  const items = await prisma.teamMember.findMany({ orderBy: { order: 'asc' } });
  res.json({ success: true, data: items });
});

adminContentRouter.post('/team', validate(teamMemberSchema), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.teamMember.create({ data: req.body as any });
  res.status(201).json({ success: true, data: item });
});

adminContentRouter.put('/team/:id', validate(teamMemberSchema.partial()), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.teamMember.update({ where: { id: req.params['id'] as string }, data: req.body as any });
  res.json({ success: true, data: item });
});

adminContentRouter.delete('/team/:id', async (req: Request, res: Response) => {
  await prisma.teamMember.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/team/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.teamMember.update({ where: { id: item.id }, data: { order: item.order } })));
  res.json({ success: true });
});

// ─── Company Milestones ───────────────────────────────────────────────────────

const companyMilestoneSchema = z.object({
  year:        z.string().min(1).max(20),
  heading:     z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  order:       z.number().int().min(0).default(0),
  published:   z.boolean().default(true),
});

adminContentRouter.get('/milestones', async (_req: Request, res: Response) => {
  const items = await prisma.companyMilestone.findMany({ orderBy: { order: 'asc' } });
  res.json({ success: true, data: items });
});

adminContentRouter.post('/milestones', validate(companyMilestoneSchema), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.companyMilestone.create({ data: req.body as any });
  res.status(201).json({ success: true, data: item });
});

adminContentRouter.put('/milestones/:id', validate(companyMilestoneSchema.partial()), async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await prisma.companyMilestone.update({ where: { id: req.params['id'] as string }, data: req.body as any });
  res.json({ success: true, data: item });
});

adminContentRouter.delete('/milestones/:id', async (req: Request, res: Response) => {
  await prisma.companyMilestone.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

adminContentRouter.patch('/milestones/reorder', async (req: Request, res: Response) => {
  const items = req.body as { id: string; order: number }[];
  await Promise.all(items.map((item) => prisma.companyMilestone.update({ where: { id: item.id }, data: { order: item.order } })));
  res.json({ success: true });
});

// ─── Content Pages ────────────────────────────────────────────────────────────

const contentPageSchema = z.object({
  slug:      z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title:     z.string().min(1).max(200),
  content:   z.union([z.string(), z.array(z.object({ type: z.string() }).passthrough())]).default(''),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDesc:  z.string().max(160).optional().nullable(),
  status:    z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

adminContentRouter.get('/pages', async (_req: Request, res: Response) => {
  const pages = await prisma.contentPage.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json({ success: true, data: pages });
});

adminContentRouter.get('/pages/:slug', async (req: Request, res: Response) => {
  const page = await prisma.contentPage.findUnique({ where: { slug: req.params['slug'] as string } });
  if (!page) { res.status(404).json({ success: false, error: 'Page not found' }); return; }
  res.json({ success: true, data: page });
});

adminContentRouter.post('/pages', validate(contentPageSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof contentPageSchema>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await prisma.contentPage.create({
    data: { ...body, createdBy: req.user!.sub, publishedAt: body.status === 'PUBLISHED' ? new Date() : null } as any,
  });
  res.status(201).json({ success: true, data: page });
});

adminContentRouter.put('/pages/:id', validate(contentPageSchema.partial()), async (req: Request, res: Response) => {
  const body = req.body as Partial<z.infer<typeof contentPageSchema>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await prisma.contentPage.update({
    where: { id: req.params['id'] as string },
    data: {
      ...body, updatedBy: req.user!.sub,
      ...(body.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    } as any,
  });
  res.json({ success: true, data: page });
});

adminContentRouter.delete('/pages/:id', async (req: Request, res: Response) => {
  await prisma.contentPage.delete({ where: { id: req.params['id'] as string } });
  res.json({ success: true });
});

// ─── Aggregate GET — returns everything in one request for page load ──────────

adminContentRouter.get('/', async (_req: Request, res: Response) => {
  const [settings, faqs, testimonials, winners, trustBadges, howItWorksSteps, team, milestones] = await Promise.all([
    prisma.siteSettings.upsert({ where: { id: 'global' }, update: {}, create: { id: 'global' } }),
    prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
    prisma.testimonial.findMany({ orderBy: [{ featured: 'desc' }, { order: 'asc' }] }),
    prisma.winnerStory.findMany({ orderBy: [{ featured: 'desc' }, { order: 'asc' }] }),
    prisma.trustBadge.findMany({ orderBy: { order: 'asc' } }),
    prisma.howItWorksStep.findMany({ orderBy: { order: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { order: 'asc' } }),
    prisma.companyMilestone.findMany({ orderBy: { order: 'asc' } }),
  ]);
  res.json({ success: true, data: { settings, faqs, testimonials, winners, trustBadges, howItWorksSteps, team, milestones } });
});

// ─── Export — full CMS snapshot for backup ────────────────────────────────────

adminContentRouter.get('/export', async (_req: Request, res: Response) => {
  const [settings, faqs, testimonials, winners, trustBadges, howItWorksSteps, team, milestones] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 'global' } }),
    prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
    prisma.testimonial.findMany({ orderBy: [{ featured: 'desc' }, { order: 'asc' }] }),
    prisma.winnerStory.findMany({ orderBy: [{ featured: 'desc' }, { order: 'asc' }] }),
    prisma.trustBadge.findMany({ orderBy: { order: 'asc' } }),
    prisma.howItWorksStep.findMany({ orderBy: { order: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { order: 'asc' } }),
    prisma.companyMilestone.findMany({ orderBy: { order: 'asc' } }),
  ]);
  res.setHeader('Content-Disposition', `attachment; filename="raffleprop-cms-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), settings, faqs, testimonials, winners, trustBadges, howItWorksSteps, team, milestones });
});
