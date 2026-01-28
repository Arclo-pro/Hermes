import { storage } from "../storage";
import { v4 as uuidv4 } from "uuid";
import type { ActionCategory } from "arclo-contracts";

/**
 * Seed Trust Levels - Step 6.1 Implementation
 * 
 * Initialize trust levels for a website with conservative defaults.
 * All categories start at Level 0 (Observe Only) for safety.
 */

interface SeedTrustParams {
  websiteId: string;
  websiteName?: string;
}

const ACTION_CATEGORIES: ActionCategory[] = [
  "tech-seo",
  "content",
  "links",
  "ads",
  "indexing",
  "performance",
  "compliance",
];

/**
 * Seed trust levels for a website
 */
export async function seedTrustLevels(params: SeedTrustParams): Promise<void> {
  const { websiteId, websiteName = "Unknown" } = params;

  console.log(`Seeding trust levels for website: ${websiteName} (${websiteId})`);

  for (const category of ACTION_CATEGORIES) {
    const trustLevelData = {
      id: uuidv4(),
      websiteId,
      actionCategory: category,
      trustLevel: 0, // Start at Observe Only
      confidence: 0,
      successCount: 0,
      failureCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastReviewedAt: null,
    };

    await storage.upsertTrustLevel(trustLevelData);
    console.log(`  ✓ Initialized ${category} at Level 0 (Observe Only)`);
  }

  console.log(`Trust levels seeded successfully for ${websiteName}`);
}

/**
 * Seed common action risk metadata
 * This defines risk profiles for common SEO actions
 */
export async function seedActionRiskRegistry(): Promise<void> {
  console.log("Seeding action risk registry...");

  const actions = [
    // Technical SEO - Low Risk
    {
      actionCode: "FIX_CANONICAL",
      actionCategory: "tech-seo" as ActionCategory,
      riskLevel: "low" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 2, // Assisted
      requiresApproval: false,
      description: "Fix canonical URL tags on pages",
    },
    {
      actionCode: "ADD_STRUCTURED_DATA",
      actionCategory: "tech-seo" as ActionCategory,
      riskLevel: "low" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 2,
      requiresApproval: false,
      description: "Add schema.org structured data markup",
    },
    {
      actionCode: "FIX_META_ROBOTS",
      actionCategory: "indexing" as ActionCategory,
      riskLevel: "medium" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 2,
      requiresApproval: false,
      description: "Fix meta robots directives",
    },
    
    // Content - Medium Risk
    {
      actionCode: "UPDATE_META_DESCRIPTION",
      actionCategory: "content" as ActionCategory,
      riskLevel: "low" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 2,
      requiresApproval: false,
      description: "Update page meta descriptions",
    },
    {
      actionCode: "REWRITE_TITLE_TAG",
      actionCategory: "content" as ActionCategory,
      riskLevel: "medium" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 3, // Autonomous (requires high trust)
      requiresApproval: false,
      description: "Rewrite page title tags",
    },
    {
      actionCode: "GENERATE_BLOG_POST",
      actionCategory: "content" as ActionCategory,
      riskLevel: "medium" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 3,
      requiresApproval: true, // Always require approval
      description: "Generate new blog post content",
    },
    
    // Performance - Low Risk
    {
      actionCode: "OPTIMIZE_IMAGES",
      actionCategory: "performance" as ActionCategory,
      riskLevel: "low" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 2,
      requiresApproval: false,
      description: "Optimize and compress images",
    },
    {
      actionCode: "LAZY_LOAD_IMAGES",
      actionCategory: "performance" as ActionCategory,
      riskLevel: "low" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 2,
      requiresApproval: false,
      description: "Add lazy loading to images",
    },
    
    // Compliance - High Risk
    {
      actionCode: "ADD_MEDICAL_DISCLAIMER",
      actionCategory: "compliance" as ActionCategory,
      riskLevel: "high" as const,
      blastRadius: "site" as const,
      rollbackPossible: true,
      minTrustLevel: 3,
      requiresApproval: true, // Always require approval for compliance
      description: "Add medical disclaimer to health content",
    },
    
    // Ads - Medium Risk
    {
      actionCode: "PAUSE_UNDERPERFORMING_AD",
      actionCategory: "ads" as ActionCategory,
      riskLevel: "medium" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 3,
      requiresApproval: false,
      description: "Pause underperforming ad campaigns",
    },
    {
      actionCode: "ADJUST_AD_BID",
      actionCategory: "ads" as ActionCategory,
      riskLevel: "medium" as const,
      blastRadius: "page" as const,
      rollbackPossible: true,
      minTrustLevel: 3,
      requiresApproval: false,
      description: "Adjust bid amounts for ad keywords",
    },
  ];

  for (const action of actions) {
    try {
      await storage.registerActionRisk(action);
      console.log(`  ✓ Registered ${action.actionCode}`);
    } catch (error) {
      // Skip if already exists (unique constraint)
      if (error instanceof Error && error.message.includes("unique")) {
        console.log(`  - Skipped ${action.actionCode} (already exists)`);
      } else {
        throw error;
      }
    }
  }

  console.log("Action risk registry seeded successfully");
}

/**
 * Example usage - seed for first website
 */
export async function seedFirstWebsite(websiteId: string): Promise<void> {
  console.log("=".repeat(60));
  console.log("Step 6.1: Seeding Trust Levels for First Website");
  console.log("=".repeat(60));

  // 1. Seed trust levels
  await seedTrustLevels({
    websiteId,
    websiteName: "First Test Website",
  });

  console.log();

  // 2. Seed action risk registry
  await seedActionRiskRegistry();

  console.log();
  console.log("=".repeat(60));
  console.log("Trust system initialized successfully!");
  console.log("All action categories start at Level 0 (Observe Only)");
  console.log("Trust can be upgraded manually or earned through successful actions");
  console.log("=".repeat(60));
}
