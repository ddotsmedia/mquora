-- Vote.targetId points at a Post, Answer OR Comment (see targetType). Three FKs on the same
-- column made every vote insert fail, so they are dropped. Prisma relations still work for reads.
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_post_fkey";
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_answer_fkey";
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_comment_fkey";
