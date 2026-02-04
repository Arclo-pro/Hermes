/**
 * PageSpeed Insights API utility for Vercel API routes.
 * Fetches Core Web Vitals and performance data directly from Google PSI.
 */

const PSI_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface PageSpeedResult {
  ok: boolean;
  error: string | null;
  performanceScore: number | null;
  coreWebVitals: {
    lcp: number | null;  // seconds
    fid: number | null;  // milliseconds
    cls: number | null;  // score
    fcp: number | null;  // seconds
    ttfb: number | null; // milliseconds
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string | null;
    severity: "error" | "warning" | "info";
    savingsMs: number | null;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    displayValue: string | null;
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch PageSpeed Insights data for a URL.
 * Uses mobile strategy by default.
 */
export async function fetchPageSpeedData(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  const emptyResult: PageSpeedResult = {
    ok: false,
    error: null,
    performanceScore: null,
    coreWebVitals: { lcp: null, fid: null, cls: null, fcp: null, ttfb: null },
    opportunities: [],
    diagnostics: [],
  };

  // Build API URL
  const params = new URLSearchParams({ url, strategy, category: "performance" });
  if (apiKey) params.set("key", apiKey);

  // Retry logic
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${PSI_API_URL}?${params}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`[PageSpeed] Rate limited, waiting ${Math.round(waitTime)}ms`);
        await sleep(waitTime);
        continue;
      }

      if (response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`[PageSpeed] Server error ${response.status}, retrying`);
        await sleep(waitTime);
        continue;
      }

      const data = await response.json();

      if (data.error) {
        return { ...emptyResult, error: data.error.message || "API error" };
      }

      // Extract data from response
      const lighthouse = data.lighthouseResult;
      const audits = lighthouse?.audits || {};
      const fieldMetrics = data.loadingExperience?.metrics || data.originLoadingExperience?.metrics || {};

      // Performance score (0-100)
      const performanceScore = lighthouse?.categories?.performance?.score != null
        ? Math.round(lighthouse.categories.performance.score * 100)
        : null;

      // Core Web Vitals (prefer field data, fallback to lab)
      const coreWebVitals = {
        lcp: fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile
          ? fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile / 1000  // Convert to seconds
          : audits["largest-contentful-paint"]?.numericValue
            ? audits["largest-contentful-paint"].numericValue / 1000
            : null,
        fid: audits["max-potential-fid"]?.numericValue || null,
        cls: fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
          ? fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : audits["cumulative-layout-shift"]?.numericValue || null,
        fcp: fieldMetrics.FIRST_CONTENTFUL_PAINT_MS?.percentile
          ? fieldMetrics.FIRST_CONTENTFUL_PAINT_MS.percentile / 1000
          : audits["first-contentful-paint"]?.numericValue
            ? audits["first-contentful-paint"].numericValue / 1000
            : null,
        ttfb: fieldMetrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile || null,
      };

      // Extract opportunities (failing performance audits)
      const opportunityIds = [
        "render-blocking-resources",
        "unused-css-rules",
        "unused-javascript",
        "modern-image-formats",
        "uses-optimized-images",
        "offscreen-images",
        "server-response-time",
        "uses-text-compression",
        "total-byte-weight",
        "dom-size",
        "bootup-time",
        "mainthread-work-breakdown",
        "third-party-summary",
        "lcp-lazy-loaded",
      ];

      const opportunities: PageSpeedResult["opportunities"] = [];
      for (const id of opportunityIds) {
        const audit = audits[id];
        if (!audit || audit.score === null || audit.score >= 0.9) continue;

        const savingsMs = audit.details?.overallSavingsMs ||
          (audit.numericUnit === "millisecond" ? audit.numericValue : null);

        opportunities.push({
          id,
          title: audit.title || id,
          description: audit.description || null,
          severity: audit.score < 0.5 ? "error" : "warning",
          savingsMs: savingsMs ? Math.round(savingsMs) : null,
        });
      }

      // Sort by savings
      opportunities.sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0));

      // Extract diagnostics
      const diagnosticIds = [
        "largest-contentful-paint-element",
        "layout-shift-elements",
        "long-tasks",
        "unsized-images",
      ];

      const diagnostics: PageSpeedResult["diagnostics"] = [];
      for (const id of diagnosticIds) {
        const audit = audits[id];
        if (!audit || audit.score === 1) continue;

        diagnostics.push({
          id,
          title: audit.title || id,
          displayValue: audit.displayValue || null,
        });
      }

      return {
        ok: true,
        error: null,
        performanceScore,
        coreWebVitals,
        opportunities: opportunities.slice(0, 5),
        diagnostics: diagnostics.slice(0, 3),
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      if (attempt === 2) {
        return { ...emptyResult, error: errMsg };
      }
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  return { ...emptyResult, error: "Failed after retries" };
}
