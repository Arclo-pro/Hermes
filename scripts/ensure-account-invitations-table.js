/**
 * Ensure account_invitations table exists
 */
import { Pool } from 'pg';
import 'dotenv/config';

async function ensureTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Ensuring account_invitations table exists...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_invitations (
        id SERIAL PRIMARY KEY,
        invite_token TEXT NOT NULL UNIQUE,
        invited_email TEXT NOT NULL,
        invited_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP,
        accepted_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Table created/verified');

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_account_invitations_email
      ON account_invitations (invited_email, invited_by_user_id)
      WHERE status = 'pending';
    `);
    console.log('Index created/verified');

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

ensureTable();
