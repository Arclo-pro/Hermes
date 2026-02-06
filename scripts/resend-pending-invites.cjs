// Script to resend pending invitation emails
// Usage: node scripts/resend-pending-invites.js

require('dotenv').config();
const sgMail = require('@sendgrid/mail');
const { Pool } = require('pg');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.arclo.pro";

async function main() {
  const apiKey = process.env.SendGrid;
  if (!apiKey) {
    console.error('SendGrid API key not found in environment');
    process.exit(1);
  }

  sgMail.setApiKey(apiKey);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Get pending invitations with inviter info
    const result = await pool.query(`
      SELECT
        ai.id,
        ai.invited_email,
        ai.invite_token,
        u.display_name as inviter_name,
        u.email as inviter_email
      FROM account_invitations ai
      JOIN users u ON ai.invited_by_user_id = u.id
      WHERE ai.status = 'pending'
      ORDER BY ai.id
    `);

    console.log(`Found ${result.rows.length} pending invitations`);

    for (const invite of result.rows) {
      const inviterName = invite.inviter_name || invite.inviter_email;
      const inviteUrl = `${BASE_URL}/signup?invite=${invite.invite_token}`;

      console.log(`Sending to ${invite.invited_email} (invited by ${inviterName})...`);

      const msg = {
        to: invite.invited_email,
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

      try {
        await sgMail.send(msg);
        console.log(`  ✓ Sent to ${invite.invited_email}`);
      } catch (error) {
        console.error(`  ✗ Failed to send to ${invite.invited_email}:`, error.message);
        if (error.response?.body) {
          console.error('    Details:', JSON.stringify(error.response.body, null, 2));
        }
      }
    }

    console.log('\nDone!');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
