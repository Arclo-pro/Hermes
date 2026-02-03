/**
 * POST /api/admin/oauth-config → Save Google OAuth configuration for a site
 * GET /api/admin/oauth-config → Check if OAuth is configured for a site
 *
 * Multi-tenant: Each site/user has their own Google Cloud project credentials.
 * This allows agencies and businesses to use their own Google API quotas.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import { getPool } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const siteId = req.query.siteId as string;
  if (!siteId) {
    return res.status(400).json({ ok: false, error: "Site ID required" });
  }

  const pool = getPool();

  // Ensure table exists for per-site OAuth config
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_oauth_config (
      id SERIAL PRIMARY KEY,
      site_id INTEGER NOT NULL UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {
    // Table might already exist or sites table might not exist yet
  });

  // GET: Check configuration status for this site
  if (req.method === "GET") {
    try {
      // First check for platform-wide env vars (fallback)
      const hasEnvVars = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

      // Then check for site-specific config
      const result = await pool.query(
        `SELECT id, redirect_uri, created_at, updated_at
         FROM site_oauth_config
         WHERE site_id = $1
         LIMIT 1`,
        [siteId]
      );

      const hasSiteConfig = result.rows.length > 0;

      return res.json({
        ok: true,
        configured: hasEnvVars || hasSiteConfig,
        source: hasSiteConfig ? "site" : hasEnvVars ? "platform" : "none",
        redirectUri: hasSiteConfig ? result.rows[0].redirect_uri : null,
      });
    } catch (error: any) {
      console.error("[OAuthConfig] Failed to check config:", error.message);
      return res.status(500).json({
        ok: false,
        error: "Failed to check OAuth configuration",
      });
    }
  }

  // POST: Save configuration for this site
  if (req.method === "POST") {
    try {
      const { clientId, clientSecret, redirectUri } = req.body;

      if (!clientId || !clientSecret || !redirectUri) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields: clientId, clientSecret, redirectUri",
        });
      }

      // Validate the credentials format
      if (!clientId.includes(".apps.googleusercontent.com")) {
        return res.status(400).json({
          ok: false,
          error: "Invalid Client ID format. Should end with .apps.googleusercontent.com",
        });
      }

      // Resolve site ID if it's a text ID
      let numericSiteId = parseInt(siteId, 10);
      if (isNaN(numericSiteId)) {
        const siteResult = await pool.query(
          `SELECT id FROM sites WHERE site_id = $1 LIMIT 1`,
          [siteId]
        );
        if (siteResult.rows.length === 0) {
          return res.status(404).json({ ok: false, error: "Site not found" });
        }
        numericSiteId = siteResult.rows[0].id;
      }

      // Upsert the configuration for this site
      await pool.query(
        `INSERT INTO site_oauth_config (site_id, client_id, client_secret, redirect_uri, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (site_id) DO UPDATE SET
           client_id = EXCLUDED.client_id,
           client_secret = EXCLUDED.client_secret,
           redirect_uri = EXCLUDED.redirect_uri,
           updated_at = NOW()`,
        [numericSiteId, clientId, clientSecret, redirectUri]
      );

      console.log(`[OAuthConfig] Google OAuth configuration saved for site ${numericSiteId}`);

      return res.json({
        ok: true,
        message: "OAuth configuration saved successfully",
      });
    } catch (error: any) {
      console.error("[OAuthConfig] Failed to save config:", error.message);
      return res.status(500).json({
        ok: false,
        error: "Failed to save OAuth configuration",
      });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
