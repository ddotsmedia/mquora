-- CreateTable
CREATE TABLE "QuestionVisit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVisit_userId_postId_key" ON "QuestionVisit"("userId", "postId");

-- CreateIndex
CREATE INDEX "QuestionVisit_userId_visitedAt_idx" ON "QuestionVisit"("userId", "visitedAt");

-- AddForeignKey
ALTER TABLE "QuestionVisit" ADD CONSTRAINT "QuestionVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVisit" ADD CONSTRAINT "QuestionVisit_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
