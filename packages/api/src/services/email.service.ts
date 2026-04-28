import { Resend } from 'resend';

const resend = new Resend(process.env['RESEND_API_KEY']);
const FROM = process.env['RESEND_FROM'] ?? 'RaffleProp <noreply@raffleprop.com>';

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env['RESEND_API_KEY']) {
    console.info(`[Email] To: ${to} | Subject: ${subject}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error(`[Resend] Failed to send "${subject}" to ${to}: ${JSON.stringify(error)}`);
  }
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, fullName: string): Promise<void> {
  await send(
    to,
    'Welcome to RaffleProp!',
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
      <h2 style="color:#2d7a3a">Welcome, ${fullName}!</h2>
      <p>Your RaffleProp account has been created. You can now browse live campaigns, purchase tickets, and enter draws for property ownership.</p>
      <p>Once your phone is verified you'll have full access to the platform.</p>
      <p style="color:#666;font-size:0.85rem;margin-top:2rem">RaffleProp — Property. Simplified.</p>
    </div>`,
  );
}

// ─── Ticket Purchase Confirmation ─────────────────────────────────────────────

export async function sendTicketConfirmationEmail(
  to: string,
  fullName: string,
  campaignTitle: string,
  ticketNumber: string,
  receiptNumber: string,
  amount: number,
): Promise<void> {
  await send(
    to,
    `Your ticket for ${campaignTitle}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
      <h2 style="color:#2d7a3a">Ticket Confirmed!</h2>
      <p>Hi ${fullName}, your entry for <strong>${campaignTitle}</strong> has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:1.5rem 0">
        <tr><td style="padding:8px 0;color:#666;width:50%">Ticket Number</td><td style="padding:8px 0;font-weight:700">${ticketNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Receipt</td><td style="padding:8px 0">${receiptNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Amount Paid</td><td style="padding:8px 0">₦${amount.toLocaleString()}</td></tr>
      </table>
      <p>Keep your ticket number safe — it's your proof of entry.</p>
      <p style="color:#666;font-size:0.85rem;margin-top:2rem">RaffleProp — Property. Simplified.</p>
    </div>`,
  );
}

// ─── Draw Winner Notification ─────────────────────────────────────────────────

export async function sendWinnerEmail(
  to: string,
  fullName: string,
  campaignTitle: string,
  ticketNumber: string,
): Promise<void> {
  await send(
    to,
    `Congratulations — You won ${campaignTitle}!`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
      <h2 style="color:#2d7a3a">You won! 🎉</h2>
      <p>Hi ${fullName}, your ticket <strong>${ticketNumber}</strong> was drawn as the winner for <strong>${campaignTitle}</strong>.</p>
      <p>Our team will contact you within 3 working days to begin the property handover process in accordance with FCCPA §124.</p>
      <p>Please have your government-issued ID ready for verification.</p>
      <p style="color:#666;font-size:0.85rem;margin-top:2rem">RaffleProp — Property. Simplified.</p>
    </div>`,
  );
}

// ─── Refund Notification ──────────────────────────────────────────────────────

export async function sendRefundEmail(
  to: string,
  fullName: string,
  campaignTitle: string,
  amount: number,
  reason: string,
): Promise<void> {
  await send(
    to,
    `Refund processed for ${campaignTitle}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
      <h2 style="color:#2d7a3a">Refund Processed</h2>
      <p>Hi ${fullName}, your refund of <strong>₦${amount.toLocaleString()}</strong> for <strong>${campaignTitle}</strong> has been processed.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Funds will appear in your original payment method within 3–5 business days depending on your bank.</p>
      <p style="color:#666;font-size:0.85rem;margin-top:2rem">RaffleProp — Property. Simplified.</p>
    </div>`,
  );
}

// ─── Broadcast (bulk) ─────────────────────────────────────────────────────────

export interface BroadcastRecipient { email: string; name: string }

export async function sendBroadcastBatch(
  recipients: BroadcastRecipient[],
  subject: string,
  bodyHtml: string,
): Promise<{ sent: number; failed: number }> {
  if (!process.env['RESEND_API_KEY']) {
    console.info(`[Broadcast] Would send to ${recipients.length} recipients: ${subject}`);
    return { sent: recipients.length, failed: 0 };
  }

  const BATCH = 50;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    const siteUrl = process.env['FRONTEND_URL'] ?? 'https://raffleprop.com';
    const messages = chunk.map(r => ({
      from: FROM,
      to: r.email,
      subject,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
        <p>Hi ${r.name},</p>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:2rem 0" />
        <p style="color:#9ca3af;font-size:0.75rem;line-height:1.6">
          You are receiving this email because you have an account with RaffleProp.<br />
          To manage your email preferences or unsubscribe, visit your
          <a href="${siteUrl}/ndpr" style="color:#6b7280">account privacy settings</a>
          or reply to this email with "UNSUBSCRIBE".<br /><br />
          RaffleProp Limited &mdash; Property. Simplified.<br />
          RC 9484205 &bull; Lagos, Nigeria
        </p>
      </div>`,
    }));
    try {
      const { error } = await resend.batch.send(messages);
      if (error) {
        failed += chunk.length;
        console.error(`[Broadcast] Batch failed: ${JSON.stringify(error)}`);
      } else {
        sent += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  resetLink: string,
): Promise<void> {
  await send(
    to,
    'Reset your RaffleProp password',
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
      <h2 style="color:#2d7a3a">Password Reset</h2>
      <p>Hi ${fullName}, we received a request to reset your password.</p>
      <p style="margin:1.5rem 0">
        <a href="${resetLink}" style="background:#2d7a3a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Reset Password</a>
      </p>
      <p>This link expires in 1 hour. If you didn't request a password reset, ignore this email.</p>
      <p style="color:#666;font-size:0.85rem;margin-top:2rem">RaffleProp — Property. Simplified.</p>
    </div>`,
  );
}
