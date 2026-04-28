import { Router, Request, Response } from 'express';
import { prisma, RefundStatus } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { paystack } from '../../lib/paystack';
import { flutterwave } from '../../lib/flutterwave';

export const adminRefundsRouter: import('express').Router = Router();
adminRefundsRouter.use(authenticate, requireAdmin);

// ─── GET /api/admin/refunds ───────────────────────────────────────────────────
adminRefundsRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt((req.query['page'] as string) ?? '1', 10);
  const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '20', 10), 100);
  const status = req.query['status'] as RefundStatus | undefined;
  const skip = (page - 1) * pageSize;

  const where = status ? { status } : {};

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        ticket: { select: { ticketNumber: true, receiptNumber: true, paymentRef: true, paymentGateway: true } },
        campaign: { select: { title: true, slug: true } },
      },
    }),
    prisma.refund.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      data: refunds,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ─── POST /api/admin/refunds/:id/approve ─────────────────────────────────────
adminRefundsRouter.post('/:id/approve', async (req: Request, res: Response) => {
  const refundId = req.params['id'] as string;
  const refund = await prisma.refund.findFirst({
    where: { id: refundId },
    include: {
      ticket: { select: { paymentRef: true, paymentGateway: true, gatewayTransactionId: true } },
    },
  });

  if (!refund) {
    res.status(404).json({ success: false, error: 'Refund not found' });
    return;
  }
  if (refund.status !== RefundStatus.PENDING) {
    res.status(409).json({ success: false, error: 'Refund is not in PENDING status' });
    return;
  }

  // Mark PROCESSING immediately so double-clicks are idempotent
  await prisma.refund.update({
    where: { id: refundId },
    data: { status: RefundStatus.PROCESSING },
  });

  const { paymentGateway, paymentRef, gatewayTransactionId } = refund.ticket;
  const amountNaira = Number(refund.amount);
  let gatewayRef: string | null = null;
  let finalStatus: RefundStatus = RefundStatus.PROCESSING; // stays PROCESSING for BANK_TRANSFER

  try {
    if (paymentGateway === 'PAYSTACK') {
      const result = await paystack.refundTransaction({ transaction: paymentRef, amount: amountNaira });
      if (result.status) {
        gatewayRef = String(result.data.id);
        finalStatus = RefundStatus.COMPLETED;
      } else {
        finalStatus = RefundStatus.FAILED;
      }
    } else if (paymentGateway === 'FLUTTERWAVE') {
      const flwId = gatewayTransactionId ? parseInt(gatewayTransactionId, 10) : null;
      if (flwId && !isNaN(flwId)) {
        const result = await flutterwave.initiateRefund({ id: flwId, amount: amountNaira });
        if (result.status === 'success') {
          gatewayRef = String(flwId);
          finalStatus = RefundStatus.COMPLETED;
        } else {
          finalStatus = RefundStatus.FAILED;
        }
      }
      // No numeric ID → stays PROCESSING, surfaced to admin as needing manual gateway action
    }
    // BANK_TRANSFER → stays PROCESSING; admin processes via manual bank transfer
  } catch {
    finalStatus = RefundStatus.FAILED;
  }

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: finalStatus,
      ...(gatewayRef ? { gatewayRef } : {}),
      ...(finalStatus === RefundStatus.COMPLETED ? { processedAt: new Date() } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'refund.approved',
      entityType: 'Refund',
      entityId: refundId,
      payload: { amount: refund.amount.toString(), reason: refund.reason, finalStatus, gatewayRef },
      ip: req.ip ?? null,
    },
  });

  if (finalStatus === RefundStatus.FAILED) {
    res.status(502).json({
      success: false,
      error: 'Refund approved but gateway processing failed. Check gateway dashboard and retry.',
    });
    return;
  }

  res.json({
    success: true,
    data: updated,
    message: paymentGateway === 'BANK_TRANSFER'
      ? 'Refund approved. Transfer ₦' + amountNaira.toLocaleString() + ' manually via bank transfer.'
      : 'Refund processed successfully through ' + paymentGateway + '.',
  });
});
