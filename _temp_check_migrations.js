import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // Check sites table for Empathy Health Clinic
    const sites = await pool.query(`
      SELECT site_id, base_url, id FROM sites WHERE base_url ILIKE '%empathy%' OR site_id ILIKE '%empathy%'
    `);
    console.log('\n=== Sites matching "empathy" ===');
    console.log(sites.rows);

    // Check scan_requests for empathyhealthclinic domain
    const scans = await pool.query(`
      SELECT scan_id, domain, status, target_url, completed_at
      FROM scan_requests
      WHERE domain ILIKE '%empathy%' OR target_url ILIKE '%empathy%'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n=== Scans for empathy ===');
    console.log(scans.rows);

    // Check all recent scans
    const recentScans = await pool.query(`
      SELECT scan_id, domain, status, target_url, completed_at
      FROM scan_requests
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n=== Recent scans (any domain) ===');
    console.log(recentScans.rows);

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
