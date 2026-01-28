-- Migration: Add website_id to oauth_tokens for tenant isolation
-- Step 7.1: Multi-tenant scaling and isolation
-- Date: 2026-01-27

-- Step 1: Add website_id column (nullable initially to handle existing data)
ALTER TABLE oauth_tokens
ADD COLUMN website_id text;

-- Step 2: Add foreign key constraint to ensure referential integrity
ALTER TABLE oauth_tokens
ADD CONSTRAINT fk_oauth_tokens_website
FOREIGN KEY (website_id)
REFERENCES websites(id)
ON DELETE CASCADE;

-- Step 3: Create index for efficient filtering by website_id
CREATE INDEX idx_oauth_tokens_website_id ON oauth_tokens(website_id);

-- Step 4: Create composite index for common query patterns (website_id + provider)
CREATE INDEX idx_oauth_tokens_website_provider ON oauth_tokens(website_id, provider);

-- Note: After this migration, application code MUST:
-- 1. Update all INSERT operations to include website_id
-- 2. Update all SELECT operations to filter by website_id
-- 3. Once all existing tokens are migrated/updated, run the follow-up migration
--    to make website_id NOT NULL

-- For existing tokens without website_id:
-- These should be manually assigned to their correct website_id or deleted
-- Query to find orphaned tokens:
-- SELECT * FROM oauth_tokens WHERE website_id IS NULL;
