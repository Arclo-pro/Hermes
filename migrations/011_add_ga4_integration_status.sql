-- Add GA4 integration status tracking columns to site_google_credentials
-- This migration adds support for:
-- - ga4_stream_id: Web data stream selection
-- - integration_status: Track connection state (disconnected|connected|error)
-- - last_verified_at: Timestamp of last successful verification
-- - last_error_code/message: Error tracking without exposing secrets

ALTER TABLE site_google_credentials ADD COLUMN IF NOT EXISTS ga4_stream_id TEXT;
ALTER TABLE site_google_credentials ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'disconnected';
ALTER TABLE site_google_credentials ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;
ALTER TABLE site_google_credentials ADD COLUMN IF NOT EXISTS last_error_code TEXT;
ALTER TABLE site_google_credentials ADD COLUMN IF NOT EXISTS last_error_message TEXT;
