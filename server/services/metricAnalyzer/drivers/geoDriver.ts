/**
 * Geography dimension driver - analyzes traffic changes by geographic region
 */

import type { MetricKey } from "../../../../shared/types/metricExplanation";
import type { GA4Row, DriverResult } from "../types";
import { getMetricValue } from "../types";

export function analyzeGeo(
  current: GA4Row[],
  previous: GA4Row[],
  metricKey: MetricKey,
  totalChange: number
): DriverResult[] {
  if (totalChange === 0) return [];

  const currentByGeo = groupByGeo(current, metricKey);
  const previousByGeo = groupByGeo(previous, metricKey);

  const drivers: DriverResult[] = [];
  const allGeos = new Set([
    ...Object.keys(currentByGeo),
    ...Object.keys(previousByGeo),
  ]);

  for (const geo of allGeos) {
    const curr = currentByGeo[geo] || 0;
    const prev = previousByGeo[geo] || 0;
    const change = curr - prev;

    if (Math.abs(change) < 0.01) continue;

    const contribution = (change / totalChange) * 100;

    // Only include significant contributors (>= 5% of change)
    if (Math.abs(contribution) >= 5) {
      drivers.push({
        type: "geo",
        label: formatGeoName(geo),
        contribution: Math.round(contribution * 10) / 10,
        delta: Math.round(change * 10) / 10,
        metricBefore: prev,
        metricAfter: curr,
        details: generateGeoDetails(geo, curr, prev, change),
      });
    }
  }

  return drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function groupByGeo(
  data: GA4Row[],
  metricKey: MetricKey
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of data) {
    const geo = row.geo || "Unknown";
    const value = getMetricValue(row, metricKey);
    result[geo] = (result[geo] || 0) + value;
  }

  return result;
}

function formatGeoName(geo: string): string {
  const cleanName = geo.trim();

  // Handle common geo values
  if (cleanName === "(not set)" || cleanName === "") {
    return "Unknown Region";
  }

  return cleanName;
}

function generateGeoDetails(
  geo: string,
  current: number,
  previous: number,
  change: number
): string {
  const direction = change > 0 ? "increased" : "decreased";
  const absChange = Math.abs(change);
  const percentChange = previous > 0
    ? Math.abs((change / previous) * 100).toFixed(1)
    : "N/A";

  return `Traffic from ${formatGeoName(geo)} ${direction} by ${absChange.toLocaleString()} (${percentChange}%)`;
}
