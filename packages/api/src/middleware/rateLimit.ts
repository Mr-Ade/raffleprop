import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis';

// Typed wrapper that satisfies rate-limit-redis's SendCommandFn signature
const sendCommand = (command: string, ...args: string[]) =>
  redis.call(command, ...args) as Promise<number | string>;

// Login: 5 attempts per 15 minutes per IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:login:',
  }),
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// Register: 10 per hour per IP
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:register:',
  }),
  message: { success: false, error: 'Too many registration attempts.' },
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// Purchase: 10 per 15 minutes per IP
export const purchaseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:purchase:',
  }),
  message: { success: false, error: 'Too many purchase attempts. Please try again shortly.' },
  keyGenerator: (req) => (req.ip ?? 'unknown') + ':purchase',
});

// SSE: 10 connection attempts per minute per IP (persistent connections — strict limit)
export const sseRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:sse:',
  }),
  message: { success: false, error: 'Too many SSE subscriptions. Please try again shortly.' },
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// Campaign list: 120 requests per minute per IP (generous for public browsing)
export const campaignListRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:campaigns:',
  }),
  message: { success: false, error: 'Too many requests. Please slow down.' },
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// OTP: 3 per 10 minutes per phone
export const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:otp:',
  }),
  message: { success: false, error: 'Too many OTP requests. Please wait before requesting again.' },
});
