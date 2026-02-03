/**
 * Script to run a full technical SEO scan for Empathy Health Clinic
 *
 * Run with: npx tsx scripts/runTechSeoScan.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { runTechnicalCrawl } from "../api/_lib/crawler/crawlerEngine";

const DATABASE_URL = process.env.DATABASE_URL;
const DOMAIN = "empathyhealthclinic.com";

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  console.log(`\n=== Running Technical SEO Crawl for ${DOMAIN} ===\n`);
  console.log("This will crawl up to 50 pages and analyze technical SEO issues...\n");

  const startTime = Date.now();

  try {
    // Run the technical crawl with more aggressive settings
    const result = await runTechnicalCrawl(DOMAIN, {
      maxPages: 50,
      maxDepth: 3,
      concurrency: 5,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n=== CRAWL COMPLETE ===");
    console.log(`Duration: ${duration}s`);
    console.log(`Pages crawled: ${result.pages_crawled}`);
    console.log(`Health score: ${result.summary?.health_score ?? "N/A"}/100`);
    console.log(`\nFindings: ${result.findings?.length ?? 0}`);

    // Group findings by severity
    const findings = result.findings || [];
    const critical = findings.filter((f: any) => f.severity === "critical");
    const high = findings.filter((f: any) => f.severity === "high");
    const medium = findings.filter((f: any) => f.severity === "medium");
    const low = findings.filter((f: any) => f.severity === "low");

    console.log(`  - Critical: ${critical.length}`);
    console.log(`  - High: ${high.length}`);
    console.log(`  - Medium: ${medium.length}`);
    console.log(`  - Low: ${low.length}`);

    if (critical.length > 0 || high.length > 0) {
      console.log("\n=== HIGH PRIORITY ISSUES ===");
      [...critical, ...high].forEach((f: any, i: number) => {
        console.log(`\n${i + 1}. [${f.severity.toUpperCase()}] ${f.summary}`);
        console.log(`   Category: ${f.category}`);
        if (f.url) console.log(`   URL: ${f.url}`);
        if (f.evidence) console.log(`   Evidence: ${JSON.stringify(f.evidence).slice(0, 100)}`);
      });
    }

    if (medium.length > 0) {
      console.log("\n=== MEDIUM PRIORITY ISSUES ===");
      medium.slice(0, 10).forEach((f: any, i: number) => {
        console.log(`\n${i + 1}. ${f.summary}`);
        console.log(`   Category: ${f.category}`);
        if (f.url) console.log(`   URL: ${f.url}`);
      });
      if (medium.length > 10) {
        console.log(`\n   ... and ${medium.length - 10} more medium issues`);
      }
    }

    // Save results to database
    console.log("\n=== Updating Database ===");

    try {
      // Find the existing scan for this domain
      const scanRes = await pool.query(
        `SELECT scan_id, full_report FROM scan_requests
         WHERE domain = $1 AND status IN ('preview_ready', 'complete', 'report_ready')
         ORDER BY completed_at DESC NULLS LAST LIMIT 1`,
        [DOMAIN]
      );

      if (scanRes.rows.length > 0) {
        const scan = scanRes.rows[0];
        const fullReport = scan.full_report || {};

        // Update technical section
        fullReport.technical = {
          ok: result.ok,
          pages_crawled: result.pages_crawled,
          findings: findings,
          summary: result.summary,
        };

        // Update performance if we have data
        if (result.summary) {
          fullReport.performance = fullReport.performance || {};
          fullReport.performance.lcp = result.summary.avg_lcp || null;
          fullReport.performance.cls = result.summary.avg_cls || null;
        }

        await pool.query(
          `UPDATE scan_requests SET full_report = $1, updated_at = NOW() WHERE scan_id = $2`,
          [JSON.stringify(fullReport), scan.scan_id]
        );

        console.log(`Updated scan ${scan.scan_id} with technical SEO data`);
      } else {
        // Create a new scan record
        const scanId = `tech_scan_${Date.now()}`;
        await pool.query(
          `INSERT INTO scan_requests (scan_id, target_url, normalized_url, domain, status, full_report, completed_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())`,
          [
            scanId,
            `https://${DOMAIN}`,
            `https://${DOMAIN}`,
            DOMAIN,
            "complete",
            JSON.stringify({
              technical: {
                ok: result.ok,
                pages_crawled: result.pages_crawled,
                findings: findings,
                summary: result.summary,
              },
            }),
          ]
        );
        console.log(`Created new scan record ${scanId}`);
      }
    } catch (dbError: any) {
      console.error("Database update failed:", dbError.message);
    }

    // Print summary
    console.log("\n=== SUMMARY ===");
    console.log(`Domain: ${DOMAIN}`);
    console.log(`Pages crawled: ${result.pages_crawled}`);
    console.log(`Total issues: ${findings.length}`);
    console.log(`Health score: ${result.summary?.health_score ?? "N/A"}/100`);

    if (result.summary) {
      console.log("\nPage Analysis:");
      console.log(`  - Indexable: ${result.summary.indexable_count || 0}`);
      console.log(`  - Blocked: ${result.summary.blocked_count || 0}`);
      console.log(`  - Total links: ${result.summary.total_links || 0}`);
      console.log(`  - Internal links: ${result.summary.internal_links || 0}`);
      console.log(`  - External links: ${result.summary.external_links || 0}`);
    }

  } catch (error: any) {
    console.error("\nCrawl failed:", error.message);
    console.error(error.stack);
  }

  await pool.end();
  console.log("\nDone!");
}

main().catch(console.error);
