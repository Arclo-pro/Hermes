/**
 * Inline competitive analyzer — replaces the external Natasha microservice.
 * Uses SERP results + cheerio page comparison to find content gaps.
 *
 * Ported from server/services/competitiveIntel/ (gapDetector + findingsGenerator).
 */

import * as cheerio from "cheerio";

const USER_AGENT = "ArcloBot/1.0 (+https://arclo.com/bot)";
const FETCH_TIMEOUT = 5_000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageMetadata {
  url: string;
  title: string | null;
  description: string | null;
  headings: string[];
  schemaTypes: string[];
  wordCount: number;
  hasFreshnessSignals: boolean;
}

interface ContentGap {
  keyword: string;
  ourUrl: string | null;
  competitorUrl: string;
  competitorDomain: string;
  competitorPosition: number;
  ourPosition: number | null;
  missingHeadings: string[];
  missingSchemaTypes: string[];
  contentDepthGap: number; // positive = competitor has more words
  competitorHasFreshness: boolean;
  ourHasFreshness: boolean;
}

export interface CompetitiveFinding {
  type: "content_gap" | "ranking_opportunity" | "freshness_issue" | "schema_gap";
  severity: "critical" | "high" | "medium" | "low";
  keyword: string;
  title: string;
  description: string;
  recommendation: string;
  ourUrl: string | null;
  competitorUrl: string;
  competitorDomain: string;
  evidence: Record<string, any>;
}

export interface CompetitiveResult {
  ok: boolean;
  findings: CompetitiveFinding[];
  findings_count: number;
  competitors: Array<{ domain: string; keywords: number; avgPosition: number }>;
  summary: {
    content_gaps: number;
    schema_gaps: number;
    freshness_issues: number;
    ranking_opportunities: number;
  };
}

// ─── Page fetching & analysis ────────────────────────────────────────────────

async function fetchPageMetadata(url: string): Promise<PageMetadata | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await resp.text();
    const $ = cheerio.load(html);

    const title = $("title").first().text().trim() || null;
    const description = $('meta[name="description"]').attr("content")?.trim() || null;

    // Extract headings (H1-H3)
    const headings: string[] = [];
    $("h1, h2, h3").each((i, el) => {
      if (i < 30) {
        const text = $(el).text().trim();
        if (text && text.length > 2) headings.push(text);
      }
    });

    // Extract JSON-LD schema types
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        const items = data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (item["@type"]) {
            const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
            for (const t of types) {
              if (typeof t === "string" && !schemaTypes.includes(t)) schemaTypes.push(t);
            }
          }
        }
      } catch {}
    });

    // Word count (strip nav, footer, script, style)
    const $clone = cheerio.load(html);
    $clone("script, style, noscript, nav, footer").remove();
    const text = $clone("body").text().replace(/\s+/g, " ").trim();
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    // Freshness signals
    const bodyText = $("body").text().toLowerCase();
    const hasFreshnessSignals =
      /202[4-9]/.test(bodyText) ||
      /updated|latest|new for 202/.test(bodyText) ||
      !!$('meta[property="article:modified_time"]').attr("content");

    return { url, title, description, headings, schemaTypes, wordCount, hasFreshnessSignals };
  } catch {
    return null;
  }
}

// ─── Gap analysis ────────────────────────────────────────────────────────────

function analyzeGap(
  keyword: string,
  ourMeta: PageMetadata | null,
  compMeta: PageMetadata,
  compDomain: string,
  compPosition: number,
  ourPosition: number | null
): ContentGap {
  const ourHeadingsLower = (ourMeta?.headings || []).map(h => h.toLowerCase().slice(0, 20));

  const missingHeadings = compMeta.headings.filter(
    h => !ourHeadingsLower.includes(h.toLowerCase().slice(0, 20))
  ).slice(0, 10);

  const ourSchemaLower = (ourMeta?.schemaTypes || []).map(s => s.toLowerCase());
  const missingSchemaTypes = compMeta.schemaTypes.filter(
    s => !ourSchemaLower.includes(s.toLowerCase())
  ).slice(0, 5);

  const contentDepthGap = compMeta.wordCount - (ourMeta?.wordCount || 0);

  return {
    keyword,
    ourUrl: ourMeta?.url || null,
    competitorUrl: compMeta.url,
    competitorDomain: compDomain,
    competitorPosition: compPosition,
    ourPosition,
    missingHeadings,
    missingSchemaTypes,
    contentDepthGap,
    competitorHasFreshness: compMeta.hasFreshnessSignals,
    ourHasFreshness: ourMeta?.hasFreshnessSignals || false,
  };
}

// ─── Finding generation ──────────────────────────────────────────────────────

function generateFindings(gaps: ContentGap[]): CompetitiveFinding[] {
  const findings: CompetitiveFinding[] = [];

  for (const gap of gaps) {
    const rankDelta = gap.ourPosition ? gap.competitorPosition - gap.ourPosition : 20;

    // Content gap finding (missing headings/topics)
    if (gap.missingHeadings.length >= 2) {
      const severity = gap.missingHeadings.length >= 5 && Math.abs(rankDelta) >= 5
        ? "high"
        : gap.missingHeadings.length >= 3
        ? "medium"
        : "low";

      findings.push({
        type: "content_gap",
        severity,
        keyword: gap.keyword,
        title: `Missing ${gap.missingHeadings.length} content topics vs ${gap.competitorDomain}`,
        description: `For "${gap.keyword}", ${gap.competitorDomain} covers topics your page doesn't: ${gap.missingHeadings.slice(0, 3).join(", ")}`,
        recommendation: `Add sections covering: ${gap.missingHeadings.slice(0, 5).join("; ")}`,
        ourUrl: gap.ourUrl,
        competitorUrl: gap.competitorUrl,
        competitorDomain: gap.competitorDomain,
        evidence: {
          missingHeadings: gap.missingHeadings,
          ourPosition: gap.ourPosition,
          competitorPosition: gap.competitorPosition,
        },
      });
    }

    // Schema gap finding
    if (gap.missingSchemaTypes.length > 0) {
      findings.push({
        type: "schema_gap",
        severity: gap.missingSchemaTypes.includes("FAQPage") || gap.missingSchemaTypes.includes("HowTo") ? "medium" : "low",
        keyword: gap.keyword,
        title: `Missing schema: ${gap.missingSchemaTypes.join(", ")}`,
        description: `${gap.competitorDomain} uses ${gap.missingSchemaTypes.join(", ")} schema that your page lacks`,
        recommendation: `Add ${gap.missingSchemaTypes.join(", ")} structured data markup`,
        ourUrl: gap.ourUrl,
        competitorUrl: gap.competitorUrl,
        competitorDomain: gap.competitorDomain,
        evidence: {
          missingSchemaTypes: gap.missingSchemaTypes,
          competitorSchemas: gap.missingSchemaTypes,
        },
      });
    }

    // Content depth / ranking opportunity
    if (gap.contentDepthGap > 300) {
      findings.push({
        type: "ranking_opportunity",
        severity: gap.contentDepthGap > 1000 ? "high" : "medium",
        keyword: gap.keyword,
        title: `Content depth gap: ${gap.contentDepthGap} fewer words than ${gap.competitorDomain}`,
        description: `Your page has ~${gap.contentDepthGap} fewer words than the top competitor for "${gap.keyword}"`,
        recommendation: "Expand content depth with additional relevant sections",
        ourUrl: gap.ourUrl,
        competitorUrl: gap.competitorUrl,
        competitorDomain: gap.competitorDomain,
        evidence: {
          contentDepthGap: gap.contentDepthGap,
          ourPosition: gap.ourPosition,
          competitorPosition: gap.competitorPosition,
        },
      });
    }

    // Freshness issue
    if (gap.competitorHasFreshness && !gap.ourHasFreshness) {
      findings.push({
        type: "freshness_issue",
        severity: "low",
        keyword: gap.keyword,
        title: `${gap.competitorDomain} has freshness signals you lack`,
        description: `Competitor page for "${gap.keyword}" shows recent updates or dates, your page doesn't`,
        recommendation: "Add last-updated dates, publication dates, or recent content references",
        ourUrl: gap.ourUrl,
        competitorUrl: gap.competitorUrl,
        competitorDomain: gap.competitorDomain,
        evidence: {
          competitorHasFreshness: true,
          ourHasFreshness: false,
        },
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  return findings.slice(0, 30); // Cap findings
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface AnalyzeOptions {
  maxKeywords?: number;
  fetchTimeout?: number;
}

export async function analyzeCompetitors(
  domain: string,
  serpResults: any[],
  options: AnalyzeOptions = {}
): Promise<CompetitiveResult> {
  const { maxKeywords = 5 } = options;
  const baseDomain = domain.replace(/^www\./, "").toLowerCase();

  // Pick keywords where we're NOT in top 3 (biggest opportunity)
  const targetKeywords = serpResults
    .filter(r => r.position === null || r.position > 3)
    .slice(0, maxKeywords);

  if (targetKeywords.length === 0) {
    return { ok: true, findings: [], findings_count: 0, competitors: [], summary: { content_gaps: 0, schema_gaps: 0, freshness_issues: 0, ranking_opportunities: 0 } };
  }

  const gaps: ContentGap[] = [];
  const competitorStats = new Map<string, { keywords: number; positions: number[] }>();

  // Fetch our homepage metadata once
  const ourMeta = await fetchPageMetadata(`https://${domain}`);

  for (const kw of targetKeywords) {
    if (!kw.competitors || kw.competitors.length === 0) continue;

    // Fetch top competitor's page
    const topComp = kw.competitors[0];
    if (!topComp?.url) continue;

    const compMeta = await fetchPageMetadata(topComp.url);
    if (!compMeta) continue;

    const gap = analyzeGap(
      kw.keyword,
      kw.url ? await fetchPageMetadata(kw.url) : ourMeta,
      compMeta,
      topComp.domain,
      topComp.position,
      kw.position
    );
    gaps.push(gap);

    // Track competitor stats
    const stats = competitorStats.get(topComp.domain) || { keywords: 0, positions: [] };
    stats.keywords++;
    stats.positions.push(topComp.position);
    competitorStats.set(topComp.domain, stats);
  }

  const findings = generateFindings(gaps);

  // Build competitor summary
  const competitors = Array.from(competitorStats.entries())
    .map(([compDomain, stats]) => ({
      domain: compDomain,
      keywords: stats.keywords,
      avgPosition: Math.round(stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length * 10) / 10,
    }))
    .sort((a, b) => b.keywords - a.keywords)
    .slice(0, 10);

  const summary = {
    content_gaps: findings.filter(f => f.type === "content_gap").length,
    schema_gaps: findings.filter(f => f.type === "schema_gap").length,
    freshness_issues: findings.filter(f => f.type === "freshness_issue").length,
    ranking_opportunities: findings.filter(f => f.type === "ranking_opportunity").length,
  };

  console.log(`[CompetitiveAnalyzer] Analyzed ${gaps.length} keyword gaps, generated ${findings.length} findings`);

  return { ok: true, findings, findings_count: findings.length, competitors, summary };
}
