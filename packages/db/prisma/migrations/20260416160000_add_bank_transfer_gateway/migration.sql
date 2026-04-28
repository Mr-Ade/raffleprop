-- AlterEnum: add BANK_TRANSFER to PaymentGateway
-- NOTE: PostgreSQL requires ADD VALUE to be outside a transaction for enum changes
ALTER TYPE "PaymentGateway" ADD VALUE 'BANK_TRANSFER';

-- AlterTable: add bank transfer tracking fields to tickets
ALTER TABLE "tickets"
  ADD COLUMN "bankTransferRef"      TEXT,
  ADD COLUMN "bankTransferProofKey" TEXT,
  ADD COLUMN "bankTransferNote"     TEXT;

-- AlterTable: add escrow account name to campaigns
ALTER TABLE "campaigns"
  ADD COLUMN "escrowAccountName" TEXT;
