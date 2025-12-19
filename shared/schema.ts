import { pgTable, text, serial, timestamp, jsonb, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// OAuth Tokens Storage
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // 'google_ads', 'ga4', 'gsc'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOAuthTokenSchema = createInsertSchema(oauthTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOAuthToken = z.infer<typeof insertOAuthTokenSchema>;
export type OAuthToken = typeof oauthTokens.$inferSelect;

// GA4 Daily Snapshots
export const ga4Daily = pgTable("ga4_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  sessions: integer("sessions").notNull(),
  users: integer("users").notNull(),
  events: integer("events").notNull(),
  conversions: integer("conversions").notNull(),
  channel: text("channel"),
  landingPage: text("landing_page"),
  device: text("device"),
  geo: text("geo"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGA4DailySchema = createInsertSchema(ga4Daily).omit({
  id: true,
  createdAt: true,
});
export type InsertGA4Daily = z.infer<typeof insertGA4DailySchema>;
export type GA4Daily = typeof ga4Daily.$inferSelect;

// Google Search Console Daily Snapshots
export const gscDaily = pgTable("gsc_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  clicks: integer("clicks").notNull(),
  impressions: integer("impressions").notNull(),
  ctr: real("ctr").notNull(),
  position: real("position").notNull(),
  query: text("query"),
  page: text("page"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGSCDailySchema = createInsertSchema(gscDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertGSCDaily = z.infer<typeof insertGSCDailySchema>;
export type GSCDaily = typeof gscDaily.$inferSelect;

// Google Ads Daily Snapshots
export const adsDaily = pgTable("ads_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  spend: real("spend").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  cpc: real("cpc").notNull(),
  campaignId: text("campaign_id"),
  campaignName: text("campaign_name"),
  campaignStatus: text("campaign_status"),
  disapprovals: integer("disapprovals").default(0),
  policyIssues: jsonb("policy_issues"),
  searchTerms: jsonb("search_terms"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdsDailySchema = createInsertSchema(adsDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertAdsDaily = z.infer<typeof insertAdsDailySchema>;
export type AdsDaily = typeof adsDaily.$inferSelect;

// Website Health Checks Daily
export const webChecksDaily = pgTable("web_checks_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  url: text("url").notNull(),
  statusCode: integer("status_code").notNull(),
  redirectUrl: text("redirect_url"),
  canonical: text("canonical"),
  metaRobots: text("meta_robots"),
  hasContent: boolean("has_content").notNull(),
  errorMessage: text("error_message"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebChecksDailySchema = createInsertSchema(webChecksDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertWebChecksDaily = z.infer<typeof insertWebChecksDailySchema>;
export type WebChecksDaily = typeof webChecksDaily.$inferSelect;

// Analysis Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  reportType: text("report_type").notNull(), // 'daily', 'on_demand'
  summary: text("summary").notNull(),
  dropDates: jsonb("drop_dates"), // Array of detected drop dates
  rootCauses: jsonb("root_causes"), // Ranked list of hypotheses
  markdownReport: text("markdown_report").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Diagnostic Tickets
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(), // e.g., "TICK-1024"
  title: text("title").notNull(),
  owner: text("owner").notNull(), // 'SEO', 'Dev', 'Ads'
  priority: text("priority").notNull(), // 'High', 'Medium', 'Low'
  status: text("status").notNull().default('Open'), // 'Open', 'In Progress', 'Resolved'
  steps: jsonb("steps").notNull(), // Array of action steps
  expectedImpact: text("expected_impact").notNull(),
  evidence: jsonb("evidence"), // Links and metrics
  reportId: integer("report_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Configuration
export const config = pgTable("config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConfigSchema = createInsertSchema(config).omit({
  id: true,
  updatedAt: true,
});
export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof config.$inferSelect;

// Diagnostic Runs History
export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  runType: text("run_type").notNull(), // 'full', 'smoke', 'scheduled'
  status: text("status").notNull(), // 'running', 'completed', 'failed'
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  summary: text("summary"),
  anomaliesDetected: integer("anomalies_detected").default(0),
  reportId: integer("report_id"),
  ticketCount: integer("ticket_count").default(0),
  errors: jsonb("errors"),
  sourceStatuses: jsonb("source_statuses"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRunSchema = createInsertSchema(runs).omit({
  id: true,
  createdAt: true,
});
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Run = typeof runs.$inferSelect;
