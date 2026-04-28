import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { customAlphabet } from 'nanoid';
import { prisma, Role } from '@raffleprop/db';
import { redisTokens, redisOtp, redisPwdReset } from '../lib/redis';
import { AppError } from '../middleware/errorHandler';
import { encrypt, decrypt } from './encryption.service';
import { sendWelcomeEmail, sendPasswordResetEmail } from './email.service';
import type { JwtPayload } from '../middleware/auth';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const ACCESS_EXPIRES = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';
const REFRESH_EXPIRES_SECS = 30 * 24 * 60 * 60; // 30 days

// ─── Token Generation ─────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env['JWT_REFRESH_SECRET']!, {
    expiresIn: REFRESH_EXPIRES_SECS,
  } as jwt.SignOptions);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerUser(input: {
  email: string;
  phone: string;
  fullName: string;
  password: string;
  referredByCode?: string;
  ndprConsentIp: string;
  tcAcceptedIp: string;
}) {
  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { email: true, phone: true },
  });
  if (existing) {
    const field = existing.email === input.email ? 'email' : 'phone number';
    throw new AppError(409, `An account with this ${field} already exists.`, 'DUPLICATE_USER');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash,
      referralCode: nanoid(),
      referredByCode: input.referredByCode ?? null,
      ndprConsentAt: now,
      ndprConsentIp: input.ndprConsentIp,
      tcAcceptedAt: now,
      tcAcceptedIp: input.tcAcceptedIp,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      role: true,
      referralCode: true,
      kycStatus: true,
    },
  });

  // Update referrer count/earnings if referral code provided
  if (input.referredByCode) {
    await prisma.user.updateMany({
      where: { referralCode: input.referredByCode },
      data: { referralCount: { increment: 1 } },
    });
  }

  // Fire-and-forget welcome email — don't block registration if it fails
  void sendWelcomeEmail(user.email, user.fullName);

  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string,
  ip: string,
): Promise<{ accessToken: string; refreshToken: string; requiresTwoFa: boolean }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      role: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      deletedAt: true,
    },
  });

  if (!user) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (user.deletedAt) throw new AppError(401, 'Account not found', 'ACCOUNT_DELETED');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  // Admin users with 2FA enabled need a separate 2FA verification step
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
  if (isAdmin && user.twoFactorEnabled) {
    // Issue a limited pre-2FA token (twoFaVerified: false)
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      twoFaVerified: false,
    });
    return { accessToken, refreshToken: '', requiresTwoFa: true };
  }

  // If 2FA is not enabled, the user is considered verified (same logic as refreshAccessToken)
  const twoFaVerified = !user.twoFactorEnabled;
  const tokens = await issueTokens(user.id, user.email, user.fullName, user.role, twoFaVerified, ip);
  return { ...tokens, requiresTwoFa: false };
}

// ─── 2FA Verification (admin only) ───────────────────────────────────────────

export async function verifyTwoFa(
  userId: string,
  totpCode: string,
  ip: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError(400, '2FA is not enabled for this account', 'TWO_FA_NOT_ENABLED');
  }

  const secret = decrypt(user.twoFactorSecret);
  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totpCode, window: 1 });
  if (!valid) throw new AppError(401, 'Invalid or expired 2FA code', 'INVALID_TOTP');

  return issueTokens(user.id, user.email, user.fullName, user.role, true, ip);
}

// ─── 2FA Setup ────────────────────────────────────────────────────────────────

export async function setupTwoFa(userId: string): Promise<{ otpauthUrl: string; secret: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const secret = speakeasy.generateSecret({
    length: 32,
    name: `RaffleProp (${user.email})`,
    issuer: 'RaffleProp',
  });

  // Store encrypted — never store plain TOTP secret
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: encrypt(secret.base32),
      twoFactorEnabled: false, // enabled only after first successful verify
    },
  });

  return {
    otpauthUrl: secret.otpauth_url ?? '',
    secret: secret.base32,
  };
}

export async function confirmTwoFaSetup(userId: string, totpCode: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });
  if (!user?.twoFactorSecret) throw new AppError(400, '2FA setup not initiated', 'TWO_FA_NOT_SETUP');

  const secret = decrypt(user.twoFactorSecret);
  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totpCode, window: 1 });
  if (!valid) throw new AppError(401, 'Invalid TOTP code — 2FA not enabled', 'INVALID_TOTP');

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string,
  ip: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, process.env['JWT_REFRESH_SECRET']!) as { sub: string };
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const tokenHash = hashToken(refreshToken);
  const valid = await redisTokens.isRefreshTokenValid(payload.sub, tokenHash);
  if (!valid) throw new AppError(401, 'Refresh token has been revoked', 'TOKEN_REVOKED');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, fullName: true, role: true, twoFactorEnabled: true },
  });
  if (!user) throw new AppError(401, 'User not found', 'NOT_FOUND');

  // Rotate: revoke old, issue new
  await redisTokens.revokeRefreshToken(payload.sub, tokenHash);
  const twoFaVerified = !user.twoFactorEnabled; // if 2FA not required, considered verified
  return issueTokens(user.id, user.email, user.fullName, user.role, twoFaVerified, ip);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(userId: string, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await redisTokens.revokeRefreshToken(userId, tokenHash);
}

// ─── OTP (phone verification) ─────────────────────────────────────────────────

export async function verifyPhoneOtp(phone: string, code: string): Promise<void> {
  const stored = await redisOtp.getOtp(`reg:${phone}`);
  if (!stored || stored !== code) {
    throw new AppError(401, 'Invalid or expired OTP', 'INVALID_OTP');
  }
  await redisOtp.deleteOtp(`reg:${phone}`);
  await prisma.user.updateMany({ where: { phone }, data: { phoneVerified: true } });
}

// ─── OTP helpers ─────────────────────────────────────────────────────────────

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function dispatchSms(phone: string, message: string): Promise<void> {
  const apiKey = process.env['TERMII_API_KEY'];
  const senderId = process.env['TERMII_SENDER_ID'] ?? 'N-Alert';

  if (apiKey) {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: phone,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Termii] SMS failed for ${phone}: ${err}`);
    }
  } else {
    // Dev fallback — OTP visible in API console when no credentials are set
    console.info(`[OTP] ${phone}: ${message}`);
  }
}

// ─── Send registration OTP ────────────────────────────────────────────────────

export async function sendRegistrationOtp(phone: string): Promise<void> {
  // Verify a user with this phone exists and isn't already verified
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phoneVerified: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    throw new AppError(404, 'No account found for this phone number', 'USER_NOT_FOUND');
  }
  if (user.phoneVerified) {
    throw new AppError(400, 'Phone number is already verified', 'ALREADY_VERIFIED');
  }

  const attempts = await redisOtp.incrementAttempts(`reg:${phone}`);
  if (attempts > 5) {
    throw new AppError(429, 'Too many OTP requests. Please wait 15 minutes.', 'OTP_RATE_LIMIT');
  }

  const code = generateOtpCode();
  await redisOtp.storeOtp(`reg:${phone}`, code, 600);
  await dispatchSms(phone, `Your RaffleProp verification code is: ${code}. Valid for 10 minutes.`);
}

// ─── Phone login OTP ──────────────────────────────────────────────────────────

export async function sendLoginOtp(phone: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    // Return silently to avoid phone enumeration
    return;
  }

  const attempts = await redisOtp.incrementAttempts(`login:${phone}`);
  if (attempts > 5) {
    throw new AppError(429, 'Too many OTP requests. Please wait 15 minutes.', 'OTP_RATE_LIMIT');
  }

  const code = generateOtpCode();
  await redisOtp.storeOtp(`login:${phone}`, code, 600);
  await dispatchSms(phone, `Your RaffleProp login code is: ${code}. Valid for 10 minutes. Do not share this code.`);
}

export async function verifyLoginOtp(
  phone: string,
  code: string,
  ip: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const stored = await redisOtp.getOtp(`login:${phone}`);
  if (!stored || stored !== code) {
    throw new AppError(401, 'Invalid or expired OTP', 'INVALID_OTP');
  }
  await redisOtp.deleteOtp(`login:${phone}`);

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, email: true, fullName: true, role: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    throw new AppError(401, 'Account not found', 'USER_NOT_FOUND');
  }

  return issueTokens(user.id, user.email, user.fullName, user.role, false, ip);
}

// ─── Internal: issue token pair ──────────────────────────────────────────────

async function issueTokens(
  userId: string,
  email: string,
  fullName: string,
  role: string,
  twoFaVerified: boolean,
  _ip: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: userId, email, fullName, role, twoFaVerified });
  const refreshToken = signRefreshToken(userId);
  const tokenHash = hashToken(refreshToken);
  await redisTokens.storeRefreshToken(userId, tokenHash, REFRESH_EXPIRES_SECS);
  return { accessToken, refreshToken };
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, deletedAt: true },
  });
  // Always return silently — never reveal whether an email is registered
  if (!user || user.deletedAt) return;

  const token = crypto.randomBytes(32).toString('hex');
  await redisPwdReset.store(token, user.id, 3600); // 1 hour TTL

  const siteUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
  const resetLink = `${siteUrl}/reset-password?token=${token}`;
  void sendPasswordResetEmail(email, user.fullName, resetLink);
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await redisPwdReset.getUserId(token);
  if (!userId) {
    throw new AppError(400, 'Reset link is invalid or has expired.', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Consume token and invalidate all existing sessions
  await redisPwdReset.consume(token);
  await redisTokens.revokeAllUserTokens(userId);
}
