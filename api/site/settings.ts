import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";

/**
 * Content publishing frequency defaults:
 * - maxBlogsPerDay: 1 (hard limit)
 * - targetBlogsPerWeek: 3-5 (ideal range)
 */
const DEFAULT_CONTENT_SETTINGS = {
  autoPublishEnabled: true,
  maxBlogsPerDay: 1,
  targetBlogsPerWeekMin: 3,
  targetBlogsPerWeekMax: 5,
};

/**
 * GET /api/site/settings?siteId=xxx
 * Returns site settings including content publishing frequency
 *
 * PATCH /api/site/settings
 * Updates site-specific settings like auto-publish preferences and content frequency.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const pool = getPool();

  // GET: Return current settings
  if (req.method === "GET") {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }

    try {
      const siteResult = await pool.query(
        `SELECT id, cadence FROM sites WHERE site_id = $1 AND user_id = $2 LIMIT 1`,
        [siteId, user.id]
      );
      if (siteResult.rows.length === 0) {
        return res.status(404).json({ error: "Site not found" });
      }

      const cadence = siteResult.rows[0].cadence || {};

      return res.json({
        settings: {
          autoPublishEnabled: cadence.autoPublishEnabled ?? DEFAULT_CONTENT_SETTINGS.autoPublishEnabled,
          maxBlogsPerDay: cadence.maxBlogsPerDay ?? DEFAULT_CONTENT_SETTINGS.maxBlogsPerDay,
          targetBlogsPerWeekMin: cadence.targetBlogsPerWeekMin ?? DEFAULT_CONTENT_SETTINGS.targetBlogsPerWeekMin,
          targetBlogsPerWeekMax: cadence.targetBlogsPerWeekMax ?? DEFAULT_CONTENT_SETTINGS.targetBlogsPerWeekMax,
        },
      });
    } catch (error: any) {
      console.error("[SiteSettings] GET Error:", error.message);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  // PATCH: Update settings
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    siteId,
    autoPublishEnabled,
    maxBlogsPerDay,
    targetBlogsPerWeekMin,
    targetBlogsPerWeekMax,
  } = req.body;

  if (!siteId) {
    return res.status(400).json({ error: "siteId is required" });
  }

  // Validate limits
  if (maxBlogsPerDay !== undefined && (maxBlogsPerDay < 1 || maxBlogsPerDay > 3)) {
    return res.status(400).json({ error: "maxBlogsPerDay must be between 1 and 3" });
  }
  if (targetBlogsPerWeekMin !== undefined && (targetBlogsPerWeekMin < 1 || targetBlogsPerWeekMin > 7)) {
    return res.status(400).json({ error: "targetBlogsPerWeekMin must be between 1 and 7" });
  }
  if (targetBlogsPerWeekMax !== undefined && (targetBlogsPerWeekMax < 1 || targetBlogsPerWeekMax > 7)) {
    return res.status(400).json({ error: "targetBlogsPerWeekMax must be between 1 and 7" });
  }

  try {
    // Verify site ownership and get current cadence
    const siteResult = await pool.query(
      `SELECT id, cadence FROM sites WHERE site_id = $1 AND user_id = $2 LIMIT 1`,
      [siteId, user.id]
    );
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    const siteNumericId = siteResult.rows[0].id;
    const currentCadence = siteResult.rows[0].cadence || {};

    // Merge new settings with existing cadence
    const newCadence = {
      ...currentCadence,
      ...(autoPublishEnabled !== undefined && { autoPublishEnabled }),
      ...(maxBlogsPerDay !== undefined && { maxBlogsPerDay }),
      ...(targetBlogsPerWeekMin !== undefined && { targetBlogsPerWeekMin }),
      ...(targetBlogsPerWeekMax !== undefined && { targetBlogsPerWeekMax }),
    };

    // Update the cadence column
    await pool.query(
      `UPDATE sites SET cadence = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(newCadence), siteNumericId]
    );

    console.log(`[SiteSettings] Updated settings for site ${siteId}:`, newCadence);

    return res.json({
      success: true,
      settings: {
        autoPublishEnabled: newCadence.autoPublishEnabled ?? DEFAULT_CONTENT_SETTINGS.autoPublishEnabled,
        maxBlogsPerDay: newCadence.maxBlogsPerDay ?? DEFAULT_CONTENT_SETTINGS.maxBlogsPerDay,
        targetBlogsPerWeekMin: newCadence.targetBlogsPerWeekMin ?? DEFAULT_CONTENT_SETTINGS.targetBlogsPerWeekMin,
        targetBlogsPerWeekMax: newCadence.targetBlogsPerWeekMax ?? DEFAULT_CONTENT_SETTINGS.targetBlogsPerWeekMax,
      },
    });
  } catch (error: any) {
    console.error("[SiteSettings] PATCH Error:", error.message);
    return res.status(500).json({ error: "Failed to update settings" });
  }
}
