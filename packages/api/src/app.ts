import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { authRouter } from './routes/auth';
import { campaignsRouter } from './routes/campaigns';
import { ticketsRouter } from './routes/tickets';
import { usersRouter } from './routes/users';
import { webhooksRouter } from './routes/webhooks';
import { ndprRouter } from './routes/ndpr';
import { refundsRouter } from './routes/refunds';
import { notificationsRouter } from './routes/notifications';
import { adminCampaignsRouter } from './routes/admin/campaigns';
import { adminDrawsRouter } from './routes/admin/draws';
import { adminUsersRouter } from './routes/admin/users';
import { adminComplianceRouter } from './routes/admin/compliance';
import { adminInfluencersRouter } from './routes/admin/influencers';
import { adminRefundsRouter } from './routes/admin/refunds';
import { adminStorageRouter } from './routes/admin/storage';
import { adminTicketsRouter } from './routes/admin/tickets';
import { adminContentRouter } from './routes/admin/content';
import { adminCommsRouter } from './routes/admin/comms';
import { publicContentRouter } from './routes/content';
import { drawsRouter } from './routes/draws';
import { errorHandler } from './middleware/errorHandler';

const app: import('express').Express = express();

// Trust proxy so req.ip is the real client IP when behind a load balancer
if (process.env['NODE_ENV'] === 'production') {
  app.set('trust proxy', 1);
}

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

const allowedOrigins = [
  process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  process.env['ADMIN_URL'] ?? 'http://localhost:3002',
  // Always allow the canonical production domains
  'https://raffleprop.com',
  'https://www.raffleprop.com',
  'https://raffleprop.vercel.app',
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.) only in dev
      if (!origin && process.env['NODE_ENV'] !== 'production') return cb(null, true);
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
    maxAge: 86400, // Cache preflight responses for 24 hours
  }),
);

// ─── Webhooks MUST receive raw body for HMAC verification ────────────────────
// Mount webhooks BEFORE json() middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env['NODE_ENV'], ts: new Date().toISOString() });
});

// ─── Public Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ndpr', ndprRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/draws', drawsRouter);
app.use('/api/content', publicContentRouter);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.use('/api/admin/campaigns', adminCampaignsRouter);
app.use('/api/admin/draws', adminDrawsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/compliance', adminComplianceRouter);
app.use('/api/admin/influencers', adminInfluencersRouter);
app.use('/api/admin/refunds', adminRefundsRouter);
app.use('/api/admin/storage', adminStorageRouter);
app.use('/api/admin/tickets', adminTicketsRouter);
app.use('/api/admin/stats', adminTicketsRouter); // stats endpoint lives in tickets router
app.use('/api/admin/content', adminContentRouter);
app.use('/api/admin/comms', adminCommsRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

export { app };
