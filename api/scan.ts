import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db";
import { randomUUID } from "crypto";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/** Ensure scan_requests table exists (idempotent) */
async function ensureTable(pool: ReturnType<typeof getPool>) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scan_requests (
      id SERIAL PRIMARY KEY,
      scan_id TEXT NOT NULL UNIQUE,
      target_url TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      email TEXT,
      preview_findings JSONB,
      full_report JSONB,
      score_summary JSONB,
      geo_scope TEXT,
      geo_location JSONB,
      error_message TEXT,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

/** Ensure free_reports table exists (idempotent) */
async function ensureReportsTable(pool: ReturnType<typeof getPool>) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS free_reports (
      id SERIAL PRIMARY KEY,
      report_id TEXT NOT NULL UNIQUE,
      scan_id TEXT NOT NULL,
      website_url TEXT NOT NULL,
      website_domain TEXT NOT NULL,
      report_version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'generating',
      summary JSONB,
      competitors JSONB,
      keywords JSONB,
      technical JSONB,
      performance JSONB,
      next_steps JSONB,
      meta JSONB,
      visibility_mode TEXT DEFAULT 'full',
      limited_visibility_reason TEXT,
      limited_visibility_steps JSONB,
      share_token TEXT,
      share_token_expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

/** Simple fetch with timeout for external APIs */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Lightweight PageSpeed Insights check (no heavy deps) */
async function checkPageSpeed(targetUrl: string): Promise<{ ok: boolean; data: any }> {
  try {
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(`https://${targetUrl}`)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ""}`;
    const res = await fetchWithTimeout(psiUrl, {}, 20000);
    if (!res.ok) return { ok: false, data: null };
    const json = await res.json();
    const lhr = json.lighthouseResult;
    return {
      ok: true,
      data: {
        performance_score: lhr?.categories?.performance?.score != null ? Math.round(lhr.categories.performance.score * 100) : null,
        lab: {
          lcp_ms: lhr?.audits?.["largest-contentful-paint"]?.numericValue || null,
          cls: lhr?.audits?.["cumulative-layout-shift"]?.numericValue || null,
        },
        url: `https://${targetUrl}`,
      },
    };
  } catch {
    return { ok: false, data: null };
  }
}

/** Simple HTTP check for basic technical signals */
async function checkTechnical(targetUrl: string): Promise<{ ok: boolean; data: any }> {
  try {
    const fullUrl = `https://${targetUrl}`;
    const res = await fetchWithTimeout(fullUrl, {
      headers: { "User-Agent": "Arclo-SEO-Scanner/1.0" },
      redirect: "follow",
    }, 10000);
    const html = await res.text();
    const hasTitle = /<title[^>]*>.+<\/title>/i.test(html);
    const hasMetaDesc = /<meta[^>]*name=["']description["'][^>]*>/i.test(html);
    const hasH1 = /<h1[^>]*>/i.test(html);
    const hasCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
    const hasRobotsMeta = /<meta[^>]*name=["']robots["'][^>]*>/i.test(html);
    const findings: any[] = [];
    if (!hasTitle) findings.push({ ruleId: "RULE_TITLE_MISSING", category: "meta", severity: "high", summary: "Page is missing a title tag" });
    if (!hasMetaDesc) findings.push({ ruleId: "RULE_META_DESC_MISSING", category: "meta", severity: "medium", summary: "Page is missing a meta description" });
    if (!hasH1) findings.push({ ruleId: "RULE_H1_MISSING", category: "content", severity: "medium", summary: "Page is missing an H1 heading" });
    if (!hasCanonical) findings.push({ ruleId: "RULE_CANONICAL_MISSING", category: "indexability", severity: "low", summary: "Page is missing a canonical tag" });
    return {
      ok: true,
      data: {
        ok: true,
        pages_crawled: 1,
        findings,
        findings_by_category: { meta: findings.filter(f => f.category === "meta").length, content: findings.filter(f => f.category === "content").length },
        summary: { total_pages: 1, errors: res.status >= 400 ? 1 : 0 },
        pages_summary: [{ url: fullUrl, status: res.status }],
      },
    };
  } catch {
    return { ok: false, data: null };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  let pool: ReturnType<typeof getPool>;
  let scanId = "";

  try {
    pool = getPool();
  } catch (dbErr: any) {
    console.error("[Scan] Database pool error:", dbErr);
    return res.status(500).json({ ok: false, message: "Database connection failed: " + (dbErr.message || "unknown") });
  }

  try {
    // Ensure tables exist
    await ensureTable(pool);
    await ensureReportsTable(pool);

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!body?.url || typeof body.url !== "string") {
      return res.status(400).json({ ok: false, message: "Valid URL is required" });
    }

    let normalizedUrl = body.url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return res.status(400).json({ ok: false, message: "Valid URL is required" });
    }

    const geoLocation = body.geoLocation || null;
    scanId = `scan_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const geoScope = geoLocation ? "local" : null;
    const geoLocationJson = geoLocation ? JSON.stringify(geoLocation) : null;

    // Insert scan
    await pool.query(
      `INSERT INTO scan_requests (scan_id, target_url, normalized_url, status, geo_scope, geo_location, created_at, updated_at)
       VALUES ($1, $2, $3, 'queued', $4, $5::jsonb, NOW(), NOW())`,
      [scanId, body.url, normalizedUrl, geoScope, geoLocationJson]
    );

    // Update to running
    await pool.query(
      `UPDATE scan_requests SET status = 'running', started_at = NOW(), updated_at = NOW() WHERE scan_id = $1`,
      [scanId]
    );

    // Extract domain
    let targetDomain: string;
    try {
      targetDomain = new URL(normalizedUrl).hostname.replace(/^www\./, "");
    } catch {
      targetDomain = normalizedUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }

    // Run lightweight analysis (no heavy server imports needed)
    const [technicalResult, cwvResult] = await Promise.allSettled([
      checkTechnical(targetDomain),
      checkPageSpeed(targetDomain),
    ]);

    const crawlerData = technicalResult.status === "fulfilled" ? technicalResult.value : { ok: false, data: null };
    const cwvData = cwvResult.status === "fulfilled" ? cwvResult.value : { ok: false, data: null };

    // Build findings
    const findings: any[] = [];
    let findingIndex = 1;
    let technicalIssueCount = 0, missingMetaCount = 0, missingH1Count = 0, brokenLinksCount = 0, contentIssueCount = 0;

    if (crawlerData.ok && crawlerData.data) {
      const cd = crawlerData.data;
      const crawlFindings = cd.findings || [];
      technicalIssueCount = crawlFindings.length;
      brokenLinksCount = (cd.summary?.errors) || 0;
      const fbc = cd.findings_by_category || {};
      contentIssueCount = (fbc.meta || 0) + (fbc.content || 0);
      for (const f of crawlFindings) {
        if (f.ruleId?.includes("META_DESC")) missingMetaCount++;
        if (f.ruleId?.includes("H1")) missingH1Count++;
      }
      if (missingMetaCount > 0) findings.push({ id: `finding_${findingIndex++}`, title: "Missing Meta Descriptions", severity: "medium", impact: "Medium", effort: "Low", summary: `${missingMetaCount} page(s) missing meta descriptions.` });
      if (missingH1Count > 0) findings.push({ id: `finding_${findingIndex++}`, title: "Missing H1 Tags", severity: "medium", impact: "Medium", effort: "Low", summary: `${missingH1Count} page(s) missing H1 tags.` });
      if (brokenLinksCount > 0) findings.push({ id: `finding_${findingIndex++}`, title: "Broken Links Detected", severity: "high", impact: "High", effort: "Medium", summary: `${brokenLinksCount} page(s) return error status codes.` });
    } else {
      missingMetaCount = 5; missingH1Count = 2;
      findings.push({ id: `finding_${findingIndex++}`, title: "Missing Meta Descriptions", severity: "high", impact: "High", effort: "Low", summary: "Some pages may be missing meta descriptions." });
    }

    let performanceScore = 85;
    if (cwvData.ok && cwvData.data) {
      const cwv = cwvData.data;
      const lcpValue = cwv.lab?.lcp_ms || null;
      const clsValue = cwv.lab?.cls ?? null;
      if (cwv.performance_score != null) performanceScore = cwv.performance_score;
      else {
        const lcpS = lcpValue ? (lcpValue > 4000 ? 30 : lcpValue > 2500 ? 60 : 90) : 100;
        const clsS = clsValue !== null ? (clsValue > 0.25 ? 30 : clsValue > 0.1 ? 60 : 90) : 100;
        performanceScore = Math.round(lcpS * 0.6 + clsS * 0.4);
      }
      if (lcpValue && lcpValue > 2500) findings.push({ id: `finding_${findingIndex++}`, title: "Slow Page Speed", severity: lcpValue > 4000 ? "high" : "medium", impact: lcpValue > 4000 ? "High" : "Medium", effort: "Medium", summary: `LCP is ${(lcpValue / 1000).toFixed(1)}s on mobile.` });
      if (clsValue !== null && clsValue > 0.1) findings.push({ id: `finding_${findingIndex++}`, title: "Layout Shifts Detected", severity: clsValue > 0.25 ? "high" : "medium", impact: clsValue > 0.25 ? "High" : "Medium", effort: "Medium", summary: `CLS is ${clsValue.toFixed(2)}.` });
    } else {
      performanceScore = 70;
      findings.push({ id: `finding_${findingIndex++}`, title: "Performance Analysis Limited", severity: "low", impact: "Medium", effort: "Low", summary: "Core Web Vitals analysis was limited." });
    }

    const technicalScore = Math.max(20, 100 - technicalIssueCount * 5 - brokenLinksCount * 10);
    const contentScore = Math.max(20, 100 - missingMetaCount * 8 - missingH1Count * 6 - contentIssueCount * 3);
    const serpScore = 50;
    const authorityScore = 50;
    const overallScore = Math.round(technicalScore * 0.25 + performanceScore * 0.25 + contentScore * 0.20 + serpScore * 0.15 + authorityScore * 0.15);

    const severity = 100 - overallScore;
    const trafficAtRisk = Math.max(200, Math.round(severity * 35 + findings.length * 50));
    const clicksLost = Math.max(100, Math.round(trafficAtRisk * 1.5));

    const scoreSummary = {
      overall: Math.min(100, Math.max(0, overallScore)),
      technical: Math.min(100, Math.max(0, technicalScore)),
      content: Math.min(100, Math.max(0, contentScore)),
      performance: Math.min(100, Math.max(0, performanceScore)),
      serp: serpScore,
      authority: authorityScore,
      costOfInaction: {
        trafficAtRisk, clicksLost,
        leadsMin: Math.max(5, Math.round(clicksLost * 0.025 * 0.6)),
        leadsMax: Math.max(15, Math.round(clicksLost * 0.025 * 1.6)),
        pageOneOpportunities: Math.max(3, findings.length),
      },
    };

    const visibilityMode = crawlerData.ok ? "full" : "limited";
    const fullReport = {
      visibilityMode,
      limitedVisibilityReason: !crawlerData.ok ? "Crawl was limited" : null,
      limitedVisibilitySteps: !crawlerData.ok ? ["Allow our crawler access", "Submit your sitemap"] : [],
      technical: crawlerData.data || null,
      performance: cwvData.data || null,
      serp: null,
      competitive: null,
      backlinks: null,
      keywords: { quickWins: [{ keyword: "Keyword analysis pending", position: 0 }], declining: [] },
      competitors: [{ domain: "Competitor analysis pending", overlap: 0 }],
      contentGaps: [],
      authority: { domainAuthority: null, referringDomains: null },
    };

    await pool.query(
      `UPDATE scan_requests
       SET status = 'preview_ready',
           preview_findings = $1::jsonb,
           score_summary = $2::jsonb,
           full_report = $3::jsonb,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE scan_id = $4`,
      [JSON.stringify(findings), JSON.stringify(scoreSummary), JSON.stringify(fullReport), scanId]
    );

    return res.status(200).json({
      ok: true,
      scanId,
      status: "queued",
      message: "Scan started successfully",
    });
  } catch (error: any) {
    console.error("[Scan] Failed:", error?.message, error?.stack);

    // Try to mark scan as failed in DB
    if (scanId && pool!) {
      await pool!.query(
        `UPDATE scan_requests SET status = 'failed', error_message = $1, updated_at = NOW() WHERE scan_id = $2`,
        [error?.message?.slice(0, 500) || "Scan failed", scanId]
      ).catch(() => {});
    }

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: error?.message || "Failed to start scan. Please try again.",
      });
    }
  }
}
