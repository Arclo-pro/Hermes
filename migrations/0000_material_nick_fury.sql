CREATE TABLE "achievement_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"crew_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"current_tier" text DEFAULT 'bronze' NOT NULL,
	"current_value" integer DEFAULT 0 NOT NULL,
	"next_threshold" integer DEFAULT 5 NOT NULL,
	"base_threshold" integer DEFAULT 5 NOT NULL,
	"growth_factor" real DEFAULT 1.7 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"action_key" text NOT NULL,
	"action_title" text NOT NULL,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" text DEFAULT 'user'
);
--> statement-breakpoint
CREATE TABLE "action_execution_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"action_code" text NOT NULL,
	"action_category" text NOT NULL,
	"trust_level" integer NOT NULL,
	"confidence" integer NOT NULL,
	"execution_mode" text NOT NULL,
	"evidence" jsonb,
	"rule" text,
	"outcome" text NOT NULL,
	"impact_metrics" jsonb,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"executed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 50 NOT NULL,
	"impact_level" text,
	"effort_level" text,
	"source_agents" text[],
	"evidence_json" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"reviewed_at" timestamp,
	"approved_at" timestamp,
	"completed_at" timestamp,
	"prompt_markdown" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_risk_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_code" text NOT NULL,
	"action_category" text NOT NULL,
	"risk_level" text NOT NULL,
	"blast_radius" text NOT NULL,
	"rollback_possible" boolean DEFAULT true NOT NULL,
	"min_trust_level" integer DEFAULT 2 NOT NULL,
	"requires_approval" boolean DEFAULT false,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "action_risk_registry_action_code_unique" UNIQUE("action_code")
);
--> statement-breakpoint
CREATE TABLE "action_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text NOT NULL,
	"anomaly_id" text NOT NULL,
	"action_code" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"plan_json" jsonb,
	"output_json" jsonb,
	"error_text" text,
	"triggered_by" text DEFAULT 'user',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "action_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "ads_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"spend" real NOT NULL,
	"impressions" integer NOT NULL,
	"clicks" integer NOT NULL,
	"cpc" real NOT NULL,
	"campaign_id" text,
	"campaign_name" text,
	"campaign_status" text,
	"disapprovals" integer DEFAULT 0,
	"policy_issues" jsonb,
	"search_terms" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"agent_slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"value" jsonb,
	"achieved_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_action_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"site_id" text NOT NULL,
	"env" text NOT NULL,
	"timestamp_start" timestamp NOT NULL,
	"timestamp_end" timestamp,
	"action_type" text NOT NULL,
	"targets" jsonb,
	"diff_summary" text,
	"commit_sha" text,
	"deploy_id" text,
	"job_id" text,
	"run_id" text,
	"expected_impact" jsonb,
	"risk_level" text,
	"notes" text,
	"inputs_hash" text,
	"outputs_summary" text,
	"duration_ms" integer,
	"success" boolean,
	"error_code" text,
	"error_message" text,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_action_logs_action_id_unique" UNIQUE("action_id")
);
--> statement-breakpoint
CREATE TABLE "ai_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"finding_id" text NOT NULL,
	"url" text NOT NULL,
	"finding_type" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"impact_estimate" text,
	"recommended_action" text,
	"fix_action" text,
	"is_auto_fixable" boolean DEFAULT false,
	"metadata" jsonb,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_findings_finding_id_unique" UNIQUE("finding_id")
);
--> statement-breakpoint
CREATE TABLE "ai_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"ai_visibility_score" integer,
	"structured_data_coverage" integer,
	"entity_coverage" integer,
	"llm_answerability" integer,
	"structured_data_details" jsonb,
	"entity_details" jsonb,
	"summary_details" jsonb,
	"llm_visibility_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anomalies" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"anomaly_type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"metric" text NOT NULL,
	"baseline_value" real NOT NULL,
	"observed_value" real NOT NULL,
	"delta_pct" real NOT NULL,
	"z_score" real,
	"scope" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_id" text NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"display_name" text NOT NULL,
	"hashed_key" text NOT NULL,
	"prefix" text NOT NULL,
	"scopes" text[] DEFAULT '{}',
	"created_by" text,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "approval_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"run_id" text NOT NULL,
	"action_type" text NOT NULL,
	"action_category" text NOT NULL,
	"risk_level" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"diff_preview" text,
	"affected_files" jsonb,
	"estimated_impact" text,
	"execution_payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp,
	"decided_by" integer,
	"executed_at" timestamp,
	"execution_error" text,
	"user_feedback" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"artifact_id" text NOT NULL,
	"type" text NOT NULL,
	"website_id" text,
	"run_id" text,
	"run_context_id" text,
	"producer_service" text NOT NULL,
	"schema_version" text DEFAULT '1.0.0',
	"storage_ref" text,
	"payload" jsonb,
	"summary" text,
	"metrics" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artifacts_artifact_id_unique" UNIQUE("artifact_id")
);
--> statement-breakpoint
CREATE TABLE "attribution_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"attribution_id" text NOT NULL,
	"site_id" text NOT NULL,
	"env" text NOT NULL,
	"event_id" text NOT NULL,
	"candidate_action_ids" jsonb,
	"time_proximity_score" real,
	"change_surface_score" real,
	"historical_likelihood_score" real,
	"confounders" jsonb,
	"confidence" real NOT NULL,
	"explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribution_records_attribution_id_unique" UNIQUE("attribution_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text,
	"action" text NOT NULL,
	"actor" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_proposal_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" text NOT NULL,
	"proposal_id" text NOT NULL,
	"action" text NOT NULL,
	"actor" text DEFAULT 'system' NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "change_proposal_actions_action_id_unique" UNIQUE("action_id")
);
--> statement-breakpoint
CREATE TABLE "change_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"website_id" text,
	"service_key" text,
	"type" text NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"rationale" jsonb,
	"evidence" jsonb,
	"change_plan" jsonb,
	"preview" jsonb,
	"verification_plan" jsonb,
	"rollback_plan" jsonb,
	"policy_gate" jsonb,
	"blocking" boolean DEFAULT false,
	"fingerprint" text,
	"created_by" text DEFAULT 'system',
	"superseded_by" text,
	"snoozed_until" timestamp,
	"tags" text[],
	"verification_results" jsonb,
	"apply_logs" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "change_proposals_proposal_id_unique" UNIQUE("proposal_id")
);
--> statement-breakpoint
CREATE TABLE "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"change_id" text NOT NULL,
	"website_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"change_type" text NOT NULL,
	"scope" text NOT NULL,
	"affected_urls" jsonb,
	"description" text NOT NULL,
	"reason" text,
	"trigger" text NOT NULL,
	"confidence_score" real,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"knowledge_pass" boolean,
	"policy_pass" boolean,
	"conflicts_detected" boolean,
	"cadence_pass" boolean,
	"cadence_block_reason" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"skip_reason" text,
	"deploy_window_id" text,
	"metrics_before" jsonb,
	"metrics_after" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"queued_at" timestamp,
	"applied_at" timestamp,
	"rolled_back_at" timestamp,
	CONSTRAINT "changes_change_id_unique" UNIQUE("change_id")
);
--> statement-breakpoint
CREATE TABLE "completed_work" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"domain" text NOT NULL,
	"fingerprint" text NOT NULL,
	"page" text,
	"work_type" text NOT NULL,
	"action" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "connector_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"overall_status" text DEFAULT 'pending' NOT NULL,
	"stages_json" jsonb NOT NULL,
	"config_snapshot" jsonb,
	"auth_mode" text,
	"expected_response_type" text DEFAULT 'json',
	"required_output_fields" text[],
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"website_id" text NOT NULL,
	"run_context_id" text,
	"content_type" text NOT NULL,
	"title" text,
	"target_url" text,
	"target_keywords" text[],
	"state" text DEFAULT 'drafted' NOT NULL,
	"state_history" jsonb,
	"revision_number" integer DEFAULT 1,
	"max_revisions" integer DEFAULT 2,
	"current_draft_artifact_id" text,
	"all_draft_artifact_ids" text[] DEFAULT '{}',
	"latest_qa_artifact_id" text,
	"qa_score" integer,
	"qa_violations" jsonb,
	"qa_fix_list" jsonb,
	"needs_human_reason" text,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_drafts_draft_id_unique" UNIQUE("draft_id")
);
--> statement-breakpoint
CREATE TABLE "core_web_vitals_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	"lcp" real,
	"cls" real,
	"inp" real,
	"ttfb" real,
	"fcp" real,
	"lcp_status" text,
	"cls_status" text,
	"inp_status" text,
	"ttfb_status" text,
	"fcp_status" text,
	"overall_score" integer,
	"source" text,
	"url" text,
	"device_type" text DEFAULT 'mobile',
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"run_id" text NOT NULL,
	"status" text NOT NULL,
	"pages_scanned" integer DEFAULT 0,
	"errors_found" integer DEFAULT 0,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crawl_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "crew_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"site_id" text NOT NULL,
	"crew_id" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"meta" jsonb,
	"surfaced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew_kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"site_id" text NOT NULL,
	"crew_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"value" real,
	"unit" text,
	"trend_delta" real,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"crew_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary" text,
	"missing_outputs" jsonb,
	"raw_payload" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"needs_config" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"health" text DEFAULT 'unknown',
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"degraded_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_metric_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"metrics_json" jsonb NOT NULL,
	"source_run_ids" jsonb,
	"date_range_from" text,
	"date_range_to" text,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"last_refresh_attempt_at" timestamp,
	"last_refresh_status" text,
	"last_refresh_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_metric_snapshots_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "deploy_windows" (
	"id" serial PRIMARY KEY NOT NULL,
	"deploy_window_id" text NOT NULL,
	"website_id" text NOT NULL,
	"theme" text,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"executed_at" timestamp,
	"metrics_before" jsonb,
	"metrics_after" jsonb,
	"regression_flagged" boolean DEFAULT false,
	"regression_reasons" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deploy_windows_deploy_window_id_unique" UNIQUE("deploy_window_id")
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" text NOT NULL,
	"site_id" text NOT NULL,
	"patch_id" text,
	"status" text NOT NULL,
	"deployed_at" timestamp,
	"rollback_at" timestamp,
	"pre_deploy_checks" jsonb,
	"post_deploy_checks" jsonb,
	"logs" text,
	"previous_commit_sha" text,
	"new_commit_sha" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deployments_deployment_id_unique" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "diagnostic_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text NOT NULL,
	"site_domain" text,
	"run_type" text DEFAULT 'daily' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"duration_ms" integer,
	"summary" text,
	"services_run" integer DEFAULT 0,
	"services_success" integer DEFAULT 0,
	"services_failed" integer DEFAULT 0,
	"services_blocked" integer DEFAULT 0,
	"services_skipped" integer DEFAULT 0,
	"metrics_json" jsonb,
	"outputs_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "diagnostic_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "digest_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"digest_schedule_id" integer NOT NULL,
	"website_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"summary_data" jsonb,
	"sent_at" timestamp NOT NULL,
	"email_sent_to" text NOT NULL,
	"sendgrid_message_id" text,
	"opened" boolean DEFAULT false NOT NULL,
	"clicked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"frequency" text NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"include_only_if_changes" boolean DEFAULT true NOT NULL,
	"min_actions_to_send" integer DEFAULT 1 NOT NULL,
	"last_sent_at" timestamp,
	"next_scheduled_at" timestamp,
	"delivery_count" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draper_action_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"action_type" text NOT NULL,
	"payload" jsonb,
	"note" text,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draper_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"customer_id" text,
	"target_cpa" real,
	"target_roas" real,
	"daily_spend_cap" real,
	"auto_apply_negatives" boolean DEFAULT false,
	"pause_low_performers" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_id" text NOT NULL,
	"site_id" text NOT NULL,
	"crawl_run_id" text,
	"source_integration" text,
	"run_id" text,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"impact_score" integer DEFAULT 50,
	"confidence" real DEFAULT 0.5,
	"title" text NOT NULL,
	"description" text,
	"evidence" jsonb,
	"recommended_actions" text[],
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "findings_finding_id_unique" UNIQUE("finding_id")
);
--> statement-breakpoint
CREATE TABLE "first_run_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"run_id" text NOT NULL,
	"fixes_applied" integer DEFAULT 0 NOT NULL,
	"fix_types" jsonb DEFAULT '[]'::jsonb,
	"fix_details" jsonb,
	"completed_successfully" boolean NOT NULL,
	"duration_ms" integer,
	"user_reaction" text,
	"user_reacted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "first_run_results_website_id_unique" UNIQUE("website_id")
);
--> statement-breakpoint
CREATE TABLE "fix_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"site_id" text NOT NULL,
	"crew_id" text NOT NULL,
	"topic" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cooldown_allowed" boolean DEFAULT true NOT NULL,
	"cooldown_next_allowed_at" timestamp,
	"cooldown_reason" text,
	"last_pr_created_at" timestamp,
	"max_changes_recommended" integer DEFAULT 5,
	"items_json" jsonb NOT NULL,
	"metrics_snapshot" jsonb,
	"socrates_context" jsonb,
	"executed_at" timestamp,
	"executed_items_count" integer,
	"pr_url" text,
	"pr_branch" text,
	"execution_result" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fix_plans_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "free_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"scan_id" text NOT NULL,
	"website_url" text NOT NULL,
	"website_domain" text NOT NULL,
	"report_version" integer DEFAULT 1,
	"status" text DEFAULT 'generating',
	"summary" jsonb,
	"competitors" jsonb,
	"keywords" jsonb,
	"technical" jsonb,
	"performance" jsonb,
	"next_steps" jsonb,
	"meta" jsonb,
	"visibility_mode" text DEFAULT 'full',
	"limited_visibility_reason" text,
	"limited_visibility_steps" jsonb,
	"share_token" text,
	"share_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "free_reports_report_id_unique" UNIQUE("report_id")
);
--> statement-breakpoint
CREATE TABLE "ga4_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"date" text NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"events" integer NOT NULL,
	"conversions" integer NOT NULL,
	"bounce_rate" real,
	"avg_session_duration" real,
	"pages_per_session" real,
	"channel" text,
	"landing_page" text,
	"device" text,
	"geo" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ga4_landing_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"date" text NOT NULL,
	"landing_path" text NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"engaged_sessions" integer,
	"conversions" integer,
	"cluster" text
);
--> statement-breakpoint
CREATE TABLE "generated_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"user_id" integer,
	"business_name" text NOT NULL,
	"business_category" text NOT NULL,
	"city" text,
	"state" text,
	"phone" text,
	"email" text NOT NULL,
	"existing_website" text,
	"description" text,
	"services" text[],
	"brand_preference" text DEFAULT 'modern',
	"color_theme" text DEFAULT 'violet',
	"domain_preference" text DEFAULT 'subdomain',
	"custom_domain" text,
	"status" text DEFAULT 'preview_pending' NOT NULL,
	"build_state" text DEFAULT 'pending' NOT NULL,
	"preview_url" text,
	"hero_image_url" text,
	"logo_url" text,
	"user_provided_logo" boolean DEFAULT false,
	"user_provided_hero" boolean DEFAULT false,
	"hero_image_status" text DEFAULT 'pending',
	"preview_token" text,
	"config_version" integer DEFAULT 1,
	"generated_pages" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generated_sites_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "gsc_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"date" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" real NOT NULL,
	"position" real NOT NULL,
	"query" text,
	"page" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_page_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"date" text NOT NULL,
	"page_path" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" real NOT NULL,
	"position" real NOT NULL,
	"cluster" text
);
--> statement-breakpoint
CREATE TABLE "gsc_query_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"date" text NOT NULL,
	"query" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" real NOT NULL,
	"position" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hermes_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"category" text NOT NULL,
	"agent_sources" text[] NOT NULL,
	"priority" integer NOT NULL,
	"confidence" text NOT NULL,
	"missing_inputs" text[],
	"phase" text NOT NULL,
	"action" text NOT NULL,
	"steps" jsonb,
	"evidence" jsonb,
	"definition_of_done" text,
	"dependencies" text[],
	"risks" text[],
	"kbase_refs" text[],
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hypotheses" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"rank" integer NOT NULL,
	"hypothesis_key" text NOT NULL,
	"confidence" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"disconfirmed_by" jsonb,
	"missing_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry" text NOT NULL,
	"metric" text NOT NULL,
	"percentile_25" real NOT NULL,
	"percentile_50" real NOT NULL,
	"percentile_75" real NOT NULL,
	"percentile_90" real NOT NULL,
	"unit" text,
	"source" text,
	"source_year" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" text NOT NULL,
	"site_id" text,
	"check_type" text NOT NULL,
	"status" text NOT NULL,
	"details" jsonb,
	"duration_ms" integer,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_status_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"services_json" jsonb,
	"next_actions_json" jsonb,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"computed_from_run_id" text,
	"last_refresh_attempt_at" timestamp,
	"last_refresh_status" text,
	"last_refresh_error" text,
	"last_refresh_duration_ms" integer,
	"ttl_seconds" integer DEFAULT 60,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integration_status_cache_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"description_md" text,
	"category" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"health_status" text DEFAULT 'disconnected',
	"last_success_at" timestamp,
	"last_error_at" timestamp,
	"last_error" text,
	"contract_version" text DEFAULT '1.0',
	"expected_signals" jsonb,
	"received_signals" jsonb,
	"config_json" jsonb,
	"replit_project_url" text,
	"base_url" text,
	"health_endpoint" text DEFAULT '/health',
	"meta_endpoint" text DEFAULT '/meta',
	"deployment_status" text DEFAULT 'not_built',
	"has_required_endpoints" boolean DEFAULT false,
	"auth_required" boolean DEFAULT true,
	"secret_key_name" text,
	"secret_exists" boolean DEFAULT false,
	"last_health_check_at" timestamp,
	"health_check_status" text,
	"health_check_response" jsonb,
	"last_auth_test_at" timestamp,
	"auth_test_status" text,
	"auth_test_details" jsonb,
	"called_successfully" boolean DEFAULT false,
	"notes" text,
	"build_state" text DEFAULT 'planned',
	"config_state" text DEFAULT 'missing_config',
	"run_state" text DEFAULT 'never_ran',
	"last_run_at" timestamp,
	"last_run_summary" text,
	"last_run_metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_integration_id_unique" UNIQUE("integration_id")
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" serial PRIMARY KEY NOT NULL,
	"intervention_id" text NOT NULL,
	"site_id" text NOT NULL,
	"run_id" text,
	"action_ids" jsonb NOT NULL,
	"services_involved" jsonb,
	"change_summary" text NOT NULL,
	"change_tags" jsonb,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"expected_outcome" jsonb,
	"rollback_possible" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interventions_intervention_id_unique" UNIQUE("intervention_id")
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"run_id" text NOT NULL,
	"service" text NOT NULL,
	"action" text NOT NULL,
	"website_id" text,
	"params" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 50,
	"claimed_by" text,
	"claimed_at" timestamp,
	"result" jsonb,
	"error_message" text,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"lock_expires_at" timestamp,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"last_heartbeat_at" timestamp,
	CONSTRAINT "job_queue_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "kb_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"insight_id" text NOT NULL,
	"site_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"tags" text[],
	"sources" jsonb,
	"synthesis_run_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kb_insights_insight_id_unique" UNIQUE("insight_id")
);
--> statement-breakpoint
CREATE TABLE "kb_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendation_id" text NOT NULL,
	"site_id" text NOT NULL,
	"title" text NOT NULL,
	"rationale" text,
	"priority" text DEFAULT 'medium',
	"effort" text,
	"action_type" text,
	"sources" jsonb,
	"status" text DEFAULT 'pending',
	"synthesis_run_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kb_recommendations_recommendation_id_unique" UNIQUE("recommendation_id")
);
--> statement-breakpoint
CREATE TABLE "kb_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"action" text DEFAULT 'warn' NOT NULL,
	"conditions" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kb_rules_rule_id_unique" UNIQUE("rule_id")
);
--> statement-breakpoint
CREATE TABLE "keyword_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_keywords" text[],
	"target_url" text,
	"impact_score" integer DEFAULT 50 NOT NULL,
	"effort_score" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 50,
	"reason" text,
	"metadata" jsonb,
	"executed_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managed_website_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"integration_type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"source_agent" text NOT NULL,
	"window_start" timestamp,
	"window_end" timestamp,
	"value" real NOT NULL,
	"comparison_value" real,
	"delta_abs" real,
	"delta_pct" real,
	"verdict" text,
	"verdict_reason" text,
	"as_of" timestamp DEFAULT now() NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp NOT NULL,
	"scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outcome_event_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"site_id" text NOT NULL,
	"env" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"event_type" text NOT NULL,
	"metric_key" text NOT NULL,
	"old_value" real,
	"new_value" real,
	"delta" real,
	"severity" text,
	"detection_source" text,
	"context" jsonb,
	"window" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outcome_event_logs_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "patches" (
	"id" serial PRIMARY KEY NOT NULL,
	"patch_id" text NOT NULL,
	"site_id" text NOT NULL,
	"plan_id" text,
	"finding_id" text,
	"changes" jsonb,
	"rationale" text,
	"acceptance_criteria" text[],
	"risk_level" text DEFAULT 'low',
	"status" text DEFAULT 'queued',
	"pr_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patches_patch_id_unique" UNIQUE("patch_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"site_id" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"buckets" jsonb,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "qa_run_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"qa_run_id" text NOT NULL,
	"service_slug" text NOT NULL,
	"test_type" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer,
	"details" text,
	"http_status" integer,
	"latency_ms" integer,
	"metrics_json" jsonb,
	"missing_outputs" text[],
	"service_run_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"mode" text DEFAULT 'connection' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"duration_ms" integer,
	"summary" text,
	"total_tests" integer DEFAULT 0,
	"passed" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"skipped" integer DEFAULT 0,
	"results_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qa_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "report_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" text NOT NULL,
	"share_token" text NOT NULL,
	"created_by_email" text,
	"title" text,
	"password_hash" text,
	"expires_at" timestamp,
	"allowed_sections" jsonb,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"report_type" text NOT NULL,
	"summary" text NOT NULL,
	"drop_dates" jsonb,
	"root_causes" jsonb,
	"markdown_report" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_contexts" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"website_id" text,
	"workflow_name" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"step_states" jsonb,
	"current_step" text,
	"completed_steps" text[] DEFAULT '{}',
	"max_retries" integer DEFAULT 3,
	"current_retries" integer DEFAULT 0,
	"ruleset_version" text,
	"rules_bundle_ids" text[],
	"input_artifact_ids" text[] DEFAULT '{}',
	"output_artifact_ids" text[] DEFAULT '{}',
	"errors" jsonb,
	"last_error" text,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "run_contexts_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "run_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"run_id" text NOT NULL,
	"service" text NOT NULL,
	"error_type" text NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"next_retry_at" timestamp,
	"retry_strategy" text DEFAULT 'exponential_backoff',
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolution" text,
	"user_notified" boolean DEFAULT false NOT NULL,
	"escalated" boolean DEFAULT false NOT NULL,
	"escalated_at" timestamp,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"run_type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"summary" text,
	"anomalies_detected" integer DEFAULT 0,
	"report_id" integer,
	"ticket_count" integer DEFAULT 0,
	"errors" jsonb,
	"source_statuses" jsonb,
	"primary_classification" text,
	"confidence_overall" text,
	"deltas" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "scan_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" text NOT NULL,
	"target_url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"email" text,
	"preview_findings" jsonb,
	"full_report" jsonb,
	"score_summary" jsonb,
	"geo_scope" text,
	"geo_location" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scan_requests_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"execution_time_ms" integer,
	"checksum" text,
	"applied_by" text DEFAULT 'system',
	CONSTRAINT "schema_migrations_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "seo_agent_competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"agent_slug" text DEFAULT 'natasha' NOT NULL,
	"domain" text NOT NULL,
	"name" text,
	"type" text DEFAULT 'direct',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_agent_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"agent_slug" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"market_sov_pct" real NOT NULL,
	"tracked_sov_pct" real,
	"total_keywords" integer NOT NULL,
	"ranking_keywords" integer NOT NULL,
	"not_ranking_keywords" integer NOT NULL,
	"top1_count" integer DEFAULT 0 NOT NULL,
	"top3_count" integer DEFAULT 0 NOT NULL,
	"top10_count" integer DEFAULT 0 NOT NULL,
	"top20_count" integer DEFAULT 0 NOT NULL,
	"top50_count" integer DEFAULT 0 NOT NULL,
	"position_distribution" jsonb
);
--> statement-breakpoint
CREATE TABLE "seo_kbase_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"insight_id" text NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"full_content" text,
	"insight_type" text NOT NULL,
	"article_refs_json" jsonb,
	"suggestion_ids" text[],
	"actions_json" jsonb,
	"priority" integer DEFAULT 50,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seo_kbase_insights_insight_id_unique" UNIQUE("insight_id")
);
--> statement-breakpoint
CREATE TABLE "seo_metric_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"service_id" text NOT NULL,
	"crew_id" text NOT NULL,
	"run_id" text,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	"metrics_json" jsonb NOT NULL,
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"report_id" text NOT NULL,
	"domain" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"report_json" jsonb,
	"error_message" text,
	"source" text DEFAULT 'free_report',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "seo_reports_report_id_unique" UNIQUE("report_id")
);
--> statement-breakpoint
CREATE TABLE "seo_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"worker_statuses_json" jsonb,
	"total_workers" integer DEFAULT 0,
	"completed_workers" integer DEFAULT 0,
	"success_workers" integer DEFAULT 0,
	"failed_workers" integer DEFAULT 0,
	"skipped_workers" integer DEFAULT 0,
	"suggestions_generated" integer DEFAULT 0,
	"insights_generated" integer DEFAULT 0,
	"tickets_generated" integer DEFAULT 0,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seo_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "seo_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggestion_id" text NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text NOT NULL,
	"suggestion_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"category" text NOT NULL,
	"evidence_json" jsonb,
	"impacted_urls" text[],
	"impacted_keywords" text[],
	"actions_json" jsonb,
	"estimated_impact" text,
	"estimated_effort" text,
	"status" text DEFAULT 'open' NOT NULL,
	"assignee" text,
	"source_workers" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seo_suggestions_suggestion_id_unique" UNIQUE("suggestion_id")
);
--> statement-breakpoint
CREATE TABLE "seo_worker_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"site_id" text NOT NULL,
	"worker_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload_json" jsonb,
	"metrics_json" jsonb,
	"summary_text" text,
	"error_code" text,
	"error_detail" text,
	"duration_ms" integer,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serp_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"intent" text,
	"priority" integer DEFAULT 3,
	"priority_reason" text,
	"difficulty" integer,
	"target_url" text,
	"tags" text[],
	"volume" integer,
	"active" boolean DEFAULT true,
	"last_checked" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "serp_keywords_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE "serp_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer NOT NULL,
	"date" text NOT NULL,
	"search_engine" text DEFAULT 'google',
	"location" text DEFAULT 'Orlando, Florida, United States',
	"device" text DEFAULT 'desktop',
	"position" integer,
	"url" text,
	"change" integer,
	"volume" integer,
	"serp_features" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"website_id" text,
	"run_context_id" text,
	"producer_service" text NOT NULL,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"audience" text DEFAULT 'ops' NOT NULL,
	"notify" boolean DEFAULT false,
	"notified" boolean DEFAULT false,
	"notified_at" timestamp,
	"notification_channel" text,
	"title" text NOT NULL,
	"message" text,
	"details" jsonb,
	"artifact_id" text,
	"dedupe_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "service_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_name" text NOT NULL,
	"quota_type" text NOT NULL,
	"quota_limit" integer NOT NULL,
	"quota_period" text NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"throttle_when_approaching" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_quotas_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
CREATE TABLE "service_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"run_type" text DEFAULT 'smoke' NOT NULL,
	"site_id" text,
	"site_domain" text,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"duration_ms" integer,
	"version" text,
	"summary" text,
	"metrics_json" jsonb,
	"inputs_json" jsonb,
	"outputs_json" jsonb,
	"error_code" text,
	"error_detail" text,
	"artifact_links" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "site_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"asset_type" text NOT NULL,
	"source" text NOT NULL,
	"source_asset_id" text,
	"url_original" text NOT NULL,
	"url_cached" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_generation_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"site_id" integer,
	"payload_json" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0,
	"progress_message" text,
	"error_message" text,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"run_after" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"integration_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"vault_provider" text,
	"vault_item_id" text,
	"vault_collection_id" text,
	"vault_org_id" text,
	"meta_json" jsonb,
	"last_checked_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"display_name" text NOT NULL,
	"base_url" text NOT NULL,
	"category" text,
	"tech_stack" text,
	"repo_provider" text,
	"repo_identifier" text,
	"deploy_method" text,
	"crawl_settings" jsonb,
	"sitemaps" text[],
	"key_pages" text[],
	"integrations" jsonb,
	"guardrails" jsonb,
	"cadence" jsonb,
	"owner_name" text,
	"owner_contact" text,
	"health_score" integer,
	"last_diagnosis_at" timestamp,
	"last_deploy_at" timestamp,
	"status" text DEFAULT 'active',
	"active" boolean DEFAULT true,
	"geo_scope" text,
	"geo_location" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sites_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "socrates_kb_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"kb_id" text NOT NULL,
	"title" text NOT NULL,
	"problem_statement" text NOT NULL,
	"context_scope" jsonb NOT NULL,
	"trigger_pattern" text,
	"root_cause_hypothesis" text,
	"evidence" jsonb NOT NULL,
	"recommended_action" text,
	"avoid_action" text,
	"guardrail" text,
	"confidence" real NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "socrates_kb_entries_kb_id_unique" UNIQUE("kb_id")
);
--> statement-breakpoint
CREATE TABLE "system_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"old_value" jsonb,
	"new_value" jsonb NOT NULL,
	"reason" text,
	"triggered_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" text NOT NULL,
	"config_value" jsonb NOT NULL,
	"config_type" text NOT NULL,
	"description" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "test_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"site_id" text,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"summary" text,
	"progress_json" jsonb,
	CONSTRAINT "test_jobs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"run_id" text,
	"title" text NOT NULL,
	"owner" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"steps" jsonb NOT NULL,
	"expected_impact" text NOT NULL,
	"impact_estimate" jsonb,
	"evidence" jsonb,
	"hypothesis_key" text,
	"report_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"default_website_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"addons" jsonb,
	"verified_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vault_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'bitwarden' NOT NULL,
	"org_id" text,
	"default_collection_id" text,
	"status" text DEFAULT 'disconnected',
	"last_health_check" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "web_checks_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"url" text NOT NULL,
	"status_code" integer NOT NULL,
	"redirect_url" text,
	"canonical" text,
	"meta_robots" text,
	"has_content" boolean NOT NULL,
	"error_message" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_cadence_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"max_deploys_per_week" integer DEFAULT 2 NOT NULL,
	"cooldowns" jsonb DEFAULT '{"content_refresh_days":7,"title_meta_days":14,"template_layout_days":21,"technical_indexing_days":14,"performance_days":7}'::jsonb,
	"stabilization_mode_until" timestamp,
	"stabilization_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "website_cadence_settings_website_id_unique" UNIQUE("website_id")
);
--> statement-breakpoint
CREATE TABLE "website_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"integration_type" text NOT NULL,
	"status" text DEFAULT 'not_configured' NOT NULL,
	"config_json" jsonb,
	"secret_refs" text[],
	"last_ok_at" timestamp,
	"last_checked_at" timestamp,
	"last_error" jsonb,
	"connection_owner" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"website_id" text NOT NULL,
	"job_type" text NOT NULL,
	"domain" text NOT NULL,
	"requested_by" text NOT NULL,
	"trace_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "website_jobs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "website_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"can_auto_fix_technical" boolean DEFAULT false NOT NULL,
	"can_auto_publish_content" boolean DEFAULT false NOT NULL,
	"can_auto_update_content" boolean DEFAULT false NOT NULL,
	"can_auto_optimize_images" boolean DEFAULT false NOT NULL,
	"can_auto_update_code" boolean DEFAULT false NOT NULL,
	"max_auto_risk_level" integer DEFAULT 3 NOT NULL,
	"blocked_paths" jsonb DEFAULT '[]'::jsonb,
	"blocked_file_types" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"quota_type" text NOT NULL,
	"quota_limit" integer NOT NULL,
	"quota_period" text NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"pause_when_exceeded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"competitors" jsonb DEFAULT '[]'::jsonb,
	"target_services_enabled" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"scan_id" text,
	"plan" text DEFAULT 'free',
	"subscription_status" text DEFAULT 'inactive',
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"addons" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_trust_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"action_category" text NOT NULL,
	"trust_level" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"last_success_at" timestamp,
	"last_failure_at" timestamp,
	"last_reviewed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"method" text NOT NULL,
	"token" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"user_id" integer,
	"automation_mode" text DEFAULT 'observe' NOT NULL,
	"trust_level" integer DEFAULT 1 NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"verification_method" text,
	"gsc_property_url" text,
	"ga4_property_id" text,
	"ga4_stream_id" text,
	"run_frequency_hours" integer DEFAULT 24 NOT NULL,
	"max_crawl_depth" integer DEFAULT 100 NOT NULL,
	"max_keywords_tracked" integer DEFAULT 50 NOT NULL,
	"notification_cadence" text DEFAULT 'weekly' NOT NULL,
	"last_auto_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "websites_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "action_execution_audit" ADD CONSTRAINT "action_execution_audit_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_findings" ADD CONSTRAINT "crew_findings_run_id_crew_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."crew_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_kpis" ADD CONSTRAINT "crew_kpis_run_id_crew_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."crew_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_history" ADD CONSTRAINT "digest_history_digest_schedule_id_digest_schedule_id_fk" FOREIGN KEY ("digest_schedule_id") REFERENCES "public"."digest_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_history" ADD CONSTRAINT "digest_history_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_history" ADD CONSTRAINT "digest_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_schedule" ADD CONSTRAINT "digest_schedule_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_schedule" ADD CONSTRAINT "digest_schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "first_run_results" ADD CONSTRAINT "first_run_results_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_sites" ADD CONSTRAINT "generated_sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_website_integrations" ADD CONSTRAINT "managed_website_integrations_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_errors" ADD CONSTRAINT "run_errors_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_assets" ADD CONSTRAINT "site_assets_site_id_generated_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."generated_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_generation_jobs" ADD CONSTRAINT "site_generation_jobs_site_id_generated_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."generated_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_jobs" ADD CONSTRAINT "website_jobs_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_policies" ADD CONSTRAINT "website_policies_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_settings" ADD CONSTRAINT "website_settings_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_trust_levels" ADD CONSTRAINT "website_trust_levels_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_verifications" ADD CONSTRAINT "website_verifications_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;