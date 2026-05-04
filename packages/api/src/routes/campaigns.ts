import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, CampaignStatus } from '@raffleprop/db';
import { redisCounters, redisCache } from '../lib/redis';
import { validateQuery } from '../middleware/validate';
import { campaignListRateLimit, sseRateLimit, campaignDetailRateLimit } from '../middleware/rateLimit';

export const campaignsRouter: import('express').Router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  status: z.enum(['LIVE', 'UPCOMING', 'REVIEW', 'DRAWN']).default('LIVE'),
  state: z.string().optional(),
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'MIXED_USE']).optional(),
  search: z.string().max(100).trim().optional(),
  sortBy: z.enum(['publishedAt', 'ticketPrice', 'drawDate', 'hotScore']).default('publishedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  closingSoon: z.coerce.boolean().default(false),
});

// ─── GET /api/campaigns ───────────────────────────────────────────────────────
campaignsRouter.get('/', campaignListRateLimit, validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const q = req.query as unknown as z.infer<typeof listQuerySchema>;

  // Cache key = full normalised query string
  const cacheKey = `campaigns:${new URLSearchParams(req.query as Record<string, string>).toString()}`;
  const cached = await redisCache.get<object>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const skip = (q.page - 1) * q.pageSize;

  const campaignStatus =
    q.status === 'REVIEW'    ? CampaignStatus.REVIEW :
    q.status === 'UPCOMING'  ? CampaignStatus.UPCOMING :
    q.status === 'DRAWN'     ? CampaignStatus.DRAWN :
    CampaignStatus.LIVE;

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    status: campaignStatus,
    ...(q.state ? { propertyState: q.state } : {}),
    ...(q.propertyType ? { propertyType: q.propertyType } : {}),
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: 'insensitive' as const } },
            { propertyAddress: { contains: q.search, mode: 'insensitive' as const } },
            { propertyState: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    // "Closing soon": draw date within 7 days
    ...(q.closingSoon
      ? { drawDate: { gte: now, lte: sevenDaysOut } }
      : {}),
  };

  // hotScore sorts by our computed column; closingSoon overrides sortBy to draw date
  const orderBy = q.closingSoon
    ? { drawDate: 'asc' as const }
    : q.sortBy === 'hotScore'
      ? { hotScore: q.sortDir }
      : { [q.sortBy]: q.sortDir };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: q.pageSize,
      orderBy: [
        // Featured campaigns float to top; within featured, sort by displayOrder ascending
        { featured: 'desc' },
        { displayOrder: 'asc' as const },
        orderBy,
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        propertyAddress: true,
        propertyState: true,
        propertyLga: true,
        propertyType: true,
        marketValue: true,
        ticketPrice: true,
        totalTickets: true,
        minTickets: true,
        status: true,
        drawDate: true,
        featuredImageKey: true,
        publishedAt: true,
        fccpcRef: true,
        fctLroRef: true,
        lslgaRef: true,
        featured: true,
        displayOrder: true,
        hotScore: true,
        draw: {
          select: {
            status: true,
            winnerTicket: {
              select: { ticketNumber: true },
            },
          },
        },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  // Batch-fetch all ticket counters in a single MGET round-trip
  const ids = campaigns.map((c) => c.id);
  const ticketMap = await redisCounters.getManyTicketsSold(ids);

  const withCounts = campaigns.map((c) => {
    const ticketsSold = ticketMap.get(c.id) ?? 0;
    return {
      ...c,
      ticketsSold,
      percentageSold: c.totalTickets > 0 ? Math.round((ticketsSold / c.totalTickets) * 100) : 0,
    };
  });

  const payload = {
    success: true,
    data: {
      data: withCounts,
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.ceil(total / q.pageSize),
    },
  };

  // Cache for 60 seconds (public-facing statuses only)
  if (campaignStatus === CampaignStatus.LIVE || campaignStatus === CampaignStatus.UPCOMING) {
    await redisCache.set(cacheKey, payload, 60);
  }

  res.json(payload);
});

// ─── GET /api/campaigns/:slug ─────────────────────────────────────────────────
campaignsRouter.get('/:slug', campaignDetailRateLimit, async (req: Request, res: Response) => {
  const campaign = await prisma.campaign.findFirst({
    where: {
      slug: req.params['slug'] as string,
      status: { in: [CampaignStatus.UPCOMING, CampaignStatus.LIVE, CampaignStatus.PAUSED, CampaignStatus.CLOSED, CampaignStatus.DRAWN] },
    },
  });

  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }

  const ticketsSold = await redisCounters.getTicketsSold(campaign.id);

  res.json({
    success: true,
    data: {
      ...campaign,
      // Remove internal fields from public response
      documentKeys: undefined,
      ticketsSold,
      percentageSold:
        campaign.totalTickets > 0
          ? Math.round((ticketsSold / campaign.totalTickets) * 100)
          : 0,
    },
  });
});

// ─── GET /api/campaigns/:id/tickets/count ─────────────────────────────────────
campaignsRouter.get('/:id/tickets/count', campaignDetailRateLimit, async (req: Request, res: Response) => {
  const count = await redisCounters.getTicketsSold(req.params['id']!);
  res.json({ success: true, data: { ticketsSold: count } });
});

// Per-IP SSE connection counter — max 5 concurrent connections per IP
const sseConnections = new Map<string, number>();
const SSE_MAX_PER_IP = 5;
const SSE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ─── GET /api/campaigns/:id/tickets/sse — Server-Sent Events ─────────────────
campaignsRouter.get('/:id/tickets/sse', sseRateLimit, async (req: Request, res: Response) => {
  const campaignId = req.params['id']!;

  // Verify campaign exists before opening a persistent connection
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true },
  });
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }

  // Per-IP rate limit
  const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown');
  const current = sseConnections.get(ip) ?? 0;
  if (current >= SSE_MAX_PER_IP) {
    res.status(429).json({ success: false, error: 'Too many SSE connections' });
    return;
  }
  sseConnections.set(ip, current + 1);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = async () => {
    const count = await redisCounters.getTicketsSold(campaignId);
    res.write(`data: ${JSON.stringify({ ticketsSold: count })}\n\n`);
  };

  void send();
  const interval = setInterval(() => void send(), 5000);

  // Auto-close after 30 minutes to prevent resource leaks
  const timeout = setTimeout(() => {
    clearInterval(interval);
    res.end();
  }, SSE_TIMEOUT_MS);

  const cleanup = () => {
    clearInterval(interval);
    clearTimeout(timeout);
    const n = sseConnections.get(ip) ?? 1;
    if (n <= 1) sseConnections.delete(ip);
    else sseConnections.set(ip, n - 1);
  };

  req.on('close', cleanup);
});
