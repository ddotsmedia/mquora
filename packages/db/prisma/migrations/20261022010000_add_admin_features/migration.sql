-- CreateEnum
CREATE TYPE "AdminFeatureType" AS ENUM ('USERS', 'CONTENT', 'REPORTS', 'COMMUNITIES', 'TAGS', 'ANNOUNCEMENTS', 'SYSTEM', 'AUDIT_LOG', 'FLAGS', 'QUEUES', 'OTHER_ADMINS');

-- CreateTable
CREATE TABLE "AdminFeature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPermission" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminFeature_key_key" ON "AdminFeature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPermission_adminId_featureKey_key" ON "AdminPermission"("adminId", "featureKey");

-- CreateIndex
CREATE INDEX "AdminPermission_adminId_idx" ON "AdminPermission"("adminId");

-- CreateIndex
CREATE INDEX "AdminPermission_featureKey_idx" ON "AdminPermission"("featureKey");

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
