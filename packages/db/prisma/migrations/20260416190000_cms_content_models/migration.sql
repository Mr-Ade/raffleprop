-- CMS content models: SiteSettings (singleton), Faq, Testimonial, WinnerStory

CREATE TABLE "site_settings" (
  "id"                TEXT         NOT NULL DEFAULT 'global',
  "siteName"          TEXT         NOT NULL DEFAULT 'RaffleProp',
  "tagline"           TEXT,
  "supportEmail"      TEXT,
  "supportPhone"      TEXT,
  "whatsappNumber"    TEXT,
  "twitterUrl"        TEXT,
  "instagramUrl"      TEXT,
  "facebookUrl"       TEXT,
  "youtubeUrl"        TEXT,
  "maintenanceMode"   BOOLEAN      NOT NULL DEFAULT false,
  "maintenanceBanner" TEXT,
  "footerTagline"     TEXT,
  "termsUrl"          TEXT,
  "privacyUrl"        TEXT,
  "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedBy"         TEXT,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row
INSERT INTO "site_settings" ("id", "updatedAt") VALUES ('global', now())
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "faqs" (
  "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "question"  TEXT         NOT NULL,
  "answer"    TEXT         NOT NULL,
  "category"  TEXT         NOT NULL DEFAULT 'general',
  "order"     INTEGER      NOT NULL DEFAULT 0,
  "published" BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "createdBy" TEXT,
  CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "faqs_category_idx"  ON "faqs"("category");
CREATE INDEX "faqs_published_idx" ON "faqs"("published");

CREATE TABLE "testimonials" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "authorName"  TEXT         NOT NULL,
  "authorTitle" TEXT,
  "avatarKey"   TEXT,
  "body"        TEXT         NOT NULL,
  "rating"      INTEGER      NOT NULL DEFAULT 5,
  "published"   BOOLEAN      NOT NULL DEFAULT false,
  "featured"    BOOLEAN      NOT NULL DEFAULT false,
  "order"       INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "testimonials_published_idx" ON "testimonials"("published");

CREATE TABLE "winner_stories" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "winnerName"    TEXT         NOT NULL,
  "propertyTitle" TEXT         NOT NULL,
  "propertyState" TEXT,
  "prize"         TEXT,
  "drawDate"      TIMESTAMPTZ,
  "imageKey"      TEXT,
  "blurb"         TEXT,
  "published"     BOOLEAN      NOT NULL DEFAULT false,
  "featured"      BOOLEAN      NOT NULL DEFAULT false,
  "campaignId"    TEXT,
  "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "winner_stories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "winner_stories_published_idx" ON "winner_stories"("published");
