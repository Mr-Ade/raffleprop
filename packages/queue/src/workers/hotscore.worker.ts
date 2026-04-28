/**
 * Hot Score Worker
 *
 * Recomputes `hotScore` for every LIVE campaign.
 * Formula (weighted velocity):
 *   hotScore = (ticketsSold / totalTickets) * 0.6
 *            + (ticketsSold / max(daysSincePublish, 1)) * 0.4
 *
 * A campaign that has sold 70% of tickets in 3 days will outscore one
 * that sold 70% over 30 days. `featured` campaigns keep their manual pin
 * via the DB `featured` flag — hotScore only affects organic ordering.
 */

import Redis from 'ioredis';
import { prisma, CampaignStatus } from '@raffleprop/db';

const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const ticketCounterKey = (campaignId: string) => `campaign:${campaignId}:tickets_sold`;

export async function recomputeHotScores(): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: CampaignStatus.LIVE },
    select: { id: true, totalTickets: true, publishedAt: true },
  });

  if (campaigns.length === 0) return;

  // Batch-fetch all counters in one MGET
  const keys = campaigns.map((c) => ticketCounterKey(c.id));
  const vals = await redis.mget(...keys);

  const now = Date.now();
  const updates: Promise<unknown>[] = [];

  campaigns.forEach((campaign, i) => {
    const ticketsSold = vals[i] ? parseInt(vals[i]!, 10) : 0;
    const totalTickets = campaign.totalTickets;

    const publishedAt = campaign.publishedAt ?? new Date();
    const daysSincePublish = Math.max(
      (now - publishedAt.getTime()) / (1000 * 60 * 60 * 24),
      1,
    );

    const completeness = totalTickets > 0 ? ticketsSold / totalTickets : 0;
    const velocity = ticketsSold / daysSincePublish;

    const hotScore = completeness * 0.6 + velocity * 0.4;

    updates.push(
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { hotScore },
      }),
    );
  });

  await Promise.all(updates);
  console.log(`✅ hotScore recomputed for ${campaigns.length} campaigns`);
}
