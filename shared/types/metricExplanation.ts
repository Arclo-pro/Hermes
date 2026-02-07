/**
 * Metric Explanation Types
 *
 * Types for the "What Changed?" KPI micro-cards and Metric Breakdown pages.
 * Used by both frontend and backend.
 */

export type MetricKey = "activeUsers" | "eventCount" | "newUsers" | "avgEngagement";

export type ExplanationStatus =
  | "improving"
  | "stable"
  | "needs_attention"
  | "no_data"
  | "error";

export type ConfidenceLevel = "low" | "med" | "high";

export type DriverType = "channel" | "device" | "geo" | "landing_page" | "time_pattern";

export interface MetricDelta {
  absolute: number;
  percent: number;
  timeWindow: string; // e.g., "7 days"
}

export interface TopDriver {
  type: DriverType;
  label: string;
  contribution: number; // percentage of total change attributed to this driver
  delta?: number; // raw change value
  details?: string;
}

export interface PageImpact {
  url: string;
  metricBefore: number;
  metricAfter: number;
  delta: number;
  contribution: number; // percentage contribution to total change
}

export interface SourceImpact {
  source: string;
  delta: number;
  contribution: number;
}

export interface MetricEvidence {
  topPagesByImpact: PageImpact[];
  topSourcesByImpact?: SourceImpact[];
}

export interface Recommendation {
  title: string;
  why: string;
  targetUrls: string[];
  suggestedActions: string[];
}

export interface MetricExplanation {
  metricKey: MetricKey;
  status: ExplanationStatus;
  delta: MetricDelta;
  summary: string; // 1 sentence plain English explanation
  topDrivers: TopDriver[];
  evidence: MetricEvidence;
  recommendations: Recommendation[];
  confidence: ConfidenceLevel;
  lastUpdated: string; // ISO timestamp
  error?: string;
}

// Batch response for dashboard (all 4 metrics at once)
export interface MetricExplanationsResponse {
  activeUsers: MetricExplanation;
  eventCount: MetricExplanation;
  newUsers: MetricExplanation;
  avgEngagement: MetricExplanation;
}

// Metric definitions for the breakdown page "What it means" section
export const METRIC_DEFINITIONS: Record<MetricKey, { title: string; definition: string }> = {
  activeUsers: {
    title: "Active Users",
    definition: "The number of unique users who initiated sessions on your site during the selected time period. This metric helps you understand your audience reach and engagement.",
  },
  eventCount: {
    title: "Event Count",
    definition: "The total number of events triggered on your site, including page views, clicks, form submissions, and custom events. Higher event counts typically indicate more engaged users.",
  },
  newUsers: {
    title: "New Users",
    definition: "Users who visited your site for the first time during the selected period. This metric indicates how well your marketing and SEO efforts are attracting fresh audiences.",
  },
  avgEngagement: {
    title: "Average Engagement Time",
    definition: "The average time users actively spend on your site per session. Longer engagement times suggest more valuable, relevant content that keeps visitors interested.",
  },
};
