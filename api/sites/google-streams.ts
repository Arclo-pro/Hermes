/**
 * GET /api/sites/:siteId/google/streams?propertyId=XXX → List web data streams for a GA4 property
 *
 * Rewrites: /api/sites/:siteId/google/streams → /api/sites/google-streams?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import { getAuthenticatedClientForSite, resolveNumericSiteId } from "../_lib/googleOAuth.js";

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

  const propertyId = req.query.propertyId as string;
  if (!propertyId) {
    return res.status(400).json({
      ok: false,
      error: "propertyId query parameter is required",
    });
  }

  try {
    const auth = await getAuthenticatedClientForSite(siteId);
    const adminApi = google.analyticsadmin("v1beta");

    const streams: Array<{
      streamId: string;
      streamName: string;
      measurementId: string | null;
    }> = [];

    try {
      const streamsRes = await adminApi.properties.dataStreams.list({
        auth,
        parent: `properties/${propertyId}`,
      });

      for (const stream of streamsRes.data.dataStreams || []) {
        // Only include web data streams
        if (stream.type === "WEB_DATA_STREAM" && stream.name) {
          const streamId = stream.name.split("/").pop() || "";
          streams.push({
            streamId,
            streamName: stream.displayName || streamId,
            measurementId: stream.webStreamData?.measurementId || null,
          });
        }
      }
    } catch (err: any) {
      console.warn("[GoogleStreams] Failed to list data streams:", err.message);
      return res.status(500).json({
        ok: false,
        error: "Failed to list data streams",
      });
    }

    return res.json({ ok: true, streams });
  } catch (error: any) {
    console.error("[GoogleStreams] Failed to fetch streams:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch data streams",
    });
  }
}
