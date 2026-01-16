import { z } from "zod";
import { ProvenanceSchema, type Provenance } from "../types/provenance";
import { CREW_KPI_CONTRACTS, type CrewKpiContract } from "./kpiSchemas";

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
});

export type CrewKpiSnapshot = z.infer<typeof CrewKpiSnapshotSchema>;

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
