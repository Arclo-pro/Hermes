import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { randomUUID } from "crypto";
import { scanHomepageServices, type HomepageScanResult } from "./_lib/homepageServiceScan.js";
import { buildSerpKeywords, buildFallbackKeywords, type SerpKeyword } from "./_lib/serpKeywordBuilder.js";
import { runAgent, skipAgent, finalizeAgentSummary } from "./_lib/agentRunner.js";
import { analyzeCompetitors, type CompetitiveResult } from "./_lib/competitiveAnalyzer.js";
import { analyzePageForAtlas, type AtlasResult } from "./_lib/atlasAnalyzer.js";
import { updateRollup } from "./_lib/rollupAggregator.js";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

type ScanMode = "light" | "full";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method === "GET") return res.json({ ok: true, fn: "scan", ts: Date.now() });
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body?.url || typeof body.url !== "string") {
      return res.status(400).json({ ok: false, message: "Valid URL is required" });
    }

    let normalizedUrl = body.url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try { new URL(normalizedUrl); } catch { return res.status(400).json({ ok: false, message: "Invalid URL format" }); }

    const pool = getPool();
    const geoLocation = body.geoLocation || null;
    const scanMode: ScanMode = body.mode === "full" ? "full" : "light";
    const force = body.force === true;

    // Extract domain
    let domain: string;
    try { domain = new URL(normalizedUrl).hostname.replace(/^www\./, ""); }
    catch { domain = normalizedUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; }

    // ── Ensure tables & columns exist BEFORE any queries ────────────
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
        scan_mode TEXT DEFAULT 'light',
        domain TEXT,
        idempotency_key TEXT,
        agent_summary JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Ensure columns exist on pre-existing tables
    await pool.query(`ALTER TABLE scan_requests ADD COLUMN IF NOT EXISTS idempotency_key TEXT`);
    await pool.query(`ALTER TABLE scan_requests ADD COLUMN IF NOT EXISTS domain TEXT`);
    await pool.query(`ALTER TABLE scan_requests ADD COLUMN IF NOT EXISTS scan_mode TEXT DEFAULT 'light'`);
    await pool.query(`ALTER TABLE scan_requests ADD COLUMN IF NOT EXISTS agent_summary JSONB`);

    // ── Idempotency check (columns now guaranteed to exist) ─────────
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `${domain}-${scanMode}-${today}`;

    if (!force) {
      const existing = await pool.query(
        `SELECT scan_id, status FROM scan_requests
         WHERE idempotency_key = $1 AND status IN ('running', 'preview_ready', 'completed')
         LIMIT 1`,
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        console.log(`[Scan] idempotency_hit { domain: "${domain}", key: "${idempotencyKey}", existingScanId: "${existing.rows[0].scan_id}" }`);
        return res.status(200).json({
          ok: true,
          scanId: existing.rows[0].scan_id,
          status: existing.rows[0].status,
          message: "Existing scan found for today",
          deduplicated: true,
        });
      }
    }

    const scanId = `scan_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS free_reports (
        id SERIAL PRIMARY KEY,
        report_id TEXT NOT NULL UNIQUE,
        scan_id TEXT NOT NULL,
        website_url TEXT NOT NULL,
        website_domain TEXT NOT NULL,
        report_version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'generating',
        summary JSONB, competitors JSONB, keywords JSONB,
        technical JSONB, performance JSONB, next_steps JSONB, meta JSONB,
        visibility_mode TEXT DEFAULT 'full',
        limited_visibility_reason TEXT,
        limited_visibility_steps JSONB,
        share_token TEXT,
        share_token_expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id SERIAL PRIMARY KEY,
        scan_id TEXT NOT NULL,
        crew_id TEXT NOT NULL,
        agent_step TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        scan_mode TEXT NOT NULL DEFAULT 'light',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        rows_written INTEGER DEFAULT 0,
        result_summary JSONB,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_rollups (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        latest_scan_id TEXT,
        scan_mode TEXT,
        overall_score NUMERIC,
        technical_score NUMERIC,
        performance_score NUMERIC,
        serp_score NUMERIC,
        content_score NUMERIC,
        findings_count INTEGER DEFAULT 0,
        scan_count INTEGER DEFAULT 1,
        first_scan_at TIMESTAMP,
        latest_scan_at TIMESTAMP,
        score_trend JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert scan record with new columns
    await pool.query(
      `INSERT INTO scan_requests (scan_id, target_url, normalized_url, status, geo_scope, geo_location, scan_mode, domain, idempotency_key, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'running', $4, $5::jsonb, $6, $7, $8, NOW(), NOW(), NOW())`,
      [scanId, body.url, normalizedUrl, geoLocation ? "local" : null, geoLocation ? JSON.stringify(geoLocation) : null, scanMode, domain, idempotencyKey]
    );

    console.log(`[Scan] scan_started { scanId: "${scanId}", domain: "${domain}", mode: "${scanMode}" }`);

    // Derive location string from geoLocation payload
    const locationStr: string | null = geoLocation
      ? (geoLocation.city && geoLocation.region
          ? `${geoLocation.city}, ${geoLocation.region}`
          : geoLocation.city || geoLocation.region || geoLocation.label || null)
      : null;

    // ════════════════════════════════════════════════════════════════
    // Phase A: Run agents in parallel
    // ════════════════════════════════════════════════════════════════

    // Shared state populated by agents
    let technicalOk = false;
    let rawHtml = "";
    let crawlerFindings: any[] = [];
    let crawlerSummary: any = null;
    let pagesCrawled = 0;

    let performanceScore = 70;
    let lcpMs: number | null = null;
    let clsValue: number | null = null;
    let fcpMs: number | null = null;
    let tbtMs: number | null = null;
    let speedIndex: number | null = null;
    let psiAuditRecommendations: any[] = [];
    let psiOk = false;

    let homepageScan: HomepageScanResult | null = null;
    let serpKeywordList: SerpKeyword[] = [];
    let serpResults: any[] = [];
    let serpRunOk = false;
    let serviceDetectionWarning = false;

    // ── Phase A: Scotty + Speedster in parallel (independent) ──────
    const [scottyResult, speedsterResult] = await Promise.all([
      // Agent: Scotty (Technical Crawl — full crawler)
      runAgent(
        { scanId, crewId: "scotty", agentStep: "technical_crawl", scanMode },
        pool,
        async () => {
          const { runTechnicalCrawl } = await import("./_lib/crawler/crawlerEngine.js");
          const result = await runTechnicalCrawl(domain, { maxPages: 10, maxDepth: 1, concurrency: 3 });
          // Extract shared state for downstream agents
          technicalOk = result.ok;
          rawHtml = result.homepage_html || "";
          crawlerFindings = result.findings || [];
          crawlerSummary = result.summary || null;
          pagesCrawled = result.pages_crawled || 0;
          return result;
        }
      ),
      // Agent: Speedster (Core Web Vitals)
      runAgent(
        { scanId, crewId: "speedster", agentStep: "cwv", scanMode },
        pool,
        async () => {
          const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";
          const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(`https://${domain}`)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ""}`;
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 20000);
          try {
            const psiRes = await fetch(psiUrl, { signal: ctrl.signal });
            if (!psiRes.ok) throw new Error(`PSI returned ${psiRes.status}`);
            const psiJson = await psiRes.json();
            const lhr = psiJson.lighthouseResult;
            if (lhr?.categories?.performance?.score != null) {
              performanceScore = Math.round(lhr.categories.performance.score * 100);
            }
            lcpMs = lhr?.audits?.["largest-contentful-paint"]?.numericValue || null;
            clsValue = lhr?.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
            fcpMs = lhr?.audits?.["first-contentful-paint"]?.numericValue || null;
            tbtMs = lhr?.audits?.["total-blocking-time"]?.numericValue || null;
            speedIndex = lhr?.audits?.["speed-index"]?.numericValue || null;

            // Extract top audit recommendations where score < 1
            if (lhr?.audits) {
              const auditEntries = Object.entries(lhr.audits) as [string, any][];
              psiAuditRecommendations = auditEntries
                .filter(([_, audit]) => audit.score !== null && audit.score < 1 && audit.title && audit.description)
                .sort((a, b) => (a[1].score ?? 0) - (b[1].score ?? 0))
                .slice(0, 5)
                .map(([id, audit]) => ({
                  id,
                  title: audit.title,
                  score: audit.score,
                  displayValue: audit.displayValue || null,
                }));
            }

            psiOk = true;
            return { performanceScore, lcpMs, clsValue, fcpMs, tbtMs, speedIndex, recommendations: psiAuditRecommendations };
          } finally {
            clearTimeout(t);
          }
        }
      ),
    ]);

    // ── Service Detection + Keyword Building (runs on Scotty's HTML) ──
    if (technicalOk && rawHtml) {
      try {
        homepageScan = scanHomepageServices(rawHtml, `https://${domain}`);
        if (homepageScan.services.length > 0) {
          const effectiveLocation = locationStr
            || (homepageScan.locationCues.length > 0
                ? homepageScan.locationCues.join(", ")
                : null);
          serpKeywordList = buildSerpKeywords(homepageScan.services, effectiveLocation, domain);
        } else {
          serviceDetectionWarning = true;
          serpKeywordList = buildFallbackKeywords(
            homepageScan.evidence.meta.title,
            homepageScan.evidence.meta.description,
            locationStr,
            domain,
          );
        }
      } catch (e) {
        serviceDetectionWarning = true;
        serpKeywordList = buildFallbackKeywords(null, null, locationStr, domain);
      }
    } else {
      serviceDetectionWarning = true;
      serpKeywordList = buildFallbackKeywords(null, null, locationStr, domain);
    }

    // ── Agent: Lookout (SERP Rankings) ──────────────────────────────
    if (serpKeywordList.length > 0 && process.env.SERPAPI_API_KEY) {
      const lookoutResult = await runAgent(
        { scanId, crewId: "lookout", agentStep: "serp", scanMode },
        pool,
        async () => {
          const SERP_TIMEOUT_MS = 45_000;
          const SERP_DELAY_MS = 1500;
          const serpCtrl = new AbortController();
          const serpTimer = setTimeout(() => serpCtrl.abort(), SERP_TIMEOUT_MS);

          const apiKey = process.env.SERPAPI_API_KEY!;
          const serpBase = "https://serpapi.com/search";
          const baseDomain = domain.replace(/^www\./, "").toLowerCase();

          for (let i = 0; i < serpKeywordList.length; i++) {
            if (serpCtrl.signal.aborted) break;

            const kw = serpKeywordList[i];
            try {
              const params = new URLSearchParams({
                api_key: apiKey,
                engine: "google",
                q: kw.keyword,
                ...(locationStr ? { location: locationStr } : {}),
                google_domain: "google.com",
                gl: "us",
                hl: "en",
                num: "20",
              });
              const resp = await fetch(`${serpBase}?${params}`, {
                signal: AbortSignal.timeout(30_000),
              });

              if (resp.ok) {
                const data = await resp.json();
                const organicResults = data.organic_results || [];
                let position: number | null = null;
                let url: string | null = null;
                const competitors: any[] = [];

                for (const result of organicResults) {
                  let resultDomain: string | null = null;
                  try { resultDomain = new URL(result.link).hostname.toLowerCase().replace(/^www\./, ""); } catch {}
                  if (!resultDomain) continue;

                  if (resultDomain === baseDomain || resultDomain === `www.${baseDomain}`) {
                    if (position === null) {
                      position = result.position;
                      url = result.link;
                    }
                  } else {
                    competitors.push({ domain: resultDomain, url: result.link, title: result.title, position: result.position });
                  }
                }
                serpResults.push({ keyword: kw.keyword, intent: kw.intent, source: kw.source, position, url, competitors: competitors.slice(0, 5) });
              } else {
                serpResults.push({ keyword: kw.keyword, intent: kw.intent, source: kw.source, position: null, url: null, competitors: [] });
              }
            } catch {
              serpResults.push({ keyword: kw.keyword, intent: kw.intent, source: kw.source, position: null, url: null, competitors: [] });
            }

            if (i < serpKeywordList.length - 1 && !serpCtrl.signal.aborted) {
              await new Promise(r => setTimeout(r, SERP_DELAY_MS));
            }
          }

          clearTimeout(serpTimer);
          serpRunOk = true;

          const ranking = serpResults.filter(r => r.position !== null).length;
          return { checked: serpResults.length, ranking };
        }
      );
    } else if (!process.env.SERPAPI_API_KEY) {
      await skipAgent(
        { scanId, crewId: "lookout", agentStep: "serp", scanMode },
        pool,
        "SERPAPI_API_KEY not configured"
      );
    }

    // ── Agent: Competitive Intelligence (inline, replaces Natasha) ──
    let competitiveResult: CompetitiveResult | null = null;
    if (serpRunOk && serpResults.length > 0) {
      const compRun = await runAgent(
        { scanId, crewId: "natasha", agentStep: "competitive", scanMode },
        pool,
        async () => {
          return analyzeCompetitors(domain, serpResults, { maxKeywords: 5, fetchTimeout: 5000 });
        }
      );
      competitiveResult = compRun.result;
    } else {
      await skipAgent(
        { scanId, crewId: "natasha", agentStep: "competitive", scanMode },
        pool,
        "No SERP data available for competitive analysis"
      );
    }

    // ── Agent: Atlas (AI Search Optimization) ───────────────────────
    let atlasResult: AtlasResult | null = null;
    if (technicalOk && rawHtml) {
      const atlasRun = await runAgent(
        { scanId, crewId: "atlas", agentStep: "atlas_ai", scanMode },
        pool,
        async () => analyzePageForAtlas(rawHtml, `https://${domain}`)
      );
      atlasResult = atlasRun.result;
    } else {
      await skipAgent(
        { scanId, crewId: "atlas", agentStep: "atlas_ai", scanMode },
        pool,
        "No HTML available (technical crawl failed)"
      );
    }

    // ════════════════════════════════════════════════════════════════
    // Post-scan: scoring, findings, report assembly
    // ════════════════════════════════════════════════════════════════

    // Compute SERP score
    let serpScore = 50;
    if (serpRunOk && serpResults.length > 0) {
      const total = serpResults.length;
      const top3 = serpResults.filter(r => r.position !== null && r.position <= 3).length;
      const top10 = serpResults.filter(r => r.position !== null && r.position <= 10).length;
      const top20 = serpResults.filter(r => r.position !== null && r.position <= 20).length;
      const ranking = serpResults.filter(r => r.position !== null).length;

      serpScore = Math.round(
        Math.min(100, Math.max(0,
          (top3 / total) * 100 * 0.4 +
          (top10 / total) * 100 * 0.3 +
          (top20 / total) * 100 * 0.2 +
          (ranking / total) * 100 * 0.1
        ))
      );
    }

    // Build findings from crawler output
    const findings: any[] = [];
    let idx = 1;

    if (technicalOk && crawlerFindings.length > 0) {
      // Map crawler findings to report findings format
      const severityImpactMap: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
      const severityEffortMap: Record<string, string> = { critical: "High", high: "Medium", medium: "Low", low: "Low" };

      for (const cf of crawlerFindings) {
        findings.push({
          id: `f_${idx++}`,
          title: cf.summary,
          severity: cf.severity,
          impact: severityImpactMap[cf.severity] || "Medium",
          effort: severityEffortMap[cf.severity] || "Low",
          summary: cf.summary,
          category: cf.category,
          ruleId: cf.ruleId,
          url: cf.url,
          evidence: cf.evidence,
          suggestedAction: cf.suggestedAction,
        });
      }
    } else if (!technicalOk) {
      findings.push({ id: `f_${idx++}`, title: "Site Could Not Be Fully Analyzed", severity: "medium", impact: "High", effort: "Low", summary: "Our crawler could not fully access your site." });
    }

    if (psiOk) {
      if (lcpMs && lcpMs > 2500) findings.push({ id: `f_${idx++}`, title: "Slow Page Speed", severity: lcpMs > 4000 ? "high" : "medium", impact: lcpMs > 4000 ? "High" : "Medium", effort: "Medium", summary: `LCP is ${(lcpMs / 1000).toFixed(1)}s on mobile.` });
      if (clsValue !== null && clsValue > 0.1) findings.push({ id: `f_${idx++}`, title: "Layout Shifts Detected", severity: clsValue > 0.25 ? "high" : "medium", impact: clsValue > 0.25 ? "High" : "Medium", effort: "Medium", summary: `CLS is ${clsValue.toFixed(2)}.` });
    } else {
      performanceScore = 70;
      findings.push({ id: `f_${idx++}`, title: "Performance Analysis Limited", severity: "low", impact: "Medium", effort: "Low", summary: "Core Web Vitals analysis was limited." });
    }

    // Calculate scores using crawler health score when available
    const technicalScore = crawlerSummary?.health_score ?? Math.max(20, 100 - findings.filter(f => f.severity === "high" || f.severity === "medium").length * 10);
    const contentFindings = findings.filter(f => f.category === "titles" || f.category === "headings" || f.category === "content");
    const contentScore = Math.max(20, 100 - contentFindings.length * 8);
    const authorityScore = 50;
    const overall = Math.round(technicalScore * 0.25 + performanceScore * 0.25 + contentScore * 0.2 + serpScore * 0.15 + authorityScore * 0.15);

    const severity = 100 - overall;
    const trafficAtRisk = Math.max(200, Math.round(severity * 35 + findings.length * 50));
    const clicksLost = Math.max(100, Math.round(trafficAtRisk * 1.5));

    const scoreSummary = {
      overall: Math.min(100, Math.max(0, overall)),
      technical: Math.min(100, Math.max(0, technicalScore)),
      content: Math.min(100, Math.max(0, contentScore)),
      performance: Math.min(100, Math.max(0, performanceScore)),
      serp: serpScore,
      authority: authorityScore,
      costOfInaction: {
        trafficAtRisk,
        clicksLost,
        leadsMin: Math.max(5, Math.round(clicksLost * 0.025 * 0.6)),
        leadsMax: Math.max(15, Math.round(clicksLost * 0.025 * 1.6)),
        pageOneOpportunities: Math.max(3, findings.length),
      },
    };

    const visibilityMode = technicalOk ? "full" : "limited";
    const fullReport = {
      visibilityMode,
      scan_mode: scanMode,
      limitedVisibilityReason: !technicalOk ? "Crawl was limited" : null,
      limitedVisibilitySteps: !technicalOk ? ["Allow our crawler access", "Submit your sitemap"] : [],
      technical: technicalOk ? {
        ok: true,
        pages_crawled: pagesCrawled,
        findings: findings.filter(f => f.category && f.category !== "performance"),
        summary: crawlerSummary,
      } : null,
      performance: psiOk ? {
        ok: true,
        performance_score: performanceScore,
        lab: { lcp_ms: lcpMs, cls: clsValue, fcp_ms: fcpMs, tbt_ms: tbtMs, speed_index: speedIndex },
        recommendations: psiAuditRecommendations,
        url: `https://${domain}`,
      } : null,
      serp: serpRunOk ? { ok: true, results: serpResults } : null,
      competitive: competitiveResult ? {
        ok: true,
        findings: competitiveResult.findings,
        findings_count: competitiveResult.findings_count,
        competitors: competitiveResult.competitors,
        summary: competitiveResult.summary,
      } : null,
      backlinks: null,
      keywords: serpRunOk
        ? { quickWins: serpResults.filter(r => r.position !== null && r.position <= 20).map(r => ({ keyword: r.keyword, position: r.position })), declining: [] }
        : { quickWins: [{ keyword: "Keyword analysis pending", position: 0 }], declining: [] },
      competitors: competitiveResult?.competitors || [],
      contentGaps: [],
      authority: { domainAuthority: null, referringDomains: null },
      homepage_scan: homepageScan,
      serp_keywords: serpKeywordList.map(k => ({ keyword: k.keyword, intent: k.intent, source: k.source })),
      serp_results: serpResults,
      serviceDetectionWarning,
      ai_search: atlasResult ? {
        ai_visibility_score: atlasResult.ai_visibility_score,
        structured_data_coverage: atlasResult.structured_data_coverage,
        entity_coverage: atlasResult.entity_coverage,
        llm_answerability: atlasResult.llm_answerability,
        checklist: atlasResult.checklist,
        findings: atlasResult.findings,
      } : null,
    };

    // Finalize agent summary
    await finalizeAgentSummary(scanId, pool);

    // Update rollup aggregation
    await updateRollup(pool, domain, scanId, scanMode, {
      overall: scoreSummary.overall,
      technical: scoreSummary.technical,
      performance: scoreSummary.performance,
      serp: scoreSummary.serp,
      content: scoreSummary.content,
    });

    // Update scan to preview_ready
    await pool.query(
      `UPDATE scan_requests
       SET status = 'preview_ready', preview_findings = $1::jsonb, score_summary = $2::jsonb,
           full_report = $3::jsonb, completed_at = NOW(), updated_at = NOW()
       WHERE scan_id = $4`,
      [JSON.stringify(findings), JSON.stringify(scoreSummary), JSON.stringify(fullReport), scanId]
    );

    const totalMs = Date.now() - parseInt(scanId.split("_")[1]);
    console.log(`[ScanComplete] { scanId: "${scanId}", domain: "${domain}", mode: "${scanMode}", totalMs: ${totalMs} }`);

    return res.status(200).json({ ok: true, scanId, status: "queued", message: "Scan started successfully" });
  } catch (error: any) {
    console.error("[Scan] Unhandled error:", error?.message, error?.stack);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: error?.message || "Scan failed" });
    }
  }
}
