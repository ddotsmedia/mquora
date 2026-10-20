-- Topic follows, question follows/passes, onboarding flag, profile credential, question follower count.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMP(3);
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "credential" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "followerCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "TagFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TagFollow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TagFollow_userId_tagId_key" ON "TagFollow"("userId", "tagId");
CREATE INDEX IF NOT EXISTS "TagFollow_tagId_idx" ON "TagFollow"("tagId");
ALTER TABLE "TagFollow" ADD CONSTRAINT "TagFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TagFollow" ADD CONSTRAINT "TagFollow_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "QuestionFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionFollow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuestionFollow_userId_postId_key" ON "QuestionFollow"("userId", "postId");
CREATE INDEX IF NOT EXISTS "QuestionFollow_postId_idx" ON "QuestionFollow"("postId");
ALTER TABLE "QuestionFollow" ADD CONSTRAINT "QuestionFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionFollow" ADD CONSTRAINT "QuestionFollow_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "QuestionPass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionPass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuestionPass_userId_postId_key" ON "QuestionPass"("userId", "postId");
CREATE INDEX IF NOT EXISTS "QuestionPass_postId_idx" ON "QuestionPass"("postId");
ALTER TABLE "QuestionPass" ADD CONSTRAINT "QuestionPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionPass" ADD CONSTRAINT "QuestionPass_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill counters that were never maintained on question create.
UPDATE "Tag" t SET "postCount" = (SELECT COUNT(*) FROM "PostTag" pt JOIN "Post" p ON p."id" = pt."postId" WHERE pt."tagId" = t."id" AND p."deletedAt" IS NULL AND p."status" = 'PUBLISHED');
UPDATE "Community" c SET "postCount" = (SELECT COUNT(*) FROM "Post" p WHERE p."communityId" = c."id" AND p."deletedAt" IS NULL AND p."status" = 'PUBLISHED');
UPDATE "Community" c SET "memberCount" = (SELECT COUNT(*) FROM "CommunityMember" m WHERE m."communityId" = c."id");
-- Authors follow their own questions.
INSERT INTO "QuestionFollow" ("id", "userId", "postId") SELECT 'qf_' || p."id", p."authorId", p."id" FROM "Post" p ON CONFLICT DO NOTHING;
UPDATE "Post" p SET "followerCount" = (SELECT COUNT(*) FROM "QuestionFollow" f WHERE f."postId" = p."id");
-- Existing users skip onboarding.
UPDATE "User" SET "onboardedAt" = CURRENT_TIMESTAMP WHERE "onboardedAt" IS NULL;
