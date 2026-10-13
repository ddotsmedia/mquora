-- Columns and tables present in schema.prisma but missing from the init migration.
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "bannedAt" TIMESTAMP(3),
ADD COLUMN "bannedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PostEmbedding" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerEmbedding" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" TEXT NOT NULL,
    "sourcePostId" TEXT NOT NULL,
    "targetPostId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostEmbedding_postId_key" ON "PostEmbedding"("postId");
CREATE INDEX "PostEmbedding_postId_idx" ON "PostEmbedding"("postId");
CREATE UNIQUE INDEX "AnswerEmbedding_answerId_key" ON "AnswerEmbedding"("answerId");
CREATE INDEX "AnswerEmbedding_answerId_idx" ON "AnswerEmbedding"("answerId");
CREATE UNIQUE INDEX "DuplicateCandidate_sourcePostId_targetPostId_key" ON "DuplicateCandidate"("sourcePostId", "targetPostId");
CREATE INDEX "DuplicateCandidate_sourcePostId_idx" ON "DuplicateCandidate"("sourcePostId");
CREATE INDEX "DuplicateCandidate_targetPostId_idx" ON "DuplicateCandidate"("targetPostId");
CREATE INDEX "DuplicateCandidate_status_idx" ON "DuplicateCandidate"("status");

-- AddForeignKey
ALTER TABLE "PostEmbedding" ADD CONSTRAINT "PostEmbedding_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerEmbedding" ADD CONSTRAINT "AnswerEmbedding_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_targetPostId_fkey" FOREIGN KEY ("targetPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
