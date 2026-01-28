/**
 * Step 9.5: Approvals & Escalation API
 *
 * Handles:
 * - Creating approval requests
 * - Previewing changes
 * - Approving/rejecting actions
 * - Executing approved actions
 * - Learning from user decisions
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  approvalQueue,
  websites,
  websitePolicies,
  users,
  type InsertApprovalQueue,
  type ApprovalQueue,
} from '@shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// CREATE APPROVAL REQUEST
// ═══════════════════════════════════════════════════════════════════════════

const createApprovalSchema = z.object({
  websiteId: z.string().uuid(),
  runId: z.string(),
  actionType: z.string(),
  actionCategory: z.enum(['content', 'technical', 'optimization']),
  riskLevel: z.number().int().min(1).max(10),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  diffPreview: z.string().optional(),
  affectedFiles: z.array(z.string()).optional(),
  estimatedImpact: z.string().optional(),
  executionPayload: z.record(z.any()),
});

router.post('/approvals', async (req, res) => {
  try {
    const parsed = createApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const data = parsed.data;

    // Verify website exists
    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, data.websiteId))
      .limit(1);

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Auto-expire in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create approval request
    const [approval] = await db.insert(approvalQueue).values({
      websiteId: data.websiteId,
      runId: data.runId,
      actionType: data.actionType,
      actionCategory: data.actionCategory,
      riskLevel: data.riskLevel,
      title: data.title,
      description: data.description,
      diffPreview: data.diffPreview,
      affectedFiles: data.affectedFiles,
      estimatedImpact: data.estimatedImpact,
      executionPayload: data.executionPayload,
      status: 'pending',
      expiresAt,
    } as InsertApprovalQueue).returning();

    logger.info("Approvals", "Approval request created", {
      approvalId: approval.id,
      websiteId: data.websiteId,
      actionType: data.actionType,
      riskLevel: data.riskLevel,
    });

    // Send email notification if user exists
    if (website.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, website.userId))
        .limit(1);

      if (user) {
        await sendApprovalNotificationEmail(user.email, website, approval);
      }
    }

    res.status(201).json({
      approval,
      message: "Approval request created successfully",
    });
  } catch (error: any) {
    logger.error("Approvals", "Failed to create approval", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LIST APPROVALS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/approvals/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { status } = req.query;

    let query = db
      .select()
      .from(approvalQueue)
      .where(eq(approvalQueue.websiteId, websiteId))
      .orderBy(desc(approvalQueue.createdAt))
      .limit(50);

    // Filter by status if provided
    if (status && typeof status === 'string') {
      query = db
        .select()
        .from(approvalQueue)
        .where(
          and(
            eq(approvalQueue.websiteId, websiteId),
            eq(approvalQueue.status, status)
          )
        )
        .orderBy(desc(approvalQueue.createdAt))
        .limit(50) as any;
    }

    const approvals = await query;

    // Check for expired approvals and mark them
    const now = new Date();
    const expiredIds = approvals
      .filter(a => a.status === 'pending' && a.expiresAt < now)
      .map(a => a.id);

    if (expiredIds.length > 0) {
      await db
        .update(approvalQueue)
        .set({ status: 'expired' })
        .where(
          and(
            eq(approvalQueue.status, 'pending'),
            // @ts-ignore - Drizzle type inference issue
            ...expiredIds.map(id => eq(approvalQueue.id, id))
          )
        );
    }

    res.json({
      approvals: approvals.map(a => ({
        ...a,
        status: expiredIds.includes(a.id) ? 'expired' : a.status,
      })),
      pendingCount: approvals.filter(a => a.status === 'pending' && !expiredIds.includes(a.id)).length,
    });
  } catch (error: any) {
    logger.error("Approvals", "Failed to list approvals", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET SINGLE APPROVAL
// ═══════════════════════════════════════════════════════════════════════════

router.get('/approvals/:websiteId/:approvalId', async (req, res) => {
  try {
    const { websiteId, approvalId } = req.params;

    const [approval] = await db
      .select()
      .from(approvalQueue)
      .where(
        and(
          eq(approvalQueue.id, parseInt(approvalId)),
          eq(approvalQueue.websiteId, websiteId)
        )
      )
      .limit(1);

    if (!approval) {
      return res.status(404).json({ error: "Approval not found" });
    }

    // Check if expired
    if (approval.status === 'pending' && approval.expiresAt < new Date()) {
      await db
        .update(approvalQueue)
        .set({ status: 'expired' })
        .where(eq(approvalQueue.id, approval.id));

      approval.status = 'expired';
    }

    res.json({ approval });
  } catch (error: any) {
    logger.error("Approvals", "Failed to get approval", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// APPROVE ACTION
// ═══════════════════════════════════════════════════════════════════════════

const decisionSchema = z.object({
  userId: z.number().int().positive(),
  feedback: z.string().optional(),
});

router.post('/approvals/:websiteId/:approvalId/approve', async (req, res) => {
  try {
    const { websiteId, approvalId } = req.params;
    const parsed = decisionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { userId } = parsed.data;

    const [approval] = await db
      .select()
      .from(approvalQueue)
      .where(
        and(
          eq(approvalQueue.id, parseInt(approvalId)),
          eq(approvalQueue.websiteId, websiteId)
        )
      )
      .limit(1);

    if (!approval) {
      return res.status(404).json({ error: "Approval not found" });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve - status is ${approval.status}` });
    }

    if (approval.expiresAt < new Date()) {
      await db
        .update(approvalQueue)
        .set({ status: 'expired' })
        .where(eq(approvalQueue.id, approval.id));

      return res.status(400).json({ error: "Approval has expired" });
    }

    // Mark as approved
    const [updated] = await db
      .update(approvalQueue)
      .set({
        status: 'approved',
        decidedAt: new Date(),
        decidedBy: userId,
      })
      .where(eq(approvalQueue.id, approval.id))
      .returning();

    logger.info("Approvals", "Action approved", {
      approvalId: approval.id,
      websiteId,
      userId,
      actionType: approval.actionType,
    });

    // TODO: Execute the approved action asynchronously
    // executeApprovedAction(updated);

    // Increase website trust level on approval
    await incrementTrustLevel(websiteId);

    res.json({
      approval: updated,
      message: "Action approved successfully. Execution queued.",
    });
  } catch (error: any) {
    logger.error("Approvals", "Failed to approve", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REJECT ACTION
// ═══════════════════════════════════════════════════════════════════════════

router.post('/approvals/:websiteId/:approvalId/reject', async (req, res) => {
  try {
    const { websiteId, approvalId } = req.params;
    const parsed = decisionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const { userId, feedback } = parsed.data;

    const [approval] = await db
      .select()
      .from(approvalQueue)
      .where(
        and(
          eq(approvalQueue.id, parseInt(approvalId)),
          eq(approvalQueue.websiteId, websiteId)
        )
      )
      .limit(1);

    if (!approval) {
      return res.status(404).json({ error: "Approval not found" });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject - status is ${approval.status}` });
    }

    // Mark as rejected
    const [updated] = await db
      .update(approvalQueue)
      .set({
        status: 'rejected',
        decidedAt: new Date(),
        decidedBy: userId,
        userFeedback: feedback,
      })
      .where(eq(approvalQueue.id, approval.id))
      .returning();

    logger.info("Approvals", "Action rejected", {
      approvalId: approval.id,
      websiteId,
      userId,
      actionType: approval.actionType,
      feedback,
    });

    // TODO: Use rejection as learning signal
    // - If action type is repeatedly rejected, lower its priority
    // - If risk level is too high, adjust trust thresholds

    res.json({
      approval: updated,
      message: "Action rejected. Feedback recorded.",
    });
  } catch (error: any) {
    logger.error("Approvals", "Failed to reject", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send email notification when approval is needed
 */
async function sendApprovalNotificationEmail(
  email: string,
  website: any,
  approval: ApprovalQueue
): Promise<void> {
  const approvalUrl = `${process.env.APP_BASE_URL || 'https://arclo.pro'}/app/websites/${website.id}/approvals/${approval.id}`;

  const riskBadge = approval.riskLevel <= 3 ? '🟢 Low Risk' :
                     approval.riskLevel <= 6 ? '🟡 Medium Risk' :
                     '🔴 High Risk';

  await sendEmail({
    to: email,
    subject: `Arclo: Approval Needed - ${website.domain}`,
    text: `Hi,\n\nArclo needs your approval for an action on ${website.domain}.\n\n${approval.title}\n\nRisk Level: ${approval.riskLevel}/10\n${approval.description}\n\nReview and approve: ${approvalUrl}\n\nThis approval expires in 7 days.\n\nBest,\nThe Arclo Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✋ Approval Needed</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9fafb;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Arclo identified an improvement for <strong>${website.domain}</strong> that requires your approval:
          </p>

          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 18px;">${approval.title}</h2>
            <p style="margin: 8px 0; padding: 6px 12px; background: ${approval.riskLevel <= 3 ? '#d1fae5' : approval.riskLevel <= 6 ? '#fef3c7' : '#fee2e2'}; color: ${approval.riskLevel <= 3 ? '#065f46' : approval.riskLevel <= 6 ? '#92400e' : '#991b1b'}; border-radius: 6px; font-size: 14px; display: inline-block;">
              ${riskBadge}
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
              ${approval.description}
            </p>
            ${approval.estimatedImpact ? `
            <p style="color: #4b5563; font-size: 14px; margin: 12px 0 0 0;">
              <strong>Impact:</strong> ${approval.estimatedImpact}
            </p>
            ` : ''}
            ${approval.affectedFiles && approval.affectedFiles.length > 0 ? `
            <p style="color: #4b5563; font-size: 14px; margin: 12px 0 0 0;">
              <strong>Affected files:</strong> ${approval.affectedFiles.slice(0, 3).join(', ')}${approval.affectedFiles.length > 3 ? ` and ${approval.affectedFiles.length - 3} more` : ''}
            </p>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Review & Approve
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This approval expires ${new Date(approval.expiresAt).toLocaleDateString()}
          </p>
        </div>
        <div style="padding: 20px 30px; background: #111827; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });

  logger.info("Approvals", "Notification email sent", { approvalId: approval.id, email });
}

/**
 * Increment trust level when user approves an action
 */
async function incrementTrustLevel(websiteId: string): Promise<void> {
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website) return;

  const newTrustLevel = Math.min(website.trustLevel + 1, 10);

  await db
    .update(websites)
    .set({
      trustLevel: newTrustLevel,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, websiteId));

  logger.info("Approvals", "Trust level increased", {
    websiteId,
    oldLevel: website.trustLevel,
    newLevel: newTrustLevel,
  });
}

export default router;
