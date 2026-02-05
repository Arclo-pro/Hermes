/**
 * /api/leads — GET (list) + POST (create)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { getPool } from "./_lib/db.js";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const pool = getPool();

  if (req.method === "GET") {
    return handleList(req, res, pool);
  }

  if (req.method === "POST") {
    return handleCreate(req, res, pool, user.id);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

async function handleList(req: VercelRequest, res: VercelResponse, pool: any) {
  try {
    const q = req.query;
    const siteId = q.siteId as string;
    if (!siteId) return res.status(400).json({ error: "siteId is required" });

    const limit = Math.min(Math.max(parseInt(q.limit as string) || 50, 1), 10000);
    const offset = Math.max(parseInt(q.offset as string) || 0, 0);

    const conditions: string[] = ["site_id = $1"];
    const params: any[] = [siteId];
    let idx = 2;

    if (q.status && q.status !== "all") {
      conditions.push(`lead_status = $${idx++}`);
      params.push(q.status);
    }
    if (q.outcome && q.outcome !== "all") {
      conditions.push(`outcome = $${idx++}`);
      params.push(q.outcome);
    }
    if (q.serviceLine && q.serviceLine !== "all") {
      conditions.push(`service_line = $${idx++}`);
      params.push(q.serviceLine);
    }
    if (q.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(q.startDate);
    }
    if (q.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(q.endDate);
    }
    if (q.search) {
      const pattern = `%${q.search}%`;
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx} OR utm_term ILIKE $${idx})`);
      params.push(pattern);
      idx++;
    }

    const where = conditions.join(" AND ");

    // Count
    const countResult = await pool.query(
      `SELECT count(*) FROM leads WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch
    const dataResult = await pool.query(
      `SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const leads = dataResult.rows.map(snakeToCamel);

    return res.json({
      leads,
      total,
      limit,
      offset,
      hasMore: offset + leads.length < total,
    });
  } catch (error: any) {
    console.error("[Leads] List error:", error.message);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse, pool: any, userId: number) {
  try {
    const body = req.body;
    if (!body || !body.siteId || !body.name) {
      return res.status(400).json({ error: "siteId and name are required" });
    }
    if (!body.email && !body.phone) {
      return res.status(400).json({ error: "Either email or phone is required" });
    }

    const leadId = `lead_${randomUUID()}`;

    const result = await pool.query(
      `INSERT INTO leads (
        lead_id, site_id, created_by_user_id, name, email, phone,
        lead_source_type, service_line, form_type,
        preferred_contact_method, notes,
        landing_page_path, source_path,
        utm_source, utm_campaign, utm_term, utm_medium, utm_content,
        assigned_to_user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11,
        $12, $13,
        $14, $15, $16, $17, $18,
        $19
      ) RETURNING *`,
      [
        leadId,
        body.siteId,
        userId,
        body.name,
        body.email || null,
        body.phone || null,
        body.leadSourceType || "manual",
        body.serviceLine || "general_inquiry",
        body.formType || "other",
        body.preferredContactMethod || "unknown",
        body.notes || null,
        body.landingPagePath || null,
        body.sourcePath || null,
        body.utmSource || null,
        body.utmCampaign || null,
        body.utmTerm || null,
        body.utmMedium || null,
        body.utmContent || null,
        body.assignedToUserId || null,
      ]
    );

    return res.status(201).json(snakeToCamel(result.rows[0]));
  } catch (error: any) {
    console.error("[Leads] Create error:", error.message);
    return res.status(500).json({ error: "Failed to create lead" });
  }
}

/** Convert snake_case DB row to camelCase for frontend */
function snakeToCamel(row: any): any {
  if (!row) return row;
  const result: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
