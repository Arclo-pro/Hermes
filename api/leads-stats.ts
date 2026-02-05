/**
 * GET /api/leads/stats — Summary statistics
 * Rewrite: /api/leads/stats → /api/leads-stats
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

  const pool = getPool();

  try {
    const conditions: string[] = ["site_id = $1"];
    const params: any[] = [siteId];
    let idx = 2;

    if (req.query.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(req.query.startDate);
    }
    if (req.query.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(req.query.endDate);
    }

    const where = conditions.join(" AND ");
    const result = await pool.query(`SELECT * FROM leads WHERE ${where}`, params);
    const allLeads = result.rows;

    const total = allLeads.length;
    const signedUp = allLeads.filter((l: any) => l.outcome === "signed_up").length;
    const notSignedUp = allLeads.filter((l: any) => l.outcome === "not_signed_up").length;
    const conversionRate = total > 0 ? (signedUp / total) * 100 : 0;

    const byReason: Record<string, number> = {};
    const byLandingPage: Record<string, number> = {};
    const byCampaign: Record<string, number> = {};
    const byServiceLine: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const lead of allLeads) {
      if (lead.no_signup_reason) byReason[lead.no_signup_reason] = (byReason[lead.no_signup_reason] || 0) + 1;
      if (lead.landing_page_path) byLandingPage[lead.landing_page_path] = (byLandingPage[lead.landing_page_path] || 0) + 1;
      if (lead.utm_campaign) byCampaign[lead.utm_campaign] = (byCampaign[lead.utm_campaign] || 0) + 1;
      if (lead.service_line) byServiceLine[lead.service_line] = (byServiceLine[lead.service_line] || 0) + 1;
      if (lead.lead_source_type) bySource[lead.lead_source_type] = (bySource[lead.lead_source_type] || 0) + 1;
    }

    return res.json({
      total,
      signedUp,
      notSignedUp,
      conversionRate,
      byReason,
      byLandingPage,
      byCampaign,
      byServiceLine,
      bySource,
    });
  } catch (error: any) {
    console.error("[LeadStats] Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch lead statistics" });
  }
}
