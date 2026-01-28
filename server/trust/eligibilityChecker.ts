import { storage } from "../storage";
import type { ActionCategory, TrustEligibilityResult, RiskLevel } from "arclo-contracts";

/**
 * Trust Eligibility Checker
 * 
 * Step 6.3: Determines whether an action can be auto-executed based on:
 * - Trust level for the website/category
 * - Action risk level requirements
 * - Confidence threshold
 * - System health checks
 */

interface CanAutoExecuteParams {
  websiteId: string;
  actionCode: string;
  actionCategory: ActionCategory;
}

/**
 * Check if an action can be auto-executed based on trust levels
 */
export async function canAutoExecute(
  params: CanAutoExecuteParams
): Promise<TrustEligibilityResult> {
  const { websiteId, actionCode, actionCategory } = params;

  // 1. Get trust level for this website/category
  const trustLevel = await storage.getTrustLevel(websiteId, actionCategory);
  
  if (!trustLevel) {
    return {
      allowed: false,
      reason: "No trust level configured for this website and action category",
      currentTrustLevel: 0,
      requiredTrustLevel: 0,
      confidence: 0,
      actionCategory,
      riskLevel: "low" as RiskLevel,
    };
  }

  // 2. Get action risk metadata
  const actionRisk = await storage.getActionRisk(actionCode);
  
  if (!actionRisk) {
    return {
      allowed: false,
      reason: "Action not found in risk registry",
      currentTrustLevel: trustLevel.trustLevel,
      requiredTrustLevel: 0,
      confidence: trustLevel.confidence,
      actionCategory,
      riskLevel: "low" as RiskLevel,
    };
  }

  // 3. Check if action requires manual approval regardless of trust
  if (actionRisk.requiresApproval) {
    return {
      allowed: false,
      reason: "This action requires manual approval regardless of trust level",
      currentTrustLevel: trustLevel.trustLevel,
      requiredTrustLevel: actionRisk.minTrustLevel,
      confidence: trustLevel.confidence,
      actionCategory,
      riskLevel: actionRisk.riskLevel as RiskLevel,
    };
  }

  // 4. Check if trust level meets minimum requirement
  if (trustLevel.trustLevel < actionRisk.minTrustLevel) {
    return {
      allowed: false,
      reason: `Trust level ${trustLevel.trustLevel} is below required level ${actionRisk.minTrustLevel}`,
      currentTrustLevel: trustLevel.trustLevel,
      requiredTrustLevel: actionRisk.minTrustLevel,
      confidence: trustLevel.confidence,
      actionCategory,
      riskLevel: actionRisk.riskLevel as RiskLevel,
    };
  }

  // 5. Check confidence threshold (require at least 70% for autonomous actions)
  const CONFIDENCE_THRESHOLD = 70;
  if (trustLevel.trustLevel >= 3 && trustLevel.confidence < CONFIDENCE_THRESHOLD) {
    return {
      allowed: false,
      reason: `Confidence ${trustLevel.confidence}% is below threshold ${CONFIDENCE_THRESHOLD}%`,
      currentTrustLevel: trustLevel.trustLevel,
      requiredTrustLevel: actionRisk.minTrustLevel,
      confidence: trustLevel.confidence,
      actionCategory,
      riskLevel: actionRisk.riskLevel as RiskLevel,
    };
  }

  // 6. Check for recent failures (downgrade if last action was a failure)
  if (
    trustLevel.lastFailureAt &&
    trustLevel.lastSuccessAt &&
    trustLevel.lastFailureAt > trustLevel.lastSuccessAt
  ) {
    return {
      allowed: false,
      reason: "Recent failure detected - trust temporarily downgraded",
      currentTrustLevel: trustLevel.trustLevel,
      requiredTrustLevel: actionRisk.minTrustLevel,
      confidence: trustLevel.confidence,
      actionCategory,
      riskLevel: actionRisk.riskLevel as RiskLevel,
    };
  }

  // 7. All checks passed - action is allowed
  return {
    allowed: true,
    reason: "All eligibility checks passed",
    currentTrustLevel: trustLevel.trustLevel,
    requiredTrustLevel: actionRisk.minTrustLevel,
    confidence: trustLevel.confidence,
    actionCategory,
    riskLevel: actionRisk.riskLevel as RiskLevel,
  };
}

/**
 * Get trust level name for display
 */
export function getTrustLevelName(level: number): string {
  switch (level) {
    case 0:
      return "Observe Only";
    case 1:
      return "Recommend";
    case 2:
      return "Assisted";
    case 3:
      return "Autonomous";
    default:
      return "Unknown";
  }
}

/**
 * Check if trust can be upgraded based on performance
 */
export async function canUpgradeTrust(
  websiteId: string,
  actionCategory: ActionCategory
): Promise<boolean> {
  const trustLevel = await storage.getTrustLevel(websiteId, actionCategory);
  if (!trustLevel) return false;

  // Already at max trust
  if (trustLevel.trustLevel >= 3) return false;

  // Require at least 10 successful actions before upgrade
  const MIN_SUCCESSES = 10;
  if (trustLevel.successCount < MIN_SUCCESSES) return false;

  // Require 90%+ success rate
  const totalActions = trustLevel.successCount + trustLevel.failureCount;
  const successRate = (trustLevel.successCount / totalActions) * 100;
  
  return successRate >= 90;
}

/**
 * Automatically downgrade trust after failures
 */
export async function autoDowngradeTrust(
  websiteId: string,
  actionCategory: ActionCategory
): Promise<void> {
  const trustLevel = await storage.getTrustLevel(websiteId, actionCategory);
  if (!trustLevel || trustLevel.trustLevel === 0) return;

  const totalActions = trustLevel.successCount + trustLevel.failureCount;
  const successRate = (trustLevel.successCount / totalActions) * 100;

  // Downgrade if success rate drops below 60%
  if (successRate < 60 && totalActions >= 5) {
    const newLevel = Math.max(0, trustLevel.trustLevel - 1);
    await storage.setTrustLevel(websiteId, actionCategory, newLevel);
  }
}
