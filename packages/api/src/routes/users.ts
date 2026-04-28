import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
const winnerClaimUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@raffleprop/db';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { encrypt } from '../services/encryption.service';
import { getPresignedUploadUrl, storageKeys } from '../services/storage.service';

export const usersRouter: import('express').Router = Router();

// ─── GET /api/users/me ────────────────────────────────────────────────────────
usersRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      kycStatus: true,
      role: true,
      referralCode: true,
      referralCount: true,
      referralEarnings: true,
      ndprConsentAt: true,
      ndprConsentIp: true,
      tcAcceptedAt: true,
      tcAcceptedIp: true,
      phoneVerified: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
});

// ─── PUT /api/users/me ────────────────────────────────────────────────────────
const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
});

usersRouter.put('/me', authenticate, validate(updateProfileSchema), async (req: Request, res: Response) => {
  const { fullName } = req.body as z.infer<typeof updateProfileSchema>;
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: { ...(fullName ? { fullName } : {}) },
    select: { id: true, fullName: true, email: true },
  });
  res.json({ success: true, data: user });
});

// ─── GET /api/users/me/kyc-upload-url ────────────────────────────────────────
// Returns a presigned PUT URL so the client can upload their identity document
// directly to R2 without routing through the API server.
// Accepted mimeTypes: application/pdf | image/jpeg | image/png
usersRouter.get('/me/kyc-upload-url', authenticate, async (req: Request, res: Response) => {
  const mimeType = req.query['mimeType'] as string | undefined;
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!mimeType || !allowed.includes(mimeType)) {
    res.status(400).json({ success: false, error: `mimeType must be one of: ${allowed.join(', ')}` });
    return;
  }
  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const key = `kyc/${req.user!.sub}/id-document.${ext}`;
  const uploadUrl = await getPresignedUploadUrl(key, mimeType, false, 900); // 15 min
  res.json({ success: true, data: { uploadUrl, documentKey: key } });
});

// ─── POST /api/users/me/kyc ───────────────────────────────────────────────────
const KYC_ID_TYPES = ['DRIVERS_LICENCE', 'NATIONAL_ID', 'PASSPORT', 'VOTERS_CARD', 'NIN_SLIP'] as const;

const kycSchema = z.object({
  bvn:         z.string().regex(/^\d{11}$/, 'BVN must be 11 digits').optional(),
  nin:         z.string().regex(/^\d{11}$/, 'NIN must be 11 digits').optional(),
  idType:      z.enum(KYC_ID_TYPES),
  documentKey: z.string().min(1, 'Document key is required — upload your ID document first'),
});

usersRouter.post('/me/kyc', authenticate, validate(kycSchema), async (req: Request, res: Response) => {
  const { bvn, nin, idType, documentKey } = req.body as z.infer<typeof kycSchema>;
  await prisma.user.update({
    where: { id: req.user!.sub },
    data: {
      ...(bvn ? { bvnEncrypted: encrypt(bvn) } : {}),
      ...(nin ? { ninEncrypted: encrypt(nin) } : {}),
      kycIdType: idType,
      kycDocumentKey: documentKey,
      kycSubmittedAt: new Date(),
      kycStatus: 'SUBMITTED',
    },
  });
  res.json({ success: true, data: null, message: 'KYC submitted for review.' });
});

// ─── PUT /api/users/me/password ───────────────────────────────────────────────
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});

usersRouter.put('/me/password', authenticate, validate(passwordSchema), async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { passwordHash: true } });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ success: false, error: 'Current password is incorrect.' }); return; }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user!.sub }, data: { passwordHash: hash } });
  res.json({ success: true, data: null, message: 'Password updated.' });
});

// ─── GET /api/users/me/referral-stats ────────────────────────────────────────
usersRouter.get('/me/referral-stats', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      referralCode: true,
      referralCount: true,
      referralEarnings: true,
    },
  });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

  // Tickets earned through referrals (every 5 referrals = 1 free ticket equivalent in ₦5000 credit)
  const freeTickets = Math.floor(user.referralCount / 5);
  const nextFreeAt = 5 - (user.referralCount % 5);
  // Earnings derived from free tickets earned; referralEarnings DB field is not auto-updated
  const referralEarnings = freeTickets * 5000;

  res.json({
    success: true,
    data: {
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralEarnings,
      freeTicketsEarned: freeTickets,
      nextFreeTicketIn: nextFreeAt,
      progressPercent: Math.round(((user.referralCount % 5) / 5) * 100),
    },
  });
});

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── GET /api/users/me/notifications ─────────────────────────────────────────
// Synthesised from tickets, draws and refunds — no separate notifications table
usersRouter.get('/me/notifications', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const [recentTickets, recentRefunds, upcomingDraws] = await Promise.all([
    prisma.ticket.findMany({
      where: { userId, paymentStatus: 'SUCCESS' },
      orderBy: { purchasedAt: 'desc' },
      take: 10,
      include: { campaign: { select: { title: true, slug: true } } },
    }),
    prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { campaign: { select: { title: true } } },
    }),
    prisma.ticket.findMany({
      where: { userId, paymentStatus: 'SUCCESS' },
      select: { campaignId: true, campaign: { select: { title: true, slug: true, drawDate: true } } },
      distinct: ['campaignId'],
    }),
  ]);

  type Notification = {
    id: string;
    type: string;
    icon: string;
    title: string;
    message: string;
    time: Date;
    read: boolean;
    href: string | null;
  };

  const notifications: Notification[] = [];

  for (const t of recentTickets) {
    notifications.push({
      id: `ticket-${t.id}`,
      type: 'payment',
      icon: 'fa-receipt',
      title: 'Ticket Purchase Confirmed',
      message: `${t.quantity} ticket${t.quantity > 1 ? 's' : ''} for <strong>${escHtml(t.campaign.title)}</strong>. Receipt #${escHtml(t.receiptNumber)}.`,
      time: t.purchasedAt,
      read: false,
      href: '/transactions',
    });
  }

  for (const r of recentRefunds) {
    notifications.push({
      id: `refund-${r.id}`,
      type: 'refund',
      icon: 'fa-rotate-left',
      title: 'Refund Processed',
      message: `₦${Number(r.amount).toLocaleString()} refunded for <strong>${escHtml(r.campaign.title)}</strong>. Status: ${escHtml(r.status)}.`,
      time: r.createdAt,
      read: false,
      href: '/transactions',
    });
  }

  for (const t of upcomingDraws) {
    if (t.campaign.drawDate && new Date(t.campaign.drawDate) > new Date()) {
      notifications.push({
        id: `draw-${t.campaignId}`,
        type: 'draw',
        icon: 'fa-dice',
        title: 'Upcoming Draw',
        message: `Draw for <strong>${escHtml(t.campaign.title)}</strong> is scheduled for ${new Date(t.campaign.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        time: t.campaign.drawDate,
        read: false,
        href: `/campaigns/${t.campaign.slug}`,
      });
    }
  }

  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  res.json({ success: true, data: notifications });
});

// ─── GET /api/users/me/winner-status ─────────────────────────────────────────
usersRouter.get('/me/winner-status', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const winningDraw = await prisma.draw.findFirst({
    where: {
      winnerTicket: { userId },
      status: 'COMPLETED',
    },
    select: {
      id: true,
      status: true,
      witnessName: true,
      witnessTitle: true,
      publicAnnouncedAt: true,
      winnerNotifiedAt: true,
      fccpcNotifiedAt: true,
      claimIdentityVerifiedAt: true,
      claimAcceptanceSignedAt: true,
      claimKycCompletedAt: true,
      claimTransferCompletedAt: true,
      claimKeysHandedAt: true,
      campaign: { select: { title: true, slug: true, propertyAddress: true, marketValue: true } },
      winnerTicket: { select: { ticketNumber: true, purchasedAt: true } },
    },
  });

  res.json({
    success: true,
    data: {
      isWinner: !!winningDraw,
      draw: winningDraw ?? null,
    },
  });
});

// ─── GET /api/users/me/claim-documents ───────────────────────────────────────
usersRouter.get('/me/claim-documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const draw = await prisma.draw.findFirst({
      where: { winnerTicket: { userId }, status: 'COMPLETED' },
      select: { id: true },
    });
    if (!draw) { res.json({ success: true, data: [] }); return; }
    const docs = await prisma.claimDocument.findMany({
      where: { drawId: draw.id },
      orderBy: [{ step: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, step: true, name: true, description: true, requiresPhysical: true,
        originalFileName: true, uploadedAt: true, uploadedByRole: true,
        verifiedAt: true, notes: true, mimeType: true,
        storageKey: true,
      },
    });
    res.json({ success: true, data: docs });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to load claim documents')); }
});

// ─── POST /api/users/me/claim-documents/:docId/upload ────────────────────────
// Winner uploads a file for non-physical documents.
// File is handled server-side and stored in R2 — no browser-to-R2 CORS required.
usersRouter.post('/me/claim-documents/:docId/upload', authenticate, winnerClaimUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const file = req.file;
    if (!file) { res.status(400).json({ success: false, error: 'No file provided' }); return; }
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.mimetype)) { res.status(400).json({ success: false, error: 'Unsupported file type. Use PDF, JPG, PNG, or WEBP.' }); return; }

    const draw = await prisma.draw.findFirst({
      where: { winnerTicket: { userId }, status: 'COMPLETED' },
      select: { id: true },
    });
    if (!draw) { res.status(403).json({ success: false, error: 'No winning draw found' }); return; }

    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return; }
    if (doc.requiresPhysical) {
      res.status(403).json({ success: false, error: 'This document requires a physical office visit. Please bring the original to our office.' });
      return;
    }

    const { uploadBuffer, storageKeys } = await import('../services/storage.service');
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : (file.mimetype.split('/')[1] ?? 'bin');
    const key = storageKeys.claimDocument(doc.id, ext);
    await uploadBuffer(key, file.buffer, file.mimetype, true);

    const updated = await prisma.claimDocument.update({
      where: { id: doc.id },
      data: { storageKey: key, mimeType: file.mimetype, originalFileName: file.originalname || null, uploadedAt: new Date(), uploadedByRole: 'winner' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to upload document')); }
});

// ─── GET /api/users/me/claim-documents/:docId/download-url ───────────────────
usersRouter.get('/me/claim-documents/:docId/download-url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const draw = await prisma.draw.findFirst({
      where: { winnerTicket: { userId }, status: 'COMPLETED' },
      select: { id: true },
    });
    if (!draw) { res.status(403).json({ success: false, error: 'No winning draw found' }); return; }
    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc?.storageKey || !doc.uploadedAt) { res.status(404).json({ success: false, error: 'No file available yet' }); return; }
    const { getPresignedDownloadUrl } = await import('../services/storage.service');
    const url = await getPresignedDownloadUrl(doc.storageKey, true, 900);
    res.json({ success: true, data: { url } });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to generate download URL')); }
});
