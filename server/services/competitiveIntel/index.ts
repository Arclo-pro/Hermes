/**
 * Competitive Intelligence — consolidated into Hermes.
 *
 * 5-stage pipeline: analyze SERP drops → detect content gaps →
 * compare competitors → generate findings → summarize.
 *
 * Reads SERP data directly from Hermes DB (no external service call needed).
 * Fetches competitor pages via HTTP + cheerio for HTML comparison.
 */

import { logger } from "../../utils/logger";
import { identifyDroppedKeywords, type RankingHistoryEntry } from "./serpAnalyzer";
import { analyzeContentGaps, type ContentGap } from "./gapDetector";
import { generateFindings, summarizeFindings } from "./findingsGenerator";

export type { CompetitiveFinding, FindingType, Severity } from "./findingsGenerator";
export type { DroppedKeyword } from "./serpAnalyzer";
export type { ContentGap, PageMetadata } from "./gapDetector";

interface CompetitiveAnalysisInput {
  rankings: RankingHistoryEntry[];
  competitorUrls?: string[];
}

/**
 * Run the full competitive analysis pipeline.
 *
 * Returns data in the shape infrastructureDispatch expects.
 */
export async function runCompetitiveAnalysis(
  domain: string,
  siteId: string,
  input: CompetitiveAnalysisInput,
): Promise<Record<string, any>> {
  const startTime = Date.now();
  logger.info("CompetitiveIntel", `Starting competitive analysis for ${domain}`);

  // Stage 1: Identify dropped keywords
  const droppedKeywords = identifyDroppedKeywords(input.rankings);

  if (droppedKeywords.length === 0) {
    logger.info("CompetitiveIntel", `No dropped keywords for ${domain} — skipping gap analysis`);
    return {
      ok: true,
      service: "competitive_snapshot",
      domain,
      duration_ms: Date.now() - startTime,
      dropped_keywords: 0,
      gaps_found: 0,
      findings_count: 0,
      findings: [],
      findings_by_type: { content_gap: 0, ranking_opportunity: 0, freshness_issue: 0, intent_mismatch: 0 },
      findings_by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      message: "No significant ranking drops detected",
    };
  }

  // Stage 2: Detect content gaps (fetch and compare pages)
  // Limit to top 10 dropped keywords to control fetch volume
  const topDropped = droppedKeywords.slice(0, 10);
  const gaps: ContentGap[] = [];

  for (const dk of topDropped) {
    // Find our URL and competitor URL from rankings data
    const rankingEntry = input.rankings.find(
      r => r.keyword.toLowerCase() === dk.keyword.toLowerCase()
    );
    const ourUrl = rankingEntry?.url || null;
    const competitorUrl = dk.competitorWinning || null;

    if (ourUrl || competitorUrl) {
      const gap = await analyzeContentGaps(dk.keyword, ourUrl, competitorUrl);
      gaps.push(gap);
    }
  }

  // Stage 3-4: Generate findings
  const findings = generateFindings(gaps, droppedKeywords);
  const summary = summarizeFindings(findings);

  const durationMs = Date.now() - startTime;
  logger.info("CompetitiveIntel", `Analysis complete for ${domain}: ${findings.length} findings in ${durationMs}ms`);

  return {
    ok: true,
    service: "competitive_snapshot",
    domain,
    duration_ms: durationMs,

    // Counts
    dropped_keywords: droppedKeywords.length,
    gaps_found: gaps.length,
    findings_count: summary.total,

    // Breakdown
    findings_by_type: summary.byType,
    findings_by_severity: summary.bySeverity,

    // Dropped keywords detail
    dropped: droppedKeywords.slice(0, 25).map(dk => ({
      keyword: dk.keyword,
      current_rank: dk.currentRank,
      previous_rank: dk.previousRank,
      delta: dk.delta,
    })),

    // Findings (cap at 50 for response size)
    findings: findings.slice(0, 50).map(f => ({
      type: f.type,
      severity: f.severity,
      keyword: f.keyword,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      target_url: f.targetUrl,
      competitor_url: f.competitorUrl,
      current_rank: f.currentRank,
      rank_delta: f.rankDelta,
    })),

    // Gaps detail
    gaps: gaps.slice(0, 20).map(g => ({
      keyword: g.keyword,
      missing_headings: g.missingHeadings.length,
      missing_schemas: g.missingSchemaTypes.length,
      content_depth_gap: g.contentDepthGap,
      competitor_has_freshness: g.competitorHasFreshness,
    })),
  };
}
