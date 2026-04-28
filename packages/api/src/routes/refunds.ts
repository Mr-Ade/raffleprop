import { Router, Request, Response } from 'express';
import { prisma, RefundStatus } from '@raffleprop/db';
import { authenticate } from '../middleware/auth';

export const refundsRouter: import('express').Router = Router();

// ─── GET /api/refunds — user's own refunds ────────────────────────────────────
refundsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  const refunds = await prisma.refund.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: { select: { title: true, slug: true } },
      ticket: { select: { ticketNumber: true, quantity: true, totalAmount: true } },
    },
  });
  res.json({ success: true, data: refunds });
});

// ─── GET /api/refunds/:id ─────────────────────────────────────────────────────
refundsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  const refund = await prisma.refund.findFirst({
    where: { id: req.params['id'] as string, userId: req.user!.sub },
    include: {
      campaign: { select: { title: true, slug: true } },
      ticket: { select: { ticketNumber: true, receiptNumber: true, quantity: true, totalAmount: true, paymentGateway: true } },
    },
  });

  if (!refund) {
    res.status(404).json({ success: false, error: 'Refund not found' });
    return;
  }

  res.json({ success: true, data: refund });
});
