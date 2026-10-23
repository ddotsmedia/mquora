-- CreateEnum
CREATE TYPE "AdminNotifType" AS ENUM ('USER_REGISTRATION', 'NEW_QUESTION', 'COMMAND');

-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE 'PENDING_REVIEW';

-- AlterTable: add isApproved to User
ALTER TABLE "User" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: AdminNotification
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" "AdminNotifType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedUserId" TEXT,
    "relatedPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminNotification_isRead_idx" ON "AdminNotification"("isRead");
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");
CREATE INDEX "AdminNotification_type_idx" ON "AdminNotification"("type");
