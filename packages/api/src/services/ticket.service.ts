import { customAlphabet } from 'nanoid';
import { prisma, CampaignStatus, PaymentGateway, PaymentStatus } from '@raffleprop/db';
import { redisCounters, redisCache } from '../lib/redis';
import { paystack } from '../lib/paystack';
import { flutterwave } from '../lib/flutterwave';
import { AppError } from '../middleware/errorHandler';
import type { Bundle, SkillQuestion } from '@raffleprop/shared';
import { sendTicketConfirmationEmail } from './email.service';
import { generateReceiptPdf } from './receipt.service';
import { uploadBuffer, storageKeys } from './storage.service';

const ticketNanoid = customAlphabet('0123456789', 5);
const receiptNanoid = customAlphabet('0123456789', 6);

function generateTicketNumber(campaignSeq: number, ticketSeq: number): string {
  const year = new Date().getFullYear();
  return `RP-${year}-${String(campaignSeq).padStart(4, '0')}-${String(ticketSeq).padStart(5, '0')}`;
}

function generateReceiptNumber(campaignSeq: number): string {
  const year = new Date().getFullYear();
  const ts = Date.now().toString().slice(-6);
  return `REC-${year}-${String(campaignSeq).padStart(4, '0')}-${ts}`;
}

// ─── Initiate Purchase ────────────────────────────────────────────────────────

export async function initiateTicketPurchase(input: {
  campaignId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  userName: string;
  bundleLabel?: string;
  quantity: number;
  skillAnswer: number;
  gateway?: PaymentGateway;
  ipAddress: string;
  userAgent: string;
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      status: true,
      ticketPrice: true,
      totalTickets: true,
      skillQuestion: true,
      bundles: true,
      title: true,
      allowedGateways:         true,
      paystackSubaccountCode:  true,
      flutterwaveSubaccountId: true,
    },
  });

  if (!campaign) throw new AppError(404, 'Campaign not found', 'NOT_FOUND');
  if (campaign.status !== CampaignStatus.LIVE) {
    throw new AppError(400, 'Campaign is not accepting ticket purchases', 'CAMPAIGN_NOT_LIVE');
  }

  // Validate requested gateway is enabled for this campaign
  const allowedGateways = campaign.allowedGateways as string[];
  if (allowedGateways.length > 0 && !allowedGateways.includes(input.gateway ?? PaymentGateway.PAYSTACK)) {
    const names: Record<string, string> = {
      PAYSTACK: 'Paystack', FLUTTERWAVE: 'Flutterwave', BANK_TRANSFER: 'Bank Transfer',
    };
    const allowed = allowedGateways.map(g => names[g] ?? g).join(', ');
    throw new AppError(
      400,
      `This campaign only accepts: ${allowed}`,
      'GATEWAY_NOT_ALLOWED',
    );
  }

  // Validate and enforce skill answer (FCCPA requirement)
  // DB stores multi-question wrapper: { meta, questions: [{question, options, correctIndex}] }
  // Legacy flat format is also supported: { question, options, correctIndex }
  const rawSkillQ = campaign.skillQuestion as unknown as {
    questions?: SkillQuestion[];
    question?: string;
    options?: string[];
    correctIndex?: number;
  };

  let skillAnswerValid: boolean;
  if (rawSkillQ.questions && Array.isArray(rawSkillQ.questions) && rawSkillQ.questions.length > 0) {
    // Multi-question format: frontend picks one question randomly; backend accepts any correct answer
    skillAnswerValid = rawSkillQ.questions.some(
      (q) => input.skillAnswer >= 0 && input.skillAnswer < q.options.length && input.skillAnswer === q.correctIndex,
    );
  } else {
    const skillQ = rawSkillQ as unknown as SkillQuestion;
    skillAnswerValid =
      input.skillAnswer >= 0 &&
      input.skillAnswer < (skillQ.options?.length ?? 0) &&
      input.skillAnswer === skillQ.correctIndex;
  }

  if (!skillAnswerValid) {
    throw new AppError(400, 'Incorrect answer to the skill question. Please try again.', 'SKILL_ANSWER_INCORRECT');
  }

  // Determine bundle or unit price
  const bundles = campaign.bundles as unknown as Bundle[];
  let unitPrice = Number(campaign.ticketPrice);
  let bundleLabel: string | undefined;

  if (input.bundleLabel) {
    const bundle = bundles.find((b) => b.label === input.bundleLabel);
    if (!bundle) throw new AppError(400, 'Invalid bundle selected', 'INVALID_BUNDLE');
    if (input.quantity !== bundle.tickets) {
      throw new AppError(
        400,
        `Bundle "${bundle.label}" requires exactly ${bundle.tickets} ticket(s)`,
        'BUNDLE_QUANTITY_MISMATCH',
      );
    }
    unitPrice = bundle.price / bundle.tickets;
    bundleLabel = bundle.label;
  }

  // Check availability — atomically reserve to prevent overselling under concurrency
  const reserved = await redisCounters.tryReserveTickets(
    input.campaignId,
    input.quantity,
    campaign.totalTickets,
  );
  if (!reserved) {
    throw new AppError(400, 'Not enough tickets remaining', 'INSUFFICIENT_TICKETS');
  }

  const totalAmount = unitPrice * input.quantity;
  const skillCorrect = true; // enforced above — only correct answers reach this point

  // Generate a unique payment reference
  const paymentRef = `RP-${Date.now()}-${ticketNanoid()}`;
  const campaignSeq = parseInt(campaign.id.replace(/\D/g, '').slice(0, 4) || '0001', 10);
  // Use total DB ticket count (including PENDING) for sequencing so that a
  // PENDING ticket whose webhook failed never blocks a subsequent purchase with
  // a duplicate ticketNumber (Redis sold-counter only increments on SUCCESS).
  const dbTicketCount = await prisma.ticket.count({ where: { campaignId: input.campaignId } });
  const ticketSeq = dbTicketCount + 1;

  const gateway = input.gateway ?? PaymentGateway.PAYSTACK;

  // Create PENDING ticket record BEFORE redirecting to payment
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: generateTicketNumber(campaignSeq, ticketSeq),
      campaignId: input.campaignId,
      userId: input.userId,
      bundleLabel: bundleLabel ?? null,
      quantity: input.quantity,
      unitPrice,
      totalAmount,
      paymentRef,
      paymentGateway: gateway,
      paymentStatus: PaymentStatus.PENDING,
      skillAnswer: input.skillAnswer,
      skillCorrect,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      receiptNumber: generateReceiptNumber(campaignSeq),
    },
  });

  // ── Bank transfer: skip gateway, return escrow details ──────────────────────
  if (gateway === PaymentGateway.BANK_TRANSFER) {
    const campaignEscrow = await prisma.campaign.findUnique({
      where:  { id: input.campaignId },
      select: { escrowBank: true, escrowAccountNo: true, escrowAccountName: true },
    });
    if (!campaignEscrow?.escrowBank || !campaignEscrow?.escrowAccountNo) {
      throw new AppError(
        400,
        'Bank transfer is not available for this campaign. Please use Paystack or Flutterwave.',
        'ESCROW_NOT_CONFIGURED',
      );
    }
    return {
      ticketId:     ticket.id,
      paymentRef,
      gateway:      'BANK_TRANSFER' as const,
      escrow: {
        bankName:    campaignEscrow.escrowBank,
        accountNo:   campaignEscrow.escrowAccountNo,
        accountName: campaignEscrow.escrowAccountName ?? 'RaffleProp Escrow Account',
      },
      amount:       totalAmount,
      narration:    paymentRef,
    };
  }

  // ── Paystack / Flutterwave ────────────────────────────────────────────────────
  let authorizationUrl: string;

  if (gateway === PaymentGateway.PAYSTACK) {
    const result = await paystack.initializeTransaction({
      email: input.userEmail,
      amount: totalAmount,
      reference: paymentRef,
      metadata: {
        ticketId: ticket.id,
        campaignId: input.campaignId,
        userId: input.userId,
        quantity: input.quantity,
      },
      ...(campaign.paystackSubaccountCode ? { subaccountCode: campaign.paystackSubaccountCode } : {}),
    });
    if (!result.status) throw new AppError(502, 'Payment gateway error', 'GATEWAY_ERROR');
    authorizationUrl = result.data.authorization_url;
  } else {
    const result = await flutterwave.initializePayment({
      txRef: paymentRef,
      amount: totalAmount,
      customerEmail: input.userEmail,
      customerPhone: input.userPhone,
      customerName: input.userName,
      meta: {
        ticketId: ticket.id,
        campaignId: input.campaignId,
        userId: input.userId,
        quantity: input.quantity,
      },
      ...(campaign.flutterwaveSubaccountId ? { subaccountId: campaign.flutterwaveSubaccountId } : {}),
    });
    if (result.status !== 'success') throw new AppError(502, 'Payment gateway error', 'GATEWAY_ERROR');
    authorizationUrl = result.data.link;
  }

  return {
    ticketId: ticket.id,
    authorizationUrl,
    paymentRef,
    gateway: gateway as 'PAYSTACK' | 'FLUTTERWAVE',
  };
}

// ─── Confirm Purchase (called by webhook) ────────────────────────────────────

export async function confirmTicketPurchase(
  paymentRef: string,
  opts?: {
    /** Gateway's own transaction ID — stored for reliable refunds (Flutterwave numeric id, Paystack transaction id) */
    gatewayTransactionId?: string;
  },
): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { paymentRef },
    select: {
      id: true,
      campaignId: true,
      quantity: true,
      unitPrice: true,
      paymentStatus: true,
      ticketNumber: true,
      receiptNumber: true,
      totalAmount: true,
      paymentGateway: true,
      paymentRef: true,
      purchasedAt: true,
      userId: true,
    },
  });

  if (!ticket) throw new AppError(404, 'Ticket not found', 'NOT_FOUND');
  if (ticket.paymentStatus === PaymentStatus.SUCCESS) return; // idempotent

  // Use updateMany with a PENDING guard to prevent double-processing from concurrent webhook retries
  const updated = await prisma.ticket.updateMany({
    where: { id: ticket.id, paymentStatus: PaymentStatus.PENDING },
    data: {
      paymentStatus:   PaymentStatus.SUCCESS,
      escrowSettledAt: new Date(),
      ...(opts?.gatewayTransactionId
        ? { gatewayTransactionId: opts.gatewayTransactionId }
        : {}),
    },
  });

  // Only increment Redis and send email if this call actually performed the transition
  if (updated.count === 0) return;

  await redisCounters.incrementTicketsSold(ticket.campaignId, ticket.quantity);
  await redisCounters.releaseReservation(ticket.campaignId, ticket.quantity);

  // Invalidate campaign list cache so ticket counts reflect immediately
  await redisCache.del('campaigns:*');

  // Send confirmation email + generate receipt PDF — both non-fatal
  try {
    const [user, campaign] = await Promise.all([
      prisma.user.findUnique({ where: { id: ticket.userId }, select: { email: true, fullName: true } }),
      prisma.campaign.findUnique({
        where: { id: ticket.campaignId },
        select: { title: true, propertyAddress: true, fccpcRef: true },
      }),
    ]);
    if (user?.email && campaign?.title) {
      await sendTicketConfirmationEmail(
        user.email,
        user.fullName,
        campaign.title,
        ticket.ticketNumber,
        ticket.receiptNumber,
        Number(ticket.totalAmount),
      );
    }

    // Generate and store receipt PDF in R2 (regulatory WORM bucket)
    if (user && campaign) {
      const pdfBuffer = await generateReceiptPdf({
        ticketNumber:    ticket.ticketNumber,
        receiptNumber:   ticket.receiptNumber,
        campaignTitle:   campaign.title,
        propertyAddress: campaign.propertyAddress ?? null,
        quantity:        ticket.quantity,
        unitPrice:       Number(ticket.unitPrice),
        totalAmount:     Number(ticket.totalAmount),
        paymentGateway:  ticket.paymentGateway,
        paymentRef:      ticket.paymentRef,
        purchasedAt:     ticket.purchasedAt,
        userName:        user.fullName,
        userEmail:       user.email,
        fccpcRef:        campaign.fccpcRef ?? null,
      });
      await uploadBuffer(storageKeys.receipt(ticket.id), pdfBuffer, 'application/pdf', true);
    }
  } catch (err) {
    console.error('[confirmTicketPurchase] Post-confirmation tasks failed (ticket confirmed):', err);
  }
}

// ─── Mark Failed ─────────────────────────────────────────────────────────────

export async function failTicketPurchase(paymentRef: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { paymentRef },
    select: { id: true, campaignId: true, quantity: true, paymentStatus: true },
  });
  if (!ticket || ticket.paymentStatus !== PaymentStatus.PENDING) return;

  await prisma.ticket.updateMany({
    where: { paymentRef, paymentStatus: PaymentStatus.PENDING },
    data: { paymentStatus: PaymentStatus.FAILED },
  });
  await redisCounters.releaseReservation(ticket.campaignId, ticket.quantity);
}
