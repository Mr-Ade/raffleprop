import { describe, it, expect } from 'vitest';

// Extracted winner-selection formula from packages/api/src/worker.ts
// Testing it in isolation — no DB/Redis/mocks needed
function selectWinner(
  seedHex: string,
  poolSize: number,
): number {
  const cleaned = seedHex.replace(/[^0-9a-fA-F]/g, '');
  return Number(BigInt('0x' + cleaned.slice(0, 16)) % BigInt(poolSize));
}

// Build a ticket pool identical to how worker.ts builds it
interface TicketRecord { id: string; ticketNumber: string; userId: string; quantity: number }
function buildPool(records: TicketRecord[]) {
  const pool: { id: string; ticketNumber: string; userId: string }[] = [];
  for (const t of records) {
    for (let i = 0; i < t.quantity; i++) {
      pool.push({ id: t.id, ticketNumber: t.ticketNumber, userId: t.userId });
    }
  }
  return pool;
}

describe('draw winner selection', () => {
  it('quantity weighting — 19-ticket buyer wins 19/20 of address space', () => {
    const pool = buildPool([
      { id: 't1', ticketNumber: 'RP-001', userId: 'user1', quantity: 1 },
      { id: 't2', ticketNumber: 'RP-002', userId: 'user2', quantity: 19 },
    ]);
    expect(pool).toHaveLength(20);

    // user1 occupies index 0; user2 occupies indices 1–19
    // Use a seed that lands on index 0 — user1 should win
    const seedForIndex0 = '0000000000000000' + 'a'.repeat(48); // BigInt 0 % 20 = 0
    expect(pool[selectWinner(seedForIndex0, pool.length)]!.userId).toBe('user1');

    // Use a seed that lands on index 10 — user2 should win
    const seedForIndex10 = '000000000000000a' + '0'.repeat(48); // BigInt 10 % 20 = 10
    expect(pool[selectWinner(seedForIndex10, pool.length)]!.userId).toBe('user2');
  });

  it('determinism — same seed always selects same index', () => {
    const seed = 'a1b2c3d4e5f60718' + '0'.repeat(48);
    const idx1 = selectWinner(seed, 100);
    const idx2 = selectWinner(seed, 100);
    expect(idx1).toBe(idx2);
  });

  it('single ticket in pool — always wins (index 0)', () => {
    const pool = buildPool([{ id: 't1', ticketNumber: 'RP-001', userId: 'solo', quantity: 1 }]);
    const seed = 'f'.repeat(64);
    expect(selectWinner(seed, pool.length)).toBe(0);
    expect(pool[0]!.userId).toBe('solo');
  });

  it('boundary — seed can select the last slot without off-by-one', () => {
    const poolSize = 7;
    // Find a seed that lands exactly on index 6 (poolSize - 1)
    // BigInt(6) % BigInt(7) = 6; encode 6 as 16 hex chars = '0000000000000006'
    const seed = '0000000000000006' + '0'.repeat(48);
    expect(selectWinner(seed, poolSize)).toBe(6);
  });
});
