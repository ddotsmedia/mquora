-- CreateTable QuestionSubscription
CREATE TABLE "QuestionSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSubscription_userId_postId_key" ON "QuestionSubscription"("userId", "postId");

-- CreateIndex
CREATE INDEX "QuestionSubscription_userId_idx" ON "QuestionSubscription"("userId");

-- CreateIndex
CREATE INDEX "QuestionSubscription_postId_idx" ON "QuestionSubscription"("postId");

-- AddForeignKey
ALTER TABLE "QuestionSubscription" ADD CONSTRAINT "QuestionSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSubscription" ADD CONSTRAINT "QuestionSubscription_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
