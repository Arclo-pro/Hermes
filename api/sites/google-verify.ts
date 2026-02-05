/**
 * POST /api/sites/:siteId/google/ga4/verify → Verify GA4 connection with test fetch
 *
 * Rewrites: /api/sites/:siteId/google/ga4/verify → /api/sites/google-verify?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import {
  getAuthenticatedClientForSite,
  getSiteGoogleCredentials,
  updateSiteGoogleCredentials,
  resolveNumericSiteId,
} from "../_lib/googleOAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
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
      return res.status(404).json({
        ok: false,
        error: "No Google credentials found. Connect Google first.",
      });
    }

    if (!creds.ga4PropertyId) {
      return res.status(400).json({
        ok: false,
        error: "No GA4 property selected. Select a property first.",
      });
    }

    const auth = await getAuthenticatedClientForSite(siteId);
    const analyticsData = google.analyticsdata("v1beta");

    // Calculate date range: last 28 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    try {
      // Run test fetch: sessions, users, and top 5 landing pages
      const response = await analyticsData.properties.runReport({
        auth,
        property: `properties/${creds.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "5",
        },
      });

      const rows = response.data.rows || [];

      // Calculate totals
      let totalSessions = 0;
      let totalUsers = 0;
      const landingPages: Array<{ page: string; sessions: number; users: number }> = [];

      for (const row of rows) {
        const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
        const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
        const page = row.dimensionValues?.[0]?.value || "/";

        totalSessions += sessions;
        totalUsers += users;
        landingPages.push({ page, sessions, users });
      }

      // Also run a totals-only query for accurate aggregate numbers
      const totalsResponse = await analyticsData.properties.runReport({
        auth,
        property: `properties/${creds.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        },
      });

      const totalsRow = totalsResponse.data.rows?.[0];
      if (totalsRow) {
        totalSessions = parseInt(totalsRow.metricValues?.[0]?.value || "0", 10);
        totalUsers = parseInt(totalsRow.metricValues?.[1]?.value || "0", 10);
      }

      // Update integration status to connected
      await updateSiteGoogleCredentials(siteId, {
        integrationStatus: "connected",
        lastVerifiedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      });

      console.log(`[GoogleVerify] Site ${siteId} GA4 verified - ${totalSessions} sessions, ${totalUsers} users`);

      return res.json({
        ok: true,
        sampleMetrics: {
          sessions: totalSessions,
          users: totalUsers,
          landingPages,
          dateRange: {
            start: formatDate(startDate),
            end: formatDate(endDate),
          },
        },
      });
    } catch (gaError: any) {
      // Update integration status to error
      const errorCode = gaError.code || "UNKNOWN";
      const errorMessage = gaError.message || "Failed to fetch GA4 data";

      await updateSiteGoogleCredentials(siteId, {
        integrationStatus: "error",
        lastErrorCode: String(errorCode),
        lastErrorMessage: errorMessage.substring(0, 500),
      });

      console.error(`[GoogleVerify] Site ${siteId} GA4 verification failed:`, errorCode, errorMessage);

      return res.json({
        ok: false,
        error: errorMessage,
        errorCode,
        troubleshooting: [
          'Verify you have "Viewer" or higher access to this GA4 property',
          "Ensure the correct property is selected",
          "Check if the property has data for the last 28 days",
          "Try reconnecting your Google account",
        ],
      });
    }
  } catch (error: any) {
    console.error("[GoogleVerify] Failed to verify GA4 connection:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to verify GA4 connection",
    });
  }
}
