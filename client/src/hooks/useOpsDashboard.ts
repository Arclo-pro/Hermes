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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
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

export function useTechnicalSeo(siteId: string | null | undefined) {
  return useQuery<TechnicalSeoData>({
    queryKey: ["/api/ops-dashboard", siteId, "technical-seo"],
    queryFn: () => fetchOpsDashboard<TechnicalSeoData>(siteId!, "technical-seo"),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });
}
