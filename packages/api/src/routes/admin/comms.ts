import { Router, Request, Response } from 'express';
import { prisma } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { sendBroadcastBatch } from '../../services/email.service';

export const adminCommsRouter: import('express').Router = Router();
adminCommsRouter.use(authenticate, requireAdmin);

// ─── GET /api/admin/comms/stats ───────────────────────────────────────────────
// Returns audience sizes for the compose form dropdowns.
adminCommsRouter.get('/stats', async (_req: Request, res: Response) => {
  const [allUsers, newsletter, allTicketHolders, campaigns] = await Promise.all([
    prisma.user.count(),
    prisma.newsletterSubscriber.count(),
    prisma.ticket.findMany({
      where: { paymentStatus: 'SUCCESS' },
      select: { userId: true },
      distinct: ['userId'],
    }).then(r => r.length),
    prisma.campaign.findMany({
      where: { status: { in: ['UPCOMING', 'LIVE', 'PAUSED', 'CLOSED', 'DRAWN', 'CANCELLED'] } },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { tickets: { where: { paymentStatus: 'SUCCESS' } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({
    success: true,
    data: {
      allUsers,
      newsletter,
      allTicketHolders,
      campaigns: campaigns.map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        ticketCount: c._count.tickets,
      })),
    },
  });
});

// ─── GET /api/admin/comms/broadcasts ─────────────────────────────────────────
adminCommsRouter.get('/broadcasts', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10));
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [broadcasts, total] = await Promise.all([
    prisma.broadcast.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.broadcast.count(),
  ]);

  // Enrich with campaign titles for CAMPAIGN_TICKETS rows
  const campaignIds = [...new Set(
    broadcasts.map(b => b.campaignId).filter((id): id is string => id !== null),
  )];
  const campaignTitles: Record<string, string> = {};
  if (campaignIds.length > 0) {
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, title: true },
    });
    campaigns.forEach(c => { campaignTitles[c.id] = c.title; });
  }

  const enriched = broadcasts.map(b => ({
    ...b,
    campaignTitle: b.campaignId ? (campaignTitles[b.campaignId] ?? null) : null,
  }));

  res.json({
    success: true,
    data: { data: enriched, total, page, totalPages: Math.ceil(total / pageSize) },
  });
});

// ─── POST /api/admin/comms/broadcasts ────────────────────────────────────────
adminCommsRouter.post('/broadcasts', async (req: Request, res: Response) => {
  const { subject, body, audience, campaignId } = req.body as {
    subject: string;
    body: string;
    audience: string;
    campaignId?: string;
  };

  if (!subject?.trim() || !body?.trim() || !audience) {
    res.status(400).json({ success: false, error: 'subject, body, and audience are required' });
    return;
  }

  const VALID_AUDIENCES = ['ALL_USERS', 'NEWSLETTER', 'CAMPAIGN_TICKETS', 'ALL_TICKET_HOLDERS'];
  if (!VALID_AUDIENCES.includes(audience)) {
    res.status(400).json({ success: false, error: 'Invalid audience type' });
    return;
  }

  if (audience === 'CAMPAIGN_TICKETS' && !campaignId) {
    res.status(400).json({ success: false, error: 'campaignId is required for CAMPAIGN_TICKETS audience' });
    return;
  }

  // ── Resolve recipients ────────────────────────────────────────────────────
  type Recipient = { email: string; name: string };
  let recipients: Recipient[] = [];

  if (audience === 'ALL_USERS') {
    const users = await prisma.user.findMany({
      select: { email: true, fullName: true },
    });
    recipients = users.map(u => ({ email: u.email, name: u.fullName }));
  } else if (audience === 'NEWSLETTER') {
    const subs = await prisma.newsletterSubscriber.findMany({
      select: { email: true },
    });
    recipients = subs.map(s => ({ email: s.email, name: 'Subscriber' }));
  } else if (audience === 'CAMPAIGN_TICKETS') {
    const tickets = await prisma.ticket.findMany({
      where: { campaignId: campaignId!, paymentStatus: 'SUCCESS' },
      select: { user: { select: { email: true, fullName: true } } },
      distinct: ['userId'],
    });
    recipients = tickets.map(t => ({ email: t.user.email, name: t.user.fullName }));
  } else if (audience === 'ALL_TICKET_HOLDERS') {
    const tickets = await prisma.ticket.findMany({
      where: { paymentStatus: 'SUCCESS' },
      select: { user: { select: { email: true, fullName: true } } },
      distinct: ['userId'],
    });
    recipients = tickets.map(t => ({ email: t.user.email, name: t.user.fullName }));
  }

  if (recipients.length === 0) {
    res.status(400).json({ success: false, error: 'No recipients found for this audience.' });
    return;
  }

  // ── Convert plain body to HTML paragraphs ─────────────────────────────────
  const bodyHtml = body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin:0 0 1rem">${line}</p>`)
    .join('');

  // ── Send ──────────────────────────────────────────────────────────────────
  const { sent, failed } = await sendBroadcastBatch(recipients, subject.trim(), bodyHtml);

  const status = failed === 0 ? 'SENT' : sent === 0 ? 'FAILED' : 'PARTIAL';

  const broadcast = await prisma.broadcast.create({
    data: {
      subject: subject.trim(),
      body: body.trim(),
      audience,
      campaignId: campaignId ?? null,
      sentBy: req.user!.sub,
      sentCount: sent,
      failCount: failed,
      status,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'comms.broadcast_sent',
      entityType: 'Broadcast',
      entityId: broadcast.id,
      payload: { subject: subject.trim(), audience, campaignId: campaignId ?? null, sent, failed },
      ip: req.ip ?? null,
    },
  });

  res.json({
    success: true,
    data: broadcast,
    message: `Broadcast sent to ${sent} recipient${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}.`,
  });
});
