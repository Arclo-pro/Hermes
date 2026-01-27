/**
 * Billing Routes (Stripe Integration - Stubs)
 *
 * Handles Arclo Core subscription billing through Stripe.
 * CURRENT STATUS: All endpoints are stubs returning "not configured"
 *
 * TODO: Implement actual Stripe integration
 * - Checkout session creation
 * - Webhook event handling
 * - Subscription status tracking
 * - Add-on management
 */

import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const checkoutSessionSchema = z.object({
  scanId: z.string().optional(),
  plan: z.enum(["core"]),
});

// ============================================
// Checkout & Payment Routes
// ============================================

/**
 * POST /api/billing/checkout-session
 * Create Stripe checkout session
 *
 * STATUS: Stub - returns "not configured"
 * TODO: Implement Stripe checkout session creation
 */
router.post("/billing/checkout-session", async (req, res) => {
  try {
    const parsed = checkoutSessionSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn("Billing", "Invalid checkout session request", {
        errors: parsed.error.errors
      });
      return res.status(400).json({
        ok: false,
        message: parsed.error.errors[0]?.message || "Validation failed",
        checkoutUrl: null
      });
    }

    const { scanId, plan } = parsed.data;

    logger.info("Billing", "Checkout session requested", { scanId, plan });

    // TODO: When Stripe is configured, create actual checkout session
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({...});
    // return res.json({ ok: true, checkoutUrl: session.url });

    return res.status(501).json({
      ok: false,
      message: "Stripe billing not yet implemented. Please contact support.",
      checkoutUrl: null
    });
  } catch (error: any) {
    logger.error("Billing", "Failed to create checkout session", { error: error.message });
    return res.status(500).json({
      ok: false,
      message: "Failed to create checkout session",
      checkoutUrl: null
    });
  }
});

/**
 * GET /api/billing/success
 * Handle successful checkout redirect
 *
 * STATUS: Stub - returns success message
 * TODO: Verify Stripe session and activate subscription
 */
router.get("/billing/success", async (req, res) => {
  try {
    const sessionId = req.query.session_id as string;

    logger.info("Billing", "Checkout success callback", { sessionId });

    if (!sessionId) {
      logger.warn("Billing", "Success callback missing session_id");
      return res.status(400).json({
        ok: false,
        message: "Missing session_id parameter"
      });
    }

    // TODO: When Stripe is configured, verify session and activate subscription
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.retrieve(sessionId);
    // Activate subscription in database based on session metadata

    return res.json({
      ok: true,
      message: "Payment successful! Your subscription is now active.",
      redirectUrl: "/mission-control"
    });
  } catch (error: any) {
    logger.error("Billing", "Failed to process checkout success", { error: error.message });
    return res.status(500).json({
      ok: false,
      message: "Failed to process checkout success"
    });
  }
});

// ============================================
// Webhook Routes
// ============================================

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 *
 * STATUS: Stub - logs events but doesn't process
 * TODO: Verify webhook signature and process events
 */
router.post("/billing/webhook", async (req, res) => {
  try {
    // TODO: When Stripe is configured, verify webhook signature
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const sig = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    const eventType = req.body?.type || "unknown";
    const eventId = req.body?.id || "unknown";

    logger.info("Billing", "Webhook received", { eventType, eventId });

    // Placeholder handling for expected webhook events
    switch (eventType) {
      case "checkout.session.completed":
        logger.info("Billing", "Checkout session completed", { eventId });
        // TODO: Activate subscription
        break;
      case "invoice.paid":
        logger.info("Billing", "Invoice paid", { eventId });
        // TODO: Extend subscription
        break;
      case "customer.subscription.updated":
        logger.info("Billing", "Subscription updated", { eventId });
        // TODO: Update subscription status
        break;
      case "customer.subscription.deleted":
        logger.info("Billing", "Subscription deleted", { eventId });
        // TODO: Deactivate subscription
        break;
      default:
        logger.info("Billing", "Unhandled webhook event", { eventType, eventId });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error("Billing", "Webhook processing failed", { error: error.message });
    return res.status(400).json({ error: "Webhook processing failed" });
  }
});

// ============================================
// Subscription Status Routes
// ============================================

/**
 * GET /api/billing/status
 * Get subscription status for a site/scan
 *
 * STATUS: Stub - always returns not subscribed
 * TODO: Query database for actual subscription status
 */
router.get("/billing/status", async (req, res) => {
  try {
    const scanId = req.query.scanId as string;
    const siteId = req.query.siteId as string;

    logger.info("Billing", "Status check requested", { scanId, siteId });

    if (!scanId && !siteId) {
      logger.warn("Billing", "Status check missing scanId or siteId");
      return res.status(400).json({
        ok: false,
        message: "Missing scanId or siteId parameter"
      });
    }

    // TODO: When Stripe is configured, check subscription status in database
    // const subscription = await storage.getSubscriptionByIdentifier(scanId || siteId);
    // return res.json({ subscribed: !!subscription, plan: subscription?.plan || null });

    return res.json({
      subscribed: false,
      plan: null
    });
  } catch (error: any) {
    logger.error("Billing", "Failed to check subscription status", { error: error.message });
    return res.status(500).json({
      ok: false,
      message: "Failed to check subscription status"
    });
  }
});

/**
 * GET /api/billing/subscription/:siteId
 * Get full subscription details including add-ons
 *
 * STATUS: Stub - returns empty subscription
 * TODO: Query websiteSubscriptions table
 */
router.get("/billing/subscription/:siteId", async (req, res) => {
  try {
    const { siteId } = req.params;

    if (!siteId) {
      return res.status(400).json({
        ok: false,
        message: "Missing siteId parameter"
      });
    }

    logger.info("Billing", "Subscription details requested", { siteId });

    // TODO: When database has data, query websiteSubscriptions table
    // const subscription = await storage.getWebsiteSubscription(siteId);

    // Return default/empty subscription for now
    return res.json({
      ok: true,
      subscription: {
        siteId,
        plan: "free",
        subscriptionStatus: "inactive",
        addons: {
          content_growth: false,
          competitive_intel: false,
          authority_signals: false
        },
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: null,
        updatedAt: null
      }
    });
  } catch (error: any) {
    logger.error("Billing", "Failed to fetch subscription", { error: error.message });
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch subscription"
    });
  }
});

// ============================================
// Add-ons Routes
// ============================================

/**
 * GET /api/billing/addons
 * Get available add-ons with pricing
 *
 * STATUS: Working - returns static add-on catalog
 */
router.get("/billing/addons", async (req, res) => {
  try {
    const addons = [
      {
        id: "content_growth",
        name: "Content Growth",
        description: "AI-powered content recommendations and blog post generation",
        price: 49,
        pricePeriod: "month",
        features: [
          "Weekly content recommendations",
          "AI blog post drafts",
          "Content gap analysis",
          "Competitor content tracking"
        ]
      },
      {
        id: "competitive_intel",
        name: "Competitive Intelligence",
        description: "Monitor competitors and track market positioning",
        price: 79,
        pricePeriod: "month",
        features: [
          "Competitor tracking (up to 5)",
          "Ranking change alerts",
          "Backlink gap analysis",
          "Market share insights"
        ]
      },
      {
        id: "authority_signals",
        name: "Authority Signals",
        description: "Build domain authority with strategic backlink opportunities",
        price: 99,
        pricePeriod: "month",
        features: [
          "Backlink opportunity finder",
          "Citation building suggestions",
          "Domain authority tracking",
          "Link velocity monitoring"
        ]
      }
    ];

    return res.json({
      ok: true,
      addons
    });
  } catch (error: any) {
    logger.error("Billing", "Failed to fetch add-ons", { error: error.message });
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch add-ons"
    });
  }
});

/**
 * POST /api/billing/enable-addon
 * Enable an add-on for a site
 *
 * STATUS: Stub - validates but doesn't activate
 * TODO: Create/update Stripe subscription with add-on
 */
router.post("/billing/enable-addon", async (req, res) => {
  try {
    const { siteId, addonId } = req.body;

    if (!siteId || !addonId) {
      return res.status(400).json({
        ok: false,
        message: "Missing siteId or addonId"
      });
    }

    const validAddons = ["content_growth", "competitive_intel", "authority_signals"];
    if (!validAddons.includes(addonId)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid addonId"
      });
    }

    logger.info("Billing", "Add-on enable requested", { siteId, addonId });

    // TODO: When Stripe is configured:
    // 1. Create/update Stripe subscription with add-on
    // 2. Update websiteSubscriptions table with new addon

    return res.status(501).json({
      ok: false,
      message: "Add-on activation not yet implemented",
      siteId,
      addonId,
      nextStep: "Configure Stripe to complete add-on activation"
    });
  } catch (error: any) {
    logger.error("Billing", "Failed to enable add-on", { error: error.message });
    return res.status(500).json({
      ok: false,
      message: "Failed to enable add-on"
    });
  }
});

export default router;
