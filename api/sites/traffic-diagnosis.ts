/**
 * GET /api/sites/:siteId/traffic-diagnosis → Diagnose why traffic is down
 *
 * Analyzes GA4 dimensional data to explain drops in users/sessions.
 * Returns natural language insights about what's causing the change.
 *
 * Rewrites: /api/sites/:siteId/traffic-diagnosis → /api/sites/traffic-diagnosis?siteId=:siteId
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import {
  getAuthenticatedClientForSite,
  getSiteGoogleCredentials,
  resolveNumericSiteId,
} from "../_lib/googleOAuth.js";

// ============================================================
// Types
// ============================================================

interface DimensionBreakdown {
  dimension: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  contributionPercent: number; // How much this dimension contributes to total change
}

interface DiagnosisInsight {
  id: string;
  category: "channel" | "device" | "geo" | "landing_page" | "overall";
  severity: "high" | "medium" | "low";
  title: string;
  body: string;
  metric: string;
  change: number;
}

interface DiagnosisResult {
  ok: boolean;
  hasDrop: boolean;
  summary: {
    usersChange: number;
    sessionsChange: number;
    periodLabel: string;
  };
  insights: DiagnosisInsight[];
  breakdowns: {
    channels: DimensionBreakdown[];
    devices: DimensionBreakdown[];
    geos: DimensionBreakdown[];
    landingPages: DimensionBreakdown[];
  };
}

// ============================================================
// Helpers
// ============================================================

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function calculateChange(current: number, previous: number): { change: number; changePercent: number } {
  const change = current - previous;
  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
  return { change, changePercent };
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================
// GA4 Data Fetching
// ============================================================

async function fetchDimensionalData(
  auth: any,
  propertyId: string,
  dimension: string,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const analyticsData = google.analyticsdata("v1beta");

  const response = await analyticsData.properties.runReport({
    auth,
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: dimension }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: "20",
    },
  });

  const result = new Map<string, number>();
  for (const row of response.data.rows || []) {
    const key = row.dimensionValues?.[0]?.value || "Unknown";
    const value = parseInt(row.metricValues?.[0]?.value || "0", 10);
    result.set(key, value);
  }
  return result;
}

async function fetchTotalMetrics(
  auth: any,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<{ users: number; sessions: number }> {
  const analyticsData = google.analyticsdata("v1beta");

  const response = await analyticsData.properties.runReport({
    auth,
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    },
  });

  const row = response.data.rows?.[0];
  return {
    users: parseInt(row?.metricValues?.[0]?.value || "0", 10),
    sessions: parseInt(row?.metricValues?.[1]?.value || "0", 10),
  };
}

// ============================================================
// Analysis Logic
// ============================================================

function analyzeDimension(
  current: Map<string, number>,
  previous: Map<string, number>,
  totalChange: number
): DimensionBreakdown[] {
  const results: DimensionBreakdown[] = [];
  const allKeys = new Set([...current.keys(), ...previous.keys()]);

  for (const key of allKeys) {
    const currentVal = current.get(key) || 0;
    const previousVal = previous.get(key) || 0;
    const { change, changePercent } = calculateChange(currentVal, previousVal);

    // Contribution = how much of the total drop this dimension accounts for
    const contributionPercent = totalChange !== 0 ? (change / totalChange) * 100 : 0;

    results.push({
      dimension: key,
      current: currentVal,
      previous: previousVal,
      change,
      changePercent,
      contributionPercent,
    });
  }

  // Sort by absolute contribution (biggest contributors first)
  results.sort((a, b) => Math.abs(b.contributionPercent) - Math.abs(a.contributionPercent));
  return results.slice(0, 10);
}

function generateInsights(
  summary: { usersChange: number; sessionsChange: number },
  channels: DimensionBreakdown[],
  devices: DimensionBreakdown[],
  geos: DimensionBreakdown[],
  landingPages: DimensionBreakdown[]
): DiagnosisInsight[] {
  const insights: DiagnosisInsight[] = [];
  const DROP_THRESHOLD = -10; // Only generate insights for significant drops

  // Overall drop insight
  if (summary.usersChange < DROP_THRESHOLD) {
    insights.push({
      id: "overall-users-drop",
      category: "overall",
      severity: summary.usersChange < -25 ? "high" : "medium",
      title: "User traffic is down",
      body: `Active users decreased ${formatPercent(summary.usersChange)} compared to the previous period.`,
      metric: "users",
      change: summary.usersChange,
    });
  }

  // Channel insights - find the biggest contributor to the drop
  const droppingChannels = channels.filter(c => c.changePercent < DROP_THRESHOLD);
  if (droppingChannels.length > 0) {
    const biggestDrop = droppingChannels[0];
    const severity = biggestDrop.contributionPercent > 50 ? "high" : "medium";

    insights.push({
      id: `channel-drop-${biggestDrop.dimension.toLowerCase().replace(/\s+/g, "-")}`,
      category: "channel",
      severity,
      title: `${biggestDrop.dimension} traffic dropped`,
      body: `${biggestDrop.dimension} is down ${formatPercent(biggestDrop.changePercent)}, accounting for ${Math.abs(biggestDrop.contributionPercent).toFixed(0)}% of your total user loss.`,
      metric: "users",
      change: biggestDrop.changePercent,
    });

    // If organic is down specifically, that's important
    const organic = droppingChannels.find(c =>
      c.dimension.toLowerCase().includes("organic") ||
      c.dimension.toLowerCase().includes("search")
    );
    if (organic && organic !== biggestDrop) {
      insights.push({
        id: "organic-drop",
        category: "channel",
        severity: organic.changePercent < -20 ? "high" : "medium",
        title: "Organic search traffic declined",
        body: `Organic traffic is down ${formatPercent(organic.changePercent)}. This could indicate ranking changes or seasonal patterns.`,
        metric: "users",
        change: organic.changePercent,
      });
    }
  }

  // Device insights
  const droppingDevices = devices.filter(d => d.changePercent < DROP_THRESHOLD);
  if (droppingDevices.length > 0) {
    const biggestDeviceDrop = droppingDevices[0];
    // Only surface if it's mobile-specific (often indicates UX issues)
    if (biggestDeviceDrop.dimension.toLowerCase() === "mobile" &&
        biggestDeviceDrop.contributionPercent > 30) {
      insights.push({
        id: "mobile-drop",
        category: "device",
        severity: biggestDeviceDrop.changePercent < -20 ? "high" : "medium",
        title: "Mobile traffic is down significantly",
        body: `Mobile users dropped ${formatPercent(biggestDeviceDrop.changePercent)}. Check mobile page speed and Core Web Vitals.`,
        metric: "users",
        change: biggestDeviceDrop.changePercent,
      });
    }
  }

  // Geographic insights
  const droppingGeos = geos.filter(g => g.changePercent < DROP_THRESHOLD && g.previous > 50);
  if (droppingGeos.length > 0 && droppingGeos[0].contributionPercent > 25) {
    const biggestGeoDrop = droppingGeos[0];
    insights.push({
      id: `geo-drop-${biggestGeoDrop.dimension.toLowerCase()}`,
      category: "geo",
      severity: "medium",
      title: `Traffic from ${biggestGeoDrop.dimension} declined`,
      body: `Users from ${biggestGeoDrop.dimension} dropped ${formatPercent(biggestGeoDrop.changePercent)}, contributing ${Math.abs(biggestGeoDrop.contributionPercent).toFixed(0)}% of the total decline.`,
      metric: "users",
      change: biggestGeoDrop.changePercent,
    });
  }

  // Landing page insights
  const droppingPages = landingPages.filter(p => p.changePercent < DROP_THRESHOLD && p.previous > 20);
  if (droppingPages.length > 0 && droppingPages[0].contributionPercent > 20) {
    const biggestPageDrop = droppingPages[0];
    const pageName = biggestPageDrop.dimension.length > 40
      ? biggestPageDrop.dimension.substring(0, 40) + "..."
      : biggestPageDrop.dimension;
    insights.push({
      id: "landing-page-drop",
      category: "landing_page",
      severity: biggestPageDrop.changePercent < -30 ? "high" : "medium",
      title: "Key landing page lost traffic",
      body: `"${pageName}" is down ${formatPercent(biggestPageDrop.changePercent)}. Check if content or rankings changed.`,
      metric: "users",
      change: biggestPageDrop.changePercent,
    });
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights.slice(0, 5);
}

// ============================================================
// Main Handler
// ============================================================

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
    if (!creds?.ga4PropertyId) {
      return res.json({
        ok: true,
        hasDrop: false,
        summary: { usersChange: 0, sessionsChange: 0, periodLabel: "" },
        insights: [],
        breakdowns: { channels: [], devices: [], geos: [], landingPages: [] },
        message: "GA4 not connected",
      });
    }

    const auth = await getAuthenticatedClientForSite(siteId);

    // Define periods: current 7 days vs previous 7 days
    const now = new Date();
    const currentEnd = new Date(now);
    currentEnd.setDate(currentEnd.getDate() - 1); // Yesterday (GA4 data has ~24h delay)
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - 6); // 7 days

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - 6);

    // Fetch total metrics for both periods
    const [currentTotals, previousTotals] = await Promise.all([
      fetchTotalMetrics(auth, creds.ga4PropertyId, formatDate(currentStart), formatDate(currentEnd)),
      fetchTotalMetrics(auth, creds.ga4PropertyId, formatDate(previousStart), formatDate(previousEnd)),
    ]);

    const usersChange = calculateChange(currentTotals.users, previousTotals.users);
    const sessionsChange = calculateChange(currentTotals.sessions, previousTotals.sessions);

    // Only do detailed analysis if there's a significant drop
    const hasDrop = usersChange.changePercent < -10 || sessionsChange.changePercent < -10;

    if (!hasDrop) {
      return res.json({
        ok: true,
        hasDrop: false,
        summary: {
          usersChange: usersChange.changePercent,
          sessionsChange: sessionsChange.changePercent,
          periodLabel: `${formatDate(currentStart)} to ${formatDate(currentEnd)} vs previous 7 days`,
        },
        insights: [],
        breakdowns: { channels: [], devices: [], geos: [], landingPages: [] },
      });
    }

    // Fetch dimensional breakdowns for both periods
    const [
      currentChannels,
      previousChannels,
      currentDevices,
      previousDevices,
      currentGeos,
      previousGeos,
      currentPages,
      previousPages,
    ] = await Promise.all([
      fetchDimensionalData(auth, creds.ga4PropertyId, "sessionDefaultChannelGroup", formatDate(currentStart), formatDate(currentEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "sessionDefaultChannelGroup", formatDate(previousStart), formatDate(previousEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "deviceCategory", formatDate(currentStart), formatDate(currentEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "deviceCategory", formatDate(previousStart), formatDate(previousEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "country", formatDate(currentStart), formatDate(currentEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "country", formatDate(previousStart), formatDate(previousEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "landingPage", formatDate(currentStart), formatDate(currentEnd)),
      fetchDimensionalData(auth, creds.ga4PropertyId, "landingPage", formatDate(previousStart), formatDate(previousEnd)),
    ]);

    // Analyze each dimension
    const totalUserChange = currentTotals.users - previousTotals.users;
    const channels = analyzeDimension(currentChannels, previousChannels, totalUserChange);
    const devices = analyzeDimension(currentDevices, previousDevices, totalUserChange);
    const geos = analyzeDimension(currentGeos, previousGeos, totalUserChange);
    const landingPages = analyzeDimension(currentPages, previousPages, totalUserChange);

    // Generate natural language insights
    const insights = generateInsights(
      { usersChange: usersChange.changePercent, sessionsChange: sessionsChange.changePercent },
      channels,
      devices,
      geos,
      landingPages
    );

    console.log(`[TrafficDiagnosis] Site ${siteId}: users ${formatPercent(usersChange.changePercent)}, generated ${insights.length} insights`);

    return res.json({
      ok: true,
      hasDrop: true,
      summary: {
        usersChange: usersChange.changePercent,
        sessionsChange: sessionsChange.changePercent,
        periodLabel: `${formatDate(currentStart)} to ${formatDate(currentEnd)} vs previous 7 days`,
      },
      insights,
      breakdowns: { channels, devices, geos, landingPages },
    } as DiagnosisResult);

  } catch (error: any) {
    console.error("[TrafficDiagnosis] Error:", error.message);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to diagnose traffic",
    });
  }
}
