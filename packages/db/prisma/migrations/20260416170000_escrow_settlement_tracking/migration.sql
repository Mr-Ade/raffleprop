-- Campaign: per-campaign gateway sub-account codes for escrow routing
ALTER TABLE "campaigns" ADD COLUMN "paystackSubaccountCode"  TEXT;
ALTER TABLE "campaigns" ADD COLUMN "flutterwaveSubaccountId" TEXT;

-- Ticket: store the gateway's own transaction ID (needed for reliable Flutterwave refunds)
-- and a timestamp recording when the gateway confirmed payment into escrow
ALTER TABLE "tickets" ADD COLUMN "gatewayTransactionId" TEXT;
ALTER TABLE "tickets" ADD COLUMN "escrowSettledAt"      TIMESTAMPTZ;
