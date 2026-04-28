import { app } from './app';
import { prisma } from '@raffleprop/db';
import { redis } from './lib/redis';
import { logger } from './lib/logger';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_WEBHOOK_SECRET',
  'FLUTTERWAVE_SECRET_KEY',
  'FLUTTERWAVE_WEBHOOK_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_MEDIA',
  'R2_BUCKET_DOCUMENTS',
  'RESEND_API_KEY',
  'ENCRYPTION_KEY',
] as const;

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();

  await prisma.$connect();
  logger.info('PostgreSQL connected');

  await redis.ping();
  logger.info('Redis connected');

  const server = app.listen(PORT, () => {
    logger.info('RaffleProp API started', { port: PORT, env: process.env['NODE_ENV'] });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });
    server.close(async () => {
      await prisma.$disconnect();
      redis.disconnect();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error('Failed to start server', { err: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
