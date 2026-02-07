/**
 * Acquisition Analyzer Service
 *
 * Analyzes paid vs organic acquisition efficiency and generates
 * budget sensitivity recommendations.
 */

import { db } from "../../db";
import { ga4Daily, leads, adsDaily } from "../../../shared/schema";
import { eq, gte, and, desc, sql } from "drizzle-orm";
import type {
  AcquisitionAnalysis,
  AcquisitionOverviewResponse,
  AcquisitionBudgetResponse,
  AcquisitionDataStatus,
  ChannelSplitAnalysis,
  LeadQualityComparison,
  BudgetSensitivityAnalysis,
  SpendRecommendation,
  ScenarioPreview,
  AnalysisConfidence,
} from "../../../shared/types/acquisitionAnalysis";
import { daysAgo } from "./types";
import { analyzeChannelSplit, emptyChannelSplit } from "./drivers/channelSplitDriver";
import { analyzeLeadQuality, insufficientDataQuality } from "./drivers/leadQualityDriver";
import { analyzeBudgetSensitivity } from "./drivers/budgetSensitivityDriver";
import { calculateOverallConfidence, generateWarnings } from "./utils/confidence";
import {
  generateSpendRecommendation,
  generateScenarios,
  generateToplineRecommendation,
  generateQuickInsights,
} from "./utils/recommendations";

const DEFAULT_DAYS = 90;
const COMPARISON_DAYS = 45; // Split 90 days into two 45-day periods

/**
 * Fetch all required data for analysis
 */
async function fetchData(siteId: string, days: number = DEFAULT_DAYS) {
  const startDate = daysAgo(days);
  const midDate = daysAgo(Math.floor(days / 2));

  // Fetch GA4, leads, and ads data in parallel
  const [ga4Data, leadsData, adsData] = await Promise.all([
    db
      .select()
      .from(ga4Daily)
      .where(and(eq(ga4Daily.siteId, siteId), gte(ga4Daily.date, startDate)))
      .orderBy(desc(ga4Daily.date)),

    db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.siteId, siteId),
          gte(leads.createdAt, new Date(startDate))
        )
      )
      .orderBy(desc(leads.createdAt)),

    db
      .select()
      .from(adsDaily)
      .where(gte(adsDaily.date, startDate))
      .orderBy(desc(adsDaily.date)),
  ]);

  // Split into current and previous periods
  const currentGA4 = ga4Data.filter(d => d.date && d.date >= midDate);
  const previousGA4 = ga4Data.filter(d => d.date && d.date < midDate);

  const currentLeads = leadsData.filter(
    l => l.createdAt && new Date(l.createdAt) >= new Date(midDate)
  );
  const previousLeads = leadsData.filter(
    l => l.createdAt && new Date(l.createdAt) < new Date(midDate)
  );

  return {
    ga4Data,
    leadsData,
    adsData,
    currentGA4,
    previousGA4,
    currentLeads,
    previousLeads,
    dateRange: {
      start: startDate,
      end: daysAgo(0),
      days,
    },
  };
}

/**
 * Build data status from fetched data
 */
function buildDataStatus(
  ga4Data: any[],
  leadsData: any[],
  adsData: any[],
  paidLeadCount: number,
  organicLeadCount: number
): AcquisitionDataStatus {
  const uniqueDatesWithSpend = new Set(
    adsData.filter(a => a.spend && a.spend > 0).map(a => a.date)
  );

  return {
    hasGA4: ga4Data.length > 0,
    hasLeads: leadsData.length > 0,
    hasAds: adsData.length > 0 && adsData.some(a => a.spend && a.spend > 0),
    leadCount: leadsData.length,
    paidLeadCount,
    organicLeadCount,
    daysWithSpendData: uniqueDatesWithSpend.size,
  };
}

/**
 * Analyze acquisition for the overview page
 */
export async function analyzeAcquisitionOverview(
  siteId: string
): Promise<AcquisitionOverviewResponse> {
  try {
    const data = await fetchData(siteId);

    // Analyze channel split
    let channelSplit: ChannelSplitAnalysis;
    if (data.ga4Data.length > 0 || data.leadsData.length > 0) {
      channelSplit = analyzeChannelSplit(
        data.currentGA4,
        data.previousGA4,
        data.currentLeads,
        data.previousLeads
      );
    } else {
      channelSplit = emptyChannelSplit();
    }

    // Analyze lead quality
    let qualityComparison: LeadQualityComparison;
    const paidLeads = data.leadsData.filter(
      l => l.utmMedium?.toLowerCase().includes("cpc") ||
           l.utmMedium?.toLowerCase().includes("paid") ||
           l.utmSource?.toLowerCase().includes("ads")
    );
    const organicLeads = data.leadsData.filter(
      l => !paidLeads.includes(l)
    );

    if (paidLeads.length >= 5 && organicLeads.length >= 5) {
      qualityComparison = analyzeLeadQuality(data.leadsData);
    } else {
      qualityComparison = insufficientDataQuality();
    }

    // Quick budget sensitivity for zone indicator
    let currentSpendZone: BudgetSensitivityAnalysis["currentZone"] | null = null;
    let currentWeeklySpend: number | null = null;
    let recommendation: SpendRecommendation | null = null;

    if (data.adsData.length >= 4) {
      const sensitivity = analyzeBudgetSensitivity(data.adsData, data.leadsData);
      if (sensitivity) {
        currentSpendZone = sensitivity.currentZone;
        currentWeeklySpend = sensitivity.currentSpendLevel;
        recommendation = generateSpendRecommendation(sensitivity, qualityComparison);
      }
    }

    // Build data status
    const dataStatus = buildDataStatus(
      data.ga4Data,
      data.leadsData,
      data.adsData,
      paidLeads.length,
      organicLeads.length
    );

    // Generate warnings
    const warnings = generateWarnings(dataStatus);

    // Calculate confidence
    const overallConfidence = calculateOverallConfidence({
      dataStatus,
      leadQuality: qualityComparison,
      budgetSensitivity: null,
    });

    // Generate topline recommendation
    const toplineRecommendation = generateToplineRecommendation(
      dataStatus.hasAds,
      dataStatus.hasLeads,
      qualityComparison,
      recommendation
    );

    // Generate quick insights
    const paidShare = channelSplit.current.find(c => c.channel === "paid")?.traffic.share || 0;
    const organicShare = channelSplit.current.find(c => c.channel === "organic")?.traffic.share || 0;
    const quickInsights = generateQuickInsights(
      qualityComparison,
      recommendation,
      paidShare,
      organicShare
    );

    return {
      channelSplit,
      qualityComparison,
      currentSpendZone,
      currentWeeklySpend,
      toplineRecommendation,
      quickInsights,
      dataStatus,
      overallConfidence,
      warnings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[AcquisitionAnalyzer] Error in overview:", error);
    throw error;
  }
}

/**
 * Analyze acquisition for the budget impact page
 */
export async function analyzeAcquisitionBudget(
  siteId: string
): Promise<AcquisitionBudgetResponse | null> {
  try {
    const data = await fetchData(siteId);

    // Need ads data for budget analysis
    if (data.adsData.length < 4) {
      return null;
    }

    // Analyze budget sensitivity
    const sensitivity = analyzeBudgetSensitivity(data.adsData, data.leadsData);
    if (!sensitivity) {
      return null;
    }

    // Analyze lead quality
    const qualityComparison = data.leadsData.length >= 10
      ? analyzeLeadQuality(data.leadsData)
      : insufficientDataQuality();

    // Generate recommendation
    const recommendation = generateSpendRecommendation(sensitivity, qualityComparison);

    // Generate scenarios
    const scenarioPreviews = generateScenarios(sensitivity);

    // Generate warnings
    const paidLeads = data.leadsData.filter(
      l => l.utmMedium?.toLowerCase().includes("cpc") ||
           l.utmMedium?.toLowerCase().includes("paid") ||
           l.utmSource?.toLowerCase().includes("ads")
    );
    const organicLeads = data.leadsData.filter(l => !paidLeads.includes(l));

    const dataStatus = buildDataStatus(
      data.ga4Data,
      data.leadsData,
      data.adsData,
      paidLeads.length,
      organicLeads.length
    );
    const warnings = generateWarnings(dataStatus);

    return {
      sensitivityCurve: sensitivity,
      recommendation,
      scenarioPreviews,
      weeklyData: sensitivity.dataPoints,
      confidence: recommendation.confidence,
      warnings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[AcquisitionAnalyzer] Error in budget:", error);
    throw error;
  }
}
