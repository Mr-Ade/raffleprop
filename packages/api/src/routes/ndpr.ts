/**
 * NDPR 2019 — Data Subject Rights
 *
 * Article 2.2 grants data subjects:
 *  - Right to access (within 30 days)
 *  - Right to correction
 *  - Right to deletion (subject to legal retention obligations)
 *
 * FCCPA §118 overrides NDPR for ticket records — they cannot be erased.
 * The anonymisation process nullifies personal identifiers while preserving
 * the financial record for regulatory compliance.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, NdprRequestStatus, PaymentStatus } from '@raffleprop/db';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

export const ndprRouter: import('express').Router = Router();

// ─── GET /api/ndpr/my-data ────────────────────────────────────────────────────
// Returns a complete JSON export of the user's data (NDPR right to access)
ndprRouter.get('/my-data', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    const [user, tickets, refunds, ndprRequests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          kycStatus: true,
          referralCode: true,
          referredByCode: true,
          referralEarnings: true,
          referralCount: true,
          ndprConsentAt: true,
          tcAcceptedAt: true,
          createdAt: true,
        },
      }),
      prisma.ticket.findMany({
        where: { userId },
        select: {
          id: true,
          ticketNumber: true,
          campaignId: true,
          quantity: true,
          totalAmount: true,
          paymentStatus: true,
          purchasedAt: true,
          receiptNumber: true,
        },
      }),
      prisma.refund.findMany({
        where: { userId },
        select: { id: true, campaignId: true, amount: true, reason: true, status: true, createdAt: true },
      }),
      prisma.ndprRequest.findMany({
        where: { userId },
        select: { id: true, requestType: true, status: true, requestedAt: true, dueAt: true },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'ndpr.data_accessed',
        entityType: 'User',
        entityId: userId,
        payload: { requestType: 'ACCESS' },
        ip: req.ip ?? null,
      },
    });

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        subject: user,
        tickets,
        refunds,
        ndprRequests,
        note: 'Ticket records are retained permanently per FCCPA §118 (legal obligation). Other data may be deleted on request.',
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to export data'));
  }
});

// ─── POST /api/ndpr/delete-request ───────────────────────────────────────────
const deleteRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

ndprRouter.post(
  '/delete-request',
  authenticate,
  validate(deleteRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;

      const existing = await prisma.ndprRequest.findFirst({
        where: { userId, requestType: 'DELETION', status: { in: ['PENDING', 'IN_PROGRESS'] } },
      });
      if (existing) {
        res.status(409).json({
          success: false,
          error: 'A deletion request is already in progress.',
          data: { dueAt: existing.dueAt },
        });
        return;
      }

      const activeTickets = await prisma.ticket.count({
        where: {
          userId,
          paymentStatus: PaymentStatus.SUCCESS,
          campaign: { status: { in: ['LIVE', 'CLOSED'] } },
        },
      });
      if (activeTickets > 0) {
        res.status(409).json({
          success: false,
          error:
            'Cannot delete account while holding tickets for active campaigns. Wait until draws are completed.',
          code: 'ACTIVE_TICKETS',
        });
        return;
      }

      const requestedAt = new Date();
      const dueAt = new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      const request = await prisma.ndprRequest.create({
        data: {
          userId,
          requestType: 'DELETION',
          status: NdprRequestStatus.PENDING,
          requestedAt,
          dueAt,
          notes: (req.body as { reason?: string }).reason ?? null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'ndpr.deletion_requested',
          entityType: 'User',
          entityId: userId,
          payload: { requestId: request.id },
          ip: req.ip ?? null,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          requestId: request.id,
          dueAt,
          message:
            'Deletion request submitted. Your account will be anonymised within 30 days. Note: ticket records are retained per FCCPA §118.',
        },
      });
    } catch (err) {
      next(err instanceof AppError ? err : new AppError(500, 'Failed to submit deletion request'));
    }
  },
);

// ─── GET /api/ndpr/my-requests ────────────────────────────────────────────────
ndprRouter.get('/my-requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.ndprRequest.findMany({
      where: { userId: req.user!.sub },
      orderBy: { requestedAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load requests'));
  }
});

// ─── GET /api/ndpr/requests (admin) ──────────────────────────────────────────
ndprRouter.get('/requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }
    const requests = await prisma.ndprRequest.findMany({
      where: { status: { in: [NdprRequestStatus.PENDING, NdprRequestStatus.IN_PROGRESS] } },
      orderBy: { dueAt: 'asc' },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            _count: { select: { tickets: true } },
          },
        },
      },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load NDPR requests'));
  }
});

// ─── POST /api/ndpr/requests/:id/reject (admin) ───────────────────────────────
ndprRouter.post('/requests/:id/reject', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) {
      res.status(400).json({ success: false, error: 'Reason is required when denying a deletion request.' });
      return;
    }

    const request = await prisma.ndprRequest.findUnique({ where: { id: req.params['id'] as string } });
    if (!request) {
      res.status(404).json({ success: false, error: 'NDPR request not found' });
      return;
    }
    if (request.status === NdprRequestStatus.COMPLETED || request.status === NdprRequestStatus.REJECTED) {
      res.status(409).json({ success: false, error: 'Request is already resolved.' });
      return;
    }

    await prisma.ndprRequest.update({
      where: { id: req.params['id'] as string },
      data: {
        status: NdprRequestStatus.REJECTED,
        processedAt: new Date(),
        processedBy: req.user!.sub,
        notes: reason.trim(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'ndpr.request_rejected',
        entityType: 'NdprRequest',
        entityId: req.params['id']!,
        payload: { reason: reason.trim() },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: null, message: 'Deletion request rejected. User should be notified.' });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to reject NDPR request'));
  }
});

// ─── POST /api/ndpr/requests/:id/complete (admin) ────────────────────────────
ndprRouter.post('/requests/:id/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const request = await prisma.ndprRequest.findUnique({ where: { id: req.params['id'] as string } });
    if (!request) {
      res.status(404).json({ success: false, error: 'NDPR request not found' });
      return;
    }
    if (request.status === NdprRequestStatus.COMPLETED || request.status === NdprRequestStatus.REJECTED) {
      res.status(409).json({ success: false, error: 'Request is already resolved.' });
      return;
    }

    const processedAt = new Date();

    // Anonymise personal identifiers — NDPR Art. 2.10 / FCCPA §118 allows retaining
    // financial records but personal identifiers must be erased.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data: {
          fullName: '[Deleted User]',
          phone: `deleted-${request.userId}`,
          email: `deleted-${request.userId}@deleted.invalid`,
        },
      }),
      prisma.ndprRequest.update({
        where: { id: req.params['id'] as string },
        data: {
          status: NdprRequestStatus.COMPLETED,
          processedAt,
          processedBy: req.user!.sub,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.sub,
          action: 'ndpr.user_anonymised',
          entityType: 'User',
          entityId: request.userId,
          payload: { requestId: request.id },
          ip: req.ip ?? null,
        },
      }),
    ]);

    res.json({ success: true, data: null, message: 'User data anonymised and request marked as completed.' });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to complete NDPR request'));
  }
});
