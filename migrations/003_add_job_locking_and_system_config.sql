-- Migration: Add job locking mechanism and system configuration
-- Step 10: Scale, Resilience, and Long-Term Leverage
-- Date: 2026-01-27
--
-- This migration adds:
-- 1. Enhanced job locking with timeout detection
-- 2. System configuration table for kill switches and emergency modes
-- 3. Job execution quotas and throttling support

-- ========================================
-- Part 1: Enhanced Job Queue with Locking
-- ========================================

-- Add lock expiry tracking to prevent stuck jobs
ALTER TABLE job_queue
ADD COLUMN lock_expires_at timestamp;

-- Add lock version for optimistic locking
ALTER TABLE job_queue
ADD COLUMN lock_version integer DEFAULT 0 NOT NULL;

-- Add last heartbeat for worker health tracking
ALTER TABLE job_queue
ADD COLUMN last_heartbeat_at timestamp;

-- Create index for efficient lock expiry queries
CREATE INDEX idx_job_queue_lock_expires ON job_queue(lock_expires_at)
WHERE status IN ('claimed', 'running');

-- Create index for status + priority (job claiming)
CREATE INDEX idx_job_queue_status_priority ON job_queue(status, priority DESC, created_at ASC)
WHERE status = 'queued';

-- Create index for worker health monitoring
CREATE INDEX idx_job_queue_worker_health ON job_queue(claimed_by, last_heartbeat_at)
WHERE claimed_by IS NOT NULL;

-- ========================================
-- Part 2: System Configuration Table
-- ========================================

-- System-wide configuration and kill switches
CREATE TABLE IF NOT EXISTS system_config (
  id serial PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL,
  config_type text NOT NULL, -- 'kill_switch', 'quota', 'throttle', 'setting'
  description text,
  updated_by text, -- user or system that made the change
  created_at timestamp DEFAULT NOW() NOT NULL,
  updated_at timestamp DEFAULT NOW() NOT NULL
);

-- Create index for efficient config lookups
CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_type ON system_config(config_type);

-- Insert default kill switch configurations
INSERT INTO system_config (config_key, config_value, config_type, description, updated_by) VALUES
  ('global_kill_switch', '{"enabled": false, "reason": null, "activatedAt": null}', 'kill_switch', 'Global emergency stop - disables all job processing', 'system'),
  ('global_mode', '{"mode": "normal", "reason": null, "changedAt": null}', 'kill_switch', 'Global operation mode: normal, observe_only, safe_mode', 'system'),
  ('service_kill_switches', '{}', 'kill_switch', 'Per-service kill switches: { "service-name": { "enabled": false, "reason": "", "activatedAt": null } }', 'system'),
  ('website_kill_switches', '{}', 'kill_switch', 'Per-website kill switches: { "website-id": { "enabled": false, "reason": "", "activatedAt": null } }', 'system')
ON CONFLICT (config_key) DO NOTHING;

-- ========================================
-- Part 3: Job Quotas and Throttling
-- ========================================

-- Website-level quotas and usage tracking
CREATE TABLE IF NOT EXISTS website_quotas (
  id serial PRIMARY KEY,
  website_id text NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  quota_type text NOT NULL, -- 'jobs_per_day', 'api_calls_per_day', 'pages_per_run', 'crawl_depth'
  quota_limit integer NOT NULL, -- maximum allowed
  quota_period text NOT NULL, -- 'daily', 'hourly', 'per_run'
  current_usage integer DEFAULT 0 NOT NULL, -- current usage in period
  period_start timestamp NOT NULL, -- when current period started
  period_end timestamp NOT NULL, -- when current period ends
  pause_when_exceeded boolean DEFAULT false, -- auto-pause site when quota exceeded
  created_at timestamp DEFAULT NOW() NOT NULL,
  updated_at timestamp DEFAULT NOW() NOT NULL,
  UNIQUE(website_id, quota_type, quota_period)
);

-- Create indexes for quota checks
CREATE INDEX idx_website_quotas_website ON website_quotas(website_id);
CREATE INDEX idx_website_quotas_type ON website_quotas(quota_type);
CREATE INDEX idx_website_quotas_period ON website_quotas(period_end);

-- Service-level quotas (global budget)
CREATE TABLE IF NOT EXISTS service_quotas (
  id serial PRIMARY KEY,
  service_name text NOT NULL UNIQUE, -- e.g., 'rank-tracker', 'content-analyzer'
  quota_type text NOT NULL, -- 'api_calls_per_day', 'jobs_per_hour'
  quota_limit integer NOT NULL,
  quota_period text NOT NULL, -- 'daily', 'hourly'
  current_usage integer DEFAULT 0 NOT NULL,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  throttle_when_approaching boolean DEFAULT true, -- slow down at 80%
  created_at timestamp DEFAULT NOW() NOT NULL,
  updated_at timestamp DEFAULT NOW() NOT NULL
);

-- Create indexes for service quota checks
CREATE INDEX idx_service_quotas_service ON service_quotas(service_name);
CREATE INDEX idx_service_quotas_period ON service_quotas(period_end);

-- ========================================
-- Part 4: Audit Log for System Changes
-- ========================================

-- Track all kill switch and system config changes
CREATE TABLE IF NOT EXISTS system_audit_log (
  id serial PRIMARY KEY,
  action_type text NOT NULL, -- 'kill_switch_activated', 'kill_switch_deactivated', 'mode_changed', 'quota_modified'
  target_type text NOT NULL, -- 'global', 'service', 'website'
  target_id text, -- service name or website_id (null for global)
  old_value jsonb,
  new_value jsonb NOT NULL,
  reason text,
  triggered_by text NOT NULL, -- user email, 'system', or 'auto_threshold'
  created_at timestamp DEFAULT NOW() NOT NULL
);

-- Create indexes for audit queries
CREATE INDEX idx_system_audit_target ON system_audit_log(target_type, target_id);
CREATE INDEX idx_system_audit_time ON system_audit_log(created_at DESC);
CREATE INDEX idx_system_audit_action ON system_audit_log(action_type);

-- ========================================
-- Part 5: Migration Tracking Table
-- ========================================

-- Track which migrations have been applied
CREATE TABLE IF NOT EXISTS schema_migrations (
  id serial PRIMARY KEY,
  version text NOT NULL UNIQUE, -- e.g., '003', '004'
  name text NOT NULL, -- descriptive name
  applied_at timestamp DEFAULT NOW() NOT NULL,
  execution_time_ms integer, -- how long the migration took
  checksum text, -- hash of migration file for verification
  applied_by text DEFAULT 'system' -- who/what ran the migration
);

-- Create index for version lookups
CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);

-- Record existing migrations as applied (retroactive)
INSERT INTO schema_migrations (version, name, applied_at, applied_by) VALUES
  ('001', 'add_website_id_to_oauth_tokens', NOW(), 'manual'),
  ('002', 'enforce_siteid_in_analytics', NOW(), 'manual'),
  ('003', 'add_job_locking_and_system_config', NOW(), 'system')
ON CONFLICT (version) DO NOTHING;

-- ========================================
-- Verification Queries
-- ========================================

-- Check kill switch status:
-- SELECT config_key, config_value FROM system_config WHERE config_type = 'kill_switch';

-- Check job locks:
-- SELECT job_id, status, claimed_by, claimed_at, lock_expires_at
-- FROM job_queue
-- WHERE status IN ('claimed', 'running')
-- ORDER BY claimed_at DESC;

-- Check for expired locks:
-- SELECT job_id, status, claimed_by, lock_expires_at
-- FROM job_queue
-- WHERE lock_expires_at < NOW() AND status IN ('claimed', 'running');

-- Check quota usage:
-- SELECT website_id, quota_type, current_usage, quota_limit,
--        ROUND(100.0 * current_usage / quota_limit, 2) as usage_percent
-- FROM website_quotas
-- WHERE current_usage > 0
-- ORDER BY usage_percent DESC;
