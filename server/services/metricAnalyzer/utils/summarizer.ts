/**
 * Natural language summary generator for metric explanations.
 */

import type { MetricKey, ExplanationStatus, MetricDelta, TopDriver } from "../../../../shared/types/metricExplanation";

const METRIC_NAMES: Record<MetricKey, string> = {
  activeUsers: "active users",
  eventCount: "events",
  newUsers: "new users",
  avgEngagement: "engagement time",
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDriverLabel(driver: TopDriver): string {
  const direction = driver.contribution > 0 ? "growth" : "decline";

  switch (driver.type) {
    case "channel":
      return `${direction} in ${driver.label} traffic`;
    case "device":
      return `changes in ${driver.label} users`;
    case "geo":
      return `traffic from ${driver.label}`;
    case "landing_page":
      return `your ${driver.label} page`;
    case "time_pattern":
      return driver.details || "time-based patterns";
    default:
      return driver.label;
  }
}

export function generateSummary(
  metricKey: MetricKey,
  status: ExplanationStatus,
  delta: MetricDelta,
  topDrivers: TopDriver[]
): string {
  const metricName = METRIC_NAMES[metricKey];

  if (status === "no_data") {
    return `No data available to analyze ${metricName}. Connect Google Analytics to see insights.`;
  }

  if (status === "error") {
    return `Unable to analyze ${metricName} due to a data error. Please try again later.`;
  }

  if (status === "stable") {
    return `${capitalize(metricName)} remained stable over the past ${delta.timeWindow}.`;
  }

  const direction = delta.percent > 0 ? "increased" : "decreased";
  const absPercent = Math.abs(delta.percent).toFixed(1);

  if (topDrivers.length === 0) {
    return `${capitalize(metricName)} ${direction} ${absPercent}% over the past ${delta.timeWindow}.`;
  }

  const topDriver = topDrivers[0];
  const driverLabel = formatDriverLabel(topDriver);

  return `${capitalize(metricName)} ${direction} ${absPercent}% over the past ${delta.timeWindow}, primarily driven by ${driverLabel}.`;
}

// Generate a more detailed summary for the breakdown page
export function generateDetailedSummary(
  metricKey: MetricKey,
  status: ExplanationStatus,
  delta: MetricDelta,
  topDrivers: TopDriver[]
): string {
  const metricName = METRIC_NAMES[metricKey];
  const baseSummary = generateSummary(metricKey, status, delta, topDrivers);

  if (status === "no_data" || status === "error" || topDrivers.length <= 1) {
    return baseSummary;
  }

  // Add secondary drivers
  const secondaryDrivers = topDrivers.slice(1, 3);
  if (secondaryDrivers.length === 0) {
    return baseSummary;
  }

  const secondaryLabels = secondaryDrivers.map(d => formatDriverLabel(d)).join(" and ");
  return `${baseSummary} Secondary factors include ${secondaryLabels}.`;
}
