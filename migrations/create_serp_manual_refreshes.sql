-- Create SERP Manual Refreshes table for tracking usage limits
CREATE TABLE IF NOT EXISTS serp_manual_refreshes (
  id SERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  domain TEXT,
  user_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for fast lookups by site and month
CREATE INDEX IF NOT EXISTS idx_serp_manual_refreshes_site_month
  ON serp_manual_refreshes(site_id, month_key);
