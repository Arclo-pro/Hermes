-- Migration 013: Weekly Agent Update Pipeline
-- Adds pipeline scoring and status columns to seo_suggestions, plus weekly_plans table

-- ════════════════════════════════════════════════════════════════════════════
-- SEO SUGGESTIONS — add pipeline workflow columns
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "seo_suggestions"
  ADD COLUMN IF NOT EXISTS "impact_score" integer,
  ADD COLUMN IF NOT EXISTS "effort_score" integer,
  ADD COLUMN IF NOT EXISTS "confidence_score" integer,
  ADD COLUMN IF NOT EXISTS "priority_score" integer,
  ADD COLUMN IF NOT EXISTS "pipeline_status" text DEFAULT 'backlog',
  ADD COLUMN IF NOT EXISTS "selected_for_week" text,
  ADD COLUMN IF NOT EXISTS "selected_at" timestamp,
  ADD COLUMN IF NOT EXISTS "published_at" timestamp,
  ADD COLUMN IF NOT EXISTS "skipped_reason" text;

-- Indexes for efficient pipeline queries
CREATE INDEX IF NOT EXISTS "idx_seo_suggestions_pipeline_status"
  ON "seo_suggestions" ("pipeline_status");

CREATE INDEX IF NOT EXISTS "idx_seo_suggestions_site_pipeline"
  ON "seo_suggestions" ("site_id", "pipeline_status");

CREATE INDEX IF NOT EXISTS "idx_seo_suggestions_selected_week"
  ON "seo_suggestions" ("selected_for_week") WHERE "selected_for_week" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_seo_suggestions_priority"
  ON "seo_suggestions" ("site_id", "priority_score" DESC NULLS LAST)
  WHERE "pipeline_status" IN ('backlog', 'proposed');

-- ════════════════════════════════════════════════════════════════════════════
-- WEEKLY PLANS — track top 1-3 suggestions selected each week
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "weekly_plans" (
  "id" serial PRIMARY KEY,
  "site_id" text NOT NULL,
  "week_string" text NOT NULL,

  -- Selected suggestion IDs (1-3)
  "selected_suggestion_ids" text[],

  -- Selection metadata
  "diversity_applied" boolean DEFAULT false,
  "agent_spread" jsonb,

  -- Lifecycle
  "status" text NOT NULL DEFAULT 'draft',
  "generated_at" timestamp DEFAULT now(),
  "published_at" timestamp,

  -- User overrides
  "user_overrides" jsonb,

  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Unique constraint: one plan per site per week
CREATE UNIQUE INDEX IF NOT EXISTS "idx_weekly_plans_site_week"
  ON "weekly_plans" ("site_id", "week_string");

CREATE INDEX IF NOT EXISTS "idx_weekly_plans_status"
  ON "weekly_plans" ("status");

CREATE INDEX IF NOT EXISTS "idx_weekly_plans_site_recent"
  ON "weekly_plans" ("site_id", "created_at" DESC);
