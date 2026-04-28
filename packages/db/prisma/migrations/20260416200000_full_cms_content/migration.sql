-- Full CMS content: extend site_settings + add 4 new models

-- ─── Extend site_settings ─────────────────────────────────────────────────────

ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "tiktokUrl"           TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl"          TEXT,
  ADD COLUMN IF NOT EXISTS "heroSection"          JSONB,
  ADD COLUMN IF NOT EXISTS "heroStats"            JSONB,
  ADD COLUMN IF NOT EXISTS "statsSection"         JSONB,
  ADD COLUMN IF NOT EXISTS "ctaBanner"            JSONB,
  ADD COLUMN IF NOT EXISTS "notificationSection"  JSONB,
  ADD COLUMN IF NOT EXISTS "companyInfo"          JSONB,
  ADD COLUMN IF NOT EXISTS "aboutMission"         JSONB,
  ADD COLUMN IF NOT EXISTS "aboutValues"          JSONB,
  ADD COLUMN IF NOT EXISTS "blogTopics"           JSONB;

-- ─── trust_badges ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "trust_badges" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "text"      TEXT        NOT NULL,
  "iconClass" TEXT        NOT NULL,
  "order"     INTEGER     NOT NULL DEFAULT 0,
  "enabled"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "trust_badges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "trust_badges_enabled_idx" ON "trust_badges"("enabled");

-- Seed default trust badges
INSERT INTO "trust_badges" ("text", "iconClass", "order") VALUES
  ('CAC Registered · RC-1234567',     'fa-building-columns', 0),
  ('Escrow Protected',                 'fa-vault',            1),
  ('Live Draw on YouTube',             'fa-video',            2),
  ('Lawyer Verified',                  'fa-scale-balanced',   3),
  ('Winner Guaranteed',                'fa-trophy',           4),
  ('Full Refund if Min Not Met',       'fa-rotate-left',      5),
  ('SCUML Registered · AML Compliant','fa-shield-halved',    6)
ON CONFLICT DO NOTHING;

-- ─── how_it_works_steps ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "how_it_works_steps" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "stepNumber"  INTEGER     NOT NULL,
  "icon"        TEXT,
  "title"       TEXT        NOT NULL,
  "description" TEXT        NOT NULL,
  "order"       INTEGER     NOT NULL DEFAULT 0,
  "published"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "how_it_works_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "how_it_works_steps_published_idx" ON "how_it_works_steps"("published");

-- Seed default steps
INSERT INTO "how_it_works_steps" ("stepNumber", "title", "description", "order") VALUES
  (1, 'Browse Properties',    'View campaigns with full property details, independent valuations, and regulatory approvals.', 0),
  (2, 'Buy Tickets',          'Select a ticket bundle, answer a skill question, and pay securely via Paystack or Flutterwave.', 1),
  (3, 'Watch the Live Draw',  'Draws are streamed live on YouTube with an independent lawyer and notary as witnesses.', 2),
  (4, 'Win Your Home',        'The verified winner receives formal notification within 3 days and a full Deed of Assignment.', 3)
ON CONFLICT DO NOTHING;

-- ─── team_members ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "team_members" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT        NOT NULL,
  "title"       TEXT        NOT NULL,
  "bio"         TEXT        NOT NULL,
  "photoKey"    TEXT,
  "initials"    TEXT,
  "avatarColor" TEXT,
  "linkedinUrl" TEXT,
  "order"       INTEGER     NOT NULL DEFAULT 0,
  "published"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "team_members_published_idx" ON "team_members"("published");

-- ─── company_milestones ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "company_milestones" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "year"        TEXT        NOT NULL,
  "heading"     TEXT        NOT NULL,
  "description" TEXT        NOT NULL,
  "order"       INTEGER     NOT NULL DEFAULT 0,
  "published"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "company_milestones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "company_milestones_published_idx" ON "company_milestones"("published");

-- Seed default milestones
INSERT INTO "company_milestones" ("year", "heading", "description", "order") VALUES
  ('2023',     'Company Founded',        'RaffleProp was founded with a mission to make property ownership accessible to every Nigerian through transparent, compliant draws.', 0),
  ('Q1 2024',  'First FCCPC Approval',   'Received first Federal Competition and Consumer Protection Commission approval, establishing the regulatory framework for all campaigns.', 1),
  ('Oct 2024', 'First Draw Completed',   'Tunde B. won a ₦28M 2-bedroom flat in Maitama, Abuja — our first publicly verified property draw, live-streamed on YouTube.', 2),
  ('Jan 2025', 'Second Draw Completed',  'Adaeze O. won a ₦38M 3-bedroom terrace in Ikeja GRA, Lagos. Total prizes awarded reached ₦66M.', 3),
  ('Apr 2025', 'Full Platform Launch',   'Launched the full Next.js platform with real-time ticketing, automated refunds, and admin compliance tools.', 4)
ON CONFLICT DO NOTHING;
