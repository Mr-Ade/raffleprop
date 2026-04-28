/**
 * Draw execution worker — FCCPA §124 compliant
 *
 * Integrity guarantees:
 *
 *  1. Two-phase commit-reveal  — drawPreSeed is committed (sha256) before any
 *     tickets are sold (at LIVE transition).  At initiation:
 *       drawSeed = sha256(drawPreSeed + ':' + ticketListHash)
 *     where ticketListHash = sha256(all confirmed ticket numbers in ascending order).
 *     Verification: sha256(drawPreSeed) === seedCommitment (published at LIVE)
 *                   sha256(drawPreSeed + ':' + ticketListHash) === drawSeed
 *
 *  2. Quantity-weighted pool  — a purchase of quantity=N earns N entries in the
 *     draw pool, so odds are proportional to tickets purchased.
 *
 *  3. Rejection sampling  — eliminates modulo bias completely.
 *     (naive `randomValue % ticketCount` gives some tickets a fractionally
 *     higher probability when 2^N is not evenly divisible by ticketCount)
 *
 *  4. RANDOM_ORG_VERIFIED  — uses random.org Signed Random Integers API.
 *     The complete signed API response is stored verbatim so the result can
 *     be independently verified at https://api.random.org/signatures/form.
 *
 *  5. Audit log  — every state transition written to audit_logs (append-only).
 *
 *  6. No admin override  — the old /complete endpoint that accepted a
 *     winnerTicketId body parameter has been removed.  The worker is the sole
 *     source of truth for winner selection.
 */
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import crypto from 'crypto';
import { prisma, DrawStatus, CampaignStatus, PaymentStatus, DrawMethod } from '@raffleprop/db';
import { enqueueWinnerNotification } from '../queues';
import type { ExecuteDrawJob } from '../queues';

const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Unbiased random integer in [0, max) using rejection sampling.
 *
 * A naive  `randomUint32 % max`  has modulo bias: if 2^32 is not evenly
 * divisible by max, values in [0, 2^32 % max) have probability
 * (floor(2^32/max)+1)/2^32 while the rest have floor(2^32/max)/2^32.
 * For a 25,000-ticket draw the bias is ~0.001 % — negligible mathematically
 * but indefensible in a regulated property raffle.
 *
 * Rejection sampling discards any draw in the biased tail and retries,
 * giving a perfectly uniform distribution over [0, max).
 */
function unbiasedRandom(max: number, seed: Buffer): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max; // largest multiple of max ≤ 2^32
  let buf = seed;
  let offset = 0;

  for (;;) {
    if (offset + 4 > buf.length) {
      // Deterministically extend entropy by hashing — no new randomness introduced,
      // result is still fully determined by the original seed.
      buf = crypto.createHash('sha256').update(buf).digest();
      offset = 0;
    }
    const val = buf.readUInt32BE(offset);
    offset += 4;
    if (val < limit) return val % max;
    // val falls in biased tail — discard and try next 4 bytes
  }
}

/**
 * Call random.org Signed Random Integers API.
 * Requires RANDOM_ORG_API_KEY in env.
 */
async function fetchRandomOrg(
  max: number,
): Promise<{ winnerIndex: number; signedResponse: unknown }> {
  const apiKey = process.env['RANDOM_ORG_API_KEY'];
  if (!apiKey) throw new Error('RANDOM_ORG_API_KEY is not configured');

  const payload = {
    jsonrpc: '2.0',
    method: 'generateSignedIntegers',
    params: { apiKey, n: 1, min: 0, max: max - 1, replacement: true, base: 10 },
    id: 1,
  };

  const res = await fetch('https://api.random.org/json-rpc/4/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`random.org HTTP ${res.status}`);

  const json = (await res.json()) as {
    result?: { random: { data: number[]; serialNumber: number }; signature: string };
    error?: { code: number; message: string };
  };
  if (json.error) throw new Error(`random.org error ${json.error.code}: ${json.error.message}`);
  if (!json.result?.random?.data?.[0] === undefined)
    throw new Error('random.org returned unexpected response shape');

  return {
    winnerIndex: json.result!.random.data[0]!,
    signedResponse: json,
  };
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export function createDrawWorker() {
  return new Worker<ExecuteDrawJob>(
    'draws',
    async (job: Job<ExecuteDrawJob>) => {
      const { drawId, campaignId } = job.data;

      // ── 1. Load draw + validate preconditions ────────────────────────────────
      const draw = await prisma.draw.findUnique({
        where: { id: drawId },
        select: {
          id: true,
          status: true,
          witnessName: true,
          witnessTitle: true,
          drawSeed: true,
          seedCommitment: true,
          initiatedBy: true,
        },
      });

      if (!draw) throw new Error(`Draw ${drawId} not found`);
      if (draw.status !== DrawStatus.SCHEDULED) {
        throw new Error(`Draw ${drawId} is ${draw.status} — expected SCHEDULED. Aborting.`);
      }

      const seedCommitment = draw.seedCommitment;
      const initiatedBy = draw.initiatedBy;

      // ── 2. Load campaign ─────────────────────────────────────────────────────
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { drawMethod: true },
      });
      if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

      // ── 3. Mark LIVE ─────────────────────────────────────────────────────────
      await prisma.draw.update({ where: { id: drawId }, data: { status: DrawStatus.LIVE } });

      await prisma.auditLog.create({
        data: {
          actorId: initiatedBy,
          action: 'draw.live',
          entityType: 'Draw',
          entityId: drawId,
          payload: { campaignId, drawMethod: campaign.drawMethod },
        },
      });

      // ── 4. Fetch eligible tickets (with quantity expansion) ──────────────────
      // Order by ticketNumber (ascending) — deterministic, reproducible.
      const ticketRecords = await prisma.ticket.findMany({
        where: { campaignId, paymentStatus: PaymentStatus.SUCCESS },
        select: { id: true, ticketNumber: true, quantity: true },
        orderBy: { ticketNumber: 'asc' },
      });

      if (ticketRecords.length === 0) throw new Error(`No eligible tickets for campaign ${campaignId}`);

      // Expand by quantity — a purchase of qty=20 earns 20 entries so odds are
      // proportional to tickets purchased, not number of purchase records.
      const ticketPool: Array<{ id: string; ticketNumber: string }> = [];
      for (const t of ticketRecords) {
        for (let i = 0; i < t.quantity; i++) {
          ticketPool.push({ id: t.id, ticketNumber: t.ticketNumber });
        }
      }

      // ── 5. Select winner ─────────────────────────────────────────────────────
      let winnerIndex: number;
      let randomOrgResponse: unknown = null;

      if (campaign.drawMethod === DrawMethod.RANDOM_ORG_VERIFIED) {
        // External, publicly-verifiable randomness via random.org
        const result = await fetchRandomOrg(ticketPool.length);
        winnerIndex = result.winnerIndex;
        randomOrgResponse = result.signedResponse;
      } else {
        // draw.drawSeed is the two-phase finalDrawSeed computed at initiation:
        //   finalDrawSeed = sha256(drawPreSeed + ':' + ticketListHash)
        // drawPreSeed was committed (published) before tickets opened;
        // ticketListHash is determined by who bought tickets.
        // Use rejection sampling for a perfectly unbiased result.
        if (!draw.drawSeed) throw new Error(`Draw ${drawId} has no drawSeed — cannot execute`);
        winnerIndex = unbiasedRandom(ticketPool.length, Buffer.from(draw.drawSeed, 'hex'));
      }

      const winnerTicket = ticketPool[winnerIndex];
      if (!winnerTicket) throw new Error('Winner selection produced out-of-range index — this should never happen');

      // ── 6. Commit result atomically ──────────────────────────────────────────
      await prisma.$transaction([
        prisma.draw.update({
          where: { id: drawId },
          data: {
            status: DrawStatus.COMPLETED,
            winnerTicketId: winnerTicket.id,
            randomOrgResponse: randomOrgResponse ?? undefined,
            ticketCount: ticketPool.length,
          },
        }),
        prisma.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.DRAWN },
        }),
      ]);

      // ── 7. Immutable audit record ────────────────────────────────────────────
      await prisma.auditLog.create({
        data: {
          actorId: null, // system
          action: 'draw.completed',
          entityType: 'Draw',
          entityId: drawId,
          payload: {
            campaignId,
            drawMethod: campaign.drawMethod,
            ticketCount: ticketPool.length,
            seedCommitment,
            winnerTicketId: winnerTicket.id,
            winnerTicketNumber: winnerTicket.ticketNumber,
            winnerIndex,
          },
        },
      });

      // ── 8. Enqueue winner notification ───────────────────────────────────────
      const winnerTicketFull = await prisma.ticket.findUnique({
        where: { id: winnerTicket.id },
        select: { userId: true },
      });
      if (winnerTicketFull) {
        await enqueueWinnerNotification({
          drawId,
          campaignId,
          winnerTicketId: winnerTicket.id,
          winnerUserId: winnerTicketFull.userId,
        });
      }

      // ── 9. FCCPA §124 compliance deadline ───────────────────────────────────
      await prisma.regulatoryDeadline.create({
        data: {
          campaignId,
          title: 'File Form CPC B (FCCPA §124)',
          description: 'Submit Form CPC B to FCCPC within 21 days of draw completion.',
          category: 'FCCPA',
          dueAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        },
      });

      console.log(
        `✅ Draw ${drawId} complete | winner ticket: ${winnerTicket.id}` +
        ` | index ${winnerIndex + 1}/${ticketPool.length}` +
        ` | method: ${campaign.drawMethod}`,
      );
    },
    { connection, concurrency: 1 }, // draws must never run in parallel
  );
}
