import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../app';

// Mock the ticket service so we don't need a real DB
vi.mock('../services/ticket.service', () => ({
  confirmTicketPurchase: vi.fn().mockResolvedValue(undefined),
  failTicketPurchase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Redis so rate limiters don't fail
vi.mock('../lib/redis', () => ({
  redis: { ping: vi.fn(), on: vi.fn(), get: vi.fn(), set: vi.fn(), del: vi.fn(), keys: vi.fn().mockResolvedValue([]), call: vi.fn().mockResolvedValue('OK') },
  redisCounters: { getTicketsSold: vi.fn().mockResolvedValue(0), incrementTicketsSold: vi.fn(), releaseReservation: vi.fn(), tryReserveTickets: vi.fn().mockResolvedValue(true) },
  redisCache: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() },
  redisTokens: { storeRefreshToken: vi.fn(), isRefreshTokenValid: vi.fn().mockResolvedValue(false), revokeRefreshToken: vi.fn(), revokeAllUserTokens: vi.fn() },
  redisOtp: { storeOtp: vi.fn(), getOtp: vi.fn(), deleteOtp: vi.fn(), incrementAttempts: vi.fn().mockResolvedValue(1) },
  redisPwdReset: { store: vi.fn(), getUserId: vi.fn(), consume: vi.fn() },
  isRedisHealthy: vi.fn().mockReturnValue(true),
}));

import { confirmTicketPurchase, failTicketPurchase } from '../services/ticket.service';

const TEST_KEY = process.env['PAYSTACK_SECRET_KEY']!;
const TEST_REF = 'RP-1234567890-12345';

function signPayload(body: string): string {
  return crypto.createHmac('sha512', TEST_KEY).update(body).digest('hex');
}

describe('POST /api/webhooks/paystack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and calls confirmTicketPurchase on charge.success with valid HMAC', async () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: { reference: TEST_REF, id: 99999, status: 'success' },
    });
    const sig = signPayload(payload);

    const res = await request(app)
      .post('/api/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sig)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    // Give the async processing a tick to complete
    await new Promise((r) => setTimeout(r, 50));
    expect(confirmTicketPurchase).toHaveBeenCalledWith(TEST_REF, { gatewayTransactionId: '99999' });
  });

  it('returns 401 when HMAC signature is wrong — regression for the production bug', async () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: { reference: TEST_REF },
    });

    const res = await request(app)
      .post('/api/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', 'deadbeefdeadbeef')
      .send(payload);

    expect(res.status).toBe(401);
    expect(confirmTicketPurchase).not.toHaveBeenCalled();
  });

  it('returns 401 when x-paystack-signature header is missing', async () => {
    const payload = JSON.stringify({ event: 'charge.success', data: { reference: TEST_REF } });

    const res = await request(app)
      .post('/api/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(401);
  });

  it('returns 200 and calls failTicketPurchase on charge.failed with valid HMAC', async () => {
    const payload = JSON.stringify({
      event: 'charge.failed',
      data: { reference: TEST_REF },
    });
    const sig = signPayload(payload);

    const res = await request(app)
      .post('/api/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sig)
      .send(payload);

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(failTicketPurchase).toHaveBeenCalledWith(TEST_REF);
  });
});
