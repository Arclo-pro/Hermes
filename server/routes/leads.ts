/**
 * Leads Routes (ArcFlow)
 *
 * CRUD operations for lead management with filtering, search, and reporting.
 * Phase 1: Manual data entry only (no automation).
 */

import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { requireAuth } from "../auth/session";
import { logger } from "../utils/logger";
import {
  LeadStatuses,
  LeadOutcomes,
  LeadSourceTypes,
  ServiceLines,
  FormTypes,
  NoSignupReasons,
  SignupTypes,
  PreferredContactMethods,
} from "@shared/schema";

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
// Validation Schemas
// ════════════════════════════════════════════════════════════════════════════

const createLeadSchema = z
  .object({
    siteId: z.string().min(1, "Site ID is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    leadSourceType: z
      .enum(["form_submit", "phone_click", "manual"])
      .default("manual"),
    serviceLine: z
      .enum(["psychiatric_services", "therapy", "general_inquiry", "other"])
      .optional(),
    formType: z.enum(["short", "long", "phone_click", "other"]).optional(),
    landingPagePath: z.string().optional(),
    sourcePath: z.string().optional(),
    utmSource: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmTerm: z.string().optional(),
    utmMedium: z.string().optional(),
    utmContent: z.string().optional(),
    preferredContactMethod: z
      .enum(["phone", "email", "text", "unknown"])
      .optional(),
    notes: z.string().optional(),
    assignedToUserId: z.number().int().optional().nullable(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
  });

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  leadStatus: z
    .enum([
      "new",
      "in_progress",
      "contacted",
      "scheduled",
      "signed_up",
      "not_signed_up",
      "closed",
    ])
    .optional(),
  outcome: z.enum(["unknown", "signed_up", "not_signed_up"]).optional(),
  outcomeDate: z.string().datetime().optional().nullable(),
  noSignupReason: z
    .enum([
      "spam",
      "wrong_number",
      "no_answer",
      "voicemail_left",
      "not_interested",
      "general_information_only",
      "waitlist",
      "no_availability",
      "out_of_area",
      "insurance_issue",
      "medicaid",
      "medicare",
      "private_pay_too_expensive",
      "benzos_request",
      "wrong_service",
      "duplicate_lead",
      "other",
    ])
    .optional()
    .nullable(),
  noSignupReasonDetail: z.string().optional().nullable(),
  signupType: z
    .enum([
      "scheduled_consult",
      "scheduled_intake",
      "became_patient",
      "referral_out",
      "follow_up_required",
    ])
    .optional()
    .nullable(),
  appointmentDate: z.string().datetime().optional().nullable(),
  assignedToUserId: z.number().int().optional().nullable(),
  preferredContactMethod: z
    .enum(["phone", "email", "text", "unknown"])
    .optional(),
  serviceLine: z
    .enum(["psychiatric_services", "therapy", "general_inquiry", "other"])
    .optional(),
  formType: z.enum(["short", "long", "phone_click", "other"]).optional(),
  landingPagePath: z.string().optional(),
  utmSource: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  notes: z.string().optional(),
});

const listLeadsQuerySchema = z.object({
  siteId: z.string().min(1, "Site ID is required"),
  status: z.string().optional(),
  outcome: z.string().optional(),
  serviceLine: z.string().optional(),
  noSignupReason: z.string().optional(),
  assignedToUserId: z.coerce.number().optional(),
  leadSourceType: z.string().optional(),
  landingPagePath: z.string().optional(),
  utmSource: z.string().optional(),
  utmCampaign: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/leads - List leads with filters
// ════════════════════════════════════════════════════════════════════════════

router.get("/leads", requireAuth, async (req, res) => {
  try {
    const parsed = listLeadsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    }

    const params = parsed.data;

    const result = await storage.getLeads({
      siteId: params.siteId,
      status: params.status,
      outcome: params.outcome,
      serviceLine: params.serviceLine,
      noSignupReason: params.noSignupReason,
      assignedToUserId: params.assignedToUserId,
      leadSourceType: params.leadSourceType,
      landingPagePath: params.landingPagePath,
      utmSource: params.utmSource,
      utmCampaign: params.utmCampaign,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    });

    res.json({
      leads: result.leads,
      total: result.total,
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + result.leads.length < result.total,
    });
  } catch (error: any) {
    logger.error("Leads", "Failed to list leads", { error: error.message });
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/leads/stats - Summary statistics
// ════════════════════════════════════════════════════════════════════════════

router.get("/leads/stats", requireAuth, async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    if (!siteId || typeof siteId !== "string") {
      return res.status(400).json({ error: "siteId is required" });
    }

    const stats = await storage.getLeadStats(
      siteId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(stats);
  } catch (error: any) {
    logger.error("Leads", "Failed to get lead stats", { error: error.message });
    res.status(500).json({ error: "Failed to fetch lead statistics" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/leads/:leadId - Single lead detail
// ════════════════════════════════════════════════════════════════════════════

router.get("/leads/:leadId", requireAuth, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await storage.getLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(lead);
  } catch (error: any) {
    logger.error("Leads", "Failed to get lead", { error: error.message });
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/leads - Create new lead
// ════════════════════════════════════════════════════════════════════════════

router.post("/leads", requireAuth, async (req, res) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    }

    const leadId = `lead_${randomUUID()}`;
    const userId = (req.session as any)?.userId;

    const lead = await storage.createLead({
      ...parsed.data,
      leadId,
      createdByUserId: userId || null,
    });

    logger.info("Leads", "Lead created", {
      leadId,
      siteId: parsed.data.siteId,
      name: parsed.data.name,
    });

    res.status(201).json(lead);
  } catch (error: any) {
    logger.error("Leads", "Failed to create lead", { error: error.message });
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/leads/:leadId - Update lead
// ════════════════════════════════════════════════════════════════════════════

router.patch("/leads/:leadId", requireAuth, async (req, res) => {
  try {
    const { leadId } = req.params;

    // Check if lead exists
    const existing = await storage.getLeadById(leadId);
    if (!existing) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    }

    // Convert date strings to Date objects
    const updates: any = { ...parsed.data };
    if (updates.outcomeDate) {
      updates.outcomeDate = new Date(updates.outcomeDate);
    }
    if (updates.appointmentDate) {
      updates.appointmentDate = new Date(updates.appointmentDate);
    }

    // Auto-set outcomeDate when outcome changes
    if (updates.outcome && updates.outcome !== existing.outcome && !updates.outcomeDate) {
      if (updates.outcome === "signed_up" || updates.outcome === "not_signed_up") {
        updates.outcomeDate = new Date();
      }
    }

    const updated = await storage.updateLead(leadId, updates);

    logger.info("Leads", "Lead updated", { leadId, updates: Object.keys(parsed.data) });

    res.json(updated);
  } catch (error: any) {
    logger.error("Leads", "Failed to update lead", { error: error.message });
    res.status(500).json({ error: "Failed to update lead" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/leads/:leadId - Delete lead
// ════════════════════════════════════════════════════════════════════════════

router.delete("/leads/:leadId", requireAuth, async (req, res) => {
  try {
    const { leadId } = req.params;

    const existing = await storage.getLeadById(leadId);
    if (!existing) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await storage.deleteLead(leadId);

    logger.info("Leads", "Lead deleted", { leadId });

    res.json({ ok: true });
  } catch (error: any) {
    logger.error("Leads", "Failed to delete lead", { error: error.message });
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/leads/:leadId/contact - Log contact attempt
// ════════════════════════════════════════════════════════════════════════════

router.post("/leads/:leadId/contact", requireAuth, async (req, res) => {
  try {
    const { leadId } = req.params;

    const existing = await storage.getLeadById(leadId);
    if (!existing) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await storage.incrementLeadContactAttempts(leadId);

    const updated = await storage.getLeadById(leadId);

    logger.info("Leads", "Contact logged", {
      leadId,
      attempts: updated?.contactAttemptsCount,
    });

    res.json(updated);
  } catch (error: any) {
    logger.error("Leads", "Failed to log contact", { error: error.message });
    res.status(500).json({ error: "Failed to log contact attempt" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/leads/enums - Get all enum values for UI dropdowns
// ════════════════════════════════════════════════════════════════════════════

router.get("/leads/enums", requireAuth, async (req, res) => {
  res.json({
    statuses: Object.values(LeadStatuses),
    outcomes: Object.values(LeadOutcomes),
    sourceTypes: Object.values(LeadSourceTypes),
    serviceLines: Object.values(ServiceLines),
    formTypes: Object.values(FormTypes),
    noSignupReasons: Object.values(NoSignupReasons),
    signupTypes: Object.values(SignupTypes),
    contactMethods: Object.values(PreferredContactMethods),
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/leads/analytics - Detailed analytics for dashboard
// ════════════════════════════════════════════════════════════════════════════

router.get("/leads/analytics", requireAuth, async (req, res) => {
  try {
    const { siteId, months } = req.query;

    if (!siteId || typeof siteId !== "string") {
      return res.status(400).json({ error: "siteId is required" });
    }

    const monthsToFetch = parseInt(months as string) || 12;

    const analytics = await storage.getLeadAnalytics(siteId, monthsToFetch);

    res.json(analytics);
  } catch (error: any) {
    logger.error("Leads", "Failed to get lead analytics", { error: error.message });
    res.status(500).json({ error: "Failed to fetch lead analytics" });
  }
});

export default router;
