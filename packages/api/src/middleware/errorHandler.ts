import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma unique constraint violation
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  ) {
    res.status(409).json({ success: false, error: 'A record with this value already exists.' });
    return;
  }

  // Unknown error — capture to Sentry and don't leak internals in production
  Sentry.captureException(err);
  const isDev = process.env['NODE_ENV'] !== 'production';
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: isDev && err instanceof Error ? err.message : 'Internal server error',
  });
}
