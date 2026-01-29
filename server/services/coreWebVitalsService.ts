/**
 * Core Web Vitals Service (consolidated from Worker-Vital-Monitor)
 *
 * Calls Google PageSpeed Insights API directly from Hermes.
 * No separate worker deployment needed.
 *
 * Requires: GOOGLE_PAGESPEED_API_KEY env var (or uses PSI without key at lower rate limits)
 */

import { logger } from "../utils/logger";

const PSI_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CWVMetrics {
  field: {
    lcp_p75_ms: number | null;
    cls_p75: number | null;
    inp_p75_ms: number | null;
    ttfb_p75_ms: number | null;
    source: "crux" | "none";
    scope: "url" | "origin" | null;
  };
  lab: {
    performance_score: number | null;
    lcp_ms: number | null;
    cls: number | null;
    tbt_ms: number | null;
    fcp_ms: number | null;
    speed_index_ms: number | null;
  };
  meta: {
    final_url: string | null;
    analysis_timestamp: string | null;
    lighthouse_version: string | null;
  };
}

export interface CWVOpportunity {
  id: string;
  title: string;
  description: string | null;
  savings_ms: number | null;
  savings_bytes: number | null;
}

export interface CWVResult {
  metrics: CWVMetrics;
  opportunities: CWVOpportunity[];
  error: string | null;
}

interface PSIResponse {
  lighthouseResult?: {
    finalUrl?: string;
    fetchTime?: string;
    lighthouseVersion?: string;
    categories?: {
      performance?: { score?: number };
    };
    audits?: Record<string, {
      id?: string;
      title?: string;
      description?: string;
      score?: number | null;
      numericValue?: number;
      numericUnit?: string;
      details?: {
        overallSavingsMs?: number;
        overallSavingsBytes?: number;
      };
    }>;
  };
  loadingExperience?: {
    origin_fallback?: boolean;
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number };
      INTERACTION_TO_NEXT_PAINT?: { percentile?: number };
      EXPERIMENTAL_TIME_TO_FIRST_BYTE?: { percentile?: number };
    };
  };
  originLoadingExperience?: {
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number };
      INTERACTION_TO_NEXT_PAINT?: { percentile?: number };
      EXPERIMENTAL_TIME_TO_FIRST_BYTE?: { percentile?: number };
    };
  };
  error?: {
    code?: number;
    message?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Core API Call
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createEmptyMetrics(): CWVMetrics {
  return {
    field: { lcp_p75_ms: null, cls_p75: null, inp_p75_ms: null, ttfb_p75_ms: null, source: "none", scope: null },
    lab: { performance_score: null, lcp_ms: null, cls: null, tbt_ms: null, fcp_ms: null, speed_index_ms: null },
    meta: { final_url: null, analysis_timestamp: null, lighthouse_version: null },
  };
}

/**
 * Run a PageSpeed Insights test for a single URL.
 * Retries up to 3 times with exponential backoff on rate limits and server errors.
 */
export async function runPageSpeedTest(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
  retries = 3
): Promise<CWVResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) {
    logger.warn("CWV", "GOOGLE_PAGESPEED_API_KEY not configured — running without API key (lower rate limits)");
  }

  let lastError: string | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const params = new URLSearchParams({
        url,
        strategy,
        category: "performance",
      });
      if (apiKey) params.set("key", apiKey);

      const response = await fetch(`${PSI_API_URL}?${params}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        logger.warn("CWV", `PSI rate limited, waiting ${Math.round(waitTime)}ms before retry ${attempt + 1}`);
        await sleep(waitTime);
        continue;
      }

      if (response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        logger.warn("CWV", `PSI server error ${response.status}, retrying in ${Math.round(waitTime)}ms`);
        await sleep(waitTime);
        continue;
      }

      const data: PSIResponse = await response.json();

      if (data.error) {
        return {
          metrics: createEmptyMetrics(),
          opportunities: [],
          error: data.error.message || `PSI error: ${data.error.code}`,
        };
      }

      return {
        metrics: extractMetrics(data),
        opportunities: extractOpportunities(data),
        error: null,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      const waitTime = Math.pow(2, attempt) * 1000;
      logger.warn("CWV", `PSI request failed: ${lastError}, retrying in ${waitTime}ms`);
      await sleep(waitTime);
    }
  }

  return {
    metrics: createEmptyMetrics(),
    opportunities: [],
    error: lastError || "Failed after retries",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Metric Extraction
// ═══════════════════════════════════════════════════════════════════════════

function extractMetrics(data: PSIResponse): CWVMetrics {
  const lighthouse = data.lighthouseResult;
  const loadingExp = data.loadingExperience;
  const originExp = data.originLoadingExperience;

  const fieldMetrics = loadingExp?.metrics || originExp?.metrics;
  const hasFieldData = fieldMetrics && Object.keys(fieldMetrics).length > 0;
  const isUrlLevel = loadingExp && !loadingExp.origin_fallback;

  return {
    field: {
      lcp_p75_ms: fieldMetrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      cls_p75: fieldMetrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
        ? fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
        : null,
      inp_p75_ms: fieldMetrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      ttfb_p75_ms: fieldMetrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
      source: hasFieldData ? "crux" : "none",
      scope: hasFieldData ? (isUrlLevel ? "url" : "origin") : null,
    },
    lab: {
      performance_score: lighthouse?.categories?.performance?.score != null
        ? Math.round(lighthouse.categories.performance.score * 100)
        : null,
      lcp_ms: lighthouse?.audits?.["largest-contentful-paint"]?.numericValue ?? null,
      cls: lighthouse?.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
      tbt_ms: lighthouse?.audits?.["total-blocking-time"]?.numericValue ?? null,
      fcp_ms: lighthouse?.audits?.["first-contentful-paint"]?.numericValue ?? null,
      speed_index_ms: lighthouse?.audits?.["speed-index"]?.numericValue ?? null,
    },
    meta: {
      final_url: lighthouse?.finalUrl ?? null,
      analysis_timestamp: lighthouse?.fetchTime ?? null,
      lighthouse_version: lighthouse?.lighthouseVersion ?? null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Opportunity Extraction
// ═══════════════════════════════════════════════════════════════════════════

const OPPORTUNITY_AUDIT_IDS = [
  "render-blocking-resources",
  "unused-css-rules",
  "unused-javascript",
  "modern-image-formats",
  "uses-optimized-images",
  "uses-responsive-images",
  "offscreen-images",
  "unminified-css",
  "unminified-javascript",
  "efficient-animated-content",
  "duplicated-javascript",
  "legacy-javascript",
  "uses-text-compression",
  "uses-rel-preconnect",
  "server-response-time",
  "redirects",
  "uses-rel-preload",
  "total-byte-weight",
  "dom-size",
  "critical-request-chains",
  "bootup-time",
  "mainthread-work-breakdown",
  "font-display",
  "third-party-summary",
  "lcp-lazy-loaded",
];

function extractOpportunities(data: PSIResponse): CWVOpportunity[] {
  const audits = data.lighthouseResult?.audits;
  if (!audits) return [];

  const opportunities: CWVOpportunity[] = [];

  for (const auditId of OPPORTUNITY_AUDIT_IDS) {
    const audit = audits[auditId];
    if (!audit) continue;

    const score = audit.score;
    if (score === null || score === undefined || score >= 0.9) continue;

    const savings_ms = audit.details?.overallSavingsMs ??
      (audit.numericUnit === "millisecond" ? audit.numericValue : null) ?? null;
    const savings_bytes = audit.details?.overallSavingsBytes ?? null;

    if (savings_ms || savings_bytes || score < 0.5) {
      opportunities.push({
        id: audit.id || auditId,
        title: audit.title || auditId,
        description: audit.description ?? null,
        savings_ms: savings_ms ? Math.round(savings_ms) : null,
        savings_bytes: savings_bytes ? Math.round(savings_bytes) : null,
      });
    }
  }

  return opportunities.sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0));
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestration Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run CWV analysis for a domain during orchestration dispatch.
 * Tests the homepage on mobile, returns metrics + opportunities.
 */
export async function runCoreWebVitalsAnalysis(
  domain: string
): Promise<Record<string, any>> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  logger.info("CWV", `Running PageSpeed Insights for ${url}`);

  const result = await runPageSpeedTest(url, "mobile");

  if (result.error) {
    logger.warn("CWV", `PSI analysis failed for ${url}: ${result.error}`);
  } else {
    logger.info("CWV", `PSI analysis complete for ${url} — score: ${result.metrics.lab.performance_score}`);
  }

  return {
    ok: !result.error,
    service: "core_web_vitals",
    url,
    strategy: "mobile",
    performance_score: result.metrics.lab.performance_score,
    field: result.metrics.field,
    lab: result.metrics.lab,
    meta: result.metrics.meta,
    opportunities: result.opportunities,
    opportunity_count: result.opportunities.length,
    error: result.error,
  };
}
