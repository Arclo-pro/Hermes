/**
 * Metric Analyzer Service
 *
 * Analyzes GA4 metrics to generate "What Changed?" explanations.
 * Uses dimensional analysis to identify top drivers of metric changes.
 */

import { db } from "../../db";
import { ga4Daily } from "../../../shared/schema";
import { eq, gte, and, desc } from "drizzle-orm";
import type {
  MetricKey,
  MetricExplanation,
  MetricExplanationsResponse,
  ExplanationStatus,
  MetricDelta,
  MetricEvidence,
} from "../../../shared/types/metricExplanation";
import type { GA4Row, DriverResult } from "./types";
import { getMetricValue } from "./types";
import { analyzeChannel } from "./drivers/channelDriver";
import { analyzeDevice } from "./drivers/deviceDriver";
import { analyzeGeo } from "./drivers/geoDriver";
import { analyzePage } from "./drivers/pageDriver";
import { generateSummary } from "./utils/summarizer";
import { calculateConfidence } from "./utils/confidence";
import { generateRecommendations } from "./utils/recommendations";

const METRIC_KEYS: MetricKey[] = ["activeUsers", "eventCount", "newUsers", "avgTimeToLeadSubmit"];

// Helper: get date string N days ago
function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split("T")[0];
}

// Helper: determine status based on percent change
function determineStatus(percentChange: number): ExplanationStatus {
  if (Math.abs(percentChange) < 5) {
    return "stable";
  }
  return percentChange > 0 ? "improving" : "needs_attention";
}

// Helper: calculate metric totals for a period
function calculateTotal(data: GA4Row[], metricKey: MetricKey): number {
  let total = 0;
  for (const row of data) {
    total += getMetricValue(row, metricKey);
  }
  return total;
}

// Helper: create a no-data explanation
function noDataExplanation(metricKey: MetricKey): MetricExplanation {
  return {
    metricKey,
    status: "no_data",
    delta: { absolute: 0, percent: 0, timeWindow: "7 days" },
    summary: "No data available. Connect Google Analytics to see insights.",
    topDrivers: [],
    evidence: { topPagesByImpact: [] },
    recommendations: [
      {
        title: "Connect Google Analytics",
        why: "You need GA4 data to analyze this metric and receive actionable insights.",
        targetUrls: [],
        suggestedActions: ["Go to Settings > Integrations > Connect Google Analytics"],
      },
    ],
    confidence: "low",
    lastUpdated: new Date().toISOString(),
  };
}

// Helper: create an error explanation
function errorExplanation(metricKey: MetricKey, errorMessage: string): MetricExplanation {
  return {
    metricKey,
    status: "error",
    delta: { absolute: 0, percent: 0, timeWindow: "7 days" },
    summary: "Unable to analyze this metric due to an error.",
    topDrivers: [],
    evidence: { topPagesByImpact: [] },
    recommendations: [],
    confidence: "low",
    lastUpdated: new Date().toISOString(),
    error: errorMessage,
  };
}

/**
 * Analyze a single metric and return a full explanation.
 */
export async function analyzeMetric(
  siteId: string,
  metricKey: MetricKey
): Promise<MetricExplanation> {
  try {
    const fourteenDaysAgo = daysAgo(14);
    const sevenDaysAgo = daysAgo(7);

    // Fetch GA4 data for the last 14 days
    const ga4Data = await db
      .select()
      .from(ga4Daily)
      .where(
        and(
          eq(ga4Daily.siteId, siteId),
          gte(ga4Daily.date, fourteenDaysAgo)
        )
      )
      .orderBy(desc(ga4Daily.date));

    if (ga4Data.length === 0) {
      return noDataExplanation(metricKey);
    }

    // Split into current (last 7 days) and previous (7-14 days ago)
    const current = ga4Data.filter(d => d.date && d.date >= sevenDaysAgo);
    const previous = ga4Data.filter(d => d.date && d.date < sevenDaysAgo);

    if (current.length === 0) {
      return noDataExplanation(metricKey);
    }

    // Calculate totals
    const totalCurrent = calculateTotal(current, metricKey);
    const totalPrevious = calculateTotal(previous, metricKey);
    const totalChange = totalCurrent - totalPrevious;

    // Calculate delta
    const percentChange = totalPrevious !== 0
      ? ((totalChange) / Math.abs(totalPrevious)) * 100
      : (totalCurrent > 0 ? 100 : 0);

    const delta: MetricDelta = {
      absolute: Math.round(totalChange),
      percent: Math.round(percentChange * 10) / 10,
      timeWindow: "7 days",
    };

    // Determine status
    const status = determineStatus(percentChange);

    // Run all driver analyses
    const channelDrivers = analyzeChannel(current, previous, metricKey, totalChange);
    const deviceDrivers = analyzeDevice(current, previous, metricKey, totalChange);
    const geoDrivers = analyzeGeo(current, previous, metricKey, totalChange);
    const pageDrivers = analyzePage(current, previous, metricKey, totalChange);

    // Merge and rank all drivers
    const allDrivers: DriverResult[] = [
      ...channelDrivers,
      ...deviceDrivers,
      ...geoDrivers,
      ...pageDrivers.slice(0, 3), // Limit page drivers in top drivers
    ];

    const topDrivers = allDrivers
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    // Build evidence
    const evidence: MetricEvidence = {
      topPagesByImpact: pageDrivers.slice(0, 10).map(p => ({
        url: p.label,
        metricBefore: p.metricBefore || 0,
        metricAfter: p.metricAfter || 0,
        delta: p.delta || 0,
        contribution: p.contribution,
      })),
      topSourcesByImpact: channelDrivers.slice(0, 5).map(c => ({
        source: c.label,
        delta: c.delta || 0,
        contribution: c.contribution,
      })),
    };

    // Generate natural language summary
    const summary = generateSummary(metricKey, status, delta, topDrivers);

    // Calculate confidence
    const confidence = calculateConfidence({
      currentDataPoints: current.length,
      previousDataPoints: previous.length,
      topDrivers,
      totalChange: percentChange,
    });

    // Generate recommendations
    const recommendations = generateRecommendations({
      metricKey,
      status,
      topDrivers,
      pageDrivers,
    });

    return {
      metricKey,
      status,
      delta,
      summary,
      topDrivers,
      evidence,
      recommendations,
      confidence,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[MetricAnalyzer] Error analyzing ${metricKey}:`, error);
    return errorExplanation(
      metricKey,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Analyze all metrics and return a batch response for the dashboard.
 */
export async function analyzeAllMetrics(
  siteId: string
): Promise<MetricExplanationsResponse> {
  // Run all analyses in parallel
  const [activeUsers, eventCount, newUsers, avgTimeToLeadSubmit] = await Promise.all([
    analyzeMetric(siteId, "activeUsers"),
    analyzeMetric(siteId, "eventCount"),
    analyzeMetric(siteId, "newUsers"),
    analyzeMetric(siteId, "avgTimeToLeadSubmit"),
  ]);

  return {
    activeUsers,
    eventCount,
    newUsers,
    avgTimeToLeadSubmit,
  };
}
