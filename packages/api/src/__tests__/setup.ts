import { vi } from 'vitest';

// Prevent Sentry from initialising during tests
vi.mock('../instrument', () => ({}));

// Required env vars so server.ts validation doesn't exit the process
process.env['NODE_ENV'] = 'test';
process.env['PAYSTACK_SECRET_KEY'] = 'sk_test_testkey1234567890abcdef';
process.env['FLUTTERWAVE_SECRET_KEY'] = 'FLWSECK_TEST-testkey';
process.env['FLUTTERWAVE_WEBHOOK_SECRET'] = 'test_flw_webhook_secret';
process.env['JWT_SECRET'] = 'test_jwt_secret_at_least_32_chars_long_for_tests';
process.env['JWT_REFRESH_SECRET'] = 'test_jwt_refresh_secret_32_chars_long';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['R2_ACCOUNT_ID'] = 'test_account';
process.env['R2_ACCESS_KEY_ID'] = 'test_key';
process.env['R2_SECRET_ACCESS_KEY'] = 'test_secret';
process.env['R2_BUCKET_MEDIA'] = 'test-media';
process.env['R2_BUCKET_DOCUMENTS'] = 'test-docs';
process.env['RESEND_API_KEY'] = 're_test_key';
process.env['ENCRYPTION_KEY'] = 'a'.repeat(64); // 64 hex chars = 32 bytes
process.env['FRONTEND_URL'] = 'http://localhost:3000';
