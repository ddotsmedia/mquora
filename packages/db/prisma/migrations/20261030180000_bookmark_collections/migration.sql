-- CreateTable
CREATE TABLE "BookmarkCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkCollection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Bookmark" ADD COLUMN "collectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkCollection_userId_name_key" ON "BookmarkCollection"("userId", "name");

-- CreateIndex
CREATE INDEX "BookmarkCollection_userId_idx" ON "BookmarkCollection"("userId");

-- CreateIndex
CREATE INDEX "Bookmark_collectionId_idx" ON "Bookmark"("collectionId");

-- AddForeignKey
ALTER TABLE "BookmarkCollection" ADD CONSTRAINT "BookmarkCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "BookmarkCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
