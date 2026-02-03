/**
 * POST /api/sites/:siteId/google/connect → Start OAuth flow
 * DELETE /api/sites/:siteId/google/disconnect → Remove credentials
 *
 * Rewrites: /api/sites/:siteId/google/connect → /api/sites/google-connect?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import {
  isOAuthConfigured,
  getAuthUrlForSite,
  deleteSiteGoogleCredentials,
  resolveNumericSiteId,
} from "../_lib/googleOAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const siteIdParam = req.query.siteId as string;
  const siteId = await resolveNumericSiteId(siteIdParam);
  if (!siteId) {
    return res.status(400).json({ ok: false, error: "Invalid or unknown site ID" });
  }

  // POST: Start OAuth flow
  if (req.method === "POST") {
    try {
      if (!isOAuthConfigured()) {
        return res.status(503).json({
          ok: false,
          error: "OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        });
      }

      const authUrl = getAuthUrlForSite(siteId);
      console.log(`[GoogleConnect] OAuth flow started for site ${siteId}`);
      return res.json({ ok: true, authUrl });
    } catch (error: any) {
      console.error("[GoogleConnect] Failed to generate auth URL:", error.message);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to start Google connection",
      });
    }
  }

  // DELETE: Disconnect
  if (req.method === "DELETE") {
    try {
      await deleteSiteGoogleCredentials(siteId);
      console.log(`[GoogleConnect] Disconnected site ${siteId}`);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[GoogleConnect] Failed to disconnect:", error.message);
      return res.status(500).json({
        ok: false,
        error: "Failed to disconnect Google account",
      });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
