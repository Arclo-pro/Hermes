/**
 * GET /api/account/team - List team members
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { getSessionUser, setCorsHeaders } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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

    // Get all team members (account owner + members with account_id = owner)
    const result = await pool.query(
      `SELECT id, email, display_name, created_at, last_login_at
       FROM users
       WHERE id = $1 OR account_id = $1
       ORDER BY created_at ASC`,
      [accountOwnerId]
    );

    return res.json({
      success: true,
      team: result.rows.map((m) => ({
        id: m.id,
        email: m.email,
        displayName: m.display_name,
        isOwner: m.id === accountOwnerId,
        joinedAt: m.created_at,
        lastLoginAt: m.last_login_at,
      })),
    });
  } catch (error: any) {
    console.error("[Account/Team] Error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch team" });
  }
}
