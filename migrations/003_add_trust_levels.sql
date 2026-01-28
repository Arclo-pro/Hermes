-- Migration: Add Trust Level Tables
-- Step 6.1: Trust Levels & Controlled Automation
-- Date: 2026-01-27

-- ========================================
-- Website Trust Levels Table
-- ========================================

CREATE TABLE IF NOT EXISTS website_trust_levels (
  id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  action_category TEXT NOT NULL,
  trust_level INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_reviewed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure one trust level per website/category combination
  CONSTRAINT unique_website_category UNIQUE (website_id, action_category),
  
  -- Ensure trust level is in valid range (0-3)
  CONSTRAINT valid_trust_level CHECK (trust_level >= 0 AND trust_level <= 3),
  
  -- Ensure confidence is in valid range (0-100)
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Ensure counts are non-negative
  CONSTRAINT valid_success_count CHECK (success_count >= 0),
  CONSTRAINT valid_failure_count CHECK (failure_count >= 0)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_website_trust_levels_website_id 
  ON website_trust_levels(website_id);

CREATE INDEX IF NOT EXISTS idx_website_trust_levels_category 
  ON website_trust_levels(action_category);

CREATE INDEX IF NOT EXISTS idx_website_trust_levels_trust_level 
  ON website_trust_levels(trust_level);

-- ========================================
-- Action Risk Registry Table
-- ========================================

CREATE TABLE IF NOT EXISTS action_risk_registry (
  id SERIAL PRIMARY KEY,
  action_code TEXT NOT NULL UNIQUE,
  action_category TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  blast_radius TEXT NOT NULL,
  rollback_possible BOOLEAN NOT NULL DEFAULT TRUE,
  min_trust_level INTEGER NOT NULL DEFAULT 2,
  requires_approval BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure risk level is valid
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Ensure blast radius is valid
  CONSTRAINT valid_blast_radius CHECK (blast_radius IN ('page', 'section', 'site')),
  
  -- Ensure min trust level is in valid range (0-3)
  CONSTRAINT valid_min_trust_level CHECK (min_trust_level >= 0 AND min_trust_level <= 3)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_action_risk_registry_category 
  ON action_risk_registry(action_category);

CREATE INDEX IF NOT EXISTS idx_action_risk_registry_risk_level 
  ON action_risk_registry(risk_level);

-- ========================================
-- Action Execution Audit Table
-- ========================================

CREATE TABLE IF NOT EXISTS action_execution_audit (
  id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  action_code TEXT NOT NULL,
  action_category TEXT NOT NULL,
  trust_level INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  execution_mode TEXT NOT NULL,
  evidence JSONB,
  rule TEXT,
  outcome TEXT NOT NULL,
  impact_metrics JSONB,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  executed_by TEXT NOT NULL,
  
  -- Ensure execution mode is valid
  CONSTRAINT valid_execution_mode CHECK (execution_mode IN ('manual', 'assisted', 'autonomous')),
  
  -- Ensure outcome is valid
  CONSTRAINT valid_outcome CHECK (outcome IN ('success', 'failure', 'rollback')),
  
  -- Ensure trust level is in valid range
  CONSTRAINT valid_audit_trust_level CHECK (trust_level >= 0 AND trust_level <= 3),
  
  -- Ensure confidence is in valid range
  CONSTRAINT valid_audit_confidence CHECK (confidence >= 0 AND confidence <= 100)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_action_execution_audit_website_id 
  ON action_execution_audit(website_id);

CREATE INDEX IF NOT EXISTS idx_action_execution_audit_category 
  ON action_execution_audit(action_category);

CREATE INDEX IF NOT EXISTS idx_action_execution_audit_executed_at 
  ON action_execution_audit(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_execution_audit_outcome 
  ON action_execution_audit(outcome);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_action_execution_audit_website_category 
  ON action_execution_audit(website_id, action_category, executed_at DESC);

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON TABLE website_trust_levels IS 
  'Step 6.1: Tracks trust and automation permissions per website and action category';

COMMENT ON COLUMN website_trust_levels.trust_level IS 
  '0=Observe Only, 1=Recommend, 2=Assisted, 3=Autonomous';

COMMENT ON COLUMN website_trust_levels.confidence IS 
  'Confidence score (0-100) based on success/failure ratio';

COMMENT ON TABLE action_risk_registry IS 
  'Catalog of action types with risk metadata and trust requirements';

COMMENT ON COLUMN action_risk_registry.min_trust_level IS 
  'Minimum trust level required to auto-execute this action';

COMMENT ON TABLE action_execution_audit IS 
  'Complete audit trail of automated actions with evidence and outcomes';

COMMENT ON COLUMN action_execution_audit.evidence IS 
  'Array of data points/signals that supported this action decision';

COMMENT ON COLUMN action_execution_audit.impact_metrics IS 
  'Metrics captured before and after execution for impact analysis';
