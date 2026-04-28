/**
 * NDPR Anonymisation Worker — NDPR 2019 Article 2.2 (Right to Erasure)
 *
 * Anonymises user PII while preserving ticket records per FCCPA §118.
 * Due-date enforcement: runs within 30 days of deletion request.
 */
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import crypto from 'crypto';
import { prisma, NdprRequestStatus } from '@raffleprop/db';
import type { AnonymiseUserJob } from '../queues';

const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export function createNdprWorker() {
  return new Worker<AnonymiseUserJob>(
    'ndpr',
    async (job: Job<AnonymiseUserJob>) => {
      if (job.name === 'anonymise-user') {
        await anonymiseUser(job.data);
      }
    },
    { connection, concurrency: 1 },
  );
}

async function anonymiseUser({ userId, ndprRequestId }: AnonymiseUserJob): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true, email: true },
  });

  if (!user) {
    console.warn(`NDPR worker: user ${userId} not found`);
    return;
  }

  if (user.deletedAt) {
    console.log(`NDPR worker: user ${userId} already anonymised`);
    return;
  }

  // One-way hash of email/phone for deduplication without re-identification
  const emailHash = crypto.createHash('sha256').update(user.email).digest('hex');
  const phoneHash = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 20);

  // Anonymise user record — preserve id, role, referral stats, ticket FKs
  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: 'Deleted User',
      email: `deleted_${emailHash.slice(0, 12)}@raffleprop.invalid`,
      phone: `+00000${phoneHash.slice(0, 10)}`,
      passwordHash: '[REDACTED]',
      bvnEncrypted: null,
      ninEncrypted: null,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      deletedAt: new Date(),
    },
  });

  // Delete non-regulatory data: sessions
  await prisma.adminSession.deleteMany({ where: { userId } });

  // Revoke all tokens via Redis — if keys exist
  // (redisTokens helper is in the API package; we do this via direct Redis command)
  const keys = await connection.keys(`refresh:${userId}:*`);
  if (keys.length > 0) await connection.del(...keys);

  // Mark NDPR request as completed
  await prisma.ndprRequest.update({
    where: { id: ndprRequestId },
    data: {
      status: NdprRequestStatus.COMPLETED,
      processedAt: new Date(),
      processedBy: 'system',
      notes: 'Anonymised by automated NDPR worker.',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: null, // system
      action: 'user.anonymised',
      entityType: 'User',
      entityId: userId,
      payload: { ndprRequestId, method: 'anonymisation' },
    },
  });

  console.log(`✅ User ${userId} anonymised per NDPR §2.2`);
}
