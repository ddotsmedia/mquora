-- Enable pg_trgm extension for trigram-based full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for typo-tolerant search with similarity
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_body_trgm_idx" ON "Post" USING GIN ("body" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Answer_body_trgm_idx" ON "Answer" USING GIN ("body" gin_trgm_ops);
