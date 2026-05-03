-- Create blog_comments table for threaded blog discussion
CREATE TABLE "blog_comments" (
    "id"        TEXT NOT NULL,
    "pageSlug"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "parentId"  TEXT,
    "approved"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "blog_comments_pageSlug_idx" ON "blog_comments"("pageSlug");
CREATE INDEX "blog_comments_userId_idx" ON "blog_comments"("userId");

-- FK: user
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: parent comment (self-referential)
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
