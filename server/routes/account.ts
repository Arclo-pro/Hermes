/**
 * Account & Team Management Routes
 *
 * Handles user invitations, team member management, and account settings.
 */

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth } from '../auth/session';
import { storage } from '../storage';
import { sendInviteEmail, sendTeamJoinNotification } from '../services/email';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const inviteUserSchema = z.object({
  email: z.string().email('Valid email required'),
});

// ============================================
// POST /api/account/invite - Send invitation
// ============================================

router.post('/account/invite', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const parsed = inviteUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message,
      });
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Get the inviter
    const inviter = await storage.getUserById(userId);
    if (!inviter) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Determine account owner (inviter or their account owner)
    const accountOwnerId = inviter.accountId || inviter.id;

    // Check if email is already a user
    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'This email is already registered. Only new users can be invited.',
      });
    }

    // Check for existing pending invitation
    const existingInvite = await storage.getAccountInvitationByEmail(normalizedEmail, accountOwnerId);
    if (existingInvite) {
      return res.status(400).json({
        success: false,
        error: 'An invitation has already been sent to this email.',
      });
    }

    // Create invitation token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invitation = await storage.createAccountInvitation({
      inviteToken,
      invitedEmail: normalizedEmail,
      invitedByUserId: accountOwnerId,
      status: 'pending',
      expiresAt,
    });

    // Send invitation email
    const emailSent = await sendInviteEmail(
      normalizedEmail,
      inviteToken,
      inviter.displayName || inviter.email
    );

    if (!emailSent) {
      console.error('[Account] Failed to send invite email', { email: normalizedEmail });
    }

    console.log('[Account] Invitation sent', {
      invitedEmail: normalizedEmail,
      invitedBy: inviter.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: normalizedEmail,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Account] Failed to create invitation', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

// ============================================
// GET /api/account/invites - List pending invitations
// ============================================

router.get('/account/invites', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const accountOwnerId = user.accountId || user.id;
    const invitations = await storage.getPendingInvitationsByUserId(accountOwnerId);

    return res.json({
      success: true,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.invitedEmail,
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[Account] Failed to fetch invitations', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch invitations' });
  }
});

// ============================================
// DELETE /api/account/invites/:id - Revoke invitation
// ============================================

router.delete('/account/invites/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const invitationId = parseInt(req.params.id, 10);

    if (isNaN(invitationId)) {
      return res.status(400).json({ success: false, error: 'Invalid invitation ID' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const accountOwnerId = user.accountId || user.id;
    const revoked = await storage.revokeAccountInvitation(invitationId, accountOwnerId);

    if (!revoked) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    console.log('[Account] Invitation revoked', { invitationId, userId });

    return res.json({ success: true, message: 'Invitation revoked' });
  } catch (error: any) {
    console.error('[Account] Failed to revoke invitation', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to revoke invitation' });
  }
});

// ============================================
// GET /api/account/team - List team members
// ============================================

router.get('/account/team', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const accountOwnerId = user.accountId || user.id;
    const members = await storage.getTeamMembers(accountOwnerId);

    return res.json({
      success: true,
      team: members.map((m) => ({
        id: m.id,
        email: m.email,
        displayName: m.displayName,
        isOwner: m.id === accountOwnerId,
        joinedAt: m.createdAt.toISOString(),
        lastLoginAt: m.lastLoginAt?.toISOString() || null,
      })),
    });
  } catch (error: any) {
    console.error('[Account] Failed to fetch team', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

// ============================================
// GET /api/account/invite/:token - Validate invite token (public)
// ============================================

router.get('/account/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invitation = await storage.getAccountInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or has expired',
      });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'This invitation has expired',
      });
    }

    // Get inviter info
    const inviter = await storage.getUserById(invitation.invitedByUserId);

    return res.json({
      success: true,
      invitation: {
        email: invitation.invitedEmail,
        invitedBy: inviter?.displayName || inviter?.email || 'Unknown',
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Account] Failed to validate invite', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to validate invitation' });
  }
});

export default router;
