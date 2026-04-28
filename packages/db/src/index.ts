import { PrismaClient } from '@prisma/client';

// Singleton pattern to avoid multiple connections in dev (Next.js HMR)
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma;
}

export { Prisma } from '@prisma/client';
export type {
  User,
  Campaign,
  Ticket,
  Draw,
  Refund,
  AuditLog,
  NdprRequest,
  Influencer,
  InfluencerCampaign,
  AdminSession,
  RegulatoryDeadline,
  ContentPage,
} from '@prisma/client';
export {
  KycStatus,
  Role,
  CampaignStatus,
  PropertyType,
  DrawMethod,
  DrawStatus,
  PaymentGateway,
  PaymentStatus,
  RefundReason,
  RefundStatus,
  NdprRequestStatus,
  InfluencerPlatform,
  ContentStatus,
} from '@prisma/client';
