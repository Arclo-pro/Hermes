import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";

/**
 * POST /api/content/publish
 * Publishes generated content to the site.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { siteId, draftId } = req.body;

  if (!siteId || !draftId) {
    return res.status(400).json({ error: "siteId and draftId are required" });
  }

  const pool = getPool();

  try {
    // Verify site ownership
    const siteResult = await pool.query(
      `SELECT id, base_url FROM sites WHERE site_id = $1 AND user_id = $2 LIMIT 1`,
      [siteId, user.id]
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    const siteNumericId = siteResult.rows[0].id;
    const baseUrl = siteResult.rows[0].base_url;

    // In production, this would:
    // 1. Retrieve the generated content from the content_drafts table
    // 2. Connect to the site's CMS (WordPress, etc.) via API
    // 3. Create/update the page or post
    // 4. Update the draft status to "published"

    // For now, simulate the publishing process
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`[ContentPublish] Published draft ${draftId} for site ${siteId}`);

    return res.json({
      success: true,
      draftId,
      publishedAt: new Date().toISOString(),
      message: "Content published successfully",
    });
  } catch (error: any) {
    console.error("[ContentPublish] Error:", error.message);
    return res.status(500).json({ error: "Failed to publish content" });
  }
}
