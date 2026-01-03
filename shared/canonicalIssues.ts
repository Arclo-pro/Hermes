// shared/canonicalIssues.ts
// Canonical Issue types for Popular crew's evidence-backed issue pipeline

export interface CanonicalIssueKey {
  metricFamily: "organic_traffic" | "search_clicks" | "ad_spend" | "conversions";
  metric: string; // e.g., "ga4_sessions", "gsc_clicks"
  dimension: "all" | "landing_page" | "channel" | "device";
  windowStart: string; // YYYY-MM-DD
  windowEnd: string;   // YYYY-MM-DD
  scope: {
    crewId: string;
    domain: string;
  };
}

export interface RawAnomaly {
  id: string;
  date: string;           // Could be "20251207" or "2025-12-07" - needs normalization
  source: string;         // "GA4", "GSC", etc.
  metric: string;
  metricFamily?: string;
  dropPercent: number;    // Raw reported value
  currentValue: number;
  baselineValue: number;
  zScore: number;
  severity?: "severe" | "moderate" | "mild";
}

export interface ConfirmedMetrics {
  confirmedPctChange: number;
  confirmedCurrentValue: number;
  confirmedBaselineValue: number;
  confirmedMethod: "vs_prev_7day_avg" | "vs_prev_28day_avg" | "vs_same_day_prev_week";
  validatedAt: string;    // ISO timestamp
}

export interface CorroborationCheck {
  source: "speedster" | "hemingway" | "sentinel" | "scotty";
  status: "ok" | "no_data" | "error" | "pending";
  checkedAt: string;
  summary: string;
  details?: string;
  evidenceLinks?: string[];
  degraded?: boolean;      // For speedster: was there performance degradation?
  contentChanged?: boolean; // For hemingway: was there content change?
  urlsAffected?: string[];
}

export interface CanonicalIssue {
  id: string;
  key: CanonicalIssueKey;
  displayTitle: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "detected" | "validating" | "confirmed" | "resolved" | "needs_data";
  
  // Evidence
  evidence: {
    rawAnomalies: RawAnomaly[];
    primaryAnomaly: RawAnomaly;
    confirmedMetrics?: ConfirmedMetrics;
    corroborations: CorroborationCheck[];
  };
  
  // Computed fields
  confidence: number;      // 0-100 based on evidence
  aiInterpretation?: string;
  recommendedActions: RecommendedAction[];
  
  // Timestamps
  detectedAt: string;
  lastUpdatedAt: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  priority: number;
  applicable: boolean;    // False if evidence contradicts this action
  reason?: string;        // Why not applicable
  actionType: "investigate" | "fix" | "monitor" | "escalate";
  targetCrew?: string;
}

// Helper to normalize date strings
export function normalizeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "unknown";
  
  // Handle YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  
  // Handle ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10); // Return just the date part
  }
  
  // Try parsing and formatting
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  } catch {
    // Fall through
  }
  
  return "unknown";
}

// Format date for display
export function formatDateDisplay(dateStr: string): string {
  if (dateStr === "unknown") return "Unknown date";
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  } catch {
    // Fall through
  }
  
  return "Unknown date";
}

// Determine severity from z-score
export function getSeverityFromZScore(zScore: number): "critical" | "high" | "medium" | "low" {
  const absZ = Math.abs(zScore);
  if (absZ >= 4) return "critical";
  if (absZ >= 3) return "high";
  if (absZ >= 2) return "medium";
  return "low";
}

// Check if two date windows overlap within N days
function windowsOverlap(
  start1: string, end1: string, 
  start2: string, end2: string, 
  toleranceDays: number = 3
): boolean {
  const d1Start = new Date(start1);
  const d1End = new Date(end1);
  const d2Start = new Date(start2);
  const d2End = new Date(end2);
  
  const extendedD1Start = new Date(d1Start);
  extendedD1Start.setDate(extendedD1Start.getDate() - toleranceDays);
  const extendedD1End = new Date(d1End);
  extendedD1End.setDate(extendedD1End.getDate() + toleranceDays);
  
  return !(d2End < extendedD1Start || d2Start > extendedD1End);
}

// Create canonical issue key from anomaly
function createKey(anomaly: RawAnomaly, domain: string): CanonicalIssueKey {
  const normalizedDate = normalizeDate(anomaly.date);
  const metricFamily = anomaly.metricFamily || 
    (anomaly.metric.includes("session") ? "organic_traffic" : 
     anomaly.metric.includes("click") ? "search_clicks" :
     anomaly.metric.includes("spend") ? "ad_spend" : "organic_traffic");
  
  return {
    metricFamily: metricFamily as CanonicalIssueKey["metricFamily"],
    metric: anomaly.metric,
    dimension: "all",
    windowStart: normalizedDate,
    windowEnd: normalizedDate,
    scope: {
      crewId: "popular",
      domain,
    },
  };
}

// Main merge function: dedupe raw anomalies into canonical issues
export function mergeAnomalies(
  rawAnomalies: RawAnomaly[], 
  domain: string,
  toleranceDays: number = 3
): CanonicalIssue[] {
  if (!rawAnomalies.length) return [];
  
  // Group by metric family
  const grouped = new Map<string, RawAnomaly[]>();
  
  for (const anomaly of rawAnomalies) {
    const key = createKey(anomaly, domain);
    const groupKey = `${key.metricFamily}:${key.metric}`;
    
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(anomaly);
  }
  
  const canonicalIssues: CanonicalIssue[] = [];
  
  for (const [groupKey, anomalies] of Array.from(grouped.entries())) {
    // Sort by absolute z-score descending (most severe first)
    const sorted = [...anomalies].sort((a, b) => 
      Math.abs(b.zScore) - Math.abs(a.zScore)
    );
    
    // Further group by overlapping windows
    const windowGroups: RawAnomaly[][] = [];
    
    for (const anomaly of sorted) {
      const normalizedDate = normalizeDate(anomaly.date);
      let addedToGroup = false;
      
      for (const group of windowGroups) {
        const groupDates = group.map(a => normalizeDate(a.date));
        const minDate = groupDates.reduce((a, b) => a < b ? a : b);
        const maxDate = groupDates.reduce((a, b) => a > b ? a : b);
        
        if (windowsOverlap(minDate, maxDate, normalizedDate, normalizedDate, toleranceDays)) {
          group.push(anomaly);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        windowGroups.push([anomaly]);
      }
    }
    
    // Create one canonical issue per window group
    for (const group of windowGroups) {
      const primary = group[0]; // Most severe
      const key = createKey(primary, domain);
      
      // Expand window to cover all anomalies in group
      const allDates = group.map(a => normalizeDate(a.date)).filter(d => d !== "unknown");
      if (allDates.length > 0) {
        key.windowStart = allDates.reduce((a, b) => a < b ? a : b);
        key.windowEnd = allDates.reduce((a, b) => a > b ? a : b);
      }
      
      const severity = getSeverityFromZScore(primary.zScore);
      
      // Generate display title
      const metricDisplayNames: Record<string, string> = {
        ga4_sessions: "Organic Traffic (Sessions)",
        sessions: "Organic Traffic (Sessions)",
        ga4_users: "Organic Traffic (Users)",
        users: "Organic Traffic (Users)",
        gsc_clicks: "Search Clicks",
        clicks: "Search Clicks",
        ad_spend: "Ads Spend",
        conversions: "Conversions",
      };
      const displayTitle = metricDisplayNames[primary.metric.toLowerCase()] || 
        `${key.metricFamily} (${primary.metric})`;
      
      canonicalIssues.push({
        id: `issue_${key.metricFamily}_${key.windowStart}_${Date.now()}`,
        key,
        displayTitle,
        severity,
        status: "detected",
        evidence: {
          rawAnomalies: group,
          primaryAnomaly: primary,
          corroborations: [],
        },
        confidence: 50, // Base confidence, increases with corroboration
        recommendedActions: generateDefaultActions(severity, key.metricFamily),
        detectedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });
    }
  }
  
  return canonicalIssues;
}

function generateDefaultActions(severity: string, metricFamily: string): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  
  if (metricFamily === "organic_traffic") {
    actions.push({
      id: "check_performance",
      title: "Check Site Performance",
      description: "Verify Core Web Vitals haven't degraded",
      priority: 1,
      applicable: true,
      actionType: "investigate",
      targetCrew: "speedster",
    });
    actions.push({
      id: "check_content",
      title: "Review Content Changes",
      description: "Check for removed or significantly modified pages",
      priority: 2,
      applicable: true,
      actionType: "investigate",
      targetCrew: "hemingway",
    });
    actions.push({
      id: "check_indexing",
      title: "Verify Indexing Status",
      description: "Ensure key pages are still indexed",
      priority: 3,
      applicable: true,
      actionType: "investigate",
      targetCrew: "scotty",
    });
  }
  
  actions.push({
    id: "monitor",
    title: "Monitor for Recovery",
    description: "Track metrics over the next 7 days",
    priority: 10,
    applicable: true,
    actionType: "monitor",
  });
  
  return actions;
}

// Update actions based on corroboration results
export function updateActionsFromCorroboration(
  issue: CanonicalIssue,
  corroboration: CorroborationCheck
): CanonicalIssue {
  const updated = { ...issue };
  updated.evidence = { ...updated.evidence };
  updated.recommendedActions = [...updated.recommendedActions];
  updated.evidence.corroborations = [...updated.evidence.corroborations, corroboration];
  
  // Update action applicability based on corroboration
  for (const action of updated.recommendedActions) {
    if (corroboration.source === "speedster" && action.targetCrew === "speedster") {
      if (corroboration.degraded === false) {
        action.applicable = false;
        action.reason = "Performance appears stable (no degradation detected)";
      }
    }
    if (corroboration.source === "hemingway" && action.targetCrew === "hemingway") {
      if (corroboration.contentChanged === false) {
        action.applicable = false;
        action.reason = "No major content changes detected";
      }
    }
  }
  
  // Update confidence based on evidence
  let confidence = 50;
  if (issue.evidence.confirmedMetrics) confidence += 20;
  for (const c of updated.evidence.corroborations) {
    if (c.status === "ok") confidence += 10;
  }
  updated.confidence = Math.min(100, confidence);
  
  updated.lastUpdatedAt = new Date().toISOString();
  return updated;
}

// Compute score from canonical issues
export function computePopularScore(issues: CanonicalIssue[]): number {
  let score = 100;
  
  for (const issue of issues) {
    if (issue.status === "resolved") continue;
    
    const penalty = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5,
    }[issue.severity];
    
    // Apply confidence-weighted penalty
    const weightedPenalty = penalty * (issue.confidence / 100);
    score -= weightedPenalty;
  }
  
  return Math.max(0, Math.round(score));
}

// Count missions needing attention
export function countMissionsFromIssues(issues: CanonicalIssue[]): number {
  let count = 0;
  
  for (const issue of issues) {
    if (issue.status === "resolved") continue;
    count += issue.recommendedActions.filter(a => a.applicable).length;
  }
  
  return count;
}
