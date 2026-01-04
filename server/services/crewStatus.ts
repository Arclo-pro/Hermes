import { storage } from "../storage";
import { db } from "../db";
import { CREW, type CrewId } from "@shared/registry";
import { 
  mergeAnomalies, 
  computePopularScore, 
  type CanonicalIssue 
} from "@shared/canonicalIssues";
import { getMissionsForCrew, MISSION_REGISTRY } from "@shared/missions/missionRegistry";

export type CrewTier = "looking_good" | "doing_okay" | "needs_attention";
export type CrewStatusValue = "looking_good" | "doing_okay" | "needs_attention";

export interface MissionsData {
  total: number;
  completed: number;
  pending: number;
  highPriority: number;
  autoFixable: number;
}

export interface PrimaryMetricData {
  label: string;
  value: number | null;
  unit: string;
  deltaPercent: number | null;
  deltaLabel: string;
}

export interface ReadinessData {
  isReady: boolean;
  missingDependencies: string[];
  setupHint: string | null;
}

export interface CrewStatus {
  crewId: string;
  siteId: string;
  score: number;
  status: CrewStatusValue;
  tier: CrewTier;
  missions: MissionsData;
  primaryMetric: PrimaryMetricData;
  readiness: ReadinessData;
  updatedAt: string;
}

export interface ComputeCrewStatusOptions {
  siteId: string;
  crewId: string;
  timeWindowDays?: number;
}

async function computePopularCrewScore(siteId: string, timeWindowDays: number): Promise<{
  score: number;
  issues: CanonicalIssue[];
}> {
  const recentAnomalies = await storage.getRecentAnomalies(siteId, timeWindowDays);
  
  const rawAnomalies = recentAnomalies.map((anomaly, index) => ({
    id: `anomaly_${anomaly.id || index}`,
    date: anomaly.startDate || anomaly.endDate || new Date().toISOString().slice(0, 10),
    source: anomaly.anomalyType?.includes("gsc") ? "GSC" : "GA4",
    metric: anomaly.metric || "sessions",
    metricFamily: anomaly.anomalyType?.includes("traffic") ? "organic_traffic" : 
                  anomaly.anomalyType?.includes("click") ? "search_clicks" : "organic_traffic",
    dropPercent: anomaly.deltaPct || 0,
    currentValue: anomaly.observedValue || 0,
    baselineValue: anomaly.baselineValue || 0,
    zScore: anomaly.zScore || 0,
    severity: Math.abs(anomaly.zScore || 0) >= 3 ? "severe" as const : 
              Math.abs(anomaly.zScore || 0) >= 2 ? "moderate" as const : "mild" as const,
  }));
  
  const site = await storage.getSiteById(siteId);
  const domain = site?.baseUrl || "unknown";
  
  const canonicalIssues = mergeAnomalies(rawAnomalies, domain, 3);
  const score = canonicalIssues.length === 0 ? 100 : computePopularScore(canonicalIssues);
  
  return { score, issues: canonicalIssues };
}

async function computeLookoutCrewScore(): Promise<{
  score: number;
  totalKeywords: number;
  inTop10: number;
}> {
  const [keywords, rankings] = await Promise.all([
    storage.getSerpKeywords(true),
    storage.getLatestRankings(),
  ]);
  
  const totalKeywords = keywords.length;
  if (totalKeywords === 0) {
    return { score: 0, totalKeywords: 0, inTop10: 0 };
  }
  
  const inTop10 = rankings.filter(r => r.position !== null && r.position <= 10).length;
  const coverageRatio = inTop10 / totalKeywords;
  const score = Math.round(coverageRatio * 100);
  
  return { score, totalKeywords, inTop10 };
}

async function computeSpeedsterCrewScore(siteId: string): Promise<{
  score: number;
  performanceScore: number | null;
}> {
  const snapshots = await storage.getAgentSnapshots("speedster", siteId, 1);
  
  if (snapshots.length === 0) {
    return { score: 50, performanceScore: null };
  }
  
  const latestSnapshot = snapshots[0];
  const metricsJson = latestSnapshot.metricsJson as Record<string, any> | null;
  
  let performanceScore: number | null = null;
  
  if (metricsJson) {
    performanceScore = 
      metricsJson["vitals.performance_score"] ??
      metricsJson.performance_score ??
      metricsJson.performanceScore ??
      null;
  }
  
  if (performanceScore !== null && typeof performanceScore === "number") {
    return { score: Math.round(performanceScore), performanceScore };
  }
  
  return { score: 50, performanceScore: null };
}

async function computeMissionsData(
  crewId: string,
  siteId: string,
  timeWindowDays: number
): Promise<{
  missions: MissionsData;
  metricValue: number;
}> {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - timeWindowDays);
  
  const allMissions = getMissionsForCrew(crewId);
  
  const twoWeekHours = timeWindowDays * 2 * 24;
  const allCompletions = await storage.getRecentMissionCompletions(siteId, "all", twoWeekHours);
  
  const crewCompletionsAll = allCompletions.filter(log => {
    const missionId = (log.details as any)?.missionId || (log.details as any)?.actionId;
    const mission = missionId ? MISSION_REGISTRY[missionId] : null;
    return mission?.crewId === crewId || (log.details as any)?.crewId === crewId;
  });
  
  const completedMissionIds = new Set(
    crewCompletionsAll.map(log => 
      (log.details as any)?.missionId || (log.details as any)?.actionId
    ).filter(Boolean)
  );
  
  const pendingMissions = allMissions.filter(m => !completedMissionIds.has(m.missionId));
  const highPriorityCount = pendingMissions.filter(m => m.impact === "high").length;
  const autoFixableCount = pendingMissions.filter(m => m.autoFixable).length;
  
  const thisWeekCompletions = crewCompletionsAll.filter(c => 
    new Date(c.createdAt) >= oneWeekAgo
  ).length;
  
  return {
    missions: {
      total: allMissions.length,
      completed: completedMissionIds.size,
      pending: pendingMissions.length,
      highPriority: highPriorityCount,
      autoFixable: autoFixableCount,
    },
    metricValue: thisWeekCompletions,
  };
}

function determineStatusFromPending(pending: number): CrewStatusValue {
  if (pending === 0) return "looking_good";
  if (pending <= 2) return "doing_okay";
  return "needs_attention";
}

function determineTierFromStatus(status: CrewStatusValue): CrewTier {
  return status;
}

export async function computeCrewStatus(
  options: ComputeCrewStatusOptions
): Promise<CrewStatus> {
  const { siteId, crewId, timeWindowDays = 7 } = options;
  
  const crewDef = CREW[crewId as CrewId];
  if (!crewDef) {
    throw new Error(`Unknown crew: ${crewId}`);
  }
  
  let score: number;
  let status: CrewStatusValue;
  let missions: MissionsData = {
    total: 0,
    completed: 0,
    pending: 0,
    highPriority: 0,
    autoFixable: 0,
  };
  let primaryMetric: PrimaryMetricData = {
    label: "Score",
    value: null,
    unit: "score",
    deltaPercent: null,
    deltaLabel: "vs last week",
  };
  let readiness: ReadinessData = {
    isReady: true,
    missingDependencies: [],
    setupHint: null,
  };
  
  const missionResult = await computeMissionsData(crewId, siteId, timeWindowDays);
  missions = missionResult.missions;
  
  score = missions.pending;
  status = determineStatusFromPending(missions.pending);
  
  primaryMetric = {
    label: "Open missions",
    value: missions.pending,
    unit: missions.pending === 1 ? "mission" : "missions",
    deltaPercent: null,
    deltaLabel: missions.pending === 0 ? "All clear" : "needs attention",
  };
  
  if (crewId === "popular") {
    const issueResult = await computePopularCrewScore(siteId, timeWindowDays);
    const activeIssues = issueResult.issues.filter(i => i.status !== "resolved");
    if (activeIssues.length > 0) {
      primaryMetric.deltaLabel = `${activeIssues.length} active issues`;
    }
    
  } else if (crewId === "lookout") {
    const result = await computeLookoutCrewScore();
    if (result.totalKeywords > 0) {
      primaryMetric.deltaLabel = `${result.inTop10} of ${result.totalKeywords} in Top 10`;
    }
    
    if (result.totalKeywords === 0) {
      readiness = {
        isReady: false,
        missingDependencies: ["serp_api"],
        setupHint: "Add keywords to track SERP rankings",
      };
    }
    
  } else if (crewId === "speedster") {
    const result = await computeSpeedsterCrewScore(siteId);
    if (result.performanceScore !== null) {
      primaryMetric.deltaLabel = `Performance: ${result.performanceScore}/100`;
    }
    
    if (result.performanceScore === null) {
      readiness = {
        isReady: false,
        missingDependencies: ["pagespeed"],
        setupHint: "Run a PageSpeed analysis to get performance metrics",
      };
    }
    
  } else {
    if (missions.total === 0 && missionResult.metricValue === 0) {
      readiness = {
        isReady: false,
        missingDependencies: crewDef.dependencies.required,
        setupHint: `Configure ${crewDef.nickname} to start tracking`,
      };
    }
  }
  
  const tier = determineTierFromStatus(status);
  
  return {
    crewId,
    siteId,
    score,
    status,
    tier,
    missions,
    primaryMetric,
    readiness,
    updatedAt: new Date().toISOString(),
  };
}

export async function computeAllCrewStatuses(
  siteId: string,
  timeWindowDays: number = 7
): Promise<CrewStatus[]> {
  const crewIds = Object.keys(CREW).filter(id => id !== "major_tom");
  
  const statuses = await Promise.all(
    crewIds.map(crewId => 
      computeCrewStatus({ siteId, crewId, timeWindowDays })
        .catch(err => {
          console.error(`Failed to compute status for crew ${crewId}:`, err);
          return {
            crewId,
            siteId,
            score: 0,
            status: "needs_attention" as CrewStatusValue,
            tier: "needs_attention" as CrewTier,
            missions: { total: 0, completed: 0, pending: 0, highPriority: 0, autoFixable: 0 },
            primaryMetric: { label: "Error", value: null, unit: "", deltaPercent: null, deltaLabel: "" },
            readiness: { isReady: false, missingDependencies: [], setupHint: "Error loading status" },
            updatedAt: new Date().toISOString(),
          } as CrewStatus;
        })
    )
  );
  
  return statuses;
}

export const CrewStatusService = {
  computeCrewStatus,
  computeAllCrewStatuses,
};
