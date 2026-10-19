-- Report.targetId points at a Post, Answer OR Comment (see targetType). Three FKs on the same
-- column made every report insert fail, so they are dropped. Prisma relations still work for reads.
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_post_fkey";
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_answer_fkey";
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_comment_fkey";
