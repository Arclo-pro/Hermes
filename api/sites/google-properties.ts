/**
 * GET /api/sites/:siteId/google/properties → Discover available GA4 & GSC properties
 * PUT /api/sites/:siteId/google/properties → Save selected properties
 *
 * Rewrites: /api/sites/:siteId/google/properties → /api/sites/google-properties?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { getSessionUser, setCorsHeaders, parseRequestBody } from "../_lib/auth.js";
import {
  getAuthenticatedClientForSite,
  getSiteGoogleCredentials,
  updateSiteGoogleCredentials,
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

  // GET: Discover properties
  if (req.method === "GET") {
    try {
      // Optional accountId filter - if provided, only return properties from that account
      const accountIdFilter = req.query.accountId as string | undefined;

      const auth = await getAuthenticatedClientForSite(siteId);

      // Discover GA4 properties
      const ga4Properties: Array<{ propertyId: string; displayName: string; accountId: string }> = [];
      try {
        const adminApi = google.analyticsadmin("v1beta");

        if (accountIdFilter) {
          // Fetch properties for specific account
          const propsRes = await adminApi.properties.list({
            auth,
            filter: `parent:accounts/${accountIdFilter}`,
          });
          for (const prop of propsRes.data.properties || []) {
            const id = prop.name?.replace("properties/", "") || "";
            if (id) {
              ga4Properties.push({
                propertyId: id,
                displayName: prop.displayName || id,
                accountId: accountIdFilter,
              });
            }
          }
        } else {
          // Fetch properties from all accounts
          const accountsRes = await adminApi.accounts.list({ auth });
          const accounts = accountsRes.data.accounts || [];

          for (const account of accounts) {
            const accountId = account.name?.replace("accounts/", "") || "";
            const propsRes = await adminApi.properties.list({
              auth,
              filter: `parent:${account.name}`,
            });
            for (const prop of propsRes.data.properties || []) {
              const id = prop.name?.replace("properties/", "") || "";
              if (id) {
                ga4Properties.push({
                  propertyId: id,
                  displayName: prop.displayName || id,
                  accountId,
                });
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("[GoogleProperties] Failed to list GA4 properties:", err.message);
      }

      // Discover GSC sites
      const gscSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
      try {
        const searchConsole = google.searchconsole("v1");
        const sitesRes = await searchConsole.sites.list({ auth });
        for (const entry of sitesRes.data.siteEntry || []) {
          if (entry.siteUrl) {
            gscSites.push({
              siteUrl: entry.siteUrl,
              permissionLevel: entry.permissionLevel || "unknown",
            });
          }
        }
      } catch (err: any) {
        console.warn("[GoogleProperties] Failed to list GSC sites:", err.message);
      }

      return res.json({
        ok: true,
        ga4: ga4Properties,
        gsc: gscSites,
      });
    } catch (error: any) {
      console.error("[GoogleProperties] Failed to discover properties:", error.message);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to discover Google properties",
      });
    }
  }

  // PUT: Save selected properties
  if (req.method === "PUT") {
    try {
      let body: any;
      try {
        body = typeof req.body === "object" ? req.body : await parseRequestBody(req);
      } catch {
        body = {};
      }

      const creds = await getSiteGoogleCredentials(siteId);
      if (!creds) {
        return res.status(404).json({
          ok: false,
          error: "No Google credentials found. Connect Google first.",
        });
      }

      // Build updates
      const updates: any = {};
      if (body.ga4PropertyId !== undefined) updates.ga4PropertyId = body.ga4PropertyId;
      if (body.ga4StreamId !== undefined) updates.ga4StreamId = body.ga4StreamId;
      if (body.gscSiteUrl !== undefined) updates.gscSiteUrl = body.gscSiteUrl;
      if (body.adsCustomerId !== undefined) updates.adsCustomerId = body.adsCustomerId;
      if (body.adsLoginCustomerId !== undefined) updates.adsLoginCustomerId = body.adsLoginCustomerId;

      await updateSiteGoogleCredentials(siteId, updates);

      console.log(`[GoogleProperties] Updated properties for site ${siteId}:`, Object.keys(updates));
      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[GoogleProperties] Failed to update properties:", error.message);
      return res.status(500).json({
        ok: false,
        error: "Failed to update Google properties",
      });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
