import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import type { InsertOutcomeEventLog, Intervention } from '@shared/schema';

/**
 * Ralph Wiggum Breakage Detection
 *
 * Monitors for regressions and creates outcome events when things break.
 * This is Ralph's "I broke it!" detection system.
 */

export interface BreakageThresholds {
  // CWV regressions (absolute thresholds)
  lcpMs: number; // > 2500ms is "poor"
  clsScore: number; // > 0.25 is "poor"
  inpMs: number; // > 200ms is "poor"

  // Relative change thresholds (percentage drops)
  sessions: number; // -20% or more
  clicks: number; // -20% or more
  indexingCoverage: number; // -10% or more
  domainAuthority: number; // -5% or more

  // Error rate thresholds
  errorRate4xx: number; // > 5% is concerning
  errorRate5xx: number; // > 1% is concerning
}

export const DEFAULT_THRESHOLDS: BreakageThresholds = {
  lcpMs: 2500,
  clsScore: 0.25,
  inpMs: 200,
  sessions: -20,
  clicks: -20,
  indexingCoverage: -10,
  domainAuthority: -5,
  errorRate4xx: 5,
  errorRate5xx: 1,
};

interface MetricSnapshot {
  metricKey: string;
  value: number;
  timestamp: Date;
}

interface BreakageDetectionResult {
  breakages: InsertOutcomeEventLog[];
  improvements: InsertOutcomeEventLog[];
}

/**
 * Detects breakages by comparing current metrics against baseline
 */
export async function detectBreakages(
  siteId: string,
  currentMetrics: MetricSnapshot[],
  baselineMetrics: MetricSnapshot[],
  intervention?: Intervention,
  thresholds: BreakageThresholds = DEFAULT_THRESHOLDS
): Promise<BreakageDetectionResult> {
  const breakages: InsertOutcomeEventLog[] = [];
  const improvements: InsertOutcomeEventLog[] = [];

  for (const current of currentMetrics) {
    const baseline = baselineMetrics.find(m => m.metricKey === current.metricKey);
    if (!baseline) continue;

    const delta = current.value - baseline.value;
    const percentChange = (delta / baseline.value) * 100;

    // Detect regression based on metric type
    const regression = detectRegression(current.metricKey, current.value, baseline.value, percentChange, thresholds);
    const improvement = detectImprovement(current.metricKey, current.value, baseline.value, percentChange, thresholds);

    if (regression) {
      breakages.push({
        eventId: uuidv4(),
        siteId,
        env: 'prod', // TODO: make this configurable
        timestamp: current.timestamp,
        eventType: regression.severity === 'high' ? 'breakage' : 'regression',
        metricKey: current.metricKey,
        oldValue: baseline.value,
        newValue: current.value,
        delta,
        severity: regression.severity,
        detectionSource: 'monitor',
        window: regression.window,
        context: {
          percentChange: percentChange.toFixed(2),
          interventionId: intervention?.interventionId,
          threshold: regression.threshold,
          reason: regression.reason,
        },
      });
    }

    if (improvement) {
      improvements.push({
        eventId: uuidv4(),
        siteId,
        env: 'prod',
        timestamp: current.timestamp,
        eventType: 'improvement',
        metricKey: current.metricKey,
        oldValue: baseline.value,
        newValue: current.value,
        delta,
        severity: improvement.severity,
        detectionSource: 'monitor',
        window: improvement.window,
        context: {
          percentChange: percentChange.toFixed(2),
          interventionId: intervention?.interventionId,
          reason: improvement.reason,
        },
      });
    }
  }

  return { breakages, improvements };
}

interface RegressionResult {
  severity: 'low' | 'med' | 'high';
  threshold: number;
  window: string;
  reason: string;
}

function detectRegression(
  metricKey: string,
  currentValue: number,
  baselineValue: number,
  percentChange: number,
  thresholds: BreakageThresholds
): RegressionResult | null {
  // Core Web Vitals - absolute thresholds
  if (metricKey === 'LCP' && currentValue > thresholds.lcpMs) {
    return {
      severity: currentValue > 4000 ? 'high' : 'med',
      threshold: thresholds.lcpMs,
      window: '24h',
      reason: `LCP degraded to ${currentValue}ms (threshold: ${thresholds.lcpMs}ms)`,
    };
  }

  if (metricKey === 'CLS' && currentValue > thresholds.clsScore) {
    return {
      severity: currentValue > 0.5 ? 'high' : 'med',
      threshold: thresholds.clsScore,
      window: '24h',
      reason: `CLS degraded to ${currentValue} (threshold: ${thresholds.clsScore})`,
    };
  }

  if (metricKey === 'INP' && currentValue > thresholds.inpMs) {
    return {
      severity: currentValue > 500 ? 'high' : 'med',
      threshold: thresholds.inpMs,
      window: '24h',
      reason: `INP degraded to ${currentValue}ms (threshold: ${thresholds.inpMs}ms)`,
    };
  }

  // Traffic metrics - percentage drops
  if (metricKey === 'sessions' && percentChange <= thresholds.sessions) {
    return {
      severity: percentChange <= -40 ? 'high' : percentChange <= -30 ? 'med' : 'low',
      threshold: thresholds.sessions,
      window: '7d',
      reason: `Sessions dropped ${percentChange.toFixed(1)}% (threshold: ${thresholds.sessions}%)`,
    };
  }

  if (metricKey === 'clicks' && percentChange <= thresholds.clicks) {
    return {
      severity: percentChange <= -40 ? 'high' : percentChange <= -30 ? 'med' : 'low',
      threshold: thresholds.clicks,
      window: '7d',
      reason: `Clicks dropped ${percentChange.toFixed(1)}% (threshold: ${thresholds.clicks}%)`,
    };
  }

  // Technical SEO metrics
  if (metricKey === 'indexing_coverage' && percentChange <= thresholds.indexingCoverage) {
    return {
      severity: percentChange <= -20 ? 'high' : 'med',
      threshold: thresholds.indexingCoverage,
      window: '28d',
      reason: `Indexing coverage dropped ${percentChange.toFixed(1)}% (threshold: ${thresholds.indexingCoverage}%)`,
    };
  }

  if (metricKey === 'domain_authority' && percentChange <= thresholds.domainAuthority) {
    return {
      severity: percentChange <= -10 ? 'high' : 'med',
      threshold: thresholds.domainAuthority,
      window: '28d',
      reason: `Domain authority dropped ${percentChange.toFixed(1)}% (threshold: ${thresholds.domainAuthority}%)`,
    };
  }

  // Error rates (stored as percentages)
  if (metricKey === 'error_rate_4xx' && currentValue > thresholds.errorRate4xx) {
    return {
      severity: currentValue > 10 ? 'high' : 'med',
      threshold: thresholds.errorRate4xx,
      window: '24h',
      reason: `4xx error rate: ${currentValue.toFixed(1)}% (threshold: ${thresholds.errorRate4xx}%)`,
    };
  }

  if (metricKey === 'error_rate_5xx' && currentValue > thresholds.errorRate5xx) {
    return {
      severity: currentValue > 5 ? 'high' : 'med',
      threshold: thresholds.errorRate5xx,
      window: '24h',
      reason: `5xx error rate: ${currentValue.toFixed(1)}% (threshold: ${thresholds.errorRate5xx}%)`,
    };
  }

  return null;
}

function detectImprovement(
  metricKey: string,
  currentValue: number,
  baselineValue: number,
  percentChange: number,
  thresholds: BreakageThresholds
): RegressionResult | null {
  // Core Web Vitals - improvements (lower is better)
  if ((metricKey === 'LCP' || metricKey === 'INP') && percentChange <= -10) {
    return {
      severity: percentChange <= -30 ? 'high' : percentChange <= -20 ? 'med' : 'low',
      window: '24h',
      threshold: -10,
      reason: `${metricKey} improved ${Math.abs(percentChange).toFixed(1)}%`,
    };
  }

  if (metricKey === 'CLS' && percentChange <= -10) {
    return {
      severity: percentChange <= -30 ? 'high' : percentChange <= -20 ? 'med' : 'low',
      window: '24h',
      threshold: -10,
      reason: `CLS improved ${Math.abs(percentChange).toFixed(1)}%`,
    };
  }

  // Traffic metrics - improvements (higher is better)
  if ((metricKey === 'sessions' || metricKey === 'clicks') && percentChange >= 10) {
    return {
      severity: percentChange >= 30 ? 'high' : percentChange >= 20 ? 'med' : 'low',
      window: '7d',
      threshold: 10,
      reason: `${metricKey} improved ${percentChange.toFixed(1)}%`,
    };
  }

  // Technical SEO improvements
  if (metricKey === 'indexing_coverage' && percentChange >= 5) {
    return {
      severity: percentChange >= 15 ? 'high' : percentChange >= 10 ? 'med' : 'low',
      window: '28d',
      threshold: 5,
      reason: `Indexing coverage improved ${percentChange.toFixed(1)}%`,
    };
  }

  if (metricKey === 'domain_authority' && percentChange >= 3) {
    return {
      severity: percentChange >= 10 ? 'high' : percentChange >= 5 ? 'med' : 'low',
      window: '28d',
      threshold: 3,
      reason: `Domain authority improved ${percentChange.toFixed(1)}%`,
    };
  }

  return null;
}

/**
 * Monitor intervention outcomes
 *
 * Runs after an intervention completes and checks for breakages or improvements
 */
export async function monitorInterventionOutcomes(
  interventionId: string,
  delayHours: number = 2
): Promise<BreakageDetectionResult> {
  const intervention = await storage.getInterventionById(interventionId);
  if (!intervention) {
    throw new Error(`Intervention ${interventionId} not found`);
  }

  // Wait for the delay period
  await new Promise(resolve => setTimeout(resolve, delayHours * 60 * 60 * 1000));

  // Get metrics before and after intervention
  const startTime = new Date(intervention.startedAt.getTime() - 24 * 60 * 60 * 1000); // 24h before
  const baselineEnd = intervention.startedAt;
  const currentStart = intervention.endedAt || new Date();
  const currentEnd = new Date(currentStart.getTime() + delayHours * 60 * 60 * 1000);

  // TODO: Fetch actual metrics from GA4, GSC, CWV tables
  // For now, return empty results
  const baselineMetrics: MetricSnapshot[] = [];
  const currentMetrics: MetricSnapshot[] = [];

  const result = await detectBreakages(
    intervention.siteId,
    currentMetrics,
    baselineMetrics,
    intervention
  );

  // Save breakages and improvements to database
  for (const breakage of result.breakages) {
    await storage.createOutcomeEventLog(breakage);
  }

  for (const improvement of result.improvements) {
    await storage.createOutcomeEventLog(improvement);
  }

  return result;
}

/**
 * Run continuous monitoring for a site
 *
 * Compares current metrics against previous period
 */
export async function runContinuousMonitoring(siteId: string): Promise<BreakageDetectionResult> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // TODO: Fetch current metrics from last 24h and baseline from 24-48h ago
  const baselineMetrics: MetricSnapshot[] = [];
  const currentMetrics: MetricSnapshot[] = [];

  const result = await detectBreakages(siteId, currentMetrics, baselineMetrics);

  // Save to database
  for (const breakage of result.breakages) {
    await storage.createOutcomeEventLog(breakage);
  }

  for (const improvement of result.improvements) {
    await storage.createOutcomeEventLog(improvement);
  }

  return result;
}
