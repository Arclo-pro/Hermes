/**
 * Stages 3-4: Generate typed findings with severity scoring.
 */

import type { ContentGap } from "./gapDetector";
import type { DroppedKeyword } from "./serpAnalyzer";

export type FindingType = "content_gap" | "ranking_opportunity" | "freshness_issue" | "intent_mismatch";
export type Severity = "critical" | "high" | "medium" | "low";

export interface CompetitiveFinding {
  type: FindingType;
  severity: Severity;
  keyword: string;
  title: string;
  description: string;
  recommendation: string;
  targetUrl: string | null;
  competitorUrl: string | null;
  evidence: Record<string, any>;
  currentRank: number | null;
  competitorRank: number | null;
  rankDelta: number;
}

/**
 * Severity formula:
 * Critical: rankDelta >= 7 AND gapCount >= 5
 * High:     rankDelta >= 5 AND gapCount >= 3
 * Medium:   rankDelta >= 3 OR gapCount >= 2
 * Low:      default
 */
function calculateSeverity(rankDelta: number, gapCount: number): Severity {
  if (rankDelta >= 7 && gapCount >= 5) return "critical";
  if (rankDelta >= 5 && gapCount >= 3) return "high";
  if (rankDelta >= 3 || gapCount >= 2) return "medium";
  return "low";
}

/**
 * Generate findings from content gaps and dropped keywords.
 */
export function generateFindings(
  gaps: ContentGap[],
  droppedKeywords: DroppedKeyword[],
): CompetitiveFinding[] {
  const findings: CompetitiveFinding[] = [];
  const droppedMap = new Map<string, DroppedKeyword>();
  for (const dk of droppedKeywords) {
    droppedMap.set(dk.keyword.toLowerCase(), dk);
  }

  for (const gap of gaps) {
    const dropped = droppedMap.get(gap.keyword.toLowerCase());
    const rankDelta = dropped?.delta || 0;
    const totalGaps = gap.missingHeadings.length + gap.missingSchemaTypes.length;

    // Missing schema types → content_gap
    if (gap.missingSchemaTypes.length > 0) {
      findings.push({
        type: "content_gap",
        severity: calculateSeverity(rankDelta, gap.missingSchemaTypes.length),
        keyword: gap.keyword,
        title: `Missing schema markup for "${gap.keyword}"`,
        description: `Competitor has ${gap.missingSchemaTypes.join(", ")} schema types that your page lacks.`,
        recommendation: `Add ${gap.missingSchemaTypes.join(", ")} structured data to your page.`,
        targetUrl: gap.ourPage?.url || null,
        competitorUrl: gap.competitorPage?.url || null,
        evidence: {
          missingSchemaTypes: gap.missingSchemaTypes,
          ourSchemaTypes: gap.ourPage?.schemaTypes || [],
          competitorSchemaTypes: gap.competitorPage?.schemaTypes || [],
        },
        currentRank: dropped?.currentRank || null,
        competitorRank: null,
        rankDelta,
      });
    }

    // Missing headings → content_gap
    if (gap.missingHeadings.length > 0) {
      findings.push({
        type: "content_gap",
        severity: calculateSeverity(rankDelta, gap.missingHeadings.length),
        keyword: gap.keyword,
        title: `Content gaps detected for "${gap.keyword}"`,
        description: `Competitor covers ${gap.missingHeadings.length} topics/sections your page doesn't address.`,
        recommendation: `Add sections covering: ${gap.missingHeadings.slice(0, 5).join("; ")}`,
        targetUrl: gap.ourPage?.url || null,
        competitorUrl: gap.competitorPage?.url || null,
        evidence: {
          missingHeadings: gap.missingHeadings,
          gapCount: gap.missingHeadings.length,
        },
        currentRank: dropped?.currentRank || null,
        competitorRank: null,
        rankDelta,
      });
    }

    // Significant content depth gap → ranking_opportunity
    if (gap.contentDepthGap > 300) {
      findings.push({
        type: "ranking_opportunity",
        severity: "medium",
        keyword: gap.keyword,
        title: `Content depth gap for "${gap.keyword}"`,
        description: `Competitor page has ~${gap.contentDepthGap} more words than yours.`,
        recommendation: `Expand content by ${Math.min(gap.contentDepthGap, 1000)} words with valuable, relevant information.`,
        targetUrl: gap.ourPage?.url || null,
        competitorUrl: gap.competitorPage?.url || null,
        evidence: {
          ourWordCount: gap.ourPage?.wordCount || 0,
          competitorWordCount: gap.competitorPage?.wordCount || 0,
          gap: gap.contentDepthGap,
        },
        currentRank: dropped?.currentRank || null,
        competitorRank: null,
        rankDelta,
      });
    }

    // Freshness issue
    if (gap.competitorHasFreshness && !gap.ourPage?.hasFreshnessSignals) {
      findings.push({
        type: "freshness_issue",
        severity: "high",
        keyword: gap.keyword,
        title: `Freshness disadvantage for "${gap.keyword}"`,
        description: "Competitor page shows date/freshness signals that your page lacks.",
        recommendation: "Update content with current dates, add 'Last updated' indicators, and refresh outdated sections.",
        targetUrl: gap.ourPage?.url || null,
        competitorUrl: gap.competitorPage?.url || null,
        evidence: {
          competitorHasFreshness: true,
          ourHasFreshness: false,
        },
        currentRank: dropped?.currentRank || null,
        competitorRank: null,
        rankDelta,
      });
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}

/**
 * Aggregate findings into summary counts.
 */
export function summarizeFindings(findings: CompetitiveFinding[]): {
  byType: Record<FindingType, number>;
  bySeverity: Record<Severity, number>;
  total: number;
} {
  const byType: Record<FindingType, number> = {
    content_gap: 0, ranking_opportunity: 0, freshness_issue: 0, intent_mismatch: 0,
  };
  const bySeverity: Record<Severity, number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  };

  for (const f of findings) {
    byType[f.type]++;
    bySeverity[f.severity]++;
  }

  return { byType, bySeverity, total: findings.length };
}
