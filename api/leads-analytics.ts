/**
 * GET /api/leads/analytics — Detailed analytics for dashboard
 * Rewrite: /api/leads/analytics → /api/leads-analytics
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const siteId = req.query.siteId as string;
  if (!siteId) return res.status(400).json({ error: "siteId is required" });

  const months = parseInt(req.query.months as string) || 12;

  const pool = getPool();

  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const result = await pool.query(
      `SELECT * FROM leads WHERE site_id = $1 AND created_at >= $2 ORDER BY created_at DESC`,
      [siteId, startDate]
    );
    const allLeads = result.rows;

    // Group by month
    const monthlyMap = new Map<string, { total: number; signedUp: number; notSignedUp: number }>();

    for (const lead of allLeads) {
      const date = new Date(lead.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { total: 0, signedUp: 0, notSignedUp: 0 });
      }
      const stats = monthlyMap.get(monthKey)!;
      stats.total++;
      if (lead.outcome === "signed_up") stats.signedUp++;
      if (lead.outcome === "not_signed_up") stats.notSignedUp++;
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, stats]) => {
        const [year, monthNum] = month.split("-").map(Number);
        const date = new Date(year, monthNum - 1);
        const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const conversionRate = stats.total > 0 ? (stats.signedUp / stats.total) * 100 : 0;
        return { month, label, ...stats, conversionRate };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Breakdowns
    const sourceMap: Record<string, number> = {};
    const outcomeMap: Record<string, number> = {};
    const reasonMap: Record<string, number> = {};
    const serviceLineMap: Record<string, number> = {};

    for (const lead of allLeads) {
      const source = lead.lead_source_type || "unknown";
      sourceMap[source] = (sourceMap[source] || 0) + 1;

      const outcome = lead.outcome || "unknown";
      outcomeMap[outcome] = (outcomeMap[outcome] || 0) + 1;

      if (lead.outcome === "not_signed_up" && lead.no_signup_reason) {
        reasonMap[lead.no_signup_reason] = (reasonMap[lead.no_signup_reason] || 0) + 1;
      }

      if (lead.service_line) {
        serviceLineMap[lead.service_line] = (serviceLineMap[lead.service_line] || 0) + 1;
      }
    }

    const total = allLeads.length;
    const toArray = (map: Record<string, number>) =>
      Object.entries(map)
        .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

    const reasonTotal = Object.values(reasonMap).reduce((sum, v) => sum + v, 0);
    const byReason = Object.entries(reasonMap)
      .map(([name, value]) => ({ name, value, percentage: reasonTotal > 0 ? (value / reasonTotal) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    const totalSignedUp = allLeads.filter((l: any) => l.outcome === "signed_up").length;
    const totalNotSignedUp = allLeads.filter((l: any) => l.outcome === "not_signed_up").length;
    const overallConversionRate = total > 0 ? (totalSignedUp / total) * 100 : 0;

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonth =
      now.getMonth() === 0
        ? `${now.getFullYear() - 1}-12`
        : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

    const currentMonthLeads = monthlyMap.get(currentMonth)?.total || 0;
    const previousMonthLeads = monthlyMap.get(prevMonth)?.total || 0;
    const monthOverMonthChange =
      previousMonthLeads > 0 ? ((currentMonthLeads - previousMonthLeads) / previousMonthLeads) * 100 : 0;

    return res.json({
      monthlyData,
      bySource: toArray(sourceMap),
      byOutcome: toArray(outcomeMap),
      byReason,
      byServiceLine: toArray(serviceLineMap),
      totalLeads: total,
      totalSignedUp,
      totalNotSignedUp,
      overallConversionRate,
      currentMonthLeads,
      previousMonthLeads,
      monthOverMonthChange,
    });
  } catch (error: any) {
    console.error("[LeadAnalytics] Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch lead analytics" });
  }
}
