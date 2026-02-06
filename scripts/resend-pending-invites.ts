/**
 * Script to resend invitation emails to all pending invitations for a user
 * Usage: npx tsx scripts/resend-pending-invites.ts [user_email]
 */
import pg from "pg";
import sgMail from "@sendgrid/mail";
import "dotenv/config";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.SendGrid;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.arclo.pro";

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

if (!SENDGRID_API_KEY) {
  console.error("SENDGRID_API_KEY or SendGrid not set");
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

const pool = new Pool({ connectionString: DATABASE_URL });

async function sendInviteEmail(
  email: string,
  inviteToken: string,
  inviterName: string
): Promise<boolean> {
  try {
    const inviteUrl = `${BASE_URL}/signup?invite=${inviteToken}`;

    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `${inviterName} invited you to join Arclo`,
      text: `Hi!\n\n${inviterName} has invited you to join their team on Arclo.\n\nClick this link to create your account:\n${inviteUrl}\n\nThis invitation expires in 7 days.\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
          </div>
          <div style="padding: 40px 30px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0;">You're invited!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to join their team on Arclo.
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              As a team member, you'll have full access to all websites and SEO tools in their account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This invitation expires in 7 days. If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`  ✓ Email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error(`  ✗ Failed to send email to ${email}:`, error.message);
    return false;
  }
}

async function main() {
  const userEmail = process.argv[2] || "kevin.mease@gmail.com";

  console.log(`\nLooking for pending invitations from: ${userEmail}\n`);

  try {
    // Get the user's id and account_id
    const userResult = await pool.query(
      `SELECT id, account_id, display_name, email
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.error(`User not found: ${userEmail}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    const accountOwnerId = user.account_id || user.id;
    const inviterName = user.display_name || user.email;

    console.log(`Found user: ${user.email} (id: ${user.id}, accountOwnerId: ${accountOwnerId})`);
    console.log(`Inviter name: ${inviterName}\n`);

    // Get all pending invitations for this account
    const invitesResult = await pool.query(
      `SELECT id, invite_token, invited_email, status, expires_at, created_at
       FROM account_invitations
       WHERE invited_by_user_id = $1
         AND status = 'pending'
       ORDER BY created_at DESC`,
      [accountOwnerId]
    );

    const invites = invitesResult.rows;

    if (invites.length === 0) {
      console.log("No pending invitations found.");
      return;
    }

    console.log(`Found ${invites.length} pending invitation(s):\n`);

    for (const invite of invites) {
      const expired = new Date() > new Date(invite.expires_at);
      console.log(`- ${invite.invited_email}`);
      console.log(`  Created: ${invite.created_at}`);
      console.log(`  Expires: ${invite.expires_at}${expired ? " (EXPIRED)" : ""}`);

      if (expired) {
        console.log("  Skipping - invitation has expired\n");
        continue;
      }

      // Send the email
      await sendInviteEmail(invite.invited_email, invite.invite_token, inviterName);
      console.log("");
    }

    console.log("Done!");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
