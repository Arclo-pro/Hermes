/**
 * POST /api/leads/:leadId/contact — Log contact attempt
 * Rewrite: /api/leads/:leadId/contact → /api/leads-contact?leadId=:leadId
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const leadId = req.query.leadId as string;
  if (!leadId) return res.status(400).json({ error: "leadId is required" });

  const pool = getPool();

  try {
    const existing = await pool.query(`SELECT * FROM leads WHERE lead_id = $1 LIMIT 1`, [leadId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const currentCount = existing.rows[0].contact_attempts_count || 0;

    const result = await pool.query(
      `UPDATE leads SET contact_attempts_count = $1, last_contacted_at = $2, updated_at = $2 WHERE lead_id = $3 RETURNING *`,
      [currentCount + 1, new Date(), leadId]
    );

    return res.json(snakeToCamel(result.rows[0]));
  } catch (error: any) {
    console.error("[LeadContact] Error:", error.message);
    return res.status(500).json({ error: "Failed to log contact attempt" });
  }
}

function snakeToCamel(row: any): any {
  if (!row) return row;
  const result: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
