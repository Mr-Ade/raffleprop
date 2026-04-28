import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginRateLimit, registerRateLimit, otpRateLimit } from '../middleware/rateLimit';
import {
  registerUser,
  loginUser,
  verifyTwoFa,
  setupTwoFa,
  confirmTwoFaSetup,
  refreshAccessToken,
  logoutUser,
  verifyPhoneOtp,
  sendRegistrationOtp,
  sendLoginOtp,
  verifyLoginOtp,
  forgotPassword,
  resetPassword,
} from '../services/auth.service';

export const authRouter: import('express').Router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  phone: z
    .string()
    .regex(/^\+234[0-9]{10}$/, 'Phone must be in E.164 format for Nigeria (+234XXXXXXXXXX)'),
  fullName: z.string().min(2).max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  referredByCode: z.string().optional(),
  ndprConsent: z.literal(true, { errorMap: () => ({ message: 'NDPR consent is required' }) }),
  tcAccepted: z.literal(true, { errorMap: () => ({ message: 'T&C acceptance is required' }) }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const twoFaVerifySchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d+$/),
});

const twoFaConfirmSchema = z.object({
  totpCode: z.string().length(6).regex(/^\d+$/),
});

const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+234[0-9]{10}$/),
  code: z.string().length(6).regex(/^\d+$/),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const phoneSchema = z.object({
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Phone must be in E.164 format (+234XXXXXXXXXX)'),
});

const loginOtpVerifySchema = z.object({
  phone: z.string().regex(/^\+234[0-9]{10}$/),
  code: z.string().length(6).regex(/^\d+$/),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
authRouter.post(
  '/register',
  registerRateLimit,
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const ip = req.ip ?? '0.0.0.0';
    const body = req.body as z.infer<typeof registerSchema>;
    const user = await registerUser({
      email: body.email,
      phone: body.phone,
      fullName: body.fullName,
      password: body.password,
      ndprConsentIp: ip,
      tcAcceptedIp: ip,
      ...(body.referredByCode ? { referredByCode: body.referredByCode } : {}),
    });
    // Automatically send the phone verification OTP so the user doesn't have
    // to manually hit "Resend" on the verify-phone page.
    await sendRegistrationOtp(body.phone);
    res.status(201).json({
      success: true,
      data: user,
      message: 'Registration successful. Please verify your phone number.',
    });
  },
);

// ─── POST /api/auth/verify-phone ──────────────────────────────────────────────
authRouter.post(
  '/verify-phone',
  otpRateLimit,
  validate(otpVerifySchema),
  async (req: Request, res: Response) => {
    const { phone, code } = req.body as z.infer<typeof otpVerifySchema>;
    await verifyPhoneOtp(phone, code);
    res.json({ success: true, data: null, message: 'Phone verified successfully.' });
  },
);

// ─── POST /api/auth/login ────────────────────────────────────────────────────
authRouter.post(
  '/login',
  loginRateLimit,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const ip = req.ip ?? '0.0.0.0';
    const result = await loginUser(email, password, ip);

    if (result.requiresTwoFa) {
      res.json({
        success: true,
        data: { requiresTwoFa: true, accessToken: result.accessToken },
        message: '2FA required. Please verify your authenticator code.',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: 900, // 15 minutes
      },
    });
  },
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
authRouter.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  const ip = req.ip ?? '0.0.0.0';
  const tokens = await refreshAccessToken(refreshToken, ip);
  res.json({ success: true, data: { ...tokens, expiresIn: 900 } });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
authRouter.post('/logout', authenticate, validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  await logoutUser(req.user!.sub, refreshToken);
  res.json({ success: true, data: null, message: 'Logged out successfully.' });
});

// ─── POST /api/auth/admin/2fa/setup ──────────────────────────────────────────
authRouter.post('/admin/2fa/setup', authenticate, async (req: Request, res: Response) => {
  const result = await setupTwoFa(req.user!.sub);
  // Return QR code URL — frontend renders it with a QR library
  // Never return the raw secret to the client after setup confirmation
  res.json({
    success: true,
    data: { otpauthUrl: result.otpauthUrl, secret: result.secret },
    message: 'Scan QR code in your authenticator app, then confirm with POST /admin/2fa/confirm',
  });
});

// ─── POST /api/auth/admin/2fa/confirm ────────────────────────────────────────
authRouter.post(
  '/admin/2fa/confirm',
  authenticate,
  validate(twoFaConfirmSchema),
  async (req: Request, res: Response) => {
    const { totpCode } = req.body as z.infer<typeof twoFaConfirmSchema>;
    await confirmTwoFaSetup(req.user!.sub, totpCode);
    res.json({ success: true, data: null, message: '2FA enabled successfully.' });
  },
);

// ─── POST /api/auth/admin/2fa/verify ─────────────────────────────────────────
authRouter.post(
  '/admin/2fa/verify',
  authenticate,
  validate(twoFaVerifySchema),
  async (req: Request, res: Response) => {
    const { totpCode } = req.body as z.infer<typeof twoFaVerifySchema>;
    const ip = req.ip ?? '0.0.0.0';
    const tokens = await verifyTwoFa(req.user!.sub, totpCode, ip);
    res.json({ success: true, data: { ...tokens, expiresIn: 900 } });
  },
);

// ─── POST /api/auth/otp/send (registration verification) ─────────────────────
authRouter.post(
  '/otp/send',
  otpRateLimit,
  validate(phoneSchema),
  async (req: Request, res: Response) => {
    const { phone } = req.body as z.infer<typeof phoneSchema>;
    await sendRegistrationOtp(phone);
    res.json({ success: true, data: null, message: 'OTP sent. Check your phone.' });
  },
);

// ─── POST /api/auth/login-otp/send ───────────────────────────────────────────
authRouter.post(
  '/login-otp/send',
  otpRateLimit,
  validate(phoneSchema),
  async (req: Request, res: Response) => {
    const { phone } = req.body as z.infer<typeof phoneSchema>;
    await sendLoginOtp(phone);
    // Always return 200 — never reveal whether a phone is registered
    res.json({ success: true, data: null, message: 'If an account exists for this number, an OTP has been sent.' });
  },
);

// ─── POST /api/auth/login-otp/verify ─────────────────────────────────────────
authRouter.post(
  '/login-otp/verify',
  loginRateLimit,
  validate(loginOtpVerifySchema),
  async (req: Request, res: Response) => {
    const { phone, code } = req.body as z.infer<typeof loginOtpVerifySchema>;
    const ip = req.ip ?? '0.0.0.0';
    const tokens = await verifyLoginOtp(phone, code, ip);
    res.json({ success: true, data: { ...tokens, expiresIn: 900 } });
  },
);

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
authRouter.post(
  '/forgot-password',
  loginRateLimit,
  validate(z.object({ email: z.string().email() })),
  async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    await forgotPassword(email);
    // Always return 200 — never reveal whether email is registered
    res.json({ success: true, data: null, message: 'If this email is registered, a reset link has been sent.' });
  },
);

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
authRouter.post(
  '/reset-password',
  loginRateLimit,
  validate(z.object({
    token: z.string().min(1),
    password: z.string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  })),
  async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };
    await resetPassword(token, password);
    res.json({ success: true, data: null, message: 'Password reset successfully. Please sign in.' });
  },
);
