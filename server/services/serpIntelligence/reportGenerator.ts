/**
 * SERP report generator: Cost of Inaction calculator, fingerprinting, action items.
 */

import { createHash } from "crypto";
import type { RankingSnapshot, RankingSummary, RankingDelta } from "./rankingTracker";

// ─── CTR Model ───────────────────────────────────────────────────────────────

const CTR_BY_RANK: Record<number, number> = {
  1: 0.28, 2: 0.15, 3: 0.10, 4: 0.07, 5: 0.05,
  6: 0.04, 7: 0.03, 8: 0.025, 9: 0.020, 10: 0.018,
};

export function ctrForRank(rank: number | null): number {
  if (rank === null || rank <= 0) return 0.001;
  if (rank <= 10) return CTR_BY_RANK[rank] || 0.018;
  if (rank <= 20) return 0.010;
  if (rank <= 50) return 0.004;
  return 0.001;
}

// ─── Assumptions ─────────────────────────────────────────────────────────────

export interface ReportAssumptions {
  captureFactor: number;         // Reduces overcount from SERP features, ads
  leadConversionRate: number;    // % of clicks that become leads
  targetPosition: number;        // Conservative CTR baseline target
}

const DEFAULT_ASSUMPTIONS: ReportAssumptions = {
  captureFactor: 0.65,
  leadConversionRate: 0.025,
  targetPosition: 3,
};

// ─── Cost of Inaction ────────────────────────────────────────────────────────

export interface CostOfInactionMetrics {
  impressionsAvailable: number;
  clicksAvailable: number;
  leadsAvailable: number;
  pageOneOpportunities: number;
}

export function calculateCostOfInaction(
  rankings: RankingSnapshot[],
  assumptions: ReportAssumptions = DEFAULT_ASSUMPTIONS,
): CostOfInactionMetrics {
  let impressionsAvailable = 0;
  let clicksAvailable = 0;
  let pageOneOpportunities = 0;

  const targetCtr = ctrForRank(assumptions.targetPosition);

  for (const r of rankings) {
    const volume = r.volume || 0;
    if (volume === 0) continue;

    const currentCtr = ctrForRank(r.position);

    // Only count opportunity if not already in top 3
    if (r.position === null || r.position > 3) {
      const currentClicks = volume * currentCtr * assumptions.captureFactor;
      const targetClicks = volume * targetCtr * assumptions.captureFactor;
      const gap = targetClicks - currentClicks;

      if (gap > 0) {
        impressionsAvailable += volume * assumptions.captureFactor;
        clicksAvailable += gap;
      }

      // Page one opportunity = not currently on page 1
      if (r.position === null || r.position > 10) {
        pageOneOpportunities++;
      }
    }
  }

  return {
    impressionsAvailable: Math.round(impressionsAvailable),
    clicksAvailable: Math.round(clicksAvailable),
    leadsAvailable: Math.round(clicksAvailable * assumptions.leadConversionRate),
    pageOneOpportunities,
  };
}

// ─── Fingerprinting ──────────────────────────────────────────────────────────

/**
 * Generate a stable 16-char SHA1 fingerprint for recommendation deduplication.
 */
export function generateFingerprint(
  domain: string,
  page: string,
  itemType: string,
  action: string,
): string {
  const normalized = `${domain.toLowerCase()}|${page.toLowerCase()}|${itemType.toLowerCase()}|${action.toLowerCase().trim()}`;
  return createHash("sha1").update(normalized).digest("hex").substring(0, 16);
}

// ─── Report Builder ──────────────────────────────────────────────────────────

export interface SerpReportItem {
  keyword: string;
  volume: number;
  rank: number | null;
  url: string | null;
  fingerprint: string;
}

export interface SerpReport {
  domain: string;
  generatedAt: string;
  metrics: CostOfInactionMetrics & {
    keywordsTracked: number;
    rankingTop20: number;
    notRanked: number;
  };
  currentWins: SerpReportItem[];
  bigGaps: SerpReportItem[];
  whatToDoNext: Array<{
    page: string;
    keyword: string;
    rank: number | null;
    volume: number;
    action: string;
    fingerprint: string;
  }>;
  assumptions: ReportAssumptions;
}

export function buildReport(
  domain: string,
  rankings: RankingSnapshot[],
  summary: RankingSummary,
  deltas: RankingDelta[],
  assumptions: ReportAssumptions = DEFAULT_ASSUMPTIONS,
): SerpReport {
  const coiMetrics = calculateCostOfInaction(rankings, assumptions);

  // Current wins: ranking in top 10
  const currentWins: SerpReportItem[] = rankings
    .filter(r => r.position !== null && r.position <= 10)
    .sort((a, b) => (a.position || 99) - (b.position || 99))
    .map(r => ({
      keyword: r.keyword,
      volume: r.volume || 0,
      rank: r.position,
      url: r.url,
      fingerprint: generateFingerprint(domain, r.url || "/", "win", r.keyword),
    }));

  // Big gaps: high volume keywords not ranking well
  const bigGaps: SerpReportItem[] = rankings
    .filter(r => (r.position === null || r.position > 10) && (r.volume || 0) > 100)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 20)
    .map(r => ({
      keyword: r.keyword,
      volume: r.volume || 0,
      rank: r.position,
      url: r.url,
      fingerprint: generateFingerprint(domain, r.url || "/", "gap", r.keyword),
    }));

  // Action items: keywords close to page 1 (positions 4-20)
  const actionable = rankings
    .filter(r => r.position !== null && r.position >= 4 && r.position <= 20)
    .sort((a, b) => (a.position || 99) - (b.position || 99))
    .slice(0, 15);

  const whatToDoNext = actionable.map(r => {
    const action = r.position! <= 10
      ? `Rank #${r.position} — Optimize title/meta; add internal links; expand content by 200-400 words.`
      : `Rank #${r.position} — Create dedicated landing page or significantly expand existing content.`;

    return {
      page: r.url || "/",
      keyword: r.keyword,
      rank: r.position,
      volume: r.volume || 0,
      action,
      fingerprint: generateFingerprint(domain, r.url || "/", "action", r.keyword),
    };
  });

  return {
    domain,
    generatedAt: new Date().toISOString(),
    metrics: {
      ...coiMetrics,
      keywordsTracked: summary.trackedKeywords,
      rankingTop20: summary.top20,
      notRanked: summary.notRanking,
    },
    currentWins,
    bigGaps,
    whatToDoNext,
    assumptions,
  };
}
