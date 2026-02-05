/**
 * /api/leads/:leadId — GET / PATCH / DELETE
 * Rewrite: /api/leads/:leadId → /api/leads-detail?leadId=:leadId
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const leadId = req.query.leadId as string;
  if (!leadId) return res.status(400).json({ error: "leadId is required" });

  const pool = getPool();

  if (req.method === "GET") {
    return handleGet(res, pool, leadId);
  }
  if (req.method === "PATCH") {
    return handlePatch(req, res, pool, leadId);
  }
  if (req.method === "DELETE") {
    return handleDelete(res, pool, leadId);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(res: VercelResponse, pool: any, leadId: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM leads WHERE lead_id = $1 LIMIT 1`,
      [leadId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.json(snakeToCamel(result.rows[0]));
  } catch (error: any) {
    console.error("[LeadDetail] Get error:", error.message);
    return res.status(500).json({ error: "Failed to fetch lead" });
  }
}

async function handlePatch(req: VercelRequest, res: VercelResponse, pool: any, leadId: string) {
  try {
    // Check exists
    const existing = await pool.query(`SELECT * FROM leads WHERE lead_id = $1 LIMIT 1`, [leadId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const body = req.body || {};
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      name: "name",
      email: "email",
      phone: "phone",
      leadStatus: "lead_status",
      outcome: "outcome",
      outcomeDate: "outcome_date",
      noSignupReason: "no_signup_reason",
      noSignupReasonDetail: "no_signup_reason_detail",
      signupType: "signup_type",
      appointmentDate: "appointment_date",
      assignedToUserId: "assigned_to_user_id",
      preferredContactMethod: "preferred_contact_method",
      serviceLine: "service_line",
      formType: "form_type",
      landingPagePath: "landing_page_path",
      utmSource: "utm_source",
      utmCampaign: "utm_campaign",
      utmTerm: "utm_term",
      notes: "notes",
    };

    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
      if (jsKey in body) {
        updates.push(`${dbCol} = $${idx++}`);
        values.push(body[jsKey]);
      }
    }

    // Auto-set outcomeDate when outcome changes
    if (body.outcome && body.outcome !== existing.rows[0].outcome && !body.outcomeDate) {
      if (body.outcome === "signed_up" || body.outcome === "not_signed_up") {
        updates.push(`outcome_date = $${idx++}`);
        values.push(new Date());
      }
    }

    if (updates.length === 0) {
      return res.json(snakeToCamel(existing.rows[0]));
    }

    updates.push(`updated_at = $${idx++}`);
    values.push(new Date());

    values.push(leadId);
    const result = await pool.query(
      `UPDATE leads SET ${updates.join(", ")} WHERE lead_id = $${idx} RETURNING *`,
      values
    );

    return res.json(snakeToCamel(result.rows[0]));
  } catch (error: any) {
    console.error("[LeadDetail] Patch error:", error.message);
    return res.status(500).json({ error: "Failed to update lead" });
  }
}

async function handleDelete(res: VercelResponse, pool: any, leadId: string) {
  try {
    const existing = await pool.query(`SELECT * FROM leads WHERE lead_id = $1 LIMIT 1`, [leadId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await pool.query(`DELETE FROM leads WHERE lead_id = $1`, [leadId]);
    return res.json({ ok: true });
  } catch (error: any) {
    console.error("[LeadDetail] Delete error:", error.message);
    return res.status(500).json({ error: "Failed to delete lead" });
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
