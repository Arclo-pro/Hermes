import { storage } from "../storage";
import { CREW_KPI_CONTRACTS } from "@shared/crew/kpiSchemas";
import { 
  type CrewKpiSnapshot, 
  createSampleSnapshot, 
  createRealSnapshot 
} from "@shared/crew/kpiSnapshot";
import { CrewStatusService } from "./crewStatus";
import { logger } from "../utils/logger";

export async function getCrewKpiSnapshot(
  siteId: string,
  crewId: string
): Promise<CrewKpiSnapshot> {
  const contract = CREW_KPI_CONTRACTS[crewId];
  if (!contract) {
    logger.warn("CrewKpiSnapshot", `No contract for crew: ${crewId}`);
    return createSampleSnapshot(crewId);
  }

  try {
    const kpis = await storage.getLatestCrewKpis(siteId, crewId);
    
    const primaryKpi = kpis.find(k => k.metricKey === contract.primaryKpi);
    
    if (primaryKpi && primaryKpi.value !== null) {
      return createRealSnapshot(
        crewId,
        primaryKpi.value,
        primaryKpi.measuredAt?.toISOString() ?? null,
        "lineage"
      );
    }

    const cachedStatus = await (CrewStatusService as any).getCrewStatus?.(siteId, crewId) ?? await CrewStatusService.computeCrewStatus({ siteId, crewId });
    if (cachedStatus?.score?.value !== null && cachedStatus?.score?.value !== undefined) {
      return createRealSnapshot(
        crewId,
        cachedStatus.score.value,
        cachedStatus.score.updatedAt,
        "legacy"
      );
    }

    return createSampleSnapshot(crewId);
  } catch (error) {
    logger.error("CrewKpiSnapshot", `Failed to get snapshot for ${crewId}`, { 
      error: (error as Error).message 
    });
    return createSampleSnapshot(crewId);
  }
}

export async function getAllCrewKpiSnapshots(
  siteId: string,
  crewIds: string[]
): Promise<Record<string, CrewKpiSnapshot>> {
  const snapshots = await Promise.all(
    crewIds.map(async crewId => ({
      crewId,
      snapshot: await getCrewKpiSnapshot(siteId, crewId),
    }))
  );

  return Object.fromEntries(
    snapshots.map(({ crewId, snapshot }) => [crewId, snapshot])
  );
}

export async function getScottySnapshot(siteId: string): Promise<{
  snapshot: CrewKpiSnapshot;
  health: {
    crawledUrls: number;
    healthyUrls: number;
    crawlHealthPercent: number;
    indexedUrls: number;
    indexCoveragePercent: number;
    criticalIssues: number;
    lastCrawlAt: string | null;
    isConfigured: boolean;
  };
}> {
  const snapshot = await getCrewKpiSnapshot(siteId, "scotty");
  
  const kpis = await storage.getLatestCrewKpis(siteId, "scotty");
  
  const crawlHealthPct = kpis.find(k => k.metricKey === "crawlHealthPct")?.value ?? null;
  const indexCoverage = kpis.find(k => k.metricKey === "indexCoverage")?.value ?? null;
  const techErrors = kpis.find(k => k.metricKey === "tech.errors")?.value ?? 0;
  const pagesCrawled = kpis.find(k => k.metricKey === "tech.pages_crawled")?.value ?? 0;
  
  const latestRun = await storage.getLatestCrewRun(siteId, "scotty");
  
  const hasRealData = crawlHealthPct !== null;
  
  const health = {
    crawledUrls: Number(pagesCrawled) || 0,
    healthyUrls: hasRealData ? Math.round((Number(crawlHealthPct) / 100) * Number(pagesCrawled)) : 0,
    crawlHealthPercent: hasRealData ? Number(crawlHealthPct) : 0,
    indexedUrls: hasRealData ? Math.round((Number(indexCoverage ?? 85) / 100) * Number(pagesCrawled)) : 0,
    indexCoveragePercent: hasRealData ? Number(indexCoverage ?? 85) : 0,
    criticalIssues: Number(techErrors) || 0,
    lastCrawlAt: latestRun?.completedAt?.toISOString() ?? null,
    isConfigured: hasRealData,
  };

  return { snapshot, health };
}
