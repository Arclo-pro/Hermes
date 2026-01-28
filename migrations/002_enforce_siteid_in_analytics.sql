-- Migration: Enforce NOT NULL on siteId in analytics tables
-- Step 7.1: Multi-tenant scaling and isolation
-- Date: 2026-01-27

-- ========================================
-- GA4 Daily Analytics Table
-- ========================================

-- Step 1: Update any existing NULL siteId values to 'default' (if not already)
-- This ensures no data is lost during the constraint addition
UPDATE ga4_daily
SET site_id = 'default'
WHERE site_id IS NULL;

-- Step 2: Make siteId NOT NULL
ALTER TABLE ga4_daily
ALTER COLUMN site_id SET NOT NULL;

-- Step 3: Create index for efficient filtering by siteId
CREATE INDEX IF NOT EXISTS idx_ga4_daily_site_id ON ga4_daily(site_id);

-- Step 4: Create composite index for common query patterns (siteId + date)
CREATE INDEX IF NOT EXISTS idx_ga4_daily_site_date ON ga4_daily(site_id, date DESC);

-- ========================================
-- GSC Daily Analytics Table
-- ========================================

-- Step 1: Update any existing NULL siteId values to 'default'
UPDATE gsc_daily
SET site_id = 'default'
WHERE site_id IS NULL;

-- Step 2: Make siteId NOT NULL
ALTER TABLE gsc_daily
ALTER COLUMN site_id SET NOT NULL;

-- Step 3: Create index for efficient filtering by siteId
CREATE INDEX IF NOT EXISTS idx_gsc_daily_site_id ON gsc_daily(site_id);

-- Step 4: Create composite index for common query patterns (siteId + date)
CREATE INDEX IF NOT EXISTS idx_gsc_daily_site_date ON gsc_daily(site_id, date DESC);

-- Step 5: Create composite index for query analysis (siteId + query + date)
CREATE INDEX IF NOT EXISTS idx_gsc_daily_site_query ON gsc_daily(site_id, query, date DESC)
WHERE query IS NOT NULL;

-- ========================================
-- Verification Queries
-- ========================================

-- After migration, these should return 0:
-- SELECT COUNT(*) FROM ga4_daily WHERE site_id IS NULL;
-- SELECT COUNT(*) FROM gsc_daily WHERE site_id IS NULL;

-- Check data distribution by site:
-- SELECT site_id, COUNT(*) FROM ga4_daily GROUP BY site_id;
-- SELECT site_id, COUNT(*) FROM gsc_daily GROUP BY site_id;
