/**
 * POST /api/account/invite - Send team invitation
 * GET /api/account/invite/:token - Validate invite token (via rewrite)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";
import { sendInviteEmail } from "../_lib/email.js";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const pool = getPool();

  try {
    // GET: Validate invite token
    if (req.method === "GET") {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ success: false, error: "Token required" });
      }

      const result = await pool.query(
        `SELECT ai.*, u.email as inviter_email, u.display_name as inviter_name
         FROM account_invitations ai
         LEFT JOIN users u ON ai.invited_by_user_id = u.id
         WHERE ai.invite_token = $1 AND ai.status = 'pending'
         LIMIT 1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invitation not found or has expired",
        });
      }

      const invitation = result.rows[0];
      if (new Date() > new Date(invitation.expires_at)) {
        return res.status(410).json({
          success: false,
          error: "This invitation has expired",
        });
      }

      return res.json({
        success: true,
        invitation: {
          email: invitation.invited_email,
          invitedBy: invitation.inviter_name || invitation.inviter_email || "Unknown",
          expiresAt: invitation.expires_at,
        },
      });
    }

    // POST: Send invitation
    if (req.method === "POST") {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "Valid email required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Get inviter details
      const inviterResult = await pool.query(
        `SELECT id, email, display_name, account_id FROM users WHERE id = $1 LIMIT 1`,
        [user.id]
      );
      if (inviterResult.rows.length === 0) {
        return res.status(401).json({ success: false, error: "User not found" });
      }
      const inviter = inviterResult.rows[0];
      const accountOwnerId = inviter.account_id || inviter.id;

      // Check if email is already registered
      const existingUser = await pool.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [normalizedEmail]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "This email is already registered. Only new users can be invited.",
        });
      }

      // Check for existing pending invitation
      const existingInvite = await pool.query(
        `SELECT id FROM account_invitations
         WHERE invited_email = $1 AND invited_by_user_id = $2 AND status = 'pending'
         LIMIT 1`,
        [normalizedEmail, accountOwnerId]
      );
      if (existingInvite.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "An invitation has already been sent to this email.",
        });
      }

      // Create invitation
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

      const insertResult = await pool.query(
        `INSERT INTO account_invitations (invite_token, invited_email, invited_by_user_id, status, expires_at, created_at)
         VALUES ($1, $2, $3, 'pending', $4, NOW())
         RETURNING id, invited_email, status, expires_at, created_at`,
        [inviteToken, normalizedEmail, accountOwnerId, expiresAt]
      );

      const invitation = insertResult.rows[0];

      // Send invitation email
      const inviterName = inviter.display_name || inviter.email;
      const emailSent = await sendInviteEmail(normalizedEmail, inviteToken, inviterName);
      if (!emailSent) {
        console.warn(`[Account] Invitation created but email failed for ${normalizedEmail}`);
      }
      console.log(`[Account] Invitation created for ${normalizedEmail} by ${inviter.email}, email sent: ${emailSent}`);

      return res.status(201).json({
        success: true,
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.invited_email,
          status: invitation.status,
          expiresAt: invitation.expires_at,
        },
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[Account/Invite] Error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to process invitation" });
  }
}
