/**
 * Landing page dimension driver - analyzes traffic changes by landing page URL
 */

import type { MetricKey } from "../../../../shared/types/metricExplanation";
import type { GA4Row, DriverResult } from "../types";
import { getMetricValue } from "../types";

export function analyzePage(
  current: GA4Row[],
  previous: GA4Row[],
  metricKey: MetricKey,
  totalChange: number
): DriverResult[] {
  if (totalChange === 0) return [];

  const currentByPage = groupByPage(current, metricKey);
  const previousByPage = groupByPage(previous, metricKey);

  const drivers: DriverResult[] = [];
  const allPages = new Set([
    ...Object.keys(currentByPage),
    ...Object.keys(previousByPage),
  ]);

  for (const page of allPages) {
    const curr = currentByPage[page] || 0;
    const prev = previousByPage[page] || 0;
    const change = curr - prev;

    if (Math.abs(change) < 0.01) continue;

    const contribution = (change / totalChange) * 100;

    // Include all pages with >= 3% contribution for evidence purposes
    if (Math.abs(contribution) >= 3) {
      drivers.push({
        type: "landing_page",
        label: formatPageUrl(page),
        contribution: Math.round(contribution * 10) / 10,
        delta: Math.round(change * 10) / 10,
        metricBefore: prev,
        metricAfter: curr,
        details: generatePageDetails(page, curr, prev, change),
      });
    }
  }

  return drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function groupByPage(
  data: GA4Row[],
  metricKey: MetricKey
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of data) {
    const page = row.landingPage || "/";
    const value = getMetricValue(row, metricKey);
    result[page] = (result[page] || 0) + value;
  }

  return result;
}

function formatPageUrl(url: string): string {
  const cleanUrl = url.trim();

  if (cleanUrl === "(not set)" || cleanUrl === "") {
    return "/";
  }

  // Remove query parameters for cleaner display
  const withoutQuery = cleanUrl.split("?")[0];

  // Truncate very long URLs
  if (withoutQuery.length > 60) {
    return withoutQuery.substring(0, 57) + "...";
  }

  return withoutQuery;
}

function generatePageDetails(
  page: string,
  current: number,
  previous: number,
  change: number
): string {
  const direction = change > 0 ? "increased" : "decreased";
  const absChange = Math.abs(change);
  const percentChange = previous > 0
    ? Math.abs((change / previous) * 100).toFixed(1)
    : "N/A";

  return `${formatPageUrl(page)} ${direction} by ${absChange.toLocaleString()} (${percentChange}%)`;
}
