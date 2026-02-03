/**
 * GET /api/sites/:siteId/google/status → Connection status
 *
 * Rewrites: /api/sites/:siteId/google/status → /api/sites/google-status?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import { getSiteGoogleCredentials, resolveNumericSiteId } from "../_lib/googleOAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const siteIdParam = req.query.siteId as string;
  const siteId = await resolveNumericSiteId(siteIdParam);
  if (!siteId) {
    return res.status(400).json({ ok: false, error: "Invalid or unknown site ID" });
  }

  try {
    const creds = await getSiteGoogleCredentials(siteId);

    if (!creds) {
      return res.json({
        ok: true,
        connected: false,
        integrationStatus: "disconnected",
        ga4: null,
        gsc: null,
        ads: null,
      });
    }

    return res.json({
      ok: true,
      connected: true,
      googleEmail: creds.googleEmail,
      connectedAt: creds.connectedAt?.toISOString() || null,
      integrationStatus: creds.integrationStatus || "disconnected",
      lastVerifiedAt: creds.lastVerifiedAt?.toISOString() || null,
      lastErrorCode: creds.lastErrorCode || null,
      lastErrorMessage: creds.lastErrorMessage || null,
      ga4: creds.ga4PropertyId
        ? {
            propertyId: creds.ga4PropertyId,
            streamId: creds.ga4StreamId || null,
          }
        : null,
      gsc: creds.gscSiteUrl ? { siteUrl: creds.gscSiteUrl } : null,
      ads: creds.adsCustomerId
        ? {
            customerId: creds.adsCustomerId,
            loginCustomerId: creds.adsLoginCustomerId,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[GoogleStatus] Failed to fetch status:", error.message);
    return res.status(500).json({
      ok: false,
      error: "Failed to fetch Google connection status",
    });
  }
}
