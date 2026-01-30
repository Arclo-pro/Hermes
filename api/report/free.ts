import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { randomUUID } from "crypto";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method === "GET") return res.json({ ok: true, fn: "report/free", ts: Date.now() });
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const scanId = body?.scanId;
    if (!scanId || typeof scanId !== "string") {
      return res.status(400).json({ ok: false, message: "scanId is required" });
    }

    const pool = getPool();

    const scanResult = await pool.query(
      `SELECT scan_id, target_url, normalized_url, status, preview_findings, full_report, score_summary
       FROM scan_requests WHERE scan_id = $1`,
      [scanId]
    );

    if (scanResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Scan not found" });
    }

    const scan = scanResult.rows[0];
    if (scan.status !== "preview_ready" && scan.status !== "completed") {
      return res.status(400).json({ ok: false, message: "Scan is not ready yet" });
    }

    const reportId = `fr_${Date.now()}_${randomUUID().slice(0, 8)}`;

    let domain: string;
    try { domain = new URL(scan.normalized_url || scan.target_url).hostname; }
    catch { domain = (scan.normalized_url || scan.target_url).replace(/^https?:\/\//, "").split("/")[0]; }

    const previewFindings = scan.preview_findings || [];
    const scoreSummary = scan.score_summary || {};
    const fullReport = scan.full_report || {};

    // Build technical buckets — match client TechnicalBucket/Finding interfaces
    const bucketMap: Record<string, any[]> = {};
    for (const f of previewFindings) {
      const cat = f.category || (f.title?.toLowerCase().includes("meta") ? "meta" : "errors");
      if (!bucketMap[cat]) bucketMap[cat] = [];
      bucketMap[cat].push({
        title: f.title || "Issue found",
        severity: f.severity || "medium",
        detail: f.summary || f.description || "",
        impact: f.impact || "both",
        example_urls: f.evidence || f.example_urls || [],
      });
    }

    const mapStatus = (findings: any[]) => {
      if (findings.some((f: any) => f.severity === "high")) return "critical";
      if (findings.some((f: any) => f.severity === "medium")) return "needs_attention";
      return "good";
    };

    const technicalBuckets = Object.entries(bucketMap).map(([name, findings]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
      status: mapStatus(findings),
      findings,
    }));

    if (technicalBuckets.length === 0) {
      technicalBuckets.push({ name: "General", status: "good", findings: [{ title: "No major issues detected", severity: "low", detail: "Initial scan looks good.", impact: "both", example_urls: [] }] });
    }

    // Performance
    const cwv = fullReport.performance || {};
    let performanceUrls: any[];
    if (cwv?.ok && cwv?.lab) {
      const lcpMs = cwv.lab.lcp_ms;
      const cls = cwv.lab.cls;
      const lcpStatus = lcpMs && lcpMs > 4000 ? "poor" : lcpMs && lcpMs > 2500 ? "needs_work" : "good";
      const clsStatus = cls !== null && cls > 0.25 ? "poor" : cls !== null && cls > 0.1 ? "needs_work" : "good";
      const overall = lcpStatus === "poor" || clsStatus === "poor" ? "critical" : lcpStatus === "needs_work" || clsStatus === "needs_work" ? "needs_attention" : "good";
      performanceUrls = [{ url: cwv.url || scan.normalized_url, lcp_status: lcpStatus, cls_status: clsStatus, inp_status: "not_available", overall }];
    } else {
      performanceUrls = [{ url: scan.normalized_url, lcp_status: "good", cls_status: "good", inp_status: "not_available", overall: "good" }];
    }

    // Keywords — match client KeywordTarget interface
    const baseName = domain.replace("www.", "").split(".")[0];
    const keywordTargets = [
      { keyword: `${domain.replace("www.", "")} services`, intent: "high_intent", volume_range: { min: 300, max: 700 }, current_bucket: "not_ranking" as const, position: null, winner_domain: null },
      { keyword: `best ${baseName}`, intent: "informational", volume_range: { min: 800, max: 1500 }, current_bucket: "not_ranking" as const, position: null, winner_domain: null },
      { keyword: `${baseName} near me`, intent: "high_intent", volume_range: { min: 500, max: 1000 }, current_bucket: "not_ranking" as const, position: null, winner_domain: null },
    ];

    // Competitors — match client Competitor interface
    const competitorItems = [
      { domain: `competitor1-${baseName}.com`, visibility_index: 0, keyword_overlap_count: 0, example_pages: [] as string[], notes: "Competitor data requires SERP API integration." },
      { domain: `competitor2-${baseName}.com`, visibility_index: 0, keyword_overlap_count: 0, example_pages: [] as string[], notes: "Competitor data requires SERP API integration." },
    ];

    // Summary — match client IssueOpportunity interface: { title, explanation, severity, impact, mapped_section }
    const healthScore = scoreSummary.overall ?? 65;
    const topIssueObjects = previewFindings
      .filter((f: any) => f.severity === "high" || f.severity === "medium")
      .slice(0, 3)
      .map((f: any) => ({
        title: f.title || f.summary || "Issue found",
        explanation: f.description || f.summary || "This issue may affect your search rankings.",
        severity: f.severity || "medium",
        impact: f.impact || "both",
        mapped_section: f.category === "performance" ? "performance" : f.category === "keywords" ? "keywords" : "technical",
      }));

    if (topIssueObjects.length === 0) {
      topIssueObjects.push({
        title: "Review site SEO fundamentals",
        explanation: "A comprehensive review of your site's SEO foundation is recommended to identify quick wins.",
        severity: "medium",
        impact: "both",
        mapped_section: "technical",
      });
    }

    const topOpportunities = [
      { title: "Optimize meta descriptions", explanation: "Well-crafted meta descriptions improve click-through rates from search results.", severity: "medium" as const, impact: "traffic" as const, mapped_section: "technical" as const },
      { title: "Improve page speed", explanation: "Faster pages rank higher and convert more visitors into customers.", severity: "medium" as const, impact: "both" as const, mapped_section: "performance" as const },
      { title: "Build quality backlinks", explanation: "Authoritative backlinks remain the strongest ranking signal for competitive keywords.", severity: "medium" as const, impact: "traffic" as const, mapped_section: "competitors" as const },
    ];

    const firstIssueTitle = topIssueObjects[0]?.title || "Looking solid overall.";

    const summary = {
      health_score: healthScore,
      top_issues: topIssueObjects,
      top_opportunities: topOpportunities,
      one_liner: `Your site scores ${healthScore}/100. ${topIssueObjects.length > 0 ? `Key issue: ${firstIssueTitle}` : "Looking solid overall."}`,
    };

    // NextSteps — match client NextSteps interface: { if_do_nothing, if_you_fix_this, ctas }
    const nextSteps = {
      if_do_nothing: [
        "Rankings will continue to stagnate or decline as competitors optimize",
        "Technical issues will compound, making future fixes more expensive",
        "You'll miss out on high-intent local search traffic every month",
      ],
      if_you_fix_this: [
        "Improved visibility for high-intent keywords in your market",
        "Better page speed scores leading to higher conversion rates",
        "Stronger domain authority from a clean technical foundation",
      ],
      ctas: [
        { id: "view_full_report" as const, label: "Fix Technical Issues", action: "route" as const, target: "/signup" },
        { id: "send_to_dev" as const, label: "Track Keywords", action: "route" as const, target: "/signup" },
      ],
    };

    const meta = {
      generation_status: "partial",
      missing: { keywords: "Requires Search Console", competitors: "Requires SERP API" },
      scores: {
        overall: scoreSummary.overall ?? null,
        technical: scoreSummary.technical ?? null,
        content: scoreSummary.content ?? null,
        performance: scoreSummary.performance ?? null,
        serp: scoreSummary.serp ?? null,
        authority: scoreSummary.authority ?? null,
      },
      costOfInaction: scoreSummary.costOfInaction || null,
    };

    const visMode = fullReport.visibilityMode || "full";

    await pool.query(
      `INSERT INTO free_reports (
        report_id, scan_id, website_url, website_domain, report_version, status,
        summary, competitors, keywords, technical, performance, next_steps, meta,
        visibility_mode, limited_visibility_reason, limited_visibility_steps,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16::jsonb, NOW(), NOW())`,
      [
        reportId, scanId,
        scan.normalized_url || scan.target_url, domain,
        1, "ready",
        JSON.stringify(summary),
        JSON.stringify({ items: competitorItems, insight: "Competitor data requires SERP API integration." }),
        JSON.stringify({ targets: keywordTargets, bucket_counts: { rank_1: 0, top_3: 0, "4_10": 0, "11_30": 0, not_ranking: keywordTargets.length }, insight: "Keyword data requires Search Console integration." }),
        visMode === "limited" ? null : JSON.stringify({ buckets: technicalBuckets }),
        JSON.stringify({ urls: performanceUrls, global_insight: "Connect Google Search Console for detailed Core Web Vitals data." }),
        JSON.stringify(nextSteps),
        JSON.stringify(meta),
        visMode,
        fullReport.limitedVisibilityReason || null,
        JSON.stringify(fullReport.limitedVisibilitySteps || []),
      ]
    );

    return res.json({ ok: true, reportId });
  } catch (error: any) {
    console.error("[FreeReport] Failed:", error?.message, error?.stack);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: error?.message || "Failed to create free report" });
    }
  }
}
