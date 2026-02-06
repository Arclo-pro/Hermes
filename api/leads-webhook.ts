/**
 * /api/leads-webhook — Public webhook for automated lead capture
 * Authenticated via X-API-Key header (not session)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getPool } from "./_lib/db.js";
import { setCorsHeaders } from "./_lib/auth.js";

// API key verification (SHA-256 hash comparison)
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function verifyApiKey(plaintext: string, hashedKey: string): boolean {
  const computedHash = hashApiKey(plaintext);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hashedKey, "hex")
  );
}

// Service line mapping
function normalizeServiceLine(service: string | undefined): string {
  if (!service) return "general_inquiry";
  const lower = service.toLowerCase();
  if (lower.includes("psychiatr")) return "psychiatric_services";
  if (lower.includes("therap") || lower.includes("counsel")) return "therapy";
  return "general_inquiry";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pool = getPool();

  try {
    // Extract API key from header
    const apiKeyHeader =
      (req.headers["x-api-key"] as string) ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (!apiKeyHeader) {
      console.log("[LeadsWebhook] Missing API key");
      return res.status(401).json({
        error: "API key required",
        hint: "Provide X-API-Key header or Authorization: Bearer <key>",
      });
    }

    // Look up API key by prefix (first 16 chars)
    const prefix = apiKeyHeader.slice(0, 16);
    const keyResult = await pool.query(
      `SELECT * FROM api_keys WHERE prefix = $1 AND revoked_at IS NULL LIMIT 1`,
      [prefix]
    );

    const apiKeyRecord = keyResult.rows[0];
    if (!apiKeyRecord) {
      console.log("[LeadsWebhook] API key not found:", prefix);
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Verify the full key against the stored hash
    if (!verifyApiKey(apiKeyHeader, apiKeyRecord.hashed_key)) {
      console.log("[LeadsWebhook] API key verification failed:", prefix);
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Check for required scope (leads:write or write)
    const scopes: string[] = apiKeyRecord.scopes || [];
    if (!scopes.includes("leads:write") && !scopes.includes("write")) {
      console.log("[LeadsWebhook] Missing leads:write scope:", apiKeyRecord.key_id);
      return res.status(403).json({
        error: "Insufficient permissions",
        hint: "API key requires 'leads:write' or 'write' scope",
      });
    }

    // Update last used timestamp
    await pool.query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE key_id = $1`,
      [apiKeyRecord.key_id]
    );

    // Validate request body
    const body = req.body;
    if (!body || !body.name) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!body.email && !body.phone) {
      return res.status(400).json({ error: "Either email or phone is required" });
    }

    // Generate lead ID
    const leadId = `lead_${crypto.randomUUID()}`;

    // Create lead
    const result = await pool.query(
      `INSERT INTO leads (
        lead_id, site_id, name, email, phone,
        lead_source_type, service_line, form_type,
        preferred_contact_method, notes,
        landing_page_path, source_path,
        utm_source, utm_campaign, utm_term, utm_medium, utm_content
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12,
        $13, $14, $15, $16, $17
      ) RETURNING lead_id`,
      [
        leadId,
        apiKeyRecord.site_id,
        body.name,
        body.email || null,
        body.phone || null,
        "form_submit",
        normalizeServiceLine(body.serviceLine || body.service),
        body.formType || "short",
        body.preferredContactMethod || "unknown",
        body.notes || null,
        body.landingPagePath || body.landingPage || null,
        body.sourcePath || null,
        body.utmSource || null,
        body.utmCampaign || null,
        body.utmTerm || null,
        body.utmMedium || null,
        body.utmContent || null,
      ]
    );

    console.log(`[LeadsWebhook] Lead created: ${leadId} for site ${apiKeyRecord.site_id}`);

    return res.status(201).json({
      success: true,
      leadId: result.rows[0].lead_id,
      message: "Lead created successfully",
    });
  } catch (error: any) {
    console.error("[LeadsWebhook] Error:", error.message);
    return res.status(500).json({ error: "Failed to create lead" });
  }
}
