/**
 * Internal types for the metric analyzer service.
 */

import type { MetricKey, TopDriver } from "../../../shared/types/metricExplanation";

export interface GA4Row {
  id: number;
  siteId: string | null;
  date: string | null;
  sessions: number | null;
  users: number | null;
  events: number | null;
  conversions: number | null;
  bounceRate: number | null;
  avgSessionDuration: number | null;
  pagesPerSession: number | null;
  channel: string | null;
  landingPage: string | null;
  device: string | null;
  geo: string | null;
  rawData: unknown;
  createdAt: Date | null;
}

export interface DriverResult extends TopDriver {
  metricBefore?: number;
  metricAfter?: number;
}

export interface AnalyzerContext {
  metricKey: MetricKey;
  current: GA4Row[];
  previous: GA4Row[];
  totalCurrentValue: number;
  totalPreviousValue: number;
  totalChange: number;
}

// Helper to extract metric value from a GA4 row based on the metric key
export function getMetricValue(row: GA4Row, metricKey: MetricKey): number {
  switch (metricKey) {
    case "activeUsers":
      return row.users ?? 0;
    case "eventCount":
      return row.events ?? 0;
    case "newUsers":
      // GA4 doesn't separate new users in daily data; approximate with users
      return row.users ?? 0;
    case "avgTimeToLeadSubmit":
      // This metric is not from GA4 data, it's computed from leads
      return 0;
  }
}
