import { Router, Request, Response } from 'express';
import { prisma, PaymentStatus, PaymentGateway } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { getPresignedDownloadUrl, storageKeys } from '../../services/storage.service';

export const adminTicketsRouter: import('express').Router = Router();
adminTicketsRouter.use(authenticate, requireAdmin);

// ─── Shared filter builder ────────────────────────────────────────────────────
function buildWhere(query: Record<string, unknown>) {
  const where: Record<string, unknown> = {};

  const status     = query['status']     as PaymentStatus | undefined;
  const gateway    = query['gateway']    as PaymentGateway | undefined;
  const campaignId = query['campaignId'] as string | undefined;
  const dateFrom   = query['dateFrom']   as string | undefined;
  const dateTo     = query['dateTo']     as string | undefined;
  const search     = (query['search'] as string | undefined)?.trim();

  if (status)     where['paymentStatus']  = status;
  if (gateway)    where['paymentGateway'] = gateway;
  if (campaignId) where['campaignId']     = campaignId;

  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range['gte'] = new Date(dateFrom);
    if (dateTo)   range['lte'] = new Date(dateTo + 'T23:59:59.999Z');
    where['purchasedAt'] = range;
  }

  if (search) {
    where['OR'] = [
      { ticketNumber: { contains: search, mode: 'insensitive' } },
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { paymentRef:    { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email:    { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

// ─── GET /api/admin/tickets ───────────────────────────────────────────────────
adminTicketsRouter.get('/', async (req: Request, res: Response) => {
  const page     = parseInt((req.query['page']     as string) ?? '1',  10);
  const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '20', 10), 100);
  const skip = (page - 1) * pageSize;
  const where = buildWhere(req.query as Record<string, unknown>);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [tickets, total, statusCounts, todayCount] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { purchasedAt: 'desc' },
      include: {
        user:     { select: { id: true, fullName: true, email: true } },
        campaign: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.ticket.count({ where }),
    // Always show global status breakdown in stats bar (ignores current filters)
    prisma.ticket.groupBy({
      by: ['paymentStatus'],
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.ticket.count({
      where: { paymentStatus: PaymentStatus.SUCCESS, purchasedAt: { gte: todayStart } },
    }),
  ]);

  const stats = Object.fromEntries(
    statusCounts.map((s) => [
      s.paymentStatus,
      { count: s._count, revenue: Number(s._sum.totalAmount ?? 0) },
    ]),
  );

  res.json({
    success: true,
    data: {
      data:       tickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
      todayCount,
    },
  });
});

// ─── GET /api/admin/tickets/export ────────────────────────────────────────────
// Returns filtered tickets as a CSV file (up to 10,000 rows).
adminTicketsRouter.get('/export', async (req: Request, res: Response) => {
  const where = buildWhere(req.query as Record<string, unknown>);

  const tickets = await prisma.ticket.findMany({
    where,
    take: 10_000,
    orderBy: { purchasedAt: 'desc' },
    include: {
      user:     { select: { fullName: true, email: true } },
      campaign: { select: { title: true } },
    },
  });

  const headers = [
    'Ticket Number', 'Receipt Number', 'User Name', 'User Email',
    'Campaign', 'Quantity', 'Unit Price', 'Total Amount',
    'Payment Gateway', 'Payment Ref', 'Status', 'Skill Correct', 'Purchase Date',
  ];

  const rows = tickets.map((t) => [
    t.ticketNumber,
    t.receiptNumber,
    t.user.fullName,
    t.user.email,
    t.campaign.title,
    t.quantity,
    Number(t.unitPrice),
    Number(t.totalAmount),
    t.paymentGateway,
    t.paymentRef,
    t.paymentStatus,
    t.skillCorrect ? 'Yes' : 'No',
    new Date(t.purchasedAt).toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const filename = `raffleprop-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM for Excel compatibility
});

// ─── GET /api/admin/tickets/by-campaign ──────────────────────────────────────
// Campaign breakdown: sold count, revenue, remaining, min-threshold status.
adminTicketsRouter.get('/by-campaign', async (_req: Request, res: Response) => {
  const [campaigns, aggs] = await Promise.all([
    prisma.campaign.findMany({
      where:   { status: { not: 'DRAFT' } },
      select:  { id: true, title: true, slug: true, status: true, totalTickets: true, minTickets: true, ticketPrice: true },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.ticket.groupBy({
      by:    ['campaignId'],
      where: { paymentStatus: 'SUCCESS' },
      _count: true,
      _sum:  { totalAmount: true },
    }),
  ]);

  const aggMap = new Map(aggs.map((a) => [a.campaignId, a]));

  const data = campaigns.map((c) => {
    const agg       = aggMap.get(c.id);
    const soldCount = agg?._count ?? 0;
    const revenue   = Number(agg?._sum?.totalAmount ?? 0);
    return {
      id:          c.id,
      title:       c.title,
      slug:        c.slug,
      status:      c.status,
      totalTickets: c.totalTickets,
      minTickets:  c.minTickets,
      ticketPrice: Number(c.ticketPrice),
      soldCount,
      revenue,
      remaining:   c.totalTickets - soldCount,
      pct:         c.totalTickets > 0 ? Math.round((soldCount / c.totalTickets) * 100) : 0,
      minMet:      soldCount >= c.minTickets,
    };
  });

  res.json({ success: true, data });
});

// ─── GET /api/admin/tickets/stats ─────────────────────────────────────────────
adminTicketsRouter.get('/stats', async (_req: Request, res: Response) => {
  const [totalRevenue, ticketsSoldToday, registeredUsers, activeCampaigns, pendingRefunds, pendingKyc] =
    await Promise.all([
      prisma.ticket.aggregate({ where: { paymentStatus: 'SUCCESS' }, _sum: { totalAmount: true } }),
      prisma.ticket.count({
        where: { paymentStatus: 'SUCCESS', purchasedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.campaign.count({ where: { status: 'LIVE' } }),
      prisma.refund.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { kycStatus: 'SUBMITTED' } }),
    ]);

  res.json({
    success: true,
    data: {
      totalRevenue:    Number(totalRevenue._sum.totalAmount ?? 0),
      ticketsSoldToday,
      registeredUsers,
      activeCampaigns,
      pendingRefunds,
      pendingKyc,
    },
  });
});

// ─── GET /api/admin/tickets/chart-data ───────────────────────────────────────
adminTicketsRouter.get('/chart-data', async (_req: Request, res: Response) => {
  const now = new Date();
  const since90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [recentTickets, gatewayCounts, campaigns, campaignAggs] = await Promise.all([
    prisma.ticket.findMany({
      where: { paymentStatus: 'SUCCESS', purchasedAt: { gte: since90d } },
      select: { purchasedAt: true, totalAmount: true, quantity: true },
      orderBy: { purchasedAt: 'asc' },
    }),
    prisma.ticket.groupBy({
      by: ['paymentGateway'],
      where: { paymentStatus: 'SUCCESS' },
      _count: true,
    }),
    prisma.campaign.findMany({
      where: { status: { not: 'DRAFT' } },
      select: { id: true, title: true, totalTickets: true },
      orderBy: { publishedAt: 'desc' },
      take: 8,
    }),
    prisma.ticket.groupBy({
      by: ['campaignId'],
      where: { paymentStatus: 'SUCCESS' },
      _count: true,
    }),
  ]);

  function dailyRevenue(days: number) {
    const map = new Map<number, { label: string; total: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      map.set(key, { label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }), total: 0 });
    }
    for (const t of recentTickets) {
      const d = new Date(t.purchasedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      if (map.has(key)) map.get(key)!.total += Number(t.totalAmount);
    }
    const entries = [...map.values()];
    return { labels: entries.map(e => e.label), data: entries.map(e => e.total) };
  }

  function monthlyRevenue() {
    const map = new Map<number, { label: string; total: number }>();
    for (const t of recentTickets) {
      const key = t.purchasedAt.getFullYear() * 100 + t.purchasedAt.getMonth();
      const existing = map.get(key);
      if (existing) {
        existing.total += Number(t.totalAmount);
      } else {
        map.set(key, {
          label: t.purchasedAt.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }),
          total: Number(t.totalAmount),
        });
      }
    }
    const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);
    return { labels: sorted.map(([, v]) => v.label), data: sorted.map(([, v]) => v.total) };
  }

  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of recentTickets) {
    if (t.purchasedAt >= since30d) dayCounts[t.purchasedAt.getDay()]! += t.quantity;
  }

  const GATEWAY_LABELS: Record<string, string> = {
    PAYSTACK: 'Paystack',
    FLUTTERWAVE: 'Flutterwave',
    BANK_TRANSFER: 'Bank Transfer',
  };

  const aggMap = new Map(campaignAggs.map(a => [a.campaignId, a._count]));
  const ticketsPerCampaign = campaigns.map(c => ({
    title: c.title,
    sold: aggMap.get(c.id) ?? 0,
    remaining: c.totalTickets - (aggMap.get(c.id) ?? 0),
  }));

  res.json({
    success: true,
    data: {
      revenueTrend: {
        '7d':  dailyRevenue(7),
        '30d': dailyRevenue(30),
        '90d': monthlyRevenue(),
      },
      dailyTickets: { labels: dayNames, data: dayCounts },
      gatewaySplit: gatewayCounts
        .sort((a, b) => b._count - a._count)
        .map(g => ({ label: GATEWAY_LABELS[g.paymentGateway] ?? g.paymentGateway, count: g._count })),
      ticketsPerCampaign,
    },
  });
});

// ─── POST /api/admin/tickets/:id/confirm-transfer ────────────────────────────
// Admin manually confirms or rejects a PENDING bank transfer ticket.
adminTicketsRouter.post('/:id/confirm-transfer', async (req: Request, res: Response) => {
  const { action, note } = req.body as { action?: 'confirm' | 'reject'; note?: string };

  if (action !== 'confirm' && action !== 'reject') {
    return res.status(400).json({ success: false, error: 'action must be "confirm" or "reject"' });
  }
  if (action === 'reject' && !note?.trim()) {
    return res.status(400).json({ success: false, error: 'A rejection note is required' });
  }

  const ticket = await prisma.ticket.findUnique({
    where:  { id: req.params['id'] as string },
    select: { id: true, campaignId: true, quantity: true, paymentGateway: true, paymentStatus: true, userId: true },
  });

  if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
  if (ticket.paymentGateway !== 'BANK_TRANSFER') {
    return res.status(400).json({ success: false, error: 'This endpoint is only for bank transfer tickets' });
  }
  if (ticket.paymentStatus !== 'PENDING') {
    return res.status(400).json({ success: false, error: `Ticket is already ${ticket.paymentStatus}` });
  }

  const newStatus = action === 'confirm' ? 'SUCCESS' : 'FAILED';

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        paymentStatus:    newStatus,
        bankTransferNote: note?.trim() ?? null,
      },
    });

    if (action === 'confirm') {
      // Increment the Redis sold-tickets counter
      const { redisCounters } = await import('../../lib/redis');
      await redisCounters.incrementTicketsSold(ticket.campaignId, ticket.quantity);
    }

    await tx.auditLog.create({
      data: {
        actorId:    (req as Request & { user?: { sub: string } }).user?.sub ?? null,
        action:     `bank_transfer.${action}`,
        entityType: 'Ticket',
        entityId:   ticket.id,
        payload:    { note: note ?? null, newStatus },
      },
    });
  });

  return res.json({ success: true, data: { newStatus } });
});

// ─── GET /api/admin/tickets/:id/proof ────────────────────────────────────────
// Returns a 15-min presigned download URL for the bank transfer proof image.
adminTicketsRouter.get('/:id/proof', async (req: Request, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where:  { id: req.params['id'] as string },
    select: { bankTransferProofKey: true },
  });
  if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
  if (!ticket.bankTransferProofKey) {
    return res.status(404).json({ success: false, error: 'No proof image uploaded' });
  }
  const url = await getPresignedDownloadUrl(ticket.bankTransferProofKey, false, 900);
  return res.json({ success: true, data: { url } });
});

// ─── GET /api/admin/tickets/:id/receipt ──────────────────────────────────────
adminTicketsRouter.get('/:id/receipt', async (req: Request, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where:  { id: req.params['id'] as string },
    select: { id: true, receiptNumber: true, paymentStatus: true },
  });
  if (!ticket)
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  if (ticket.paymentStatus !== 'SUCCESS')
    return res.status(400).json({ success: false, error: 'Receipt only available for paid tickets' });

  const url = await getPresignedDownloadUrl(storageKeys.receipt(ticket.id), true, 900);
  return res.json({ success: true, data: { url, receiptNumber: ticket.receiptNumber } });
});
