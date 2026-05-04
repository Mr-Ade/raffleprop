-- AddColumn: fctLroRef on campaigns (FCT Lottery Regulatory Office permit reference)
ALTER TABLE "campaigns" ADD COLUMN "fctLroRef" TEXT;

-- AddColumn: displayOrder on campaigns (ordering among featured campaigns)
ALTER TABLE "campaigns" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- AddColumn: campaignsSeo on site_settings (admin-editable /campaigns page meta)
ALTER TABLE "site_settings" ADD COLUMN "campaignsSeo" JSONB;

-- AddColumn: campaignsPageContent on site_settings (admin-editable campaigns page copy)
ALTER TABLE "site_settings" ADD COLUMN "campaignsPageContent" JSONB;
