-- AlterTable: weekly digest opt-in (off by default)
ALTER TABLE "User" ADD COLUMN "digestOptIn" BOOLEAN NOT NULL DEFAULT false;
