-- Add allowed payment gateways per campaign.
-- Defaults to all three so existing campaigns continue to accept every gateway.
ALTER TABLE "campaigns"
  ADD COLUMN "allowedGateways" "PaymentGateway"[]
  NOT NULL
  DEFAULT ARRAY['PAYSTACK','FLUTTERWAVE','BANK_TRANSFER']::"PaymentGateway"[];
