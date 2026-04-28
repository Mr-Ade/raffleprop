/**
 * BullMQ worker entry point.
 * All queue workers run in this single process.
 */
import { createDrawWorker } from './workers/draw.worker';
import { createNotificationWorker } from './workers/notification.worker';
import { createNdprWorker } from './workers/ndpr.worker';
import { recomputeHotScores } from './workers/hotscore.worker';
import { complianceQueue } from './queues';
import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@raffleprop/db';

const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const drawWorker = createDrawWorker();
const notificationWorker = createNotificationWorker();
const ndprWorker = createNdprWorker();

// Compliance deadline checker — runs on schedule (triggered by cron)
const complianceWorker = new Worker(
  'compliance',
  async (_job) => {
    const now = new Date();
    // Auto-mark overdue deadlines
    const updated = await prisma.regulatoryDeadline.updateMany({
      where: { status: 'PENDING', dueAt: { lt: now } },
      data: { status: 'OVERDUE' },
    });
    console.log(`✅ Compliance check: ${updated.count} deadlines marked overdue`);
  },
  { connection },
);

// Enqueue daily compliance check (would normally be done via a cron in production)
async function scheduleDailyComplianceCheck() {
  await complianceQueue.add(
    'check-deadlines',
    { triggeredAt: new Date().toISOString() },
    {
      repeat: {
        // Every day at 06:00 Nigeria time (UTC+1 = 05:00 UTC)
        pattern: '0 5 * * *',
      },
    },
  );
}

// ── hotScore cron ────────────────────────────────────────────────────────────
const hotScoreQueue = new Queue('hotscore', { connection });

const hotScoreWorker = new Worker(
  'hotscore',
  async () => {
    await recomputeHotScores();
  },
  { connection },
);

async function scheduleHotScoreRecompute() {
  await hotScoreQueue.add(
    'recompute',
    {},
    {
      repeat: {
        // Every 4 hours
        pattern: '0 */4 * * *',
      },
    },
  );
  // Also run immediately on startup
  await recomputeHotScores();
}

void scheduleDailyComplianceCheck();
void scheduleHotScoreRecompute();

const workers = [drawWorker, notificationWorker, ndprWorker, complianceWorker, hotScoreWorker];

workers.forEach((w) => {
  w.on('completed', (job) => console.log(`[${w.name}] Job ${job.id} completed`));
  w.on('failed', (job, err) =>
    console.error(`[${w.name}] Job ${job?.id} failed:`, err.message),
  );
});

console.log('🚀 BullMQ workers started');

const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();
  connection.disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
