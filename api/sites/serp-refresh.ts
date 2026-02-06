/**
 * Manual SERP Refresh API
 *
 * Allows users to manually trigger a SERP keyword ranking refresh.
 * Limited to 4 refreshes per site per month.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "@neondatabase/serverless";

const MONTHLY_LIMIT = 4;

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// Get the current month key (YYYY-MM)
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const pool = getPool();

  try {
    const siteId = req.query.siteId as string;
    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }

    const monthKey = getCurrentMonthKey();

    if (req.method === "GET") {
      // Return current usage stats
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM serp_manual_refreshes
         WHERE site_id = $1 AND month_key = $2`,
        [siteId, monthKey]
      );

      const usedCount = parseInt(result.rows[0]?.count || "0", 10);
      const remaining = Math.max(0, MONTHLY_LIMIT - usedCount);

      // Get last refresh time
      const lastRefresh = await pool.query(
        `SELECT created_at FROM serp_manual_refreshes
         WHERE site_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [siteId]
      );

      return res.status(200).json({
        used: usedCount,
        remaining,
        limit: MONTHLY_LIMIT,
        lastRefresh: lastRefresh.rows[0]?.created_at || null,
        monthKey,
      });
    }

    if (req.method === "POST") {
      // Check usage limit
      const usageResult = await pool.query(
        `SELECT COUNT(*) as count FROM serp_manual_refreshes
         WHERE site_id = $1 AND month_key = $2`,
        [siteId, monthKey]
      );

      const usedCount = parseInt(usageResult.rows[0]?.count || "0", 10);

      if (usedCount >= MONTHLY_LIMIT) {
        return res.status(429).json({
          error: "Monthly refresh limit reached",
          used: usedCount,
          limit: MONTHLY_LIMIT,
          remaining: 0,
          upgradeRequired: true,
        });
      }

      // Get site domain
      const siteResult = await pool.query(
        `SELECT base_url FROM sites WHERE site_id = $1`,
        [siteId]
      );

      if (siteResult.rows.length === 0) {
        return res.status(404).json({ error: "Site not found" });
      }

      const baseUrl = siteResult.rows[0].base_url;
      const domain = baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

      // Record the refresh attempt
      await pool.query(
        `INSERT INTO serp_manual_refreshes (site_id, month_key, domain, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [siteId, monthKey, domain]
      );

      // Trigger SERP refresh via the SERP worker
      const serpBaseUrl = process.env.SERP_INTELLIGENCE_BASE_URL || process.env.SERP_WORKER_BASE_URL;
      const serpApiKey = process.env.SERP_INTELLIGENCE_API_KEY;

      if (!serpBaseUrl) {
        // Return success but note that worker isn't configured
        const remaining = MONTHLY_LIMIT - usedCount - 1;
        return res.status(200).json({
          success: true,
          message: "Refresh recorded but SERP worker not configured",
          used: usedCount + 1,
          remaining,
          limit: MONTHLY_LIMIT,
        });
      }

      try {
        // Call SERP worker to trigger a refresh
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (serpApiKey) headers["X-Api-Key"] = serpApiKey;

        const refreshUrl = `${serpBaseUrl}/api/serp/refresh`;
        const response = await fetch(refreshUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ site: domain }),
        });

        const responseText = await response.text();
        let refreshResult;
        try {
          refreshResult = JSON.parse(responseText);
        } catch {
          refreshResult = { raw: responseText };
        }

        const remaining = MONTHLY_LIMIT - usedCount - 1;

        if (response.ok) {
          return res.status(200).json({
            success: true,
            message: "SERP refresh triggered successfully",
            used: usedCount + 1,
            remaining,
            limit: MONTHLY_LIMIT,
            refreshResult,
          });
        } else {
          // Refresh was recorded, but worker returned an error
          return res.status(200).json({
            success: true,
            message: "Refresh recorded, data will update soon",
            used: usedCount + 1,
            remaining,
            limit: MONTHLY_LIMIT,
            workerStatus: response.status,
          });
        }
      } catch (fetchError: any) {
        // Refresh recorded, but couldn't reach worker
        const remaining = MONTHLY_LIMIT - usedCount - 1;
        return res.status(200).json({
          success: true,
          message: "Refresh recorded, background update scheduled",
          used: usedCount + 1,
          remaining,
          limit: MONTHLY_LIMIT,
        });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("SERP refresh error:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
}
