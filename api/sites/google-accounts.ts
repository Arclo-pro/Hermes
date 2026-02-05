/**
 * GET /api/sites/:siteId/google/accounts → List GA4 accounts the user has access to
 *
 * Rewrites: /api/sites/:siteId/google/accounts → /api/sites/google-accounts?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import {
  getAuthenticatedClientForSite,
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

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedClientForSite(siteId);
    const adminApi = google.analyticsadmin("v1beta");

    const accounts: Array<{ accountId: string; displayName: string }> = [];
    let accountsError: string | null = null;
    try {
      // Use accountSummaries.list() to include accounts where user has
      // property-level access only (not just account-level)
      const summariesRes = await adminApi.accountSummaries.list({ auth });
      for (const summary of summariesRes.data.accountSummaries || []) {
        const accountRef = summary.account || "";
        const id = accountRef.replace("accounts/", "");
        if (id) {
          accounts.push({
            accountId: id,
            displayName: summary.displayName || id,
          });
        }
      }
    } catch (err: any) {
      console.warn("[GoogleAccounts] Failed to list GA4 accounts:", err.message);
      const msg = err.message || "Unknown error";
      if (msg.includes("has not been used") || msg.includes("is disabled") || err.code === 403) {
        accountsError = "The Google Analytics Admin API is not enabled in your Google Cloud project.";
      } else {
        accountsError = `Failed to list accounts: ${msg}`;
      }
    }

    return res.json({ ok: true, accounts, error: accountsError });
  } catch (error: any) {
    console.error("[GoogleAccounts] Failed to fetch accounts:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch Google accounts",
    });
  }
}
