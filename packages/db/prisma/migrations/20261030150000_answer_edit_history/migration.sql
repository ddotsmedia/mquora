-- AlterTable
ALTER TABLE "Answer" ADD COLUMN "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AnswerRevision" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerRevision_answerId_createdAt_idx" ON "AnswerRevision"("answerId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnswerRevision" ADD CONSTRAINT "AnswerRevision_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
