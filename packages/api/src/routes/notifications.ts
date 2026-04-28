import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@raffleprop/db';
import { validate } from '../middleware/validate';

export const notificationsRouter: import('express').Router = Router();

const subscribeSchema = z.object({
  email: z.string().email(),
});

// ─── POST /api/notifications/subscribe ───────────────────────────────────────
notificationsRouter.post(
  '/subscribe',
  validate(subscribeSchema),
  async (req: Request, res: Response) => {
    const { email } = req.body as z.infer<typeof subscribeSchema>;

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},               // already subscribed — silently succeed
      create: { email },
    });

    res.status(200).json({ success: true });
  },
);
