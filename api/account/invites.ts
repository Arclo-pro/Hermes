/**
 * GET /api/account/invites - List pending invitations
 * DELETE /api/account/invites/:id - Revoke invitation (via rewrite)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const pool = getPool();

  try {
    // Get user's account owner ID
    const userResult = await pool.query(
      `SELECT id, account_id FROM users WHERE id = $1 LIMIT 1`,
      [user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: "User not found" });
    }
    const accountOwnerId = userResult.rows[0].account_id || userResult.rows[0].id;

    // DELETE: Revoke invitation
    if (req.method === "DELETE") {
      const inviteId = req.query.id as string;
      if (!inviteId) {
        return res.status(400).json({ success: false, error: "Invitation ID required" });
      }

      const result = await pool.query(
        `UPDATE account_invitations
         SET status = 'revoked', updated_at = NOW()
         WHERE id = $1 AND invited_by_user_id = $2 AND status = 'pending'
         RETURNING id`,
        [inviteId, accountOwnerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Invitation not found" });
      }

      console.log(`[Account] Invitation ${inviteId} revoked by user ${user.id}`);
      return res.json({ success: true, message: "Invitation revoked" });
    }

    // GET: List pending invitations
    if (req.method === "GET") {
      const result = await pool.query(
        `SELECT id, invited_email, status, expires_at, created_at
         FROM account_invitations
         WHERE invited_by_user_id = $1 AND status = 'pending'
         ORDER BY created_at DESC`,
        [accountOwnerId]
      );

      return res.json({
        success: true,
        invitations: result.rows.map((inv) => ({
          id: inv.id,
          email: inv.invited_email,
          status: inv.status,
          expiresAt: inv.expires_at,
          createdAt: inv.created_at,
        })),
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[Account/Invites] Error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to process request" });
  }
}
