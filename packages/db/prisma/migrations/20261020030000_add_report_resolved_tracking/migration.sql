-- Add report resolution tracking
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Report_resolvedBy_idx" ON "Report"("resolvedBy");
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
