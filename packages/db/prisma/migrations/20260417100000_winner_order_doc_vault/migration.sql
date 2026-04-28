-- Add order column to winner_stories for manual reordering
ALTER TABLE "winner_stories" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Add documentVault column to site_settings for Document Vault tab
ALTER TABLE "site_settings" ADD COLUMN "documentVault" JSONB;
