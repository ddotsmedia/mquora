-- CreateTable
CREATE TABLE "AnswerEditSuggestion" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "suggestedById" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AnswerEditSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerEditSuggestion_answerId_status_idx" ON "AnswerEditSuggestion"("answerId", "status");

-- AddForeignKey
ALTER TABLE "AnswerEditSuggestion" ADD CONSTRAINT "AnswerEditSuggestion_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerEditSuggestion" ADD CONSTRAINT "AnswerEditSuggestion_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
