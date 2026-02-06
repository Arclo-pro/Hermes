-- Create API keys table for site-specific API authentication
-- Used for webhook integrations like lead capture from external forms

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_id TEXT NOT NULL UNIQUE,
  site_id TEXT NOT NULL DEFAULT 'default',
  display_name TEXT NOT NULL,
  hashed_key TEXT NOT NULL,
  prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  created_by TEXT,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for prefix lookup (used for API key validation)
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);

-- Index for site lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_site_id ON api_keys(site_id);
