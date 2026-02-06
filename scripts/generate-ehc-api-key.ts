/**
 * Generate an API key for Empathy Health Clinic to use with the leads webhook
 *
 * Run with: npx tsx scripts/generate-ehc-api-key.ts
 */

import "dotenv/config";

import { initializeDatabase, db, client } from "../server/db";
import { apiKeys } from "../shared/schema";
import { generateApiKey, generateKeyId } from "../server/utils/apiKeyUtils";

const EMPATHY_SITE_ID = "site_1769814695100_f445b6d5";

async function main() {
  console.log("🔑 Generating API key for Empathy Health Clinic...\n");

  // Initialize database connection
  await initializeDatabase();

  // Generate a new API key
  const { plaintext, hashedKey, prefix } = generateApiKey("prod");
  const keyId = generateKeyId();

  // Insert into database
  await db.insert(apiKeys).values({
    keyId,
    siteId: EMPATHY_SITE_ID,
    displayName: "EHC Form Webhook",
    hashedKey,
    prefix,
    scopes: ["leads:write"],
    createdBy: "system",
  });

  console.log("✅ API Key created successfully!\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("IMPORTANT: Save this key securely - it cannot be retrieved later!");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`Key ID:     ${keyId}`);
  console.log(`Site ID:    ${EMPATHY_SITE_ID}`);
  console.log(`Scopes:     leads:write`);
  console.log(`Prefix:     ${prefix}`);
  console.log("");
  console.log("🔐 API KEY (add to EHC .env as ARCLO_API_KEY):");
  console.log("");
  console.log(`   ${plaintext}`);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error generating API key:", err);
  process.exit(1);
});
