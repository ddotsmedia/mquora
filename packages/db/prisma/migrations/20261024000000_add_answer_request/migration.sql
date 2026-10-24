-- CreateTable
CREATE TABLE "AnswerRequest" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesteeId" TEXT NOT NULL,
    "message" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnswerRequest_postId_requesterId_requesteeId_key" ON "AnswerRequest"("postId", "requesterId", "requesteeId");

-- CreateIndex
CREATE INDEX "AnswerRequest_postId_idx" ON "AnswerRequest"("postId");

-- CreateIndex
CREATE INDEX "AnswerRequest_requesteeId_idx" ON "AnswerRequest"("requesteeId");

-- CreateIndex
CREATE INDEX "AnswerRequest_requesterId_idx" ON "AnswerRequest"("requesterId");

-- AddForeignKey
ALTER TABLE "AnswerRequest" ADD CONSTRAINT "AnswerRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRequest" ADD CONSTRAINT "AnswerRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRequest" ADD CONSTRAINT "AnswerRequest_requesteeId_fkey" FOREIGN KEY ("requesteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
