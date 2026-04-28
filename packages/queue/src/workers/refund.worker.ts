/**
 * Refund worker — FCCPA §123 compliant
 *
 * Processes both individual approved refunds and
 * bulk campaign cancellation refunds.
 */
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma, RefundStatus, RefundReason, PaymentGateway, PaymentStatus } from '@raffleprop/db';
// Payment gateway clients (duplicated from API to avoid cross-package runtime deps)
import https from 'https';

function paystackRefund(transaction: string, amount?: number): Promise<{ data: { id: number } }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ transaction, ...(amount ? { amount: amount * 100 } : {}) });
    const req = https.request(
      { hostname: 'api.paystack.co', path: '/refund', method: 'POST',
        headers: { Authorization: `Bearer ${process.env['PAYSTACK_SECRET_KEY']}`,
          'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let raw = ''; res.on('data', (c: Buffer) => (raw += c.toString())); res.on('end', () => resolve(JSON.parse(raw) as { data: { id: number } })); },
    );
    req.on('error', reject); req.write(body); req.end();
  });
}

function flutterwaveRefund(id: number, amount?: number): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    const body = amount ? JSON.stringify({ amount }) : '{}';
    const req = https.request(
      { hostname: 'api.flutterwave.com', path: `/v3/transactions/${id}/refund`, method: 'POST',
        headers: { Authorization: `Bearer ${process.env['FLUTTERWAVE_SECRET_KEY']}`,
          'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let raw = ''; res.on('data', (c: Buffer) => (raw += c.toString())); res.on('end', () => resolve(JSON.parse(raw) as { status: string })); },
    );
    req.on('error', reject); req.write(body); req.end();
  });
}
import { enqueueRefund } from '../queues';
import type { ProcessRefundJob, ProcessCampaignRefundsJob } from '../queues';

const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export function createRefundWorker() {
  return new Worker<ProcessRefundJob | ProcessCampaignRefundsJob>(
    'refunds',
    async (job: Job<ProcessRefundJob | ProcessCampaignRefundsJob>) => {
      if (job.name === 'process-refund') {
        await processSingleRefund((job.data as ProcessRefundJob).refundId);
      } else if (job.name === 'campaign-refunds') {
        await enqueueAllCampaignRefunds(job.data as ProcessCampaignRefundsJob);
      }
    },
    { connection, concurrency: 3 },
  );
}

async function processSingleRefund(refundId: string): Promise<void> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      ticket: {
        select: {
          paymentRef: true,
          paymentGateway: true,
          gatewayTransactionId: true, // Flutterwave numeric id / Paystack tx id
        },
      },
    },
  });

  if (!refund) throw new Error(`Refund ${refundId} not found`);
  if (refund.status === RefundStatus.COMPLETED) return; // idempotent

  // ── Bank Transfer: no gateway to call — admin must refund manually ──────────
  if (refund.ticket.paymentGateway === PaymentGateway.BANK_TRANSFER) {
    // Leave status as PENDING so it surfaces in the admin refund manager
    // with a clear note that manual bank transfer is required.
    await prisma.refund.update({
      where:  { id: refundId },
      data:   { gatewayRef: 'MANUAL_BANK_TRANSFER' },
    });
    console.log(`⚠️  Refund ${refundId} is a bank transfer — requires manual processing`);
    return;
  }

  await prisma.refund.update({
    where: { id: refundId },
    data: { status: RefundStatus.PROCESSING },
  });

  try {
    let gatewayRef: string | undefined;

    if (refund.ticket.paymentGateway === PaymentGateway.PAYSTACK) {
      // Use the payment ref (Paystack reference) — it's what Paystack refund API accepts
      const result = await paystackRefund(refund.ticket.paymentRef, Number(refund.amount));
      gatewayRef = String(result.data.id);
    } else {
      // Flutterwave requires its own numeric transaction ID, not our tx_ref.
      // gatewayTransactionId is stored on confirmation from the webhook payload.
      const flwId = refund.ticket.gatewayTransactionId
        ? parseInt(refund.ticket.gatewayTransactionId, 10)
        : NaN;
      if (!flwId || isNaN(flwId)) {
        throw new Error(
          `Flutterwave refund failed for ${refundId}: no gatewayTransactionId stored on ticket. ` +
          `The webhook may not have fired or the ID was not captured. Process manually.`,
        );
      }
      const result = await flutterwaveRefund(flwId, Number(refund.amount));
      gatewayRef = result.status;
    }

    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.COMPLETED,
        gatewayRef,
        processedAt: new Date(),
      },
    });

    // Mark original ticket as refunded
    await prisma.ticket.update({
      where: { id: refund.ticketId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    console.log(`✅ Refund ${refundId} processed via ${refund.ticket.paymentGateway}`);
  } catch (err) {
    await prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.FAILED },
    });
    throw err;
  }
}

async function enqueueAllCampaignRefunds(data: ProcessCampaignRefundsJob): Promise<void> {
  const { campaignId, reason } = data;

  // Find all successful, non-refunded tickets
  const tickets = await prisma.ticket.findMany({
    where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
    select: { id: true, userId: true, totalAmount: true },
  });

  for (const ticket of tickets) {
    // Create refund record
    const refund = await prisma.refund.upsert({
      where: { ticketId: ticket.id },
      update: {},
      create: {
        ticketId: ticket.id,
        userId: ticket.userId,
        campaignId,
        amount: ticket.totalAmount,
        reason: reason as RefundReason,
        status: RefundStatus.PENDING,
      },
    });

    // Enqueue individual refund processing
    await enqueueRefund({ refundId: refund.id });
  }

  console.log(`✅ Enqueued ${tickets.length} refunds for campaign ${campaignId}`);
}
