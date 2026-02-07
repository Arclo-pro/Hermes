/**
 * Acquisition Analysis Types
 *
 * Types for Paid vs Organic yield analysis and budget sensitivity.
 */

export type AcquisitionChannel = "paid" | "organic" | "unknown";

export type AnalysisConfidence = "low" | "med" | "high";

/**
 * Channel split at different funnel stages
 */
export interface ChannelSplit {
  channel: AcquisitionChannel;
  traffic: {
    sessions: number;
    users: number;
    share: number; // 0-100 percentage
  };
  leads: {
    count: number;
    share: number; // 0-100 percentage
    conversionRate: number; // session-to-lead rate
  };
  conversions: {
    count: number;
    rate: number; // lead-to-conversion rate
  };
}

export interface ChannelSplitAnalysis {
  current: ChannelSplit[];
  previous: ChannelSplit[];
  delta: {
    paidShareChange: number;
    organicShareChange: number;
    trendDirection: "shifting_to_paid" | "shifting_to_organic" | "stable";
  };
}

/**
 * Lead quality comparison between channels
 */
export interface LeadQualityMetrics {
  channel: AcquisitionChannel;
  totalLeads: number;
  conversionRate: number; // % of leads that signed up
  avgTimeToConversion: number | null; // days
  avgContactAttempts: number;
  qualityScore: number; // 0-100 composite score
}

export interface LeadQualityComparison {
  paid: LeadQualityMetrics;
  organic: LeadQualityMetrics;
  winner: AcquisitionChannel;
  winnerReason: string;
  confidence: AnalysisConfidence;
}

/**
 * Budget sensitivity analysis
 */
export interface SpendDataPoint {
  week: string;
  spend: number;
  leads: number;
  costPerLead: number;
}

export interface SensitivityZone {
  name: "efficient" | "optimal" | "diminishing" | "wasteful";
  minSpend: number;
  maxSpend: number;
  avgCostPerLead: number;
  description: string;
}

export interface BudgetSensitivityAnalysis {
  dataPoints: SpendDataPoint[];
  zones: SensitivityZone[];
  currentSpendLevel: number;
  currentZone: SensitivityZone["name"];
  optimalRange: {
    min: number;
    max: number;
    expectedCostPerLead: number;
  };
  diminishingReturnsThreshold: number | null;
}

/**
 * Spend reduction recommendation
 */
export interface SpendRecommendation {
  action: "maintain" | "increase" | "decrease";
  currentSpend: number;
  suggestedSpend: {
    min: number;
    max: number;
  };
  expectedImpact: {
    leadChange: number; // percentage change
    costPerLeadChange: number;
    qualityImpact: string;
  };
  confidence: AnalysisConfidence;
  rationale: string;
  caveats: string[];
}

export interface ScenarioPreview {
  label: string;
  spendChange: number; // percentage change
  newMonthlySpend: number;
  expectedLeadChange: number; // percentage
  expectedCostPerLeadChange: number; // percentage
  risk: "low" | "medium" | "high";
}

/**
 * Data availability status
 */
export interface AcquisitionDataStatus {
  hasGA4: boolean;
  hasLeads: boolean;
  hasAds: boolean;
  leadCount: number;
  paidLeadCount: number;
  organicLeadCount: number;
  daysWithSpendData: number;
}

/**
 * Full acquisition analysis response
 */
export interface AcquisitionAnalysis {
  siteId: string;
  analysisDate: string;
  dataRange: {
    start: string;
    end: string;
    daysIncluded: number;
  };

  // Core analyses
  channelSplit: ChannelSplitAnalysis;
  leadQuality: LeadQualityComparison;
  budgetSensitivity: BudgetSensitivityAnalysis | null;
  recommendation: SpendRecommendation | null;

  // Data availability
  dataStatus: AcquisitionDataStatus;

  // Overall confidence and warnings
  overallConfidence: AnalysisConfidence;
  warnings: string[];
  lastUpdated: string;
}

/**
 * API Response types for frontend
 */
export interface AcquisitionOverviewResponse {
  channelSplit: ChannelSplitAnalysis;
  qualityComparison: LeadQualityComparison;
  currentSpendZone: SensitivityZone["name"] | null;
  currentWeeklySpend: number | null;
  toplineRecommendation: string;
  quickInsights: string[];
  dataStatus: AcquisitionDataStatus;
  overallConfidence: AnalysisConfidence;
  warnings: string[];
  lastUpdated: string;
}

export interface AcquisitionBudgetResponse {
  sensitivityCurve: BudgetSensitivityAnalysis;
  recommendation: SpendRecommendation;
  scenarioPreviews: ScenarioPreview[];
  weeklyData: SpendDataPoint[];
  confidence: AnalysisConfidence;
  warnings: string[];
  lastUpdated: string;
}
