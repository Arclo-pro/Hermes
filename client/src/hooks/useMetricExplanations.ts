/**
 * Hooks for fetching metric explanations ("What Changed?" feature)
 */

import { useQuery } from "@tanstack/react-query";
import type {
  MetricKey,
  MetricExplanation,
  MetricExplanationsResponse,
} from "../../../shared/types/metricExplanation";

// Safe JSON fetch following the pattern from useOpsDashboard.ts
async function fetchMetricExplanations(
  siteId: string
): Promise<MetricExplanationsResponse> {
  const res = await fetch(
    `/api/ops-dashboard/${encodeURIComponent(siteId)}/metric-explanations`,
    { credentials: "include" }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  if (!text) {
    throw new Error("Empty response from server");
  }
  try {
    return JSON.parse(text) as MetricExplanationsResponse;
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }
}

async function fetchMetricExplanation(
  siteId: string,
  metricKey: MetricKey
): Promise<MetricExplanation> {
  const res = await fetch(
    `/api/ops-dashboard/${encodeURIComponent(siteId)}/metric-explanation/${metricKey}`,
    { credentials: "include" }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  if (!text) {
    throw new Error("Empty response from server");
  }
  try {
    return JSON.parse(text) as MetricExplanation;
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }
}

/**
 * Hook to fetch explanations for all 4 KPIs (batch request for dashboard)
 */
export function useMetricExplanations(siteId: string | null | undefined) {
  return useQuery<MetricExplanationsResponse>({
    queryKey: ["/api/ops-dashboard", siteId, "metric-explanations"],
    queryFn: () => fetchMetricExplanations(siteId!),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch a single metric explanation (for breakdown page)
 */
export function useMetricExplanation(
  siteId: string | null | undefined,
  metricKey: MetricKey | null | undefined
) {
  return useQuery<MetricExplanation>({
    queryKey: ["/api/ops-dashboard", siteId, "metric-explanation", metricKey],
    queryFn: () => fetchMetricExplanation(siteId!, metricKey!),
    enabled: !!siteId && !!metricKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
