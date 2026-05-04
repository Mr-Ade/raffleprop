-- AlterTable: add homeSeo JSON field to site_settings for admin-editable home page meta title/description
ALTER TABLE "site_settings" ADD COLUMN "homeSeo" JSONB;
