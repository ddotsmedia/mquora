-- AlterTable
ALTER TABLE "Answer" ADD COLUMN "helpfulCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AnswerHelpful" (
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerHelpful_pkey" PRIMARY KEY ("answerId","userId")
);

-- CreateIndex
CREATE INDEX "AnswerHelpful_userId_idx" ON "AnswerHelpful"("userId");

-- AddForeignKey
ALTER TABLE "AnswerHelpful" ADD CONSTRAINT "AnswerHelpful_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerHelpful" ADD CONSTRAINT "AnswerHelpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
