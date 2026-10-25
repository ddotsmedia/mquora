-- AlterTable: per-answer view counter (defaults to 0 for existing rows)
ALTER TABLE "Answer" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
