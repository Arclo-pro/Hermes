import { z } from "zod";
import { ProvenanceSchema, type Provenance } from "../types/provenance";
import { CREW_KPI_CONTRACTS, type CrewKpiContract } from "./kpiSchemas";

export const HealthStatusSchema = z.enum(["live", "stale", "not_configured", "error", "sample"]);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const CrewKpiSnapshotSchema = z.object({
  crewId: z.string(),
  primaryMetric: z.object({
    key: z.string(),
    label: z.string(),
    value: z.union([z.number(), z.string()]).nullable(),
    unit: z.string().optional(),
    trend: z.enum(["up", "down", "stable", "none"]).optional(),
    status: z.enum(["good", "watch", "bad", "unknown"]).optional(),
    isSample: z.boolean(),
    provenance: ProvenanceSchema,
    sampleValue: z.string(),
  }),
  lastUpdated: z.string().nullable(),
  dataSource: z.enum(["lineage", "legacy", "mock", "none"]),
  health: HealthStatusSchema.optional(),
  healthReason: z.string().optional(),
  lastRunStatus: z.enum(["success", "failed", "never"]).optional(),
});

export type CrewKpiSnapshot = z.infer<typeof CrewKpiSnapshotSchema>;

export function computeHealthStatus(
  isSample: boolean,
  lastUpdatedAt: string | null,
  lastRunStatus: "success" | "failed" | "never" | undefined,
  needsConfig: boolean
): { health: HealthStatus; healthReason: string } {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  // Priority 1: Check for errors (failed runs override everything)
  if (lastRunStatus === "failed") {
    return { health: "error", healthReason: "Last run failed" };
  }

  // Priority 2: Check if configuration is needed (no runs ever + needs setup)
  if (needsConfig) {
    return { health: "not_configured", healthReason: "Setup required" };
  }

  // Priority 3: If sample data (no real data yet, but configured)
  if (isSample) {
    // If never ran, show not_configured instead of sample
    if (lastRunStatus === "never" && !lastUpdatedAt) {
      return { health: "not_configured", healthReason: "Run first scan" };
    }
    return { health: "sample", healthReason: "Using sample data" };
  }

  // Priority 4: No data timestamp available
  if (!lastUpdatedAt) {
    return { health: "not_configured", healthReason: "No data yet" };
  }

  // Priority 5: Determine freshness based on timestamp
  const lastUpdated = new Date(lastUpdatedAt).getTime();
  const now = Date.now();
  const age = now - lastUpdated;

  if (age <= SIX_HOURS) {
    return { health: "live", healthReason: formatRelativeTime(lastUpdatedAt) };
  }

  if (age <= SEVEN_DAYS) {
    return { health: "stale", healthReason: formatRelativeTime(lastUpdatedAt) };
  }

  return { health: "stale", healthReason: formatRelativeTime(lastUpdatedAt) };
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Updated just now";
  if (diffMins < 60) return `Updated ${diffMins}m ago`;
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${diffDays}d ago`;
}

export function createSampleSnapshot(crewId: string): CrewKpiSnapshot {
  const contract = CREW_KPI_CONTRACTS[crewId];
  if (!contract) {
    return {
      crewId,
      primaryMetric: {
        key: "unknown",
        label: "Unknown",
        value: null,
        isSample: true,
        provenance: "unknown",
        sampleValue: "—",
      },
      lastUpdated: null,
      dataSource: "none",
    };
  }

  return {
    crewId,
    primaryMetric: {
      key: contract.primaryKpi,
      label: contract.label,
      value: null,
      unit: contract.unit,
      isSample: true,
      provenance: "sample",
      sampleValue: contract.sampleValue,
    },
    lastUpdated: null,
    dataSource: "none",
  };
}

export function createRealSnapshot(
  crewId: string,
  value: number | string,
  lastUpdated: string | null,
  dataSource: "lineage" | "legacy" = "lineage"
): CrewKpiSnapshot {
  const contract = CREW_KPI_CONTRACTS[crewId];
  if (!contract) {
    return createSampleSnapshot(crewId);
  }

  return {
    crewId,
    primaryMetric: {
      key: contract.primaryKpi,
      label: contract.label,
      value,
      unit: contract.unit,
      isSample: false,
      provenance: "real",
      sampleValue: contract.sampleValue,
    },
    lastUpdated,
    dataSource,
  };
}

export function getDisplayValue(snapshot: CrewKpiSnapshot): string {
  if (snapshot.primaryMetric.value !== null) {
    return String(snapshot.primaryMetric.value);
  }
  return snapshot.primaryMetric.sampleValue;
}
