/**
 * Run the auto-publish migration to add columns to content_drafts table
 */
import { Pool } from 'pg';
import 'dotenv/config';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running auto-publish migration...');

    // Add auto-publish columns to content_drafts table
    await pool.query(`
      ALTER TABLE content_drafts
      ADD COLUMN IF NOT EXISTS scheduled_for_auto_publish BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS auto_publish_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
    `);
    console.log('Added auto-publish columns to content_drafts');

    // Create index for efficient auto-publish queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_drafts_auto_publish
      ON content_drafts (auto_publish_date)
      WHERE scheduled_for_auto_publish = TRUE AND state != 'published';
    `);
    console.log('Created auto-publish index');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
