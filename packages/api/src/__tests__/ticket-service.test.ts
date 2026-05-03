import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initiateTicketPurchase } from '../services/ticket.service';
import { AppError } from '../middleware/errorHandler';
import { CampaignStatus, PaymentGateway, PaymentStatus } from '@raffleprop/db';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@raffleprop/db', async () => {
  const actual = await vi.importActual<typeof import('@raffleprop/db')>('@raffleprop/db');
  return {
    ...actual,
    prisma: {
      campaign: { findUnique: vi.fn() },
      ticket: { create: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    },
  };
});

vi.mock('../lib/redis', () => ({
  redisCounters: {
    getTicketsSold: vi.fn().mockResolvedValue(0),
    tryReserveTickets: vi.fn().mockResolvedValue(true),
    incrementTicketsSold: vi.fn(),
    releaseReservation: vi.fn(),
  },
  redisCache: { del: vi.fn() },
}));

vi.mock('../lib/paystack', () => ({
  paystack: {
    initializeTransaction: vi.fn().mockResolvedValue({
      status: true,
      data: { authorization_url: 'https://checkout.paystack.com/test', access_code: 'test', reference: 'RP-test' },
    }),
  },
}));

vi.mock('../services/email.service', () => ({ sendTicketConfirmationEmail: vi.fn() }));
vi.mock('../services/receipt.service', () => ({ generateReceiptPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }));
vi.mock('../services/storage.service', () => ({ uploadBuffer: vi.fn(), storageKeys: { receipt: (id: string) => `receipts/${id}.pdf` } }));
vi.mock('../instrument', () => ({}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { prisma } from '@raffleprop/db';
import { redisCounters } from '../lib/redis';

const mockCampaign = {
  id: 'campaign-uuid-7452',
  status: CampaignStatus.LIVE,
  ticketPrice: 2500,
  totalTickets: 6000,
  skillQuestion: {
    questions: [{ question: 'What is 2+2?', options: ['3', '4', '5'], correctIndex: 1 }],
  },
  bundles: [],
  title: 'Test Property Raffle',
  allowedGateways: [],
  paystackSubaccountCode: null,
  flutterwaveSubaccountId: null,
};

const baseInput = {
  campaignId: 'campaign-uuid-7452',
  userId: 'user-uuid-1',
  userEmail: 'test@example.com',
  userPhone: '08012345678',
  userName: 'Test User',
  quantity: 1,
  skillAnswer: 1, // correct (index 1 = '4')
  gateway: PaymentGateway.PAYSTACK,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('initiateTicketPurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.campaign.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCampaign);
    (prisma.ticket.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.ticket.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ticket-uuid-1',
      ticketNumber: 'RP-2026-7452-00001',
      receiptNumber: 'REC-2026-7452-371754',
      campaignId: mockCampaign.id,
      userId: baseInput.userId,
      quantity: 1,
      unitPrice: 2500,
      totalAmount: 2500,
      paymentRef: 'RP-test-ref',
      paymentGateway: PaymentGateway.PAYSTACK,
      paymentStatus: PaymentStatus.PENDING,
      skillAnswer: 1,
      skillCorrect: true,
      purchasedAt: new Date(),
    });
    (redisCounters.tryReserveTickets as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('happy path — returns authorizationUrl and gateway PAYSTACK', async () => {
    const result = await initiateTicketPurchase(baseInput);

    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/test');
    expect(result.gateway).toBe('PAYSTACK');
    expect(result.paymentRef).toMatch(/^RP-/);
  });

  it('incorrect skill answer — throws AppError 400', async () => {
    await expect(
      initiateTicketPurchase({ ...baseInput, skillAnswer: 0 }), // wrong answer (index 0 = '3')
    ).rejects.toThrow(AppError);

    await expect(
      initiateTicketPurchase({ ...baseInput, skillAnswer: 0 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'SKILL_ANSWER_INCORRECT' });
  });

  it('campaign not LIVE — throws AppError 400', async () => {
    (prisma.campaign.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockCampaign,
      status: CampaignStatus.CLOSED,
    });

    await expect(initiateTicketPurchase(baseInput)).rejects.toMatchObject({
      statusCode: 400,
      code: 'CAMPAIGN_NOT_LIVE',
    });
  });

  it('Redis reservation fails (sold out) — throws AppError 400', async () => {
    (redisCounters.tryReserveTickets as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(initiateTicketPurchase(baseInput)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INSUFFICIENT_TICKETS',
    });
  });

  it('ticket sequence uses DB count — second ticket gets sequence 2 (regression test)', async () => {
    // Simulate 1 existing ticket already in DB
    (prisma.ticket.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.ticket.create as ReturnType<typeof vi.fn>).mockImplementation((args: { data: { ticketNumber: string } }) => ({
      ...args.data,
      id: 'ticket-uuid-2',
      receiptNumber: 'REC-2026-7452-999999',
      paymentStatus: PaymentStatus.PENDING,
      skillCorrect: true,
      purchasedAt: new Date(),
    }));

    await initiateTicketPurchase(baseInput);

    const createCall = (prisma.ticket.create as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { ticketNumber: string } }];
    const ticketNumber: string = createCall[0].data.ticketNumber;
    expect(ticketNumber).toMatch(/-00002$/); // sequence 2, not 1
  });
});
