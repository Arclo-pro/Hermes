import { useQuery } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface MetricValue {
  value: number | null;
  change7d: number | null;
  available: boolean;
  reason?: string;
}

export interface MetricsData {
  ga4Connected: boolean;
  gscConnected: boolean;
  metrics: {
    activeUsers: MetricValue;
    eventCount: MetricValue;
    newUsers: MetricValue;
    avgEngagement: MetricValue;
  };
}

export interface SerpSnapshotData {
  hasBaseline: boolean;
  totalTracked: number;
  rankingCounts: {
    position1: number;
    top3: number;
    top10: number;
    top100: number;
    notRanking?: number;
    // Exclusive counts (non-overlapping buckets)
    positions2to3?: number;
    positions4to10?: number;
    positions11to100?: number;
  };
  weekOverWeek: {
    netChange: number;
    gained: number;
    lost: number;
    improved: number;
    declined: number;
  };
  lastChecked: string | null;
}

export interface KeywordHistoryPoint {
  date: string;
  position: number | null;
}

export type KeywordIntent = "informational" | "transactional" | "navigational" | "commercial" | "local" | null;

export interface SerpKeywordEntry {
  id: number;
  keyword: string;
  intent: KeywordIntent;
  priority: number | null;
  volume: number | null;
  currentPosition: number | null;
  change7d: number | null;
  change30d: number | null;
  change90d: number | null;
  direction: "up" | "down" | "stable" | "new";
  history: KeywordHistoryPoint[];
}

export interface SerpKeywordsData {
  keywords: SerpKeywordEntry[];
  hasData: boolean;
}

export interface ContentDraftEntry {
  draftId: string;
  title: string | null;
  contentType: string;
  state: string;
  targetUrl: string | null;
  targetKeywords: string[] | null;
  qaScore: number | null;
  createdAt: string;
  updatedAt: string;
  autoPublishDate: string | null;
  scheduledForAutoPublish: boolean;
}

export interface ContentStatusData {
  upcoming: ContentDraftEntry[];
  recentlyPublished: ContentDraftEntry[];
  contentUpdates: ContentDraftEntry[];
  hasContent: boolean;
  autoPublishEnabled: boolean;
  nextAutoPublish: string | null;
}

export interface ChangeLogEntry {
  id: string;
  what: string;
  why: string;
  when: string;
  severity: "silent" | "notify" | "ask";
  outcome: string;
  category: string;
  source: "audit" | "proposal";
}

export interface ChangesLogData {
  entries: ChangeLogEntry[];
  hasHistory: boolean;
}

export interface SystemCapability {
  category: string;
  trustLevel: number;
  label: string;
  trustLabel: string;
  confidence: number | null;
}

export interface LockedCapability {
  category: string;
  label: string;
  reason: string;
}

export interface PendingApproval {
  proposalId: string;
  title: string;
  riskLevel: string;
  createdAt: string;
}

export interface SystemStateData {
  plan: string;
  capabilities: {
    enabled: SystemCapability[];
    locked: LockedCapability[];
  };
  pendingApprovals: PendingApproval[];
  policies: {
    canAutoFixTechnical: boolean;
    canAutoPublishContent: boolean;
    canAutoUpdateContent: boolean;
    canAutoOptimizeImages: boolean;
    canAutoUpdateCode: boolean;
  } | null;
}

export type TipCategory = "rankings" | "traffic" | "content" | "technical" | "system" | "win";
export type TipSentiment = "positive" | "neutral" | "action";

export interface DashboardTip {
  id: string;
  title: string;
  body: string;
  category: TipCategory;
  priority: number;
  sentiment: TipSentiment;
  actionLabel?: string;
  actionRoute?: string;
}

export interface InsightsData {
  tips: DashboardTip[];
}

// Traffic Diagnosis Types
export interface DiagnosisInsight {
  id: string;
  category: "channel" | "device" | "geo" | "landing_page" | "overall";
  severity: "high" | "medium" | "low";
  title: string;
  body: string;
  metric: string;
  change: number;
}

export interface DimensionBreakdown {
  dimension: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  contributionPercent: number;
}

export interface TrafficDiagnosisData {
  ok: boolean;
  hasDrop: boolean;
  summary: {
    usersChange: number;
    sessionsChange: number;
    periodLabel: string;
  };
  insights: DiagnosisInsight[];
  breakdowns: {
    channels: DimensionBreakdown[];
    devices: DimensionBreakdown[];
    geos: DimensionBreakdown[];
    landingPages: DimensionBreakdown[];
  };
  message?: string;
}

export interface TechnicalSeoIssue {
  id: string;
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
  category: string;
  url: string;
}

export interface CoreWebVitals {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
}

export interface TechnicalSeoData {
  hasData: boolean;
  summary: {
    score: number | null;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  coreWebVitals: CoreWebVitals;
  issues: TechnicalSeoIssue[];
  lastCrawled: string | null;
}

// ============================================================
// Hooks
// ============================================================

function buildOpsDashboardUrl(siteId: string, section: string): string {
  return `/api/ops-dashboard/${encodeURIComponent(siteId)}/${encodeURIComponent(section)}`;
}

async function fetchOpsDashboard<T>(siteId: string, section: string): Promise<T> {
  const res = await fetch(buildOpsDashboardUrl(siteId, section), {
    credentials: "include",
  });

  // Always read response text first for safe parsing
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }

  // Safely parse JSON
  if (!text) {
    throw new Error("Empty response from server");
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }
}

export function useMetricCards(siteId: string | null | undefined) {
  return useQuery<MetricsData>({
    queryKey: ["/api/ops-dashboard", siteId, "metrics"],
    queryFn: () => fetchOpsDashboard<MetricsData>(siteId!, "metrics"),
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSerpSnapshot(siteId: string | null | undefined) {
  return useQuery<SerpSnapshotData>({
    queryKey: ["/api/ops-dashboard", siteId, "serp-snapshot"],
    queryFn: () => fetchOpsDashboard<SerpSnapshotData>(siteId!, "serp-snapshot"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSerpKeywords(siteId: string | null | undefined) {
  return useQuery<SerpKeywordsData>({
    queryKey: ["/api/ops-dashboard", siteId, "serp-keywords"],
    queryFn: () => fetchOpsDashboard<SerpKeywordsData>(siteId!, "serp-keywords"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContentStatus(siteId: string | null | undefined) {
  return useQuery<ContentStatusData>({
    queryKey: ["/api/ops-dashboard", siteId, "content-status"],
    queryFn: () => fetchOpsDashboard<ContentStatusData>(siteId!, "content-status"),
    enabled: !!siteId,
    staleTime: 60 * 1000,
  });
}

export function useChangesLog(siteId: string | null | undefined) {
  return useQuery<ChangesLogData>({
    queryKey: ["/api/ops-dashboard", siteId, "changes-log"],
    queryFn: () => fetchOpsDashboard<ChangesLogData>(siteId!, "changes-log"),
    enabled: !!siteId,
    staleTime: 30 * 1000,
  });
}

export function useSystemState(siteId: string | null | undefined) {
  return useQuery<SystemStateData>({
    queryKey: ["/api/ops-dashboard", siteId, "system-state"],
    queryFn: () => fetchOpsDashboard<SystemStateData>(siteId!, "system-state"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInsights(siteId: string | null | undefined) {
  return useQuery<InsightsData>({
    queryKey: ["/api/ops-dashboard", siteId, "insights"],
    queryFn: () => fetchOpsDashboard<InsightsData>(siteId!, "insights"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrafficDiagnosis(siteId: string | null | undefined) {
  return useQuery<TrafficDiagnosisData>({
    queryKey: ["/api/sites", siteId, "traffic-diagnosis"],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${encodeURIComponent(siteId!)}/traffic-diagnosis`, {
        credentials: "include",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Failed to fetch traffic diagnosis: ${text || res.statusText}`);
      if (!text) throw new Error("Empty response");
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Invalid response format");
      }
    },
    enabled: !!siteId,
    staleTime: 10 * 60 * 1000, // 10 minutes - expensive operation
  });
}

export function useTechnicalSeo(siteId: string | null | undefined) {
  return useQuery<TechnicalSeoData>({
    queryKey: ["/api/ops-dashboard", siteId, "technical-seo"],
    queryFn: () => fetchOpsDashboard<TechnicalSeoData>(siteId!, "technical-seo"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================
// SERP Manual Refresh
// ============================================================

export interface SerpRefreshUsage {
  used: number;
  remaining: number;
  limit: number;
  lastRefresh: string | null;
  monthKey: string;
}

export interface SerpRefreshResult {
  success: boolean;
  message: string;
  used: number;
  remaining: number;
  limit: number;
  upgradeRequired?: boolean;
}

export function useSerpRefreshUsage(siteId: string | null | undefined) {
  return useQuery<SerpRefreshUsage>({
    queryKey: ["/api/sites", siteId, "serp-refresh"],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${encodeURIComponent(siteId!)}/serp-refresh`, {
        credentials: "include",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Failed to fetch SERP refresh usage: ${text || res.statusText}`);
      if (!text) throw new Error("Empty response");
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Invalid response format");
      }
    },
    enabled: !!siteId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export async function triggerSerpRefresh(siteId: string): Promise<SerpRefreshResult> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/serp-refresh`, {
    method: "POST",
    credentials: "include",
  });
  const text = await res.text();
  if (!text) {
    return { success: false, message: "Empty response from server", used: 0, remaining: 0, limit: 0 };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: "Invalid response from server", used: 0, remaining: 0, limit: 0 };
  }
}

// ============================================================
// Acquisition Efficiency Analysis
// ============================================================

import type {
  AcquisitionOverviewResponse,
  AcquisitionBudgetResponse,
} from "../../../shared/types/acquisitionAnalysis";

export function useAcquisitionOverview(siteId: string | null | undefined) {
  return useQuery<AcquisitionOverviewResponse>({
    queryKey: ["/api/ops-dashboard", siteId, "acquisition-overview"],
    queryFn: () => fetchOpsDashboard<AcquisitionOverviewResponse>(siteId!, "acquisition-overview"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAcquisitionBudget(siteId: string | null | undefined) {
  return useQuery<AcquisitionBudgetResponse | null>({
    queryKey: ["/api/ops-dashboard", siteId, "acquisition-budget"],
    queryFn: async () => {
      const res = await fetch(buildOpsDashboardUrl(siteId!, "acquisition-budget"), {
        credentials: "include",
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      if (!text) return null;
      try {
        const data = JSON.parse(text);
        // Handle "insufficient data" response
        if (data.error === "Insufficient data") {
          return null;
        }
        return data as AcquisitionBudgetResponse;
      } catch {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================
// Weekly Plan Types
// ============================================================

export interface WeeklyPlanData {
  id: number;
  siteId: string;
  weekString: string;
  selectedSuggestionIds: string[] | null;
  diversityApplied: boolean;
  agentSpread: Record<string, number> | null;
  status: string;
  generatedAt: string | null;
  publishedAt: string | null;
  userOverrides: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionData {
  suggestionId: string;
  siteId: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  estimatedImpact: string | null;
  estimatedEffort: string | null;
  impactScore: number | null;
  effortScore: number | null;
  confidenceScore: number | null;
  priorityScore: number | null;
  pipelineStatus: string | null;
  sourceAgentId: string | null;
  sourceWorkers: string[] | null;
  createdAt: string;
}

export interface WeeklyPlanResponse {
  plan: WeeklyPlanData | null;
  updates: SuggestionData[];
}

export interface PipelineViewResponse {
  backlog: SuggestionData[];
  proposed: SuggestionData[];
  selected: SuggestionData[];
  published: SuggestionData[];
  skipped: SuggestionData[];
}

// ============================================================
// Weekly Plan Hooks
// ============================================================

export function useWeeklyPlan(siteId: string | null | undefined) {
  return useQuery<WeeklyPlanResponse>({
    queryKey: ["/api/weekly-plan", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/weekly-plan/${siteId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch weekly plan: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyPlanHistory(siteId: string | null | undefined, limit = 12) {
  return useQuery<{ plans: WeeklyPlanData[] }>({
    queryKey: ["/api/weekly-plan", siteId, "history", limit],
    queryFn: async () => {
      const res = await fetch(`/api/weekly-plan/${siteId}/history?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch plan history: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePipeline(siteId: string | null | undefined) {
  return useQuery<PipelineViewResponse>({
    queryKey: ["/api/update-pipeline", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/update-pipeline/pipeline/${siteId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch pipeline: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000, // 2 minutes, more frequent updates
  });
}

export function useAgentPipeline(siteId: string | null | undefined, agentId: string | null) {
  return useQuery<PipelineViewResponse>({
    queryKey: ["/api/update-pipeline", siteId, "agent", agentId],
    queryFn: async () => {
      const res = await fetch(`/api/update-pipeline/pipeline/${siteId}/agent/${agentId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch agent pipeline: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!siteId && !!agentId,
    staleTime: 2 * 60 * 1000,
  });
}
