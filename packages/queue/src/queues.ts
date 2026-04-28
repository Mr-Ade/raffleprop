import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ─── Queue Definitions ────────────────────────────────────────────────────────

export const drawQueue = new Queue('draws', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const refundQueue = new Queue('refunds', { connection });
export const ndprQueue = new Queue('ndpr', { connection });
export const complianceQueue = new Queue('compliance', { connection });

// ─── Job Type Definitions ─────────────────────────────────────────────────────

export interface ExecuteDrawJob {
  drawId: string;
  campaignId: string;
}

export interface NotifyWinnerJob {
  drawId: string;
  campaignId: string;
  winnerTicketId: string;
  winnerUserId: string;
}

export interface NotifyLosersJob {
  campaignId: string;
  totalLoserCount: number;
  batchOffset: number;
  batchSize: number;
}

export interface ProcessRefundJob {
  refundId: string;
}

export interface ProcessCampaignRefundsJob {
  campaignId: string;
  reason: 'CAMPAIGN_CANCELLED' | 'MINIMUM_NOT_REACHED';
}

export interface AnonymiseUserJob {
  userId: string;
  ndprRequestId: string;
}

export interface CheckDeadlinesJob {
  triggeredAt: string;
}

// ─── Helpers: enqueue jobs ────────────────────────────────────────────────────

export async function enqueueDraw(data: ExecuteDrawJob) {
  return drawQueue.add('execute-draw', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueWinnerNotification(data: NotifyWinnerJob) {
  return notificationQueue.add('notify-winner', data, {
    delay: 0,
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
  });
}

export async function enqueueRefund(data: ProcessRefundJob) {
  return refundQueue.add('process-refund', data, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 15000 },
  });
}

export async function enqueueCampaignRefunds(data: ProcessCampaignRefundsJob) {
  return refundQueue.add('campaign-refunds', data, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30000 },
  });
}

export async function enqueueNdprAnonymisation(data: AnonymiseUserJob, delayMs: number) {
  return ndprQueue.add('anonymise-user', data, {
    delay: delayMs,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
  });
}
