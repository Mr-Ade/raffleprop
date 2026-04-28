import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import { prisma } from '@raffleprop/db';
import type { NotifyWinnerJob } from '../queues';

const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST'],
  port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
  secure: false,
  auth: {
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
  },
});

export function createNotificationWorker() {
  return new Worker<NotifyWinnerJob>(
    'notifications',
    async (job: Job<NotifyWinnerJob>) => {
      if (job.name === 'notify-winner') {
        await notifyWinner(job.data);
      }
    },
    { connection, concurrency: 5 },
  );
}

async function notifyWinner(data: NotifyWinnerJob) {
  const { winnerTicketId, winnerUserId, campaignId } = data;

  const [winnerUser, campaign, ticket] = await Promise.all([
    prisma.user.findUnique({
      where: { id: winnerUserId },
      select: { fullName: true, email: true, phone: true },
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { title: true, propertyAddress: true, fccpcRef: true },
    }),
    prisma.ticket.findUnique({
      where: { id: winnerTicketId },
      select: { ticketNumber: true, receiptNumber: true },
    }),
  ]);

  if (!winnerUser || !campaign || !ticket) {
    throw new Error('Missing data for winner notification');
  }

  // Send winner email
  await transporter.sendMail({
    from: `"RaffleProp" <${process.env['EMAIL_FROM']}>`,
    to: winnerUser.email,
    subject: `🎉 Congratulations! You won ${campaign.title}`,
    html: `
      <h1>Congratulations, ${winnerUser.fullName}!</h1>
      <p>You have been selected as the winner of the <strong>${campaign.title}</strong> raffle.</p>
      <p><strong>Property:</strong> ${campaign.propertyAddress}</p>
      <p><strong>Your Winning Ticket:</strong> ${ticket.ticketNumber}</p>
      <p><strong>Receipt:</strong> ${ticket.receiptNumber}</p>
      <p><strong>FCCPC Reference:</strong> ${campaign.fccpcRef ?? 'N/A'}</p>
      <p>Our team will contact you within 3 business days to begin the property transfer process.</p>
      <p>Please do not share this email publicly until the official announcement.</p>
      <hr/>
      <p><em>This is an official notification from RaffleProp, regulated by FCCPC.</em></p>
    `,
  });

  // Update draw — winner notified
  await prisma.draw.update({
    where: { campaignId },
    data: { winnerNotifiedAt: new Date() },
  });

  // Create the 3-day winner contact deadline
  const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await prisma.regulatoryDeadline.create({
    data: {
      campaignId,
      title: 'Contact Winner (FCCPA §124)',
      description: 'Initiate official contact with winner within 3 days of draw.',
      category: 'FCCPA',
      dueAt,
    },
  });

  console.log(`✅ Winner notification sent to ${winnerUser.email}`);
}
