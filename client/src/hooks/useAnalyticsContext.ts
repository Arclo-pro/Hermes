/**
 * useAnalyticsContext Hook
 *
 * Initializes analytics context tracking on mount and route changes.
 * Use this hook in the app root or layout component.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { initAnalyticsContext } from "@/lib/analytics-context";

/**
 * Hook to initialize and maintain analytics context tracking.
 * Should be used once at the app root level.
 *
 * Handles:
 * - First-touch UTM capture on initial load
 * - Session page tracking on route changes
 * - UTM updates when new campaigns are clicked
 */
export function useAnalyticsContext(): void {
  const [location] = useLocation();

  // Initialize on mount
  useEffect(() => {
    initAnalyticsContext();
  }, []);

  // Re-track on route changes
  useEffect(() => {
    initAnalyticsContext();
  }, [location]);
}

/**
 * Re-export utilities for convenience
 */
export { getLeadContext, buildLeadPayload } from "@/lib/analytics-context";
export type { LeadContext, LeadPayloadV2 } from "@/lib/analytics-context";
