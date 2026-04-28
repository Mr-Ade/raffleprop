import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, PaymentGateway, PaymentStatus, Prisma } from '@raffleprop/db';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { purchaseRateLimit } from '../middleware/rateLimit';
import { initiateTicketPurchase } from '../services/ticket.service';
import { AppError } from '../middleware/errorHandler';

export const ticketsRouter: import('express').Router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const initiateSchema = z.object({
  campaignId: z.string().uuid(),
  bundleLabel: z.string().optional(),
  quantity: z.number().int().min(1).max(100),
  skillAnswer: z.number().int().min(0),
  gateway: z.enum(['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER']).default('PAYSTACK'),
});

const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  search: z.string().max(100).optional(),
});

// ─── POST /api/tickets/initiate ───────────────────────────────────────────────
ticketsRouter.post(
  '/initiate',
  authenticate,
  purchaseRateLimit,
  validate(initiateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof initiateSchema>;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { email: true, phone: true, fullName: true },
      });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const result = await initiateTicketPurchase({
        campaignId: body.campaignId,
        userId: req.user!.sub,
        userEmail: user.email,
        userPhone: user.phone,
        userName: user.fullName,
        ...(body.bundleLabel ? { bundleLabel: body.bundleLabel } : {}),
        quantity: body.quantity,
        skillAnswer: body.skillAnswer,
        gateway: body.gateway as PaymentGateway,
        ipAddress: req.ip ?? '0.0.0.0',
        userAgent: req.headers['user-agent'] ?? '',
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err instanceof AppError ? err : new AppError(500, 'Failed to initiate purchase'));
    }
  },
);

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
ticketsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1', 10);
    const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '20', 10), 50);
    const skip = (page - 1) * pageSize;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { userId: req.user!.sub, paymentStatus: PaymentStatus.SUCCESS },
        skip,
        take: pageSize,
        orderBy: { purchasedAt: 'desc' },
        include: {
          campaign: {
            select: { id: true, slug: true, title: true, featuredImageKey: true, drawDate: true },
          },
        },
      }),
      prisma.ticket.count({
        where: { userId: req.user!.sub, paymentStatus: PaymentStatus.SUCCESS },
      }),
    ]);

    res.json({
      success: true,
      data: {
        data: tickets,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load tickets'));
  }
});

// ─── GET /api/tickets/transactions ───────────────────────────────────────────
// All statuses for the transaction records page (unlike /api/tickets which is SUCCESS only)
ticketsRouter.get('/transactions', authenticate, validateQuery(transactionsQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as unknown as z.infer<typeof transactionsQuerySchema>;
    const { page, pageSize, search: rawSearch } = q;
    const year = q.year;
    const search = rawSearch?.toLowerCase();
    const skip = (page - 1) * pageSize;

    const where: Prisma.TicketWhereInput = { userId: req.user!.sub };
    if (year) {
      where.purchasedAt = { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) };
    }
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { paymentRef: { contains: search, mode: 'insensitive' } },
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { campaign: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [tickets, total, totalPaidAgg, successCount, refundCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { purchasedAt: 'desc' },
        include: {
          campaign: { select: { id: true, slug: true, title: true } },
          refund: { select: { id: true, status: true, amount: true, processedAt: true } },
        },
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.SUCCESS },
        _sum: { totalAmount: true },
      }),
      prisma.ticket.count({ where: { ...where, paymentStatus: PaymentStatus.SUCCESS } }),
      prisma.ticket.count({ where: { ...where, refund: { isNot: null } } }),
    ]);

    const totalPaid = Number(totalPaidAgg._sum.totalAmount ?? 0);

    res.json({
      success: true,
      data: {
        data: tickets,
        total,
        totalPaid,
        successCount,
        refundCount,
        page,
        pageSize,
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load transactions'));
  }
});

// ─── GET /api/tickets/bank-transfer-pending ──────────────────────────────────
// Returns the user's PENDING bank-transfer tickets so they can submit proof.
ticketsRouter.get('/bank-transfer-pending', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: req.user!.sub,
        paymentGateway: PaymentGateway.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PENDING,
      },
      orderBy: { purchasedAt: 'desc' },
      include: { campaign: { select: { id: true, title: true, escrowBank: true, escrowAccountNo: true, escrowAccountName: true } } },
    });
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load pending transfers'));
  }
});

// ─── GET /api/tickets/status?ref=xxx ─────────────────────────────────────────
// Lightweight poll endpoint — frontend calls this every few seconds after Paystack redirect
// to detect when the webhook has confirmed the payment, without requiring a full page reload.
ticketsRouter.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = (req.query['ref'] as string | undefined)?.trim();
    if (!ref) {
      res.status(400).json({ success: false, error: 'ref is required' });
      return;
    }
    const ticket = await prisma.ticket.findFirst({
      where: { paymentRef: ref, userId: req.user!.sub },
      select: { paymentStatus: true, ticketNumber: true },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: { status: ticket.paymentStatus, ticketNumber: ticket.ticketNumber } });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to check payment status'));
  }
});

// ─── PATCH /api/tickets/:id/bank-transfer-ref ─────────────────────────────────
// User submits the narration/reference they used so admin can verify it.
ticketsRouter.patch('/:id/bank-transfer-ref', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bankTransferRef } = req.body as { bankTransferRef?: string };
    if (!bankTransferRef?.trim()) {
      res.status(400).json({ success: false, error: 'bankTransferRef is required' });
      return;
    }
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.sub, paymentGateway: PaymentGateway.BANK_TRANSFER, paymentStatus: PaymentStatus.PENDING },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found or not a pending bank transfer' });
      return;
    }
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { bankTransferRef: bankTransferRef.trim() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to update transfer reference'));
  }
});

// ─── GET /api/tickets/:id/bank-transfer-proof-url ────────────────────────────
// Returns a 15-min presigned PUT URL for the user to upload their transfer proof.
ticketsRouter.get('/:id/bank-transfer-proof-url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mimeType = (req.query['mimeType'] as string) ?? 'image/jpeg';
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(mimeType)) {
      res.status(400).json({ success: false, error: 'Unsupported file type' });
      return;
    }
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.sub, paymentGateway: PaymentGateway.BANK_TRANSFER, paymentStatus: PaymentStatus.PENDING },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found or not a pending bank transfer' });
      return;
    }

    const { getPresignedUploadUrl, storageKeys } = await import('../services/storage.service');
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const key = storageKeys.bankTransferProof(ticket.id, ext);
    const uploadUrl = await getPresignedUploadUrl(key, mimeType, false, 900);

    await prisma.ticket.update({ where: { id: ticket.id }, data: { bankTransferProofKey: key } });

    res.json({ success: true, data: { uploadUrl, key } });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to generate upload URL'));
  }
});

// ─── GET /api/tickets/:id/receipt ────────────────────────────────────────────
ticketsRouter.get('/:id/receipt', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.sub },
      include: {
        campaign: { select: { title: true, propertyAddress: true, fccpcRef: true } },
        user: { select: { email: true, fullName: true } },
      },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    if (ticket.paymentStatus !== PaymentStatus.SUCCESS) {
      res.status(400).json({ success: false, error: 'Receipt is only available for confirmed tickets.' });
      return;
    }

    const { getPresignedDownloadUrl, storageKeys, objectExists, uploadBuffer } = await import('../services/storage.service');
    const { generateReceiptPdf } = await import('../services/receipt.service');
    const key = storageKeys.receipt(ticket.id);
    const exists = await objectExists(key, true);

    if (!exists) {
      // PDF missing (e.g. webhook upload failed) — generate it now on demand
      const pdf = await generateReceiptPdf({
        ticketNumber:    ticket.ticketNumber,
        receiptNumber:   ticket.receiptNumber,
        campaignTitle:   ticket.campaign.title,
        propertyAddress: ticket.campaign.propertyAddress ?? null,
        quantity:        ticket.quantity,
        unitPrice:       Number(ticket.unitPrice),
        totalAmount:     Number(ticket.totalAmount),
        paymentGateway:  ticket.paymentGateway,
        paymentRef:      ticket.paymentRef,
        purchasedAt:     ticket.purchasedAt,
        userName:        ticket.user.fullName,
        userEmail:       ticket.user.email,
        fccpcRef:        ticket.campaign.fccpcRef ?? null,
      });
      await uploadBuffer(key, pdf, 'application/pdf', true);
    }

    const url = await getPresignedDownloadUrl(key, true, 900);
    res.json({ success: true, data: { url, receiptNumber: ticket.receiptNumber } });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to retrieve receipt'));
  }
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
ticketsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.sub },
      include: {
        campaign: {
          select: {
            id: true,
            slug: true,
            title: true,
            propertyAddress: true,
            featuredImageKey: true,
            drawDate: true,
            fccpcRef: true,
            escrowBank: true,
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load ticket'));
  }
});
