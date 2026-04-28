import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma, DrawStatus, PaymentStatus } from '@raffleprop/db';
import { redisCounters } from '../lib/redis';
import { AppError } from '../middleware/errorHandler';

export const drawsRouter: import('express').Router = Router();

// ─── GET /api/draws/:campaignId/live ─────────────────────────────────────────
//
// Public endpoint — no auth required.
// Returns only the information needed for the live draw overlay:
//   - Campaign title, property address, image
//   - Draw status + timestamps
//   - seedCommitment (once SCHEDULED or later — safe to reveal publicly)
//   - Winner first name + ticket number (once COMPLETED)
//   - ticketCount snapshot
//   - Live tickets-sold count from Redis
//
// Winner's full identity is NOT exposed — only first name and ticket number.
drawsRouter.get('/:campaignId/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.params as { campaignId: string };

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        propertyAddress: true,
        propertyState: true,
        propertyLga: true,
        marketValue: true,
        totalTickets: true,
        ticketPrice: true,
        drawDate: true,
        drawMethod: true,
        featuredImageKey: true,
        status: true,
        drawPreSeed: true,
      },
    });

    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const draw = await prisma.draw.findUnique({
      where: { campaignId },
      select: {
        id: true,
        status: true,
        seedCommitment: true,
        drawSeed: true,
        ticketCount: true,
        fccpcNotifiedAt: true,
        publicAnnouncedAt: true,
        createdAt: true,
        winnerTicket: {
          select: {
            ticketNumber: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    const ticketsSold = await redisCounters.getTicketsSold(campaignId);

    let winnerFirstName: string | null = null;
    let winnerTicketNumber: string | null = null;
    let drawPreSeed: string | null = null;
    let ticketListHash: string | null = null;

    if (draw?.status === DrawStatus.COMPLETED) {
      if (draw.winnerTicket) {
        winnerFirstName = draw.winnerTicket.user.fullName.split(' ')[0] ?? 'Winner';
        winnerTicketNumber = draw.winnerTicket.ticketNumber;
      }
      // Reveal drawPreSeed and ticketListHash after draw completion for independent verification
      drawPreSeed = campaign.drawPreSeed ?? null;
      const confirmedTickets = await prisma.ticket.findMany({
        where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
        select: { ticketNumber: true },
        orderBy: { ticketNumber: 'asc' },
      });
      ticketListHash = crypto
        .createHash('sha256')
        .update(confirmedTickets.map((t) => t.ticketNumber).join(','))
        .digest('hex');
    }

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          title: campaign.title,
          propertyAddress: campaign.propertyAddress,
          propertyState: campaign.propertyState,
          propertyLga: campaign.propertyLga,
          marketValue: campaign.marketValue,
          totalTickets: campaign.totalTickets,
          ticketPrice: campaign.ticketPrice,
          drawDate: campaign.drawDate,
          drawMethod: campaign.drawMethod,
          featuredImageKey: campaign.featuredImageKey,
          status: campaign.status,
        },
        draw: draw
          ? {
              id: draw.id,
              status: draw.status,
              seedCommitment:
                ['SCHEDULED', 'LIVE', 'COMPLETED', 'FILED'].includes(draw.status)
                  ? draw.seedCommitment
                  : null,
              ticketCount: draw.ticketCount,
              publicAnnouncedAt: draw.publicAnnouncedAt,
              initiatedAt: draw.createdAt,
              drawSeed: draw.status === DrawStatus.COMPLETED ? draw.drawSeed : null,
              drawPreSeed,
              ticketListHash,
              winnerFirstName,
              winnerTicketNumber,
            }
          : null,
        ticketsSold,
      },
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, 'Failed to load live draw data'));
  }
});
