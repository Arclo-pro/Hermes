/**
 * Channel dimension driver - analyzes traffic changes by channel (Organic, Direct, Referral, etc.)
 */

import type { MetricKey } from "../../../../shared/types/metricExplanation";
import type { GA4Row, DriverResult } from "../types";
import { getMetricValue } from "../types";

export function analyzeChannel(
  current: GA4Row[],
  previous: GA4Row[],
  metricKey: MetricKey,
  totalChange: number
): DriverResult[] {
  if (totalChange === 0) return [];

  // Group by channel
  const currentByChannel = groupByChannel(current, metricKey);
  const previousByChannel = groupByChannel(previous, metricKey);

  const drivers: DriverResult[] = [];
  const allChannels = new Set([
    ...Object.keys(currentByChannel),
    ...Object.keys(previousByChannel),
  ]);

  for (const channel of allChannels) {
    const curr = currentByChannel[channel] || 0;
    const prev = previousByChannel[channel] || 0;
    const change = curr - prev;

    // Skip if no meaningful change
    if (Math.abs(change) < 0.01) continue;

    const contribution = (change / totalChange) * 100;

    // Only include significant contributors (>= 5% of change)
    if (Math.abs(contribution) >= 5) {
      drivers.push({
        type: "channel",
        label: formatChannelName(channel),
        contribution: Math.round(contribution * 10) / 10,
        delta: Math.round(change * 10) / 10,
        metricBefore: prev,
        metricAfter: curr,
        details: generateChannelDetails(channel, curr, prev, change),
      });
    }
  }

  return drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function groupByChannel(
  data: GA4Row[],
  metricKey: MetricKey
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of data) {
    const channel = row.channel || "Direct";
    const value = getMetricValue(row, metricKey);
    result[channel] = (result[channel] || 0) + value;
  }

  return result;
}

function formatChannelName(channel: string): string {
  // Clean up common channel names
  const cleanName = channel.trim();

  // Map common variations to standard names
  const channelMap: Record<string, string> = {
    "organic search": "Organic Search",
    "organic": "Organic Search",
    "direct": "Direct",
    "referral": "Referral",
    "social": "Social",
    "email": "Email",
    "paid search": "Paid Search",
    "paid social": "Paid Social",
    "display": "Display",
    "affiliates": "Affiliates",
    "(none)": "Direct",
    "(not set)": "Other",
  };

  const lowerName = cleanName.toLowerCase();
  return channelMap[lowerName] || cleanName;
}

function generateChannelDetails(
  channel: string,
  current: number,
  previous: number,
  change: number
): string {
  const direction = change > 0 ? "increased" : "decreased";
  const absChange = Math.abs(change);
  const percentChange = previous > 0
    ? Math.abs((change / previous) * 100).toFixed(1)
    : "N/A";

  return `${formatChannelName(channel)} ${direction} by ${absChange.toLocaleString()} (${percentChange}%)`;
}
