-- Add topic field to content_pages for blog categorisation
ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "topic" TEXT;
CREATE INDEX IF NOT EXISTS "content_pages_topic_idx" ON "content_pages"("topic");
