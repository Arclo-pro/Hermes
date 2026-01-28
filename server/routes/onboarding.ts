/**
 * Step 9.1: Website Onboarding Routes
 *
 * Handles the complete onboarding flow:
 * 1. Add domain
 * 2. Verify ownership (or accept limited mode)
 * 3. Connect Google (GSC + GA4)
 * 4. Add competitors (or auto-suggest)
 * 5. Choose automation mode
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  websites,
  websitePolicies,
  websiteSettings,
  websiteVerifications,
  digestSchedule,
  firstRunResults,
  users,
  AutomationModes,
  VerificationMethods,
  type InsertWebsite,
  type InsertWebsitePolicy,
  type InsertWebsiteSettings,
  type InsertWebsiteVerification,
  type InsertDigestSchedule,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import { executeRun } from '../runOrchestrator';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: Add Domain & Create Website
// ═══════════════════════════════════════════════════════════════════════════

const addWebsiteSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1, "Website name is required"),
  domain: z.string().min(1, "Domain is required")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, "Invalid domain format"),
  automationMode: z.enum(['observe', 'recommend', 'assisted', 'auto']).default('observe'),
});

router.post('/onboarding/website', async (req, res) => {
  try {
    const parsed = addWebsiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { userId, name, domain, automationMode } = parsed.data;

    // Check if user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if domain already exists
    const existing = await db.select().from(websites).where(eq(websites.domain, domain)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Website with this domain already exists" });
    }

    const websiteId = randomUUID();

    // Create website with Step 9 defaults
    const [newWebsite] = await db.insert(websites).values({
      id: websiteId,
      name,
      domain,
      userId,
      status: 'active',
      automationMode,
      trustLevel: 1,
      verificationStatus: 'unverified',
      runFrequencyHours: 24,
      maxCrawlDepth: 100,
      maxKeywordsTracked: 50,
      notificationCadence: 'weekly',
    } as InsertWebsite).returning();

    // Create default policies (conservative by default)
    await db.insert(websitePolicies).values({
      websiteId,
      canAutoFixTechnical: automationMode === 'auto' || automationMode === 'assisted',
      canAutoPublishContent: false, // Always require approval for content
      canAutoUpdateContent: false,
      canAutoOptimizeImages: automationMode === 'auto',
      canAutoUpdateCode: false,
      maxAutoRiskLevel: automationMode === 'auto' ? 5 : 3,
      blockedPaths: ['/checkout', '/cart', '/admin', '/login'],
      blockedFileTypes: ['.env', '.key', '.pem'],
    } as InsertWebsitePolicy);

    // Create default settings
    await db.insert(websiteSettings).values({
      websiteId,
      competitors: [],
      targetServicesEnabled: ['google_data_connector', 'technical_seo'],
      notes: '',
    } as InsertWebsiteSettings);

    // Create weekly digest schedule
    await db.insert(digestSchedule).values({
      websiteId,
      userId,
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      includeOnlyIfChanges: true,
      minActionsToSend: 1,
      enabled: true,
    } as InsertDigestSchedule);

    logger.info("Onboarding", "Website created", { websiteId, domain, userId, automationMode });

    res.status(201).json({
      website: newWebsite,
      nextStep: 'verify',
      message: "Website added successfully. Next: verify ownership.",
    });
  } catch (error: any) {
    logger.error("Onboarding", "Failed to create website", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: Initiate Domain Verification
// ═══════════════════════════════════════════════════════════════════════════

const initVerificationSchema = z.object({
  websiteId: z.string().uuid(),
  method: z.enum(['dns_txt', 'meta_tag', 'file_upload', 'gsc_property']),
});

router.post('/onboarding/verify/init', async (req, res) => {
  try {
    const parsed = initVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { websiteId, method } = parsed.data;

    // Get website
    const [website] = await db.select().from(websites).where(eq(websites.id, websiteId)).limit(1);
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Generate verification token
    const token = `arclo-verify-${nanoid(32)}`;

    // Create verification record
    const [verification] = await db.insert(websiteVerifications).values({
      websiteId,
      method,
      token,
      verified: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    } as InsertWebsiteVerification).returning();

    // Return instructions based on method
    let instructions: string;
    let verificationData: Record<string, any> = { token };

    switch (method) {
      case 'dns_txt':
        instructions = `Add a TXT record to your DNS with:\nName: _arclo-verification\nValue: ${token}`;
        verificationData.recordName = '_arclo-verification';
        verificationData.recordValue = token;
        break;

      case 'meta_tag':
        instructions = `Add this meta tag to your site's <head>:\n<meta name="arclo-site-verification" content="${token}" />`;
        verificationData.metaTag = `<meta name="arclo-site-verification" content="${token}" />`;
        break;

      case 'file_upload':
        instructions = `Upload a file to your site:\nURL: https://${website.domain}/arclo-verification.txt\nContent: ${token}`;
        verificationData.filePath = '/arclo-verification.txt';
        verificationData.fileContent = token;
        break;

      case 'gsc_property':
        instructions = 'Connect via Google Search Console OAuth. This will verify ownership automatically.';
        break;
    }

    logger.info("Onboarding", "Verification initiated", { websiteId, method });

    res.json({
      verificationId: verification.id,
      method,
      instructions,
      ...verificationData,
      expiresAt: verification.expiresAt,
    });
  } catch (error: any) {
    logger.error("Onboarding", "Failed to init verification", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Check verification status
router.post('/onboarding/verify/check', async (req, res) => {
  try {
    const { verificationId } = req.body;

    const [verification] = await db.select()
      .from(websiteVerifications)
      .where(eq(websiteVerifications.id, verificationId))
      .limit(1);

    if (!verification) {
      return res.status(404).json({ error: "Verification not found" });
    }

    const [website] = await db.select()
      .from(websites)
      .where(eq(websites.id, verification.websiteId))
      .limit(1);

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Attempt verification based on method
    let verified = false;
    let errorMessage: string | null = null;

    try {
      switch (verification.method) {
        case 'dns_txt':
          verified = await verifyDNS(website.domain, verification.token);
          break;
        case 'meta_tag':
          verified = await verifyMetaTag(website.domain, verification.token);
          break;
        case 'file_upload':
          verified = await verifyFile(website.domain, verification.token);
          break;
        case 'gsc_property':
          // GSC verification handled via OAuth callback
          verified = verification.verified;
          break;
      }
    } catch (error: any) {
      errorMessage = error.message;
    }

    if (verified && !verification.verified) {
      // Mark as verified
      await db.update(websiteVerifications)
        .set({ verified: true, verifiedAt: new Date() })
        .where(eq(websiteVerifications.id, verification.id));

      // Update website
      await db.update(websites)
        .set({
          verificationStatus: `${verification.method.replace('_', '_')}_verified` as any,
          verificationMethod: verification.method,
        })
        .where(eq(websites.id, website.id));

      logger.info("Onboarding", "Website verified", {
        websiteId: website.id,
        method: verification.method
      });
    }

    res.json({
      verified,
      verificationStatus: verified ? 'verified' : 'pending',
      errorMessage,
      nextStep: verified ? 'connect_google' : null,
    });
  } catch (error: any) {
    logger.error("Onboarding", "Failed to check verification", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: Connect Google Services
// ═══════════════════════════════════════════════════════════════════════════

const connectGoogleSchema = z.object({
  websiteId: z.string().uuid(),
  gscPropertyUrl: z.string().optional(),
  ga4PropertyId: z.string().optional(),
  ga4StreamId: z.string().optional(),
});

router.post('/onboarding/connect-google', async (req, res) => {
  try {
    const parsed = connectGoogleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { websiteId, gscPropertyUrl, ga4PropertyId, ga4StreamId } = parsed.data;

    // Update website with Google integration details
    const [updated] = await db.update(websites)
      .set({
        gscPropertyUrl,
        ga4PropertyId,
        ga4StreamId,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, websiteId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Website not found" });
    }

    logger.info("Onboarding", "Google services connected", { websiteId, gscPropertyUrl, ga4PropertyId });

    res.json({
      website: updated,
      nextStep: 'add_competitors',
      message: "Google services connected successfully",
    });
  } catch (error: any) {
    logger.error("Onboarding", "Failed to connect Google", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: Add Competitors
// ═══════════════════════════════════════════════════════════════════════════

const addCompetitorsSchema = z.object({
  websiteId: z.string().uuid(),
  competitors: z.array(z.string()).min(0).max(10),
});

router.post('/onboarding/competitors', async (req, res) => {
  try {
    const parsed = addCompetitorsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { websiteId, competitors } = parsed.data;

    // Update website settings
    await db.update(websiteSettings)
      .set({ competitors, updatedAt: new Date() })
      .where(eq(websiteSettings.websiteId, websiteId));

    logger.info("Onboarding", "Competitors added", { websiteId, count: competitors.length });

    res.json({
      competitors,
      nextStep: 'first_run',
      message: "Competitors added successfully. Ready for first run!",
    });
  } catch (error: any) {
    logger.error("Onboarding", "Failed to add competitors", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: Run First Fix (Step 9.2)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/onboarding/first-run', async (req, res) => {
  try {
    const { websiteId } = req.body;

    const [website] = await db.select().from(websites).where(eq(websites.id, websiteId)).limit(1);
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    logger.info("Onboarding", "Starting first run", { websiteId, domain: website.domain });

    // Execute safe-only onboarding run (defined in Step 9.2)
    const runSummary = await executeRun(websiteId, website.domain, 'onboarding-v1');

    // Record first run results
    await db.insert(firstRunResults).values({
      websiteId,
      runId: runSummary.runId,
      fixesApplied: 0, // TODO: Extract from run summary
      fixTypes: [],
      fixDetails: [],
      completedSuccessfully: runSummary.status === 'completed',
      durationMs: runSummary.durationMs,
    });

    logger.info("Onboarding", "First run completed", {
      websiteId,
      runId: runSummary.runId,
      status: runSummary.status
    });

    res.json({
      runId: runSummary.runId,
      status: runSummary.status,
      servicesCompleted: runSummary.servicesCompleted,
      diagnosisEventId: runSummary.diagnosisEventId,
      message: `First run ${runSummary.status}! We analyzed your site and ${runSummary.status === 'completed' ? 'found improvements' : 'encountered some issues'}.`,
      nextStep: 'complete',
    });
  } catch (error: any) {
    logger.error("Onboarding", "First run failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET Onboarding Status
// ═══════════════════════════════════════════════════════════════════════════

router.get('/onboarding/status/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    const [website] = await db.select().from(websites).where(eq(websites.id, websiteId)).limit(1);
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    const [firstRun] = await db.select()
      .from(firstRunResults)
      .where(eq(firstRunResults.websiteId, websiteId))
      .limit(1);

    // Determine current step
    let currentStep = 'add_domain';
    if (website.verificationStatus !== 'unverified') {
      currentStep = 'verified';
    }
    if (website.gscPropertyUrl || website.ga4PropertyId) {
      currentStep = 'google_connected';
    }
    if (firstRun) {
      currentStep = 'completed';
    }

    res.json({
      websiteId,
      currentStep,
      website: {
        domain: website.domain,
        verificationStatus: website.verificationStatus,
        automationMode: website.automationMode,
        googleConnected: !!(website.gscPropertyUrl || website.ga4PropertyId),
      },
      firstRun: firstRun || null,
    });
  } catch (error: any) {
    logger.error("Onboarding", "Failed to get status", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function verifyDNS(domain: string, token: string): Promise<boolean> {
  // TODO: Implement DNS TXT record verification
  // Use Node.js dns module to query _arclo-verification.domain TXT record
  const dns = require('dns').promises;
  try {
    const records = await dns.resolveTxt(`_arclo-verification.${domain}`);
    return records.some((record: string[]) => record.includes(token));
  } catch {
    return false;
  }
}

async function verifyMetaTag(domain: string, token: string): Promise<boolean> {
  // TODO: Fetch homepage and check for meta tag
  try {
    const response = await fetch(`https://${domain}`);
    const html = await response.text();
    return html.includes(`name="arclo-site-verification" content="${token}"`);
  } catch {
    return false;
  }
}

async function verifyFile(domain: string, token: string): Promise<boolean> {
  // TODO: Fetch verification file
  try {
    const response = await fetch(`https://${domain}/arclo-verification.txt`);
    const content = await response.text();
    return content.trim() === token;
  } catch {
    return false;
  }
}

export default router;
