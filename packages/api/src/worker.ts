/**
 * Draw worker — consumes the BullMQ 'draws' queue and executes draws.
 *
 * Run separately from the API server:
 *   pnpm --filter @raffleprop/api worker
 *
 * The worker picks up 'execute-draw' jobs enqueued by POST /api/admin/draws/:id/initiate.
 * Winner selection is deterministic: BigInt(drawSeed[0..16], 16) % ticketCount.
 * The drawSeed was committed (sha256) before this worker runs, so the result is
 * verifiable by anyone with the seed and the ticket list.
 */
import Redis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { prisma, CampaignStatus, DrawStatus, PaymentStatus } from '@raffleprop/db';
import { sendWinnerEmail } from './services/email.service';

const bullRedis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface DrawJobData {
  drawId: string;
  campaignId: string;
}

async function executeDraw(drawId: string, campaignId: string): Promise<void> {
  // Load draw — must still be SCHEDULED (guard against double-execution)
  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    select: { id: true, status: true, drawSeed: true, campaignId: true },
  });

  if (!draw) throw new Error(`Draw ${drawId} not found`);
  if (draw.status !== DrawStatus.SCHEDULED) {
    console.info(`[DrawWorker] Draw ${drawId} already in status ${draw.status} — skipping`);
    return;
  }
  if (!draw.drawSeed) throw new Error(`Draw ${drawId} has no drawSeed — cannot execute`);

  // Load all paid tickets sorted by ticket number (deterministic ordering)
  const ticketRecords = await prisma.ticket.findMany({
    where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
    select: { id: true, ticketNumber: true, userId: true, quantity: true },
    orderBy: { ticketNumber: 'asc' },
  });

  if (ticketRecords.length === 0) {
    throw new Error(`Draw ${drawId}: no paid tickets found for campaign ${campaignId}`);
  }

  // Expand by quantity so each individual ticket is one draw entry.
  // A bundle purchase of 20 tickets (quantity=20) gets 20 slots — 20× the odds of a single-ticket buyer.
  const ticketPool: Array<{ id: string; ticketNumber: string; userId: string }> = [];
  for (const t of ticketRecords) {
    for (let i = 0; i < t.quantity; i++) {
      ticketPool.push({ id: t.id, ticketNumber: t.ticketNumber, userId: t.userId });
    }
  }

  // Deterministic winner selection using the pre-committed seed
  // winnerIndex = BigInt('0x' + first 16 hex chars of drawSeed) % ticketPool.length
  const seedHex = draw.drawSeed.replace(/[^0-9a-fA-F]/g, '');
  const winnerIndex = Number(BigInt('0x' + seedHex.slice(0, 16)) % BigInt(ticketPool.length));
  const winnerTicket = ticketPool[winnerIndex]!;

  // Write result atomically
  await prisma.$transaction([
    prisma.draw.update({
      where: { id: drawId },
      data: {
        status: DrawStatus.COMPLETED,
        winnerTicketId: winnerTicket.id,
        ticketCount: ticketPool.length,
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.DRAWN },
    }),
    prisma.auditLog.create({
      data: {
        actorId: null,
        action: 'draw.completed',
        entityType: 'Draw',
        entityId: drawId,
        payload: {
          campaignId,
          ticketCount: ticketPool.length,
          winnerTicketId: winnerTicket.id,
          winnerTicketNumber: winnerTicket.ticketNumber,
          winnerIndex,
        },
        ip: null,
      },
    }),
  ]);

  console.info(
    `[DrawWorker] Draw ${drawId} completed — winner ticket ${winnerTicket.ticketNumber} (index ${winnerIndex}/${ticketPool.length})`,
  );

  // Send winner email — fire-and-forget, never block the draw result
  try {
    const winner = await prisma.user.findUnique({
      where: { id: winnerTicket.userId },
      select: { email: true, fullName: true },
    });
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { title: true },
    });
    if (winner && campaign) {
      await sendWinnerEmail(winner.email, winner.fullName, campaign.title, winnerTicket.ticketNumber);
    }
  } catch (err) {
    console.error('[DrawWorker] Failed to send winner email:', err);
  }
}

const worker = new Worker<DrawJobData>(
  'draws',
  async (job: Job<DrawJobData>) => {
    console.info(`[DrawWorker] Processing job ${job.id} — draw ${job.data.drawId}`);
    await executeDraw(job.data.drawId, job.data.campaignId);
  },
  {
    connection: bullRedis,
    concurrency: 1, // draws are sequential — never run two at once
  },
);

worker.on('completed', (job) => {
  console.info(`[DrawWorker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[DrawWorker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[DrawWorker] Worker error:', err);
});

console.info('[DrawWorker] Started — listening on queue: draws');

// Graceful shutdown
async function shutdown(signal: string) {
  console.info(`[DrawWorker] ${signal} received — shutting down`);
  await worker.close();
  await prisma.$disconnect();
  bullRedis.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
