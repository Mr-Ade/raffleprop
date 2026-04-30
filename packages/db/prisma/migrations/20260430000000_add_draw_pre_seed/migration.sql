-- Add two-phase draw commitment fields to campaigns
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "drawPreSeed" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "drawPreSeedCommitment" TEXT;
