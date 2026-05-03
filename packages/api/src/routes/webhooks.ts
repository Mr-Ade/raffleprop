/**
 * Payment gateway webhooks.
 *
 * IMPORTANT: This router is mounted BEFORE express.json() in app.ts so that
 * req.body is the raw Buffer — required for HMAC verification.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@raffleprop/db';
import { confirmTicketPurchase, failTicketPurchase } from '../services/ticket.service';

export const webhooksRouter: import('express').Router = Router();

// ─── Paystack ─────────────────────────────────────────────────────────────────
// Docs: https://paystack.com/docs/payments/webhooks/
webhooksRouter.post('/paystack', async (req: Request, res: Response) => {
  // req.body is a Buffer (raw middleware)
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-paystack-signature'] as string | undefined;

  if (!signature) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  // Verify HMAC-SHA512.
  // Paystack signs webhooks with the Secret Key (sk_test/sk_live), NOT a
  // separate webhook secret. Use PAYSTACK_SECRET_KEY for verification.
  const expected = crypto
    .createHmac('sha512', process.env['PAYSTACK_SECRET_KEY']!)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Parse after verification
  let event: {
    event: string;
    data: {
      id?: number;           // Paystack's own transaction id
      reference?: string;    // charge events
      status?: string;
      amount?: number;       // kobo
      transfer_code?: string; // transfer events
      reason?: string;
    };
  };
  try {
    event = JSON.parse(rawBody.toString('utf8')) as typeof event;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Acknowledge immediately — process async
  res.status(200).json({ received: true });

  try {
    switch (event.event) {
      case 'charge.success':
        await confirmTicketPurchase(event.data.reference!, {
          ...(event.data.id != null ? { gatewayTransactionId: String(event.data.id) } : {}),
        });
        break;
      case 'charge.failed':
      case 'charge.abandoned':
        await failTicketPurchase(event.data.reference!);
        break;
      case 'transfer.success':
        // Paystack settled funds to our escrow bank — write an audit record
        await prisma.auditLog.create({
          data: {
            actorId:    null,
            action:     'escrow.settlement.received',
            entityType: 'Transfer',
            entityId:   event.data.transfer_code ?? 'unknown',
            payload:    {
              gateway:        'PAYSTACK',
              amountKobo:     event.data.amount,
              transferCode:   event.data.transfer_code,
              reason:         event.data.reason,
            },
          },
        });
        break;
      case 'transfer.failed':
      case 'transfer.reversed':
        await prisma.auditLog.create({
          data: {
            actorId:    null,
            action:     `escrow.settlement.${event.event.split('.')[1]}`,
            entityType: 'Transfer',
            entityId:   event.data.transfer_code ?? 'unknown',
            payload:    {
              gateway:      'PAYSTACK',
              amountKobo:   event.data.amount,
              transferCode: event.data.transfer_code,
              reason:       event.data.reason,
            },
          },
        });
        console.error(`[Paystack webhook] Settlement ${event.event}:`, event.data);
        break;
      case 'refund.pending':
      case 'refund.processed':
        // Handled by refund worker — no action needed here
        break;
      default:
        // Ignore unrecognised events
        break;
    }
  } catch (err) {
    console.error('[Paystack webhook] Processing error:', err);
    // Do NOT return error — already sent 200 to Paystack
  }
});

// ─── Flutterwave ──────────────────────────────────────────────────────────────
// Docs: https://developer.flutterwave.com/docs/integration-guides/webhooks/
//
// Flutterwave sends one of two headers depending on dashboard configuration:
//   - verif-hash: static secret string (direct comparison)
//   - flutterwave-signature: HMAC-SHA256 of raw body (computed comparison)
// We support both and reject if neither is present or matches.
webhooksRouter.post('/flutterwave', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const secret = process.env['FLUTTERWAVE_WEBHOOK_SECRET']!;

  const hmacHeader    = req.headers['flutterwave-signature'] as string | undefined;
  const staticHeader  = req.headers['verif-hash'] as string | undefined;

  if (!hmacHeader && !staticHeader) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  let verified = false;

  if (hmacHeader) {
    // HMAC-SHA256 path — used when flutterwave-signature header is present
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(hmacHeader);
    if (expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      verified = true;
    }
  }

  if (!verified && staticHeader) {
    // Static hash path — used when verif-hash header is present (traditional method)
    const secretBuf   = Buffer.from(secret);
    const receivedBuf = Buffer.from(staticHeader);
    if (secretBuf.length === receivedBuf.length && crypto.timingSafeEqual(secretBuf, receivedBuf)) {
      verified = true;
    }
  }

  if (!verified) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let event: {
    event: string;
    data: {
      id?: number;       // Flutterwave's own transaction id — needed for refunds
      tx_ref?: string;
      status?: string;
    };
  };
  try {
    event = JSON.parse(rawBody.toString('utf8')) as typeof event;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  res.status(200).json({ received: true });

  try {
    switch (event.event) {
      case 'charge.completed':
        if (event.data.status === 'successful') {
          await confirmTicketPurchase(event.data.tx_ref!, {
            ...(event.data.id != null ? { gatewayTransactionId: String(event.data.id) } : {}),
          });
        } else {
          await failTicketPurchase(event.data.tx_ref!);
        }
        break;
      default:
        console.warn('[Flutterwave webhook] Unhandled event type:', event.event);
        break;
    }
  } catch (err) {
    console.error('[Flutterwave webhook] Processing error:', err);
  }
});
