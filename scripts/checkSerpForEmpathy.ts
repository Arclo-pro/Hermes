/**
 * Script to check SERP rankings for 100 mental health keywords for Empathy Health Clinic
 *
 * Run with: npx tsx scripts/checkSerpForEmpathy.ts
 */

import "dotenv/config";
import { Pool } from "pg";

const SERP_API_KEY = process.env.SERP_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SERP_API_KEY) {
  console.error("SERP_API_KEY not set in .env");
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const DOMAIN = "empathyhealthclinic.com";
const LOCATION = "Orlando, Florida, United States";

// 100 mental health keywords for a clinic in Orlando
const KEYWORDS = [
  // Core services + Orlando
  "psychiatrist orlando",
  "mental health clinic orlando",
  "therapy orlando",
  "counseling orlando",
  "psychologist orlando",
  "anxiety treatment orlando",
  "depression treatment orlando",
  "adhd treatment orlando",
  "ptsd treatment orlando",
  "bipolar disorder treatment orlando",
  "medication management orlando",
  "psychiatric evaluation orlando",
  "mental health services orlando",
  "behavioral health orlando",
  "outpatient mental health orlando",

  // Near me variations
  "psychiatrist near me",
  "mental health clinic near me",
  "therapist near me",
  "counseling near me",
  "psychologist near me",
  "anxiety therapist near me",
  "depression therapist near me",
  "adhd specialist near me",
  "mental health help near me",
  "psychiatric services near me",

  // Specific conditions + Orlando
  "ocd treatment orlando",
  "panic disorder treatment orlando",
  "social anxiety treatment orlando",
  "trauma therapy orlando",
  "grief counseling orlando",
  "stress management orlando",
  "anger management orlando",
  "eating disorder treatment orlando",
  "substance abuse treatment orlando",
  "dual diagnosis treatment orlando",

  // Demographics + Orlando
  "child psychiatrist orlando",
  "adolescent psychiatrist orlando",
  "adult psychiatrist orlando",
  "women mental health orlando",
  "men mental health orlando",
  "senior mental health orlando",
  "family therapy orlando",
  "couples therapy orlando",
  "teen counseling orlando",
  "child therapist orlando",

  // Treatment types
  "cognitive behavioral therapy orlando",
  "cbt therapy orlando",
  "dbt therapy orlando",
  "emdr therapy orlando",
  "group therapy orlando",
  "individual therapy orlando",
  "online therapy orlando",
  "telehealth psychiatry orlando",
  "virtual mental health orlando",
  "telepsychiatry orlando",

  // Insurance/affordability
  "psychiatrist accepting new patients orlando",
  "affordable mental health orlando",
  "sliding scale therapy orlando",
  "medicaid psychiatrist orlando",
  "medicare mental health orlando",
  "insurance psychiatrist orlando",
  "low cost counseling orlando",

  // Urgency/crisis
  "same day psychiatrist orlando",
  "urgent mental health orlando",
  "walk in mental health clinic orlando",
  "crisis counseling orlando",
  "emergency psychiatrist orlando",

  // Specific medication management
  "antidepressant doctor orlando",
  "anxiety medication orlando",
  "adhd medication management orlando",
  "psychiatric medication management orlando",
  "psychotropic medication orlando",

  // Long tail keywords
  "best psychiatrist in orlando",
  "top rated mental health clinic orlando",
  "highest rated therapist orlando",
  "best depression treatment orlando",
  "best anxiety treatment orlando",
  "holistic mental health orlando",
  "integrative psychiatry orlando",

  // Surrounding areas
  "psychiatrist winter park",
  "mental health clinic kissimmee",
  "therapist lake nona",
  "counseling dr phillips",
  "psychiatrist altamonte springs",
  "mental health sanford florida",

  // Generic high-volume
  "mental health treatment",
  "psychiatric services",
  "behavioral health services",
  "outpatient psychiatry",
  "mental health care",
  "psychiatric clinic",
  "mental wellness",
  "emotional health support",
  "psychological services",
  "mental health counselor",
];

interface SerpResult {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  snippet: string | null;
  checkedAt: string;
  intent: "local" | "informational" | "transactional";
}

async function checkKeywordRanking(keyword: string): Promise<SerpResult> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("q", keyword);
  url.searchParams.set("location", LOCATION);
  url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en");
  url.searchParams.set("num", "100");
  url.searchParams.set("api_key", SERP_API_KEY!);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`API error for "${keyword}": ${res.status}`);
      return {
        keyword,
        position: null,
        url: null,
        title: null,
        snippet: null,
        checkedAt: new Date().toISOString(),
        intent: keyword.includes("near me") || keyword.includes("orlando") ? "local" : "informational",
      };
    }

    const data = await res.json();
    const organicResults = data.organic_results || [];

    // Find our domain in results
    const ourResult = organicResults.find((r: any) =>
      r.link?.includes(DOMAIN) || r.displayed_link?.includes(DOMAIN)
    );

    const position = ourResult ? organicResults.indexOf(ourResult) + 1 : null;

    return {
      keyword,
      position,
      url: ourResult?.link || null,
      title: ourResult?.title || null,
      snippet: ourResult?.snippet || null,
      checkedAt: new Date().toISOString(),
      intent: keyword.includes("near me") || keyword.includes("orlando") ? "local" : "informational",
    };
  } catch (error: any) {
    console.error(`Error checking "${keyword}": ${error.message}`);
    return {
      keyword,
      position: null,
      url: null,
      title: null,
      snippet: null,
      checkedAt: new Date().toISOString(),
      intent: keyword.includes("near me") || keyword.includes("orlando") ? "local" : "informational",
    };
  }
}

async function main() {
  console.log(`Checking SERP rankings for ${KEYWORDS.length} keywords for ${DOMAIN}...`);
  console.log(`Location: ${LOCATION}`);
  console.log("");

  const results: SerpResult[] = [];

  for (let i = 0; i < KEYWORDS.length; i++) {
    const keyword = KEYWORDS[i];
    console.log(`[${i + 1}/${KEYWORDS.length}] Checking: ${keyword}`);

    const result = await checkKeywordRanking(keyword);
    results.push(result);

    if (result.position) {
      console.log(`  → Ranking #${result.position}`);
    } else {
      console.log(`  → Not in top 100`);
    }

    // Rate limit: 1 request per second for free tier
    if (i < KEYWORDS.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // Summary
  const ranking = results.filter(r => r.position !== null);
  const top3 = ranking.filter(r => r.position! <= 3);
  const top10 = ranking.filter(r => r.position! <= 10);
  const top100 = ranking;

  console.log("\n=== SUMMARY ===");
  console.log(`Total keywords checked: ${results.length}`);
  console.log(`Ranking in top 100: ${top100.length}`);
  console.log(`Ranking in top 10: ${top10.length}`);
  console.log(`Ranking in top 3: ${top3.length}`);

  if (top10.length > 0) {
    console.log("\nTop 10 rankings:");
    top10.forEach(r => console.log(`  #${r.position}: ${r.keyword}`));
  }

  // Update database
  console.log("\nUpdating database...");

  try {
    // Find the scan for this domain
    const scanRes = await pool.query(
      `SELECT scan_id, full_report FROM scan_requests
       WHERE domain = $1 AND status IN ('preview_ready', 'complete', 'report_ready')
       ORDER BY completed_at DESC NULLS LAST LIMIT 1`,
      [DOMAIN]
    );

    if (scanRes.rows.length === 0) {
      console.log("No scan found for domain. Creating a minimal scan record...");
      // Create a new scan record with the SERP results
      await pool.query(
        `INSERT INTO scan_requests (domain, email, status, full_report, completed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [DOMAIN, "kevin@empathyhealthclinic.com", "complete", JSON.stringify({ serp_results: results })]
      );
    } else {
      // Update existing scan
      const scan = scanRes.rows[0];
      const fullReport = scan.full_report || {};
      fullReport.serp_results = results;

      await pool.query(
        `UPDATE scan_requests SET full_report = $1 WHERE scan_id = $2`,
        [JSON.stringify(fullReport), scan.scan_id]
      );
    }

    console.log("Database updated successfully!");
  } catch (error: any) {
    console.error("Database error:", error.message);
  }

  await pool.end();
  console.log("\nDone!");
}

main().catch(console.error);
