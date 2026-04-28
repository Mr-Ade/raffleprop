import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { prisma, CampaignStatus, DrawStatus, PaymentStatus } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { redisCounters } from '../../lib/redis';
import { AppError } from '../../middleware/errorHandler';

// BullMQ requires maxRetriesPerRequest: null — separate connection from the main redis client
const bullRedis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const drawQueue = new Queue('draws', { connection: bullRedis });

export const adminDrawsRouter: import('express').Router = Router();
adminDrawsRouter.use(authenticate, requireAdmin);

// ─── GET /api/admin/draws ─────────────────────────────────────────────────────
// List all campaigns that have been drawn (DRAWN / CLOSED / FILED) with their
// draw record and winner ticket info — used by the post-draw compliance page.
adminDrawsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { status: { in: [CampaignStatus.DRAWN, CampaignStatus.CLOSED] } },
      select: {
        id: true, title: true,
        propertyState: true, propertyLga: true,
        fccpcRef: true, drawDate: true, status: true,
        draw: {
          select: {
            id: true, status: true,
            winnerNotifiedAt: true, winnerAcknowledgedAt: true,
            cpcbFiledAt: true, cpcbAcknowledgedAt: true, cpcbFormKey: true,
            claimIdentityVerifiedAt: true,
            claimAcceptanceSignedAt: true,
            claimKycCompletedAt: true,
            claimTransferCompletedAt: true,
            claimKeysHandedAt: true,
            winnerTicket: {
              select: {
                ticketNumber: true,
                user: { select: { fullName: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { drawDate: 'desc' },
    });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load draws'));
  }
});

function sha256hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

// ─── GET /api/admin/draws/:campaignId/status ─────────────────────────────────
adminDrawsRouter.get('/:campaignId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, title: true, totalTickets: true, minTickets: true, ticketPrice: true, status: true, drawDate: true, drawMethod: true },
    });
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const ticketsSold = await redisCounters.getTicketsSold(campaign.id);
    const draw = await prisma.draw.findUnique({ where: { campaignId: campaign.id } });

    res.json({
      success: true,
      data: {
        campaign,
        ticketsSold,
        meetsMinimum: ticketsSold >= campaign.minTickets,
        draw,
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load draw status'));
  }
});

// ─── POST /api/admin/draws/:campaignId/initiate ──────────────────────────────
//
// Initiates a draw using a two-phase commitment scheme:
//
//   Phase 1 (at campaign LIVE): drawPreSeed generated and its SHA-256 commitment
//   published before any tickets are sold — admin cannot predict the ticket list.
//
//   Phase 2 (here): finalDrawSeed = sha256(drawPreSeed + ':' + ticketListHash)
//   The drawPreSeed is fixed (committed at launch); ticketListHash is determined
//   by buyers. Neither party alone controls the outcome.
//
// Verification: sha256(drawPreSeed) === drawPreSeedCommitment (published at LIVE)
//               sha256(drawPreSeed + ':' + ticketListHash) === drawSeed (after draw)
//
// The draw is immediately enqueued — it executes as soon as the worker picks it up.
adminDrawsRouter.post('/:campaignId/initiate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true, minTickets: true, drawMethod: true, drawPreSeed: true, drawPreSeedCommitment: true },
    });
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    if (campaign.status !== CampaignStatus.CLOSED) {
      res.status(409).json({ success: false, error: 'Campaign must be CLOSED before initiating draw' });
      return;
    }

    // Block re-initiation — seed commitment already published cannot be replaced
    const existing = await prisma.draw.findUnique({ where: { campaignId: campaign.id } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'A draw has already been initiated for this campaign and cannot be restarted. Use the draw management panel to monitor its progress.',
      });
      return;
    }

    const ticketsSold = await redisCounters.getTicketsSold(campaign.id);
    if (ticketsSold < campaign.minTickets) {
      res.status(409).json({
        success: false,
        error: `Minimum ticket threshold not met (${ticketsSold}/${campaign.minTickets}). Trigger refunds instead.`,
      });
      return;
    }

    const { witnessName, witnessTitle, fccpcNotifiedAt } = req.body as {
      witnessName?: string;
      witnessTitle?: string;
      fccpcNotifiedAt?: string;
    };
    if (!witnessName?.trim() || !witnessTitle?.trim()) {
      res.status(400).json({
        success: false,
        error: 'witnessName and witnessTitle are required. The draw must have an independent witness (FCCPA §124).',
      });
      return;
    }

    if (fccpcNotifiedAt) {
      const notifDate = new Date(fccpcNotifiedAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - notifDate.getTime()) / 86_400_000);
      if (daysSince < 14) {
        res.status(400).json({
          success: false,
          error: `FCCPC notification must be at least 14 days before the draw (FCCPA §124). ` +
                 `Notification was ${daysSince} day(s) ago — draw cannot proceed until day 14.`,
        });
        return;
      }
    }

    // ── Two-phase seed finalisation ───────────────────────────────────────────
    if (!campaign.drawPreSeed) {
      res.status(409).json({
        success: false,
        error: 'Campaign is missing its draw pre-seed. Re-apply the UPCOMING → LIVE transition to generate one before initiating the draw.',
      });
      return;
    }

    // Build a deterministic hash of all confirmed ticket numbers
    const confirmedTickets = await prisma.ticket.findMany({
      where: { campaignId: campaign.id, paymentStatus: PaymentStatus.SUCCESS },
      select: { ticketNumber: true },
      orderBy: { ticketNumber: 'asc' },
    });
    const ticketListHash = crypto
      .createHash('sha256')
      .update(confirmedTickets.map((t) => t.ticketNumber).join(','))
      .digest('hex');

    // finalDrawSeed = sha256(drawPreSeed + ':' + ticketListHash)
    // — committed entropy (unknowable at ticket sale time) + buyer-determined entropy
    const finalDrawSeed = crypto
      .createHash('sha256')
      .update(`${campaign.drawPreSeed}:${ticketListHash}`)
      .digest('hex');

    // The commitment published at LIVE is sha256(drawPreSeed)
    const seedCommitment = campaign.drawPreSeedCommitment ?? sha256hex(campaign.drawPreSeed);

    const fccpcDate = fccpcNotifiedAt ? new Date(fccpcNotifiedAt) : undefined;

    const draw = await prisma.draw.create({
      data: {
        campaignId: campaign.id,
        status: DrawStatus.SCHEDULED,
        witnessName: witnessName.trim(),
        witnessTitle: witnessTitle.trim(),
        initiatedBy: req.user!.sub,
        drawSeed: finalDrawSeed,
        seedCommitment,
        ...(fccpcDate !== undefined && { fccpcNotifiedAt: fccpcDate }),
      },
      select: { id: true, status: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'draw.initiated',
        entityType: 'Draw',
        entityId: draw.id,
        payload: {
          campaignId,
          drawMethod: campaign.drawMethod,
          ticketsSold,
          witnessName: witnessName.trim(),
          witnessTitle: witnessTitle.trim(),
          seedCommitment,
          ticketListHash,
          fccpcNotifiedAt: fccpcDate ?? null,
        },
        ip: req.ip ?? null,
      },
    });

    await drawQueue.add(
      'execute-draw',
      { drawId: draw.id, campaignId: campaign.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    res.json({
      success: true,
      data: {
        draw,
        seedCommitment,
        ticketListHash,
        instruction:
          'The draw seed was computed as sha256(drawPreSeed + ":" + ticketListHash). ' +
          'drawPreSeed was committed (via drawPreSeedCommitment) when this campaign went LIVE — ' +
          'before any tickets were sold. Participants can verify: ' +
          '(1) sha256(drawPreSeed) === drawPreSeedCommitment (published at launch) ' +
          '(2) sha256(drawPreSeed + ":" + ticketListHash) === drawSeed (published after draw).',
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to initiate draw'));
  }
});

// ─── POST /api/admin/draws/:campaignId/announce ──────────────────────────────
//
// Called AFTER the draw worker has completed (status = COMPLETED).
// Records the public announcement timestamp. Does NOT allow changing the winner —
// that is set immutably by the draw worker.
adminDrawsRouter.post('/:campaignId/announce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;

    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: { id: true, status: true, winnerTicketId: true, drawSeed: true, seedCommitment: true },
    });
    if (!draw) {
      res.status(404).json({ success: false, error: 'No draw found for this campaign' });
      return;
    }
    if (draw.status !== DrawStatus.COMPLETED) {
      res.status(409).json({
        success: false,
        error: `Draw must be COMPLETED before announcing. Current status: ${draw.status}`,
      });
      return;
    }

    const updated = await prisma.draw.update({
      where: { id: draw.id },
      data: { publicAnnouncedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'draw.announced',
        entityType: 'Draw',
        entityId: draw.id,
        payload: {
          campaignId,
          winnerTicketId: draw.winnerTicketId,
          drawSeed: draw.drawSeed,
          seedCommitment: draw.seedCommitment,
        },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to announce draw'));
  }
});

// ─── GET /api/admin/draws/:campaignId/verify ─────────────────────────────────
//
// Returns everything needed to independently verify the draw result:
//  - drawPreSeed + seedCommitment: verify sha256(drawPreSeed) === seedCommitment
//  - drawSeed + ticketListHash:    verify sha256(drawPreSeed + ':' + ticketListHash) === drawSeed
//  - ticketCount, winnerTicketId, witnessName/Title
adminDrawsRouter.get('/:campaignId/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;

    const [draw, campaign] = await Promise.all([
      prisma.draw.findUnique({
        where: { campaignId },
        select: {
          id: true,
          status: true,
          drawSeed: true,
          seedCommitment: true,
          ticketCount: true,
          winnerTicketId: true,
          randomOrgResponse: true,
          witnessName: true,
          witnessTitle: true,
        },
      }),
      prisma.campaign.findUnique({ where: { id: campaignId }, select: { drawMethod: true, drawPreSeed: true } }),
    ]);

    if (!draw || draw.status !== DrawStatus.COMPLETED) {
      res.status(404).json({ success: false, error: 'No completed draw found for this campaign' });
      return;
    }

    // Recompute ticketListHash from confirmed tickets (same deterministic ordering as at draw time)
    const confirmedTickets = await prisma.ticket.findMany({
      where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
      select: { ticketNumber: true },
      orderBy: { ticketNumber: 'asc' },
    });
    const ticketListHash = crypto
      .createHash('sha256')
      .update(confirmedTickets.map((t) => t.ticketNumber).join(','))
      .digest('hex');

    // Two-phase commitment check:
    // seedCommitment = sha256(drawPreSeed) — committed at LIVE before any tickets sold
    // drawSeed = sha256(drawPreSeed + ':' + ticketListHash) — computed at initiation
    const commitmentMatches = !!(
      campaign?.drawPreSeed &&
      draw.seedCommitment &&
      sha256hex(campaign.drawPreSeed) === draw.seedCommitment
    );

    res.json({
      success: true,
      data: {
        drawId: draw.id,
        campaignId,
        drawMethod: campaign?.drawMethod,
        seedCommitment: draw.seedCommitment,
        drawPreSeed: campaign?.drawPreSeed ?? null,
        drawSeed: draw.drawSeed,
        ticketListHash,
        ticketCount: draw.ticketCount,
        winnerTicketId: draw.winnerTicketId,
        witnessName: draw.witnessName,
        witnessTitle: draw.witnessTitle,
        commitmentVerified: commitmentMatches,
        randomOrgResponse: draw.randomOrgResponse ?? null,
        instructions:
          'Two-phase verification: ' +
          '(1) sha256(drawPreSeed) must equal seedCommitment — proves the seed was committed before tickets were sold. ' +
          '(2) sha256(drawPreSeed + ":" + ticketListHash) must equal drawSeed — proves the final seed was computed correctly. ' +
          '(3) winnerIndex = BigInt("0x" + drawSeed.slice(0,16)) % ticketCount',
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load draw verification data'));
  }
});

// ─── GET /api/admin/draws/:campaignId/tickets ────────────────────────────────
adminDrawsRouter.get('/:campaignId/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const page = parseInt((req.query['page'] as string) ?? '1', 10);
    const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '50', 10), 200);
    const skip = (page - 1) * pageSize;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
        skip,
        take: pageSize,
        orderBy: { ticketNumber: 'asc' },
        include: { user: { select: { fullName: true, email: true, phone: true } } },
      }),
      prisma.ticket.count({
        where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
      }),
    ]);

    res.json({ success: true, data: { data: tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load draw tickets'));
  }
});

// ─── POST /api/admin/draws/:campaignId/notify-winner ─────────────────────────
// Records that winner details have been submitted to FCCPC (3-day obligation).
adminDrawsRouter.post('/:campaignId/notify-winner', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: { id: true, status: true, winnerNotifiedAt: true },
    });
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found for this campaign' }); return; }
    if (draw.status !== DrawStatus.COMPLETED) {
      res.status(409).json({ success: false, error: 'Draw must be COMPLETED before notifying winner' });
      return;
    }

    const updated = await prisma.draw.update({
      where: { campaignId },
      data: { winnerNotifiedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'draw.winner_submitted',
        entityType: 'Draw',
        entityId: draw.id,
        payload: { campaignId },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to record winner notification'));
  }
});

// ─── POST /api/admin/draws/:campaignId/acknowledge-winner ─────────────────────
// Records that FCCPC has acknowledged the winner submission.
adminDrawsRouter.post('/:campaignId/acknowledge-winner', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: { id: true, winnerNotifiedAt: true },
    });
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found for this campaign' }); return; }
    if (!draw.winnerNotifiedAt) {
      res.status(409).json({ success: false, error: 'Winner must be submitted to FCCPC before recording acknowledgement' });
      return;
    }

    const updated = await prisma.draw.update({
      where: { campaignId },
      data: { winnerAcknowledgedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'draw.winner_acknowledged',
        entityType: 'Draw',
        entityId: draw.id,
        payload: { campaignId },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to record winner acknowledgement'));
  }
});

// ─── POST /api/admin/draws/:campaignId/file-cpcb ─────────────────────────────
// Marks Form CPC B as filed with FCCPC (21-day obligation). No R2 upload
// required — just records the filing date. For uploading the actual PDF,
// use POST /api/admin/compliance/cpcb-form.
adminDrawsRouter.post('/:campaignId/file-cpcb', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: { id: true, status: true, cpcbFiledAt: true },
    });
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found for this campaign' }); return; }
    if (draw.status !== DrawStatus.COMPLETED) {
      res.status(409).json({ success: false, error: 'Draw must be COMPLETED before filing Form CPC B' });
      return;
    }

    const updated = await prisma.draw.update({
      where: { campaignId },
      data: { cpcbFiledAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'draw.cpcb_filed',
        entityType: 'Draw',
        entityId: draw.id,
        payload: { campaignId },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to record CPC B filing'));
  }
});

// ─── GET /api/admin/draws/:campaignId/cpcb-pdf ───────────────────────────────
// Generates and streams a pre-filled Form CPC B PDF for download.
adminDrawsRouter.get('/:campaignId/cpcb-pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;

    const [campaign, settings] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true, title: true, subtitle: true,
          fccpcRef: true, propertyAddress: true, propertyState: true,
          drawDate: true, ticketPrice: true, drawMethod: true,
          draw: {
            select: {
              drawSeed: true, seedCommitment: true,
              witnessName: true, witnessTitle: true, ticketCount: true,
              cpcbFiledAt: true,
              winnerTicket: {
                select: {
                  ticketNumber: true,
                  user: { select: { fullName: true, phone: true } },
                },
              },
            },
          },
        },
      }),
      prisma.siteSettings.findUnique({ where: { id: 'global' } }),
    ]);

    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    if (!campaign.draw) {
      res.status(404).json({ success: false, error: 'No draw record found for this campaign' });
      return;
    }

    // Pull company details from CMS — fall back to blanks so admin knows what to fill in
    const companyInfo = settings?.companyInfo as {
      legalName?: string; registeredAddress?: string; cacNumber?: string;
    } | null ?? {};
    const siteName = settings?.siteName ?? 'RaffleProp';
    const promoterName = companyInfo.legalName ?? siteName;
    const promoterAddress = companyInfo.registeredAddress ?? '';

    // Map DrawMethod enum to human-readable FCCPC description
    const drawMethodLabel: Record<string, string> = {
      RANDOM:               'Pseudo-random number generator (RaffleProp RNG)',
      RANDOM_ORG_VERIFIED:  'Random.org signed random number (independently verifiable)',
    };
    const drawMethod = drawMethodLabel[campaign.drawMethod] ?? campaign.drawMethod;

    // Total revenue from confirmed tickets
    const revenueAgg = await prisma.ticket.aggregate({
      where: { campaignId, paymentStatus: 'SUCCESS' },
      _sum: { totalAmount: true },
    });
    const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);

    const { generateCpcbPdf } = await import('../../services/receipt.service');

    const pdf = await generateCpcbPdf({
      campaignTitle:      campaign.title,
      campaignDescription: campaign.subtitle ?? null,
      fccpcRef:           campaign.fccpcRef,
      cacNumber:          companyInfo.cacNumber ?? null,
      propertyAddress:    campaign.propertyAddress,
      propertyState:      campaign.propertyState,
      drawDate:           campaign.drawDate,
      drawVenue:          null,
      drawMethod,
      drawSeed:           campaign.draw.drawSeed,
      seedCommitment:     campaign.draw.seedCommitment,
      witnessName:        campaign.draw.witnessName,
      witnessTitle:       campaign.draw.witnessTitle,
      ticketCount:        campaign.draw.ticketCount ?? 0,
      totalRevenue,
      ticketPrice:        Number(campaign.ticketPrice),
      winnerName:         campaign.draw.winnerTicket?.user.fullName ?? '',
      winnerPhone:        campaign.draw.winnerTicket?.user.phone ?? '',
      winnerTicketNumber: campaign.draw.winnerTicket?.ticketNumber ?? '',
      promoterName,
      promoterAddress,
      filedAt:            campaign.draw.cpcbFiledAt ?? new Date(),
    });

    const filename = `form-cpcb-${campaign.fccpcRef ?? campaignId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to generate Form CPC B PDF'));
  }
});

// ─── POST /api/admin/draws/:campaignId/advance-claim ─────────────────────────
// Advances the winner's claim journey by recording the timestamp for each step.
// step: 1=IdentityVerified 2=AcceptanceSigned 3=KycCompleted 4=TransferCompleted 5=KeysHanded
adminDrawsRouter.post('/:campaignId/advance-claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const { step } = req.body as { step?: number };

    if (!step || step < 1 || step > 5 || !Number.isInteger(step)) {
      res.status(400).json({ success: false, error: 'step must be an integer between 1 and 5' });
      return;
    }

    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: {
        id: true, status: true,
        claimIdentityVerifiedAt: true,
        claimAcceptanceSignedAt: true,
        claimKycCompletedAt: true,
        claimTransferCompletedAt: true,
        claimKeysHandedAt: true,
      },
    });
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found for this campaign' }); return; }
    if (draw.status !== DrawStatus.COMPLETED) {
      res.status(409).json({ success: false, error: 'Draw must be COMPLETED before advancing claim steps' });
      return;
    }

    // Enforce sequential progression — each step requires the previous one
    if (step === 2 && !draw.claimIdentityVerifiedAt) {
      res.status(409).json({ success: false, error: 'Step 1 (Identity Verification) must be completed first' }); return;
    }
    if (step === 3 && !draw.claimAcceptanceSignedAt) {
      res.status(409).json({ success: false, error: 'Step 2 (Acceptance Signed) must be completed first' }); return;
    }
    if (step === 4 && !draw.claimKycCompletedAt) {
      res.status(409).json({ success: false, error: 'Step 3 (KYC Completed) must be completed first' }); return;
    }
    if (step === 5 && !draw.claimTransferCompletedAt) {
      res.status(409).json({ success: false, error: 'Step 4 (Transfer Completed) must be completed first' }); return;
    }

    const stepField: Record<number, string> = {
      1: 'claimIdentityVerifiedAt',
      2: 'claimAcceptanceSignedAt',
      3: 'claimKycCompletedAt',
      4: 'claimTransferCompletedAt',
      5: 'claimKeysHandedAt',
    };
    const stepName: Record<number, string> = {
      1: 'Identity Verified',
      2: 'Acceptance Signed',
      3: 'KYC Completed',
      4: 'Property Transfer Completed',
      5: 'Keys Handed Over',
    };

    const field = stepField[step]!;
    const updated = await prisma.draw.update({
      where: { campaignId },
      data: { [field]: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: `draw.claim_step_${step}_completed`,
        entityType: 'Draw',
        entityId: draw.id,
        payload: { campaignId, step, stepName: stepName[step] },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to advance claim step'));
  }
});

// ─── POST /api/admin/draws/:campaignId/acknowledge-cpcb ──────────────────────
// Records that FCCPC has acknowledged receipt of Form CPC B.
adminDrawsRouter.post('/:campaignId/acknowledge-cpcb', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: { id: true, cpcbFiledAt: true },
    });
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found for this campaign' }); return; }
    if (!draw.cpcbFiledAt) {
      res.status(409).json({ success: false, error: 'Form CPC B must be filed before recording acknowledgement' });
      return;
    }

    const updated = await prisma.draw.update({
      where: { campaignId },
      data: { cpcbAcknowledgedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: 'draw.cpcb_acknowledged',
        entityType: 'Draw',
        entityId: draw.id,
        payload: { campaignId },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to record CPC B acknowledgement'));
  }
});

// ─── WINNER STORY (public winners page) ──────────────────────────────────────

adminDrawsRouter.get('/:campaignId/winner-story', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const story = await prisma.winnerStory.findFirst({
      where: { campaignId: req.params['campaignId'] as string },
    });
    res.json({ success: true, data: story });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load winner story'));
  }
});

adminDrawsRouter.post('/:campaignId/winner-story', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params['campaignId'] as string;
    const { blurb, drawArchiveUrl, prize, featured, published } = req.body as {
      blurb?: string; drawArchiveUrl?: string; prize?: string;
      featured?: boolean; published?: boolean;
    };

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        title: true, propertyState: true, drawDate: true,
        draw: {
          select: { winnerTicket: { select: { user: { select: { fullName: true } } } } },
        },
      },
    });
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return; }

    const storyData = {
      winnerName: campaign.draw?.winnerTicket?.user.fullName ?? 'Winner',
      propertyTitle: campaign.title,
      propertyState: campaign.propertyState ?? null,
      drawDate: campaign.drawDate ?? null,
      blurb: blurb ?? null,
      drawArchiveUrl: drawArchiveUrl ?? null,
      prize: prize ?? null,
      featured: featured ?? false,
      published: published ?? true,
      campaignId,
    };

    const existing = await prisma.winnerStory.findFirst({ where: { campaignId } });
    const story = existing
      ? await prisma.winnerStory.update({ where: { id: existing.id }, data: storyData })
      : await prisma.winnerStory.create({ data: storyData });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.sub,
        action: existing ? 'winner_story.updated' : 'winner_story.created',
        entityType: 'WinnerStory',
        entityId: story.id,
        payload: { campaignId, published: story.published },
        ip: req.ip ?? null,
      },
    });

    res.json({ success: true, data: story });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to save winner story'));
  }
});

// ─── CLAIM DOCUMENTS ──────────────────────────────────────────────────────────

const claimUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

async function getDrawForCampaign(campaignId: string) {
  return prisma.draw.findUnique({ where: { campaignId }, select: { id: true, status: true } });
}

// ─── GET /api/admin/draws/:campaignId/claim-documents ────────────────────────
adminDrawsRouter.get('/:campaignId/claim-documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }
    const docs = await prisma.claimDocument.findMany({
      where: { drawId: draw.id },
      orderBy: [{ step: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ success: true, data: docs });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to load claim documents')); }
});

// ─── POST /api/admin/draws/:campaignId/claim-documents ───────────────────────
adminDrawsRouter.post('/:campaignId/claim-documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, step, requiresPhysical } = req.body as {
      name?: string; description?: string; step?: number; requiresPhysical?: boolean;
    };
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'name is required' }); return; }
    if (!step || step < 1 || step > 5) { res.status(400).json({ success: false, error: 'step must be 1–5' }); return; }

    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }

    const doc = await prisma.claimDocument.create({
      data: {
        drawId: draw.id,
        step,
        name: name.trim(),
        description: description?.trim() ?? null,
        requiresPhysical: requiresPhysical ?? false,
      },
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to create claim document')); }
});

// ─── PATCH /api/admin/draws/:campaignId/claim-documents/:docId ───────────────
adminDrawsRouter.patch('/:campaignId/claim-documents/:docId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes, name, description } = req.body as { notes?: string; name?: string; description?: string };
    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }
    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return; }
    const updated = await prisma.claimDocument.update({
      where: { id: doc.id },
      data: { ...(notes !== undefined && { notes: notes.trim() || null }), ...(name?.trim() && { name: name.trim() }), ...(description !== undefined && { description: description?.trim() || null }) },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to update document')); }
});

// ─── DELETE /api/admin/draws/:campaignId/claim-documents/:docId ──────────────
adminDrawsRouter.delete('/:campaignId/claim-documents/:docId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }
    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return; }
    if (doc.verifiedAt) { res.status(409).json({ success: false, error: 'Cannot delete a verified document' }); return; }
    await prisma.claimDocument.delete({ where: { id: doc.id } });
    res.json({ success: true });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to delete document')); }
});

// ─── POST /api/admin/draws/:campaignId/claim-documents/:docId/upload ──────────
// Admin uploads a file for any document (including physical ones after in-person visit).
// File goes to R2 server-side — no browser-to-R2 CORS required.
adminDrawsRouter.post('/:campaignId/claim-documents/:docId/upload', claimUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ success: false, error: 'No file provided' }); return; }
    if (!ALLOWED_DOC_MIMES.includes(file.mimetype)) { res.status(400).json({ success: false, error: 'Unsupported file type. Use PDF, JPG, PNG, or WEBP.' }); return; }

    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }
    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return; }

    const { uploadBuffer, storageKeys } = await import('../../services/storage.service');
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : (file.mimetype.split('/')[1] ?? 'bin');
    const key = storageKeys.claimDocument(doc.id, ext);
    await uploadBuffer(key, file.buffer, file.mimetype, true);

    const updated = await prisma.claimDocument.update({
      where: { id: doc.id },
      data: { storageKey: key, mimeType: file.mimetype, originalFileName: file.originalname || null, uploadedAt: new Date(), uploadedByRole: 'admin' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to upload document')); }
});

// ─── POST /api/admin/draws/:campaignId/claim-documents/:docId/verify ─────────
adminDrawsRouter.post('/:campaignId/claim-documents/:docId/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }
    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return; }
    if (!doc.uploadedAt) { res.status(409).json({ success: false, error: 'Document must be uploaded before verifying' }); return; }
    const updated = await prisma.claimDocument.update({
      where: { id: doc.id },
      data: { verifiedAt: new Date(), verifiedBy: req.user!.sub },
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'claim_document.verified', entityType: 'ClaimDocument', entityId: doc.id, payload: { drawId: draw.id }, ip: req.ip ?? null },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to verify document')); }
});

// ─── GET /api/admin/draws/:campaignId/claim-documents/:docId/download-url ────
adminDrawsRouter.get('/:campaignId/claim-documents/:docId/download-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draw = await getDrawForCampaign(req.params['campaignId'] as string);
    if (!draw) { res.status(404).json({ success: false, error: 'Draw not found' }); return; }
    const doc = await prisma.claimDocument.findFirst({ where: { id: req.params['docId'] as string, drawId: draw.id } });
    if (!doc?.storageKey) { res.status(404).json({ success: false, error: 'No file uploaded for this document' }); return; }
    const { getPresignedDownloadUrl } = await import('../../services/storage.service');
    const url = await getPresignedDownloadUrl(doc.storageKey, true, 900);
    res.json({ success: true, data: { url } });
  } catch (err) { next(err instanceof AppError ? err : new AppError(500, 'Failed to generate download URL')); }
});
