import Redis from 'ioredis';

export const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});

let redisOk = true;
redis.on('error', (err) => {
  if (redisOk) console.error('Redis error:', err);
  redisOk = false;
});
redis.on('ready', () => { redisOk = true; });

export function isRedisHealthy() { return redisOk; }

// ─── Ticket Counter Helpers ───────────────────────────────────────────────────
const ticketCounterKey = (campaignId: string) => `campaign:${campaignId}:tickets_sold`;

export const redisCounters = {
  async getTicketsSold(campaignId: string): Promise<number> {
    if (!redisOk) return 0;
    try {
      const val = await redis.get(ticketCounterKey(campaignId));
      return val ? parseInt(val, 10) : 0;
    } catch { return 0; }
  },

  /** Batch-fetch ticket counts for multiple campaigns in a single MGET round-trip */
  async getManyTicketsSold(campaignIds: string[]): Promise<Map<string, number>> {
    if (campaignIds.length === 0) return new Map();
    if (!redisOk) return new Map(campaignIds.map((id) => [id, 0]));
    try {
      const keys = campaignIds.map(ticketCounterKey);
      const vals = await redis.mget(...keys);
      const result = new Map<string, number>();
      campaignIds.forEach((id, i) => {
        result.set(id, vals[i] ? parseInt(vals[i]!, 10) : 0);
      });
      return result;
    } catch { return new Map(campaignIds.map((id) => [id, 0])); }
  },

  async incrementTicketsSold(campaignId: string, qty: number): Promise<number> {
    return redis.incrby(ticketCounterKey(campaignId), qty);
  },

  async setTicketsSold(campaignId: string, count: number): Promise<void> {
    await redis.set(ticketCounterKey(campaignId), count);
  },

  // Atomically check (sold + reserved + qty <= max) and reserve if there's room.
  // Returns true if reserved, false if insufficient tickets remain.
  async tryReserveTickets(campaignId: string, qty: number, max: number): Promise<boolean> {
    const lua = `
      local sold     = tonumber(redis.call('GET', KEYS[1])) or 0
      local reserved = tonumber(redis.call('GET', KEYS[2])) or 0
      local qty = tonumber(ARGV[1])
      local max = tonumber(ARGV[2])
      if sold + reserved + qty > max then return 0 end
      redis.call('INCRBY', KEYS[2], qty)
      return 1
    `;
    const soldKey = ticketCounterKey(campaignId);
    const reservedKey = `campaign:${campaignId}:tickets_reserved`;
    const result = await redis.eval(lua, 2, soldKey, reservedKey, String(qty), String(max));
    return result === 1;
  },

  // Release a pending reservation (called on payment failure or after confirming sold counter is incremented).
  async releaseReservation(campaignId: string, qty: number): Promise<void> {
    if (qty <= 0) return;
    await redis.incrby(`campaign:${campaignId}:tickets_reserved`, -qty);
  },
};

// ─── API Response Cache ───────────────────────────────────────────────────────
const apiCacheKey = (key: string) => `api_cache:${key}`;

export const redisCache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redisOk) return null;
    try {
      const val = await redis.get(apiCacheKey(key));
      if (!val) return null;
      return JSON.parse(val) as T;
    } catch { return null; }
  },

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!redisOk) return;
    try {
      await redis.setex(apiCacheKey(key), ttlSeconds, JSON.stringify(value));
    } catch { /* cache miss on Redis failure is acceptable */ }
  },

  async del(pattern: string): Promise<void> {
    if (!redisOk) return;
    try {
      const keys = await redis.keys(apiCacheKey(pattern));
      if (keys.length) await redis.del(...keys);
    } catch { /* best-effort cache invalidation */ }
  },
};

// ─── Session / Token Helpers ──────────────────────────────────────────────────
const refreshTokenKey = (userId: string, tokenHash: string) =>
  `refresh:${userId}:${tokenHash}`;

export const redisTokens = {
  async storeRefreshToken(
    userId: string,
    tokenHash: string,
    expirySeconds: number,
  ): Promise<void> {
    if (!redisOk) throw new Error('Authentication service unavailable — Redis is not connected');
    await redis.setex(refreshTokenKey(userId, tokenHash), expirySeconds, '1');
  },

  async isRefreshTokenValid(userId: string, tokenHash: string): Promise<boolean> {
    if (!redisOk) return false;
    try {
      const val = await redis.get(refreshTokenKey(userId, tokenHash));
      return val === '1';
    } catch { return false; }
  },

  async revokeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    if (!redisOk) return;
    try { await redis.del(refreshTokenKey(userId, tokenHash)); } catch { /* best-effort */ }
  },

  async revokeAllUserTokens(userId: string): Promise<void> {
    if (!redisOk) return;
    try {
      const keys = await redis.keys(`refresh:${userId}:*`);
      if (keys.length) await redis.del(...keys);
    } catch { /* best-effort */ }
  },
};

// ─── OTP Helpers ─────────────────────────────────────────────────────────────
const otpKey = (phone: string) => `otp:${phone}`;
const otpAttemptsKey = (phone: string) => `otp_attempts:${phone}`;

export const redisOtp = {
  async storeOtp(phone: string, code: string, expirySeconds = 600): Promise<void> {
    await redis.setex(otpKey(phone), expirySeconds, code);
  },

  async getOtp(phone: string): Promise<string | null> {
    return redis.get(otpKey(phone));
  },

  async deleteOtp(phone: string): Promise<void> {
    await redis.del(otpKey(phone));
  },

  async incrementAttempts(phone: string): Promise<number> {
    const key = otpAttemptsKey(phone);
    const attempts = await redis.incr(key);
    await redis.expire(key, 900); // 15 min window
    return attempts;
  },
};

// ─── Password Reset Token Helpers ─────────────────────────────────────────────
const pwdResetKey = (token: string) => `pwd-reset:${token}`;

export const redisPwdReset = {
  async store(token: string, userId: string, ttlSeconds = 3600): Promise<void> {
    await redis.setex(pwdResetKey(token), ttlSeconds, userId);
  },

  async getUserId(token: string): Promise<string | null> {
    return redis.get(pwdResetKey(token));
  },

  async consume(token: string): Promise<void> {
    await redis.del(pwdResetKey(token));
  },
};
