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

export interface FieldDistribution {
  good: number;       // percentage 0-100
  needsImprovement: number;
  poor: number;
}

export interface CWVMetrics {
  field: {
    lcp_p75_ms: number | null;
    cls_p75: number | null;
    inp_p75_ms: number | null;
    ttfb_p75_ms: number | null;
    fcp_p75_ms: number | null;
    source: "crux" | "none";
    scope: "url" | "origin" | null;
    // Field data distributions (real user percentages)
    distributions: {
      lcp: FieldDistribution | null;
      cls: FieldDistribution | null;
      inp: FieldDistribution | null;
      ttfb: FieldDistribution | null;
      fcp: FieldDistribution | null;
    };
  };
  lab: {
    performance_score: number | null;
    accessibility_score: number | null;
    best_practices_score: number | null;
    seo_score: number | null;
    lcp_ms: number | null;
    cls: number | null;
    tbt_ms: number | null;
    fcp_ms: number | null;
    speed_index_ms: number | null;
    tti_ms: number | null;          // Time to Interactive
    max_potential_fid_ms: number | null;
  };
  meta: {
    final_url: string | null;
    analysis_timestamp: string | null;
    lighthouse_version: string | null;
    user_agent: string | null;
    environment: string | null;
  };
  // LCP/FCP element identification
  elements: {
    lcp_element: string | null;
    lcp_element_type: string | null;
    fcp_element: string | null;
  };
  // Resource summary
  resources: {
    total_bytes: number | null;
    total_requests: number | null;
    script_bytes: number | null;
    script_count: number | null;
    image_bytes: number | null;
    image_count: number | null;
    font_bytes: number | null;
    font_count: number | null;
    stylesheet_bytes: number | null;
    stylesheet_count: number | null;
    document_bytes: number | null;
    third_party_bytes: number | null;
  };
}

export interface CWVOpportunity {
  id: string;
  title: string;
  description: string | null;
  savings_ms: number | null;
  savings_bytes: number | null;
  score: number | null;
  displayValue: string | null;
}

export interface CWVDiagnostic {
  id: string;
  title: string;
  description: string | null;
  displayValue: string | null;
  score: number | null;
  details: Record<string, any> | null;
}

export interface CWVPassedAudit {
  id: string;
  title: string;
  description: string | null;
}

export interface CWVResult {
  metrics: CWVMetrics;
  opportunities: CWVOpportunity[];
  diagnostics: CWVDiagnostic[];
  passedAudits: CWVPassedAudit[];
  error: string | null;
}

interface PSIFieldMetric {
  percentile?: number;
  distributions?: Array<{
    min: number;
    max?: number;
    proportion: number;
  }>;
  category?: string;
}

interface PSIResponse {
  lighthouseResult?: {
    finalUrl?: string;
    fetchTime?: string;
    lighthouseVersion?: string;
    userAgent?: string;
    environment?: {
      networkUserAgent?: string;
      hostUserAgent?: string;
      benchmarkIndex?: number;
    };
    categories?: {
      performance?: { score?: number };
      accessibility?: { score?: number };
      "best-practices"?: { score?: number };
      seo?: { score?: number };
    };
    audits?: Record<string, {
      id?: string;
      title?: string;
      description?: string;
      score?: number | null;
      scoreDisplayMode?: string;
      numericValue?: number;
      numericUnit?: string;
      displayValue?: string;
      details?: {
        overallSavingsMs?: number;
        overallSavingsBytes?: number;
        type?: string;
        items?: Array<Record<string, any>>;
        summary?: Record<string, any>;
      };
    }>;
  };
  loadingExperience?: {
    origin_fallback?: boolean;
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: PSIFieldMetric;
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: PSIFieldMetric;
      INTERACTION_TO_NEXT_PAINT?: PSIFieldMetric;
      EXPERIMENTAL_TIME_TO_FIRST_BYTE?: PSIFieldMetric;
      FIRST_CONTENTFUL_PAINT_MS?: PSIFieldMetric;
    };
  };
  originLoadingExperience?: {
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: PSIFieldMetric;
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: PSIFieldMetric;
      INTERACTION_TO_NEXT_PAINT?: PSIFieldMetric;
      EXPERIMENTAL_TIME_TO_FIRST_BYTE?: PSIFieldMetric;
      FIRST_CONTENTFUL_PAINT_MS?: PSIFieldMetric;
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
    field: {
      lcp_p75_ms: null, cls_p75: null, inp_p75_ms: null, ttfb_p75_ms: null, fcp_p75_ms: null,
      source: "none", scope: null,
      distributions: { lcp: null, cls: null, inp: null, ttfb: null, fcp: null },
    },
    lab: {
      performance_score: null, accessibility_score: null, best_practices_score: null, seo_score: null,
      lcp_ms: null, cls: null, tbt_ms: null, fcp_ms: null, speed_index_ms: null,
      tti_ms: null, max_potential_fid_ms: null,
    },
    meta: { final_url: null, analysis_timestamp: null, lighthouse_version: null, user_agent: null, environment: null },
    elements: { lcp_element: null, lcp_element_type: null, fcp_element: null },
    resources: {
      total_bytes: null, total_requests: null,
      script_bytes: null, script_count: null,
      image_bytes: null, image_count: null,
      font_bytes: null, font_count: null,
      stylesheet_bytes: null, stylesheet_count: null,
      document_bytes: null, third_party_bytes: null,
    },
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
      const params = new URLSearchParams({ url, strategy });
      // Request all categories for comprehensive analysis
      params.append("category", "performance");
      params.append("category", "accessibility");
      params.append("category", "best-practices");
      params.append("category", "seo");
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
          diagnostics: [],
          passedAudits: [],
          error: data.error.message || `PSI error: ${data.error.code}`,
        };
      }

      return {
        metrics: extractMetrics(data),
        opportunities: extractOpportunities(data),
        diagnostics: extractDiagnostics(data),
        passedAudits: extractPassedAudits(data),
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
    diagnostics: [],
    passedAudits: [],
    error: lastError || "Failed after retries",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Metric Extraction
// ═══════════════════════════════════════════════════════════════════════════

function extractDistribution(metric: PSIFieldMetric | undefined): FieldDistribution | null {
  if (!metric?.distributions || metric.distributions.length < 3) return null;

  // Distributions are [good, needs-improvement, poor] with proportions 0-1
  return {
    good: Math.round((metric.distributions[0]?.proportion ?? 0) * 100),
    needsImprovement: Math.round((metric.distributions[1]?.proportion ?? 0) * 100),
    poor: Math.round((metric.distributions[2]?.proportion ?? 0) * 100),
  };
}

function extractMetrics(data: PSIResponse): CWVMetrics {
  const lighthouse = data.lighthouseResult;
  const audits = lighthouse?.audits;
  const loadingExp = data.loadingExperience;
  const originExp = data.originLoadingExperience;

  const fieldMetrics = loadingExp?.metrics || originExp?.metrics;
  const hasFieldData = fieldMetrics && Object.keys(fieldMetrics).length > 0;
  const isUrlLevel = loadingExp && !loadingExp.origin_fallback;

  // Extract LCP element info from the largest-contentful-paint-element audit
  let lcpElement: string | null = null;
  let lcpElementType: string | null = null;
  const lcpAudit = audits?.["largest-contentful-paint-element"];
  if (lcpAudit?.details?.items?.[0]) {
    const item = lcpAudit.details.items[0];
    lcpElement = item.node?.snippet || item.node?.selector || null;
    lcpElementType = item.node?.nodeLabel || null;
  }

  // Extract resource summary from network-requests or resource-summary audit
  let totalBytes = 0;
  let totalRequests = 0;
  let scriptBytes = 0, scriptCount = 0;
  let imageBytes = 0, imageCount = 0;
  let fontBytes = 0, fontCount = 0;
  let stylesheetBytes = 0, stylesheetCount = 0;
  let documentBytes = 0;
  let thirdPartyBytes = 0;

  const resourceAudit = audits?.["resource-summary"];
  if (resourceAudit?.details?.items) {
    for (const item of resourceAudit.details.items) {
      const resourceType = item.resourceType;
      const size = item.transferSize || 0;
      const count = item.requestCount || 0;

      if (resourceType === "total") {
        totalBytes = size;
        totalRequests = count;
      } else if (resourceType === "script") {
        scriptBytes = size;
        scriptCount = count;
      } else if (resourceType === "image") {
        imageBytes = size;
        imageCount = count;
      } else if (resourceType === "font") {
        fontBytes = size;
        fontCount = count;
      } else if (resourceType === "stylesheet") {
        stylesheetBytes = size;
        stylesheetCount = count;
      } else if (resourceType === "document") {
        documentBytes = size;
      } else if (resourceType === "third-party") {
        thirdPartyBytes = size;
      }
    }
  }

  // If no resource-summary, try total-byte-weight
  if (totalBytes === 0 && audits?.["total-byte-weight"]?.numericValue) {
    totalBytes = Math.round(audits["total-byte-weight"].numericValue);
  }

  // Third party summary
  const thirdPartyAudit = audits?.["third-party-summary"];
  if (thirdPartyAudit?.details?.summary?.wastedBytes && thirdPartyBytes === 0) {
    thirdPartyBytes = thirdPartyAudit.details.summary.wastedBytes;
  }

  return {
    field: {
      lcp_p75_ms: fieldMetrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      cls_p75: fieldMetrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
        ? fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
        : null,
      inp_p75_ms: fieldMetrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      ttfb_p75_ms: fieldMetrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
      fcp_p75_ms: fieldMetrics?.FIRST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      source: hasFieldData ? "crux" : "none",
      scope: hasFieldData ? (isUrlLevel ? "url" : "origin") : null,
      distributions: {
        lcp: extractDistribution(fieldMetrics?.LARGEST_CONTENTFUL_PAINT_MS),
        cls: extractDistribution(fieldMetrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE),
        inp: extractDistribution(fieldMetrics?.INTERACTION_TO_NEXT_PAINT),
        ttfb: extractDistribution(fieldMetrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
        fcp: extractDistribution(fieldMetrics?.FIRST_CONTENTFUL_PAINT_MS),
      },
    },
    lab: {
      performance_score: lighthouse?.categories?.performance?.score != null
        ? Math.round(lighthouse.categories.performance.score * 100)
        : null,
      accessibility_score: lighthouse?.categories?.accessibility?.score != null
        ? Math.round(lighthouse.categories.accessibility.score * 100)
        : null,
      best_practices_score: lighthouse?.categories?.["best-practices"]?.score != null
        ? Math.round(lighthouse.categories["best-practices"].score * 100)
        : null,
      seo_score: lighthouse?.categories?.seo?.score != null
        ? Math.round(lighthouse.categories.seo.score * 100)
        : null,
      lcp_ms: audits?.["largest-contentful-paint"]?.numericValue ?? null,
      cls: audits?.["cumulative-layout-shift"]?.numericValue ?? null,
      tbt_ms: audits?.["total-blocking-time"]?.numericValue ?? null,
      fcp_ms: audits?.["first-contentful-paint"]?.numericValue ?? null,
      speed_index_ms: audits?.["speed-index"]?.numericValue ?? null,
      tti_ms: audits?.["interactive"]?.numericValue ?? null,
      max_potential_fid_ms: audits?.["max-potential-fid"]?.numericValue ?? null,
    },
    meta: {
      final_url: lighthouse?.finalUrl ?? null,
      analysis_timestamp: lighthouse?.fetchTime ?? null,
      lighthouse_version: lighthouse?.lighthouseVersion ?? null,
      user_agent: lighthouse?.environment?.hostUserAgent ?? null,
      environment: lighthouse?.userAgent ?? null,
    },
    elements: {
      lcp_element: lcpElement,
      lcp_element_type: lcpElementType,
      fcp_element: null, // FCP element not typically exposed
    },
    resources: {
      total_bytes: totalBytes || null,
      total_requests: totalRequests || null,
      script_bytes: scriptBytes || null,
      script_count: scriptCount || null,
      image_bytes: imageBytes || null,
      image_count: imageCount || null,
      font_bytes: fontBytes || null,
      font_count: fontCount || null,
      stylesheet_bytes: stylesheetBytes || null,
      stylesheet_count: stylesheetCount || null,
      document_bytes: documentBytes || null,
      third_party_bytes: thirdPartyBytes || null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Opportunity Extraction
// ═══════════════════════════════════════════════════════════════════════════

// Opportunities are audits with potential savings
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
  "prioritize-lcp-image",
  "unsized-images",
  "preload-lcp-image",
];

// Diagnostics are informational audits
const DIAGNOSTIC_AUDIT_IDS = [
  "largest-contentful-paint-element",
  "lcp-lazy-loaded",
  "layout-shift-elements",
  "long-tasks",
  "non-composited-animations",
  "unsized-images",
  "viewport",
  "no-document-write",
  "uses-passive-event-listeners",
  "doctype",
  "charset",
  "dom-size",
  "geolocation-on-start",
  "inspector-issues",
  "no-unload-listeners",
  "bf-cache",
  "third-party-facades",
  "largest-contentful-paint-element",
  "total-blocking-time",
  "max-potential-fid",
  "cumulative-layout-shift",
  "user-timings",
  "critical-request-chains",
  "network-requests",
  "network-rtt",
  "network-server-latency",
  "main-thread-tasks",
  "diagnostics",
  "metrics",
  "screenshot-thumbnails",
  "final-screenshot",
];

function extractOpportunities(data: PSIResponse): CWVOpportunity[] {
  const audits = data.lighthouseResult?.audits;
  if (!audits) return [];

  const opportunities: CWVOpportunity[] = [];

  for (const auditId of OPPORTUNITY_AUDIT_IDS) {
    const audit = audits[auditId];
    if (!audit) continue;

    const score = audit.score;
    // Skip passing audits (score >= 0.9) and skip audits without a score
    if (score === null || score === undefined || score >= 0.9) continue;

    const savings_ms = audit.details?.overallSavingsMs ??
      (audit.numericUnit === "millisecond" ? audit.numericValue : null) ?? null;
    const savings_bytes = audit.details?.overallSavingsBytes ?? null;

    // Include if there are savings or if the score is below 0.5
    if (savings_ms || savings_bytes || score < 0.5) {
      opportunities.push({
        id: audit.id || auditId,
        title: audit.title || auditId,
        description: audit.description ?? null,
        savings_ms: savings_ms ? Math.round(savings_ms) : null,
        savings_bytes: savings_bytes ? Math.round(savings_bytes) : null,
        score: score,
        displayValue: audit.displayValue ?? null,
      });
    }
  }

  return opportunities.sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0));
}

function extractDiagnostics(data: PSIResponse): CWVDiagnostic[] {
  const audits = data.lighthouseResult?.audits;
  if (!audits) return [];

  const diagnostics: CWVDiagnostic[] = [];

  for (const auditId of DIAGNOSTIC_AUDIT_IDS) {
    const audit = audits[auditId];
    if (!audit) continue;

    // Skip if it's already an opportunity (has savings) or is passing
    const score = audit.score;
    if (score === 1) continue;

    // Only include diagnostics that have useful information
    const hasDetails = audit.details?.items && audit.details.items.length > 0;
    const hasDisplayValue = !!audit.displayValue;
    const isInformative = audit.scoreDisplayMode === "informative" || audit.scoreDisplayMode === "numeric";

    if (hasDetails || hasDisplayValue || isInformative) {
      diagnostics.push({
        id: audit.id || auditId,
        title: audit.title || auditId,
        description: audit.description ?? null,
        displayValue: audit.displayValue ?? null,
        score: score ?? null,
        details: audit.details ? {
          type: audit.details.type,
          itemCount: audit.details.items?.length ?? 0,
          summary: audit.details.summary ?? null,
        } : null,
      });
    }
  }

  return diagnostics;
}

function extractPassedAudits(data: PSIResponse): CWVPassedAudit[] {
  const audits = data.lighthouseResult?.audits;
  if (!audits) return [];

  const passedAudits: CWVPassedAudit[] = [];
  const allOpportunityIds = new Set(OPPORTUNITY_AUDIT_IDS);
  const allDiagnosticIds = new Set(DIAGNOSTIC_AUDIT_IDS);

  for (const [auditId, audit] of Object.entries(audits)) {
    if (!audit) continue;

    // Only include passing audits (score === 1)
    if (audit.score !== 1) continue;

    // Skip metric audits (they're in the metrics section)
    const metricAudits = [
      "first-contentful-paint", "largest-contentful-paint", "speed-index",
      "total-blocking-time", "cumulative-layout-shift", "interactive", "max-potential-fid",
    ];
    if (metricAudits.includes(auditId)) continue;

    // Skip if it's a binary/informative audit that always passes
    if (audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "manual") continue;

    // Include meaningful passed audits
    if (allOpportunityIds.has(auditId) || allDiagnosticIds.has(auditId) || audit.scoreDisplayMode === "binary") {
      passedAudits.push({
        id: audit.id || auditId,
        title: audit.title || auditId,
        description: audit.description ?? null,
      });
    }
  }

  return passedAudits;
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestration Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run CWV analysis for a domain during orchestration dispatch.
 * Tests the homepage on mobile, returns comprehensive PageSpeed data.
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
    logger.info("CWV", `PSI analysis complete for ${url} — Performance: ${result.metrics.lab.performance_score}, Accessibility: ${result.metrics.lab.accessibility_score}, Best Practices: ${result.metrics.lab.best_practices_score}, SEO: ${result.metrics.lab.seo_score}`);
  }

  return {
    ok: !result.error,
    service: "core_web_vitals",
    url,
    strategy: "mobile",

    // Category scores (0-100)
    performance_score: result.metrics.lab.performance_score,
    accessibility_score: result.metrics.lab.accessibility_score,
    best_practices_score: result.metrics.lab.best_practices_score,
    seo_score: result.metrics.lab.seo_score,

    // Field data (real user data from CrUX)
    field: result.metrics.field,

    // Lab data (synthetic Lighthouse test)
    lab: result.metrics.lab,

    // Metadata
    meta: result.metrics.meta,

    // LCP/FCP element identification
    elements: result.metrics.elements,

    // Resource breakdown
    resources: result.metrics.resources,

    // Opportunities (failing audits with potential savings)
    opportunities: result.opportunities,
    opportunity_count: result.opportunities.length,

    // Diagnostics (informational audits)
    diagnostics: result.diagnostics,
    diagnostic_count: result.diagnostics.length,

    // Passed audits
    passed_audits: result.passedAudits,
    passed_count: result.passedAudits.length,

    error: result.error,
  };
}
