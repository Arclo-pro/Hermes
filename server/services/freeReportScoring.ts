import type { 
  FreeReportTechnicalFinding, 
  FreeReportPerformanceUrl,
  FreeReportKeywordTarget 
} from "@shared/schema";

export interface ScoringInput {
  technicalFindings: FreeReportTechnicalFinding[];
  performanceUrls: FreeReportPerformanceUrl[];
  keywordTargets: FreeReportKeywordTarget[];
}

export interface HealthScoreBreakdown {
  score: number;
  penalties: {
    indexingCrawl: number;
    httpErrors: number;
    performance: number;
    keywords: number;
  };
}

export function calculateHealthScore(
  findings: FreeReportTechnicalFinding[],
  performance: FreeReportPerformanceUrl[],
  keywords: FreeReportKeywordTarget[]
): HealthScoreBreakdown {
  let score = 100;
  const penalties = {
    indexingCrawl: 0,
    httpErrors: 0,
    performance: 0,
    keywords: 0,
  };

  penalties.indexingCrawl = calculateIndexingCrawlPenalty(findings);
  penalties.httpErrors = calculateHttpErrorsPenalty(findings);
  penalties.performance = calculatePerformancePenalty(performance);
  penalties.keywords = calculateKeywordsPenalty(keywords);

  score -= penalties.indexingCrawl;
  score -= penalties.httpErrors;
  score -= penalties.performance;
  score -= penalties.keywords;

  score = Math.max(0, Math.min(100, score));

  return { score, penalties };
}

function calculateIndexingCrawlPenalty(findings: FreeReportTechnicalFinding[]): number {
  const indexingKeywords = [
    "robots.txt",
    "noindex",
    "crawl",
    "sitemap",
    "index",
    "canonical",
    "blocked",
  ];

  const criticalIndexingIssues = findings.filter((f) => {
    const titleLower = f.title.toLowerCase();
    const isIndexingRelated = indexingKeywords.some((kw) => titleLower.includes(kw));
    return isIndexingRelated && f.severity === "high";
  });

  const penaltyPerIssue = 20;
  const maxPenalty = 40;

  return Math.min(criticalIndexingIssues.length * penaltyPerIssue, maxPenalty);
}

function calculateHttpErrorsPenalty(findings: FreeReportTechnicalFinding[]): number {
  const errorKeywords = [
    "404",
    "4xx",
    "5xx",
    "500",
    "redirect chain",
    "redirect loop",
    "broken link",
    "dead link",
  ];

  let penalty = 0;

  for (const finding of findings) {
    const titleLower = finding.title.toLowerCase();
    const detailLower = (finding.detail || "").toLowerCase();
    const combined = titleLower + " " + detailLower;

    const isHttpError = errorKeywords.some((kw) => combined.includes(kw));
    if (!isHttpError) continue;

    if (finding.severity === "high") {
      penalty += 20;
    } else if (finding.severity === "medium") {
      penalty += 15;
    } else {
      penalty += 10;
    }
  }

  return Math.min(penalty, 20);
}

function calculatePerformancePenalty(performance: FreeReportPerformanceUrl[]): number {
  if (performance.length === 0) return 0;

  let poorCount = 0;
  let needsWorkCount = 0;

  for (const url of performance) {
    if (url.overall === "critical") {
      poorCount++;
    } else if (url.overall === "needs_attention") {
      needsWorkCount++;
    }
  }

  let penalty = 0;

  penalty += poorCount * 10;
  penalty += needsWorkCount * 5;

  return Math.min(penalty, 25);
}

function calculateKeywordsPenalty(keywords: FreeReportKeywordTarget[]): number {
  const highIntentKeywords = keywords.filter((k) => k.intent === "high_intent");
  const notRankingHighIntent = highIntentKeywords.filter(
    (k) => k.current_bucket === "not_ranking"
  );

  if (notRankingHighIntent.length >= 8) {
    const ratio = notRankingHighIntent.length / Math.max(highIntentKeywords.length, 1);
    if (ratio >= 0.8) {
      return 20;
    } else if (ratio >= 0.5) {
      return 15;
    } else {
      return 10;
    }
  }

  return 0;
}

export function getScoreGrade(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

export function getScoreColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#84cc16";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}
