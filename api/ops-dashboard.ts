import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";

/**
 * GET /api/ops-dashboard/:siteId/:section
 * Rewrites to /api/ops-dashboard?siteId=:siteId&section=:section
 *
 * Reads scan results from scan_requests.full_report and reshapes
 * the data into the format each dashboard section expects.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const siteId = req.query.siteId as string;
  const section = req.query.section as string;

  if (!siteId || !section) {
    return res.status(400).json({ error: "siteId and section are required" });
  }

  const pool = getPool();

  try {
    // Resolve siteId → domain → latest scan
    const siteResult = await pool.query(
      `SELECT base_url FROM sites WHERE site_id = $1 LIMIT 1`,
      [siteId]
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    const baseUrl: string = siteResult.rows[0].base_url;
    let domain: string;
    try {
      domain = new URL(baseUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      domain = baseUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").split("/")[0].toLowerCase();
    }

    // Find latest completed scan for this domain
    const scanResult = await pool.query(
      `SELECT scan_id, full_report, score_summary, preview_findings, completed_at
       FROM scan_requests
       WHERE domain = $1 AND status IN ('preview_ready', 'complete', 'report_ready')
       ORDER BY completed_at DESC NULLS LAST
       LIMIT 1`,
      [domain]
    );

    const scan = scanResult.rows[0] || null;
    const fullReport = scan?.full_report || null;
    const scoreSummary = scan?.score_summary || null;
    const findings = scan?.preview_findings || [];

    switch (section) {
      case "metrics":
        return res.json(buildMetrics(fullReport, scoreSummary));
      case "serp-snapshot":
        return res.json(buildSerpSnapshot(fullReport));
      case "serp-keywords":
        return res.json(buildSerpKeywords(fullReport));
      case "content-status":
        return res.json(buildContentStatus());
      case "changes-log":
        return res.json(buildChangesLog(scan));
      case "system-state":
        return res.json(buildSystemState());
      case "insights":
        return res.json(buildInsights(fullReport, scoreSummary, findings));
      default:
        return res.status(400).json({ error: `Unknown section: ${section}` });
    }
  } catch (error: any) {
    console.error(`[OpsDashboard] ${section} error:`, error.message);
    return res.status(500).json({ error: `Failed to fetch ${section}` });
  }
}

// ============================================================
// Section Builders
// ============================================================

function buildMetrics(fullReport: any, scoreSummary: any) {
  const perf = fullReport?.performance || null;
  const perfScore = perf?.performance_score ?? scoreSummary?.performance ?? null;
  const lab = perf?.lab || {};

  return {
    ga4Connected: false,
    gscConnected: false,
    metrics: {
      conversionRate: notAvailable("Google Analytics not connected"),
      bounceRate: notAvailable("Google Analytics not connected"),
      avgSessionDuration: notAvailable("Google Analytics not connected"),
      pagesPerSession: notAvailable("Google Analytics not connected"),
      organicCtr: notAvailable("Search Console not connected"),
      pageLoadTime: perfScore != null
        ? { value: lab.lcp_ms ? Math.round(lab.lcp_ms) / 1000 : null, change7d: null, available: true }
        : notAvailable("Run a scan to collect performance data"),
    },
  };
}

function buildSerpSnapshot(fullReport: any) {
  const serpResults: any[] = fullReport?.serp_results || fullReport?.serp?.results || [];

  if (serpResults.length === 0) {
    return {
      hasBaseline: false,
      totalTracked: 0,
      rankingCounts: { position1: 0, top3: 0, top10: 0, top100: 0 },
      weekOverWeek: { netChange: 0, gained: 0, lost: 0, improved: 0, declined: 0 },
      lastChecked: null,
    };
  }

  let position1 = 0, top3 = 0, top10 = 0, top100 = 0;
  for (const r of serpResults) {
    if (r.position != null) {
      if (r.position === 1) position1++;
      if (r.position <= 3) top3++;
      if (r.position <= 10) top10++;
      if (r.position <= 100) top100++;
    }
  }

  return {
    hasBaseline: true,
    totalTracked: serpResults.length,
    rankingCounts: { position1, top3, top10, top100 },
    // No historical data yet for week-over-week — first scan is the baseline
    weekOverWeek: { netChange: 0, gained: 0, lost: 0, improved: 0, declined: 0 },
    lastChecked: new Date().toISOString().slice(0, 10),
  };
}

function buildSerpKeywords(fullReport: any) {
  const serpResults: any[] = fullReport?.serp_results || fullReport?.serp?.results || [];

  if (serpResults.length === 0) {
    return { keywords: [], hasData: false };
  }

  const keywords = serpResults.map((r: any, idx: number) => ({
    id: idx + 1,
    keyword: r.keyword,
    priority: null,
    volume: null,
    currentPosition: r.position ?? null,
    change7d: null,
    change30d: null,
    change90d: null,
    direction: r.position != null ? ("new" as const) : ("stable" as const),
    history: r.position != null
      ? [{ date: new Date().toISOString().slice(0, 10), position: r.position }]
      : [],
  }));

  return { keywords, hasData: true };
}

function buildContentStatus() {
  return {
    upcoming: [],
    recentlyPublished: [],
    contentUpdates: [],
    hasContent: false,
  };
}

function buildChangesLog(scan: any) {
  if (!scan) {
    return { entries: [], hasHistory: false };
  }

  // Show the scan itself as a change log entry
  const entries = [
    {
      id: scan.scan_id,
      what: "SEO Scan Completed",
      why: "Initial site analysis — baseline scores established",
      when: scan.completed_at ? new Date(scan.completed_at).toISOString() : new Date().toISOString(),
      severity: "notify" as const,
      outcome: "success",
      category: "technical",
      source: "audit" as const,
    },
  ];

  return { entries, hasHistory: true };
}

function buildSystemState() {
  return {
    plan: "free",
    capabilities: {
      enabled: [
        { category: "tech-seo", trustLevel: 1, label: "Technical SEO", trustLabel: "Recommend", confidence: null },
        { category: "content", trustLevel: 1, label: "Content", trustLabel: "Recommend", confidence: null },
        { category: "performance", trustLevel: 1, label: "Performance", trustLabel: "Recommend", confidence: null },
      ],
      locked: [
        { category: "links", label: "Link Building", reason: "Available on Pro plan" },
        { category: "ads", label: "Advertising", reason: "Available on Pro plan" },
        { category: "indexing", label: "Indexing", reason: "Upgrade to enable automated indexing" },
      ],
    },
    pendingApprovals: [],
    policies: null,
  };
}

function buildInsights(fullReport: any, scoreSummary: any, findings: any[]) {
  const tips: any[] = [];
  let priority = 1;

  if (!fullReport) {
    tips.push({
      id: "no-scan",
      title: "Run your first scan",
      body: "No scan data found for this site yet. Add a site and run a scan to see insights here.",
      category: "system",
      priority: 1,
      sentiment: "action",
      actionLabel: "Run Scan",
      actionRoute: "/app/overview",
    });
    return { tips };
  }

  // Performance insights
  const perfScore = scoreSummary?.performance ?? null;
  if (perfScore != null && perfScore < 50) {
    tips.push({
      id: "perf-low",
      title: "Performance needs attention",
      body: `Your performance score is ${perfScore}/100. Slow pages hurt rankings and user experience.`,
      category: "technical",
      priority: priority++,
      sentiment: "action",
    });
  } else if (perfScore != null && perfScore >= 80) {
    tips.push({
      id: "perf-good",
      title: "Strong performance",
      body: `Your performance score is ${perfScore}/100 — your site loads fast.`,
      category: "win",
      priority: priority++,
      sentiment: "positive",
    });
  }

  // Technical findings
  const techFindings = (findings || []).filter((f: any) => f.severity === "error" || f.severity === "warning");
  if (techFindings.length > 5) {
    tips.push({
      id: "tech-issues",
      title: `${techFindings.length} technical issues found`,
      body: "Address high-severity technical SEO issues to improve crawlability and indexing.",
      category: "technical",
      priority: priority++,
      sentiment: "action",
    });
  } else if (techFindings.length === 0 && findings.length > 0) {
    tips.push({
      id: "tech-clean",
      title: "Clean technical SEO",
      body: "No critical technical issues detected — your site's foundation is solid.",
      category: "win",
      priority: priority++,
      sentiment: "positive",
    });
  }

  // SERP insights
  const serpResults: any[] = fullReport?.serp_results || fullReport?.serp?.results || [];
  const ranking = serpResults.filter((r: any) => r.position != null);
  const top10 = ranking.filter((r: any) => r.position <= 10);

  if (serpResults.length > 0 && ranking.length === 0) {
    tips.push({
      id: "serp-none",
      title: "Not ranking for tracked keywords",
      body: "None of your tracked keywords appear in the top 100. Consider targeting less competitive terms.",
      category: "rankings",
      priority: priority++,
      sentiment: "action",
    });
  } else if (top10.length > 0) {
    tips.push({
      id: "serp-top10",
      title: `${top10.length} keyword${top10.length > 1 ? "s" : ""} in top 10`,
      body: `You're ranking on page 1 for: ${top10.slice(0, 3).map((r: any) => `"${r.keyword}"`).join(", ")}${top10.length > 3 ? ` +${top10.length - 3} more` : ""}.`,
      category: "rankings",
      priority: priority++,
      sentiment: "positive",
    });
  }

  // Quick wins
  const quickWins = ranking.filter((r: any) => r.position > 10 && r.position <= 20);
  if (quickWins.length > 0) {
    tips.push({
      id: "serp-quickwins",
      title: `${quickWins.length} keyword${quickWins.length > 1 ? "s" : ""} close to page 1`,
      body: `Keywords like "${quickWins[0].keyword}" at position ${quickWins[0].position} could reach page 1 with small improvements.`,
      category: "rankings",
      priority: priority++,
      sentiment: "action",
    });
  }

  // Competitive insights
  const competitive = fullReport?.competitive;
  if (competitive?.findings_count > 0) {
    tips.push({
      id: "comp-gaps",
      title: `${competitive.findings_count} competitive gaps identified`,
      body: competitive.summary || "Competitors have content or features you're missing.",
      category: "content",
      priority: priority++,
      sentiment: "action",
    });
  }

  // GA4/GSC connection nudge
  tips.push({
    id: "connect-ga4",
    title: "Connect Google Analytics",
    body: "Link your GA4 property to see conversion rates, bounce rates, and traffic trends.",
    category: "system",
    priority: priority++,
    sentiment: "action",
    actionLabel: "Connect GA4",
    actionRoute: "/app/settings",
  });

  return { tips };
}

function notAvailable(reason: string) {
  return { value: null, change7d: null, available: false, reason };
}
