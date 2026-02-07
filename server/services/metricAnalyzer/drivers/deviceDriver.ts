/**
 * Device dimension driver - analyzes traffic changes by device type (mobile, desktop, tablet)
 */

import type { MetricKey } from "../../../../shared/types/metricExplanation";
import type { GA4Row, DriverResult } from "../types";
import { getMetricValue } from "../types";

export function analyzeDevice(
  current: GA4Row[],
  previous: GA4Row[],
  metricKey: MetricKey,
  totalChange: number
): DriverResult[] {
  if (totalChange === 0) return [];

  const currentByDevice = groupByDevice(current, metricKey);
  const previousByDevice = groupByDevice(previous, metricKey);

  const drivers: DriverResult[] = [];
  const allDevices = new Set([
    ...Object.keys(currentByDevice),
    ...Object.keys(previousByDevice),
  ]);

  for (const device of allDevices) {
    const curr = currentByDevice[device] || 0;
    const prev = previousByDevice[device] || 0;
    const change = curr - prev;

    if (Math.abs(change) < 0.01) continue;

    const contribution = (change / totalChange) * 100;

    if (Math.abs(contribution) >= 5) {
      drivers.push({
        type: "device",
        label: formatDeviceName(device),
        contribution: Math.round(contribution * 10) / 10,
        delta: Math.round(change * 10) / 10,
        metricBefore: prev,
        metricAfter: curr,
        details: generateDeviceDetails(device, curr, prev, change),
      });
    }
  }

  return drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function groupByDevice(
  data: GA4Row[],
  metricKey: MetricKey
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of data) {
    const device = row.device || "desktop";
    const value = getMetricValue(row, metricKey);
    result[device] = (result[device] || 0) + value;
  }

  return result;
}

function formatDeviceName(device: string): string {
  const cleanName = device.trim().toLowerCase();

  const deviceMap: Record<string, string> = {
    "mobile": "Mobile",
    "desktop": "Desktop",
    "tablet": "Tablet",
    "(not set)": "Unknown",
  };

  return deviceMap[cleanName] || device;
}

function generateDeviceDetails(
  device: string,
  current: number,
  previous: number,
  change: number
): string {
  const direction = change > 0 ? "increased" : "decreased";
  const absChange = Math.abs(change);
  const percentChange = previous > 0
    ? Math.abs((change / previous) * 100).toFixed(1)
    : "N/A";

  return `${formatDeviceName(device)} ${direction} by ${absChange.toLocaleString()} (${percentChange}%)`;
}
