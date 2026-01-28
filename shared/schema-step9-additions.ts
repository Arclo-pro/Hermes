/**
 * STEP 9: PRODUCTIZATION SCHEMA ADDITIONS
 *
 * This file contains all schema additions for Step 9 product izat ion.
 * Append these to the main schema.ts file after the websiteJobs table.
 */

import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { websites, users } from "./schema";

// ═══════════════════════════════════════════════════════════════════════════
// FIRST: ADD THESE FIELDS TO THE EXISTING `websites` TABLE
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Add to existing websites table definition:
 *
 *   // Step 9.1: Onboarding & Policies
 *   userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // Website owner
 *   automationMode: text("automation_mode").notNull().default("observe"), // observe, recommend, assisted, auto
 *   trustLevel: integer("trust_level").notNull().default(1), // 1-10, increases with successful runs
 *   verificationStatus: text("verification_status").notNull().default("unverified"), // unverified, dns_verified, file_verified, gsc_verified
 *   verificationMethod: text("verification_method"), // dns_txt, meta_tag, file_upload, gsc_property
 *
 *   // Google Integrations
 *   gscPropertyUrl: text("gsc_property_url"), // Full GSC property URL (sc-domain:example.com or https://example.com/)
 *   ga4PropertyId: text("ga4_property_id"), // GA4 measurement ID (G-XXXXXXXXXX)
 *   ga4StreamId: text("ga4_stream_id"), // GA4 data stream ID
 *
 *   // Step 9.3: Defaults & Limits
 *   runFrequencyHours: integer("run_frequency_hours").notNull().default(24), // How often to auto-run (0 = manual only)
 *   maxCrawlDepth: integer("max_crawl_depth").notNull().default(100), // Max pages to crawl per run
 *   maxKeywordsTracked: integer("max_keywords_tracked").notNull().default(50), // Keyword tracking limit
 *   notificationCadence: text("notification_cadence").notNull().default("weekly"), // none, weekly, monthly
 *   lastAutoRunAt: timestamp("last_auto_run_at"), // Track last automatic run
 */

// ═══════════════════════════════════════════════════════════════════════════
// NEW TABLES FOR STEP 9
// ═══════════════════════════════════════════════════════════════════════════

// 9.1: Website Policies - What can/can't be automated per site
export const websitePolicies = pgTable("website_policies", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),

  // Action categories that can be auto-executed
  canAutoFixTechnical: boolean("can_auto_fix_technical").notNull().default(false), // Missing alt tags, meta descriptions, etc.
  canAutoPublishContent: boolean("can_auto_publish_content").notNull().default(false), // New blog posts, pages
  canAutoUpdateContent: boolean("can_auto_update_content").notNull().default(false), // Refresh existing content
  canAutoOptimizeImages: boolean("can_auto_optimize_images").notNull().default(false), // Compress, resize, WebP conversion
  canAutoUpdateCode: boolean("can_auto_update_code").notNull().default(false), // JS/CSS changes, schema markup

  // Risk levels that require approval (1=safe, 10=dangerous)
  maxAutoRiskLevel: integer("max_auto_risk_level").notNull().default(3), // Auto-approve actions ≤ this level

  // Blocklists
  blockedPaths: jsonb("blocked_paths").$type<string[]>().default([]), // Paths to never touch (e.g., /checkout, /login)
  blockedFileTypes: jsonb("blocked_file_types").$type<string[]>().default([]), // File types to never modify

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWebsitePolicySchema = createInsertSchema(websitePolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebsitePolicy = z.infer<typeof insertWebsitePolicySchema>;
export type WebsitePolicy = typeof websitePolicies.$inferSelect;

// 9.1: Website Verification Records
export const websiteVerifications = pgTable("website_verifications", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  method: text("method").notNull(), // dns_txt, meta_tag, file_upload, gsc_property
  token: text("token").notNull(), // Verification token or DNS record value
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"), // Some verifications expire
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Method-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebsiteVerificationSchema = createInsertSchema(websiteVerifications).omit({
  id: true,
  createdAt: true,
});
export type InsertWebsiteVerification = z.infer<typeof insertWebsiteVerificationSchema>;
export type WebsiteVerification = typeof websiteVerifications.$inferSelect;

// 9.5: Approval Queue - Actions requiring user approval
export const approvalQueue = pgTable("approval_queue", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  runId: text("run_id").notNull(), // Associated run that generated this approval

  // What's being approved
  actionType: text("action_type").notNull(), // publish_content, update_code, fix_technical, etc.
  actionCategory: text("action_category").notNull(), // content, technical, optimization
  riskLevel: integer("risk_level").notNull(), // 1-10
  title: text("title").notNull(), // User-facing title
  description: text("description").notNull(), // What will happen

  // Preview data
  diffPreview: text("diff_preview"), // Git-style diff or before/after
  affectedFiles: jsonb("affected_files").$type<string[]>(), // Files that will change
  estimatedImpact: text("estimated_impact"), // "Low risk - metadata only" etc.

  // Execution details (stored as JSON for flexibility)
  executionPayload: jsonb("execution_payload").$type<Record<string, any>>().notNull(), // How to execute if approved

  // Status
  status: text("status").notNull().default("pending"), // pending, approved, rejected, expired, executed
  decidedAt: timestamp("decided_at"),
  decidedBy: integer("decided_by").references(() => users.id),
  executedAt: timestamp("executed_at"),
  executionError: text("execution_error"),

  // Learning signals
  userFeedback: text("user_feedback"), // Optional feedback on why rejected

  expiresAt: timestamp("expires_at").notNull(), // Auto-expire after 7 days
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApprovalQueueSchema = createInsertSchema(approvalQueue).omit({
  id: true,
  createdAt: true,
});
export type InsertApprovalQueue = z.infer<typeof insertApprovalQueueSchema>;
export type ApprovalQueue = typeof approvalQueue.$inferSelect;

// 9.6: Run Error Log - Detailed error tracking for supportability
export const runErrors = pgTable("run_errors", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  runId: text("run_id").notNull(),
  service: text("service").notNull(), // Which service failed

  // Error details
  errorType: text("error_type").notNull(), // timeout, auth_failed, rate_limit, unknown
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"), // Full stack trace

  // Retry tracking
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  nextRetryAt: timestamp("next_retry_at"), // When to retry
  retryStrategy: text("retry_strategy").default("exponential_backoff"), // exponential_backoff, linear, none

  // Resolution
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"), // auto_retry_success, manual_fix, config_update, etc.

  // User notification
  userNotified: boolean("user_notified").notNull().default(false),
  escalated: boolean("escalated").notNull().default(false), // Escalated to support
  escalatedAt: timestamp("escalated_at"),

  // Context for support
  context: jsonb("context").$type<Record<string, any>>(), // Full run context snapshot

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRunErrorSchema = createInsertSchema(runErrors).omit({
  id: true,
  createdAt: true,
});
export type InsertRunError = z.infer<typeof insertRunErrorSchema>;
export type RunError = typeof runErrors.$inferSelect;

// 9.4: Digest Email Schedule - Track digest generation and delivery
export const digestSchedule = pgTable("digest_schedule", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Schedule
  frequency: text("frequency").notNull(), // weekly, monthly
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly (0=Sunday)
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly

  // Content filters
  includeOnlyIfChanges: boolean("include_only_if_changes").notNull().default(true), // Don't send if nothing happened
  minActionsToSend: integer("min_actions_to_send").notNull().default(1), // Minimum actions to trigger email

  // Delivery tracking
  lastSentAt: timestamp("last_sent_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  deliveryCount: integer("delivery_count").notNull().default(0),

  // Status
  enabled: boolean("enabled").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDigestScheduleSchema = createInsertSchema(digestSchedule).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDigestSchedule = z.infer<typeof insertDigestScheduleSchema>;
export type DigestSchedule = typeof digestSchedule.$inferSelect;

// 9.4: Digest Sent History - Track what was sent to whom
export const digestHistory = pgTable("digest_history", {
  id: serial("id").primaryKey(),
  digestScheduleId: integer("digest_schedule_id").notNull().references(() => digestSchedule.id, { onDelete: "cascade" }),
  websiteId: text("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Period covered
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Summary data (stored for reference)
  summaryData: jsonb("summary_data").$type<{
    actionsCompleted: number;
    newPages?: number;
    blogPosts?: number;
    technicalFixes?: number;
    trafficChange?: string;
    trafficChangeType?: 'positive' | 'negative' | 'neutral';
    visibilityChange?: string;
    visibilityChangeType?: 'positive' | 'negative' | 'neutral';
    topActions?: { type: string; description: string }[];
  }>(),

  // Delivery
  sentAt: timestamp("sent_at").notNull(),
  emailSentTo: text("email_sent_to").notNull(),
  sendgridMessageId: text("sendgrid_message_id"),
  opened: boolean("opened").notNull().default(false),
  clicked: boolean("clicked").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDigestHistorySchema = createInsertSchema(digestHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertDigestHistory = z.infer<typeof insertDigestHistorySchema>;
export type DigestHistory = typeof digestHistory.$inferSelect;

// 9.2: First Run Results - Track "First Fix" trust moments
export const firstRunResults = pgTable("first_run_results", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().unique().references(() => websites.id, { onDelete: "cascade" }),
  runId: text("run_id").notNull(), // The onboarding run

  // Safe fixes applied
  fixesApplied: integer("fixes_applied").notNull().default(0),
  fixTypes: jsonb("fix_types").$type<string[]>().default([]), // [missing_alt_tags, meta_descriptions, etc.]
  fixDetails: jsonb("fix_details").$type<{ type: string; count: number; description: string }[]>(),

  // Trust signals
  completedSuccessfully: boolean("completed_successfully").notNull(),
  durationMs: integer("duration_ms"),
  userReaction: text("user_reaction"), // positive, neutral, negative, none
  userReactedAt: timestamp("user_reacted_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFirstRunResultSchema = createInsertSchema(firstRunResults).omit({
  id: true,
  createdAt: true,
});
export type InsertFirstRunResult = z.infer<typeof insertFirstRunResultSchema>;
export type FirstRunResult = typeof firstRunResults.$inferSelect;

//═══════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS FOR STEP 9
// ═══════════════════════════════════════════════════════════════════════════

export const AutomationModes = {
  OBSERVE: 'observe',       // Just watch and report
  RECOMMEND: 'recommend',   // Suggest actions, require approval
  ASSISTED: 'assisted',     // Auto-apply low-risk, approve medium-risk
  AUTO: 'auto',            // Fully automated (high trust sites only)
} as const;
export type AutomationMode = typeof AutomationModes[keyof typeof AutomationModes];

export const VerificationStatuses = {
  UNVERIFIED: 'unverified',
  DNS_VERIFIED: 'dns_verified',
  FILE_VERIFIED: 'file_verified',
  GSC_VERIFIED: 'gsc_verified',
} as const;
export type VerificationStatus = typeof VerificationStatuses[keyof typeof VerificationStatuses];

export const VerificationMethods = {
  DNS_TXT: 'dns_txt',
  META_TAG: 'meta_tag',
  FILE_UPLOAD: 'file_upload',
  GSC_PROPERTY: 'gsc_property',
} as const;
export type VerificationMethod = typeof VerificationMethods[keyof typeof VerificationMethods];

export const ApprovalStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  EXECUTED: 'executed',
} as const;
export type ApprovalStatus = typeof ApprovalStatuses[keyof typeof ApprovalStatuses];

export const ErrorTypes = {
  TIMEOUT: 'timeout',
  AUTH_FAILED: 'auth_failed',
  RATE_LIMIT: 'rate_limit',
  UNKNOWN: 'unknown',
} as const;
export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];
