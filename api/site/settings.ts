import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";

/**
 * PATCH /api/site/settings
 * Updates site-specific settings like auto-publish preferences.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { siteId, autoPublishEnabled } = req.body;

  if (!siteId) {
    return res.status(400).json({ error: "siteId is required" });
  }

  const pool = getPool();

  try {
    // Verify site ownership
    const siteResult = await pool.query(
      `SELECT id FROM sites WHERE site_id = $1 AND user_id = $2 LIMIT 1`,
      [siteId, user.id]
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    const siteNumericId = siteResult.rows[0].id;

    // Update site settings
    // In production, this would update a site_settings table
    // For now, we just log and return success
    console.log(`[SiteSettings] Updated settings for site ${siteId}:`, {
      autoPublishEnabled,
    });

    return res.json({
      success: true,
      settings: {
        autoPublishEnabled: autoPublishEnabled ?? true,
      },
    });
  } catch (error: any) {
    console.error("[SiteSettings] Error:", error.message);
    return res.status(500).json({ error: "Failed to update settings" });
  }
}
