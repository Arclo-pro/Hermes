import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // Check DATABASE_URL details (redacted for security)
  const dbUrl = process.env.DATABASE_URL || "";
  results.dbUrlLength = dbUrl.length;
  results.dbUrlStart = dbUrl.substring(0, 15); // Show protocol
  results.dbUrlContainsNeon = dbUrl.includes("neon.tech");
  results.dbUrlContainsPooler = dbUrl.includes("pooler");

  // Parse the URL to see what's happening
  try {
    const url = new URL(dbUrl);
    results.parsedHost = url.hostname;
    results.parsedProtocol = url.protocol;
  } catch (e: any) {
    results.urlParseError = e.message;
  }

  // Test database connection
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
    const result = await pool.query("SELECT 1 as test");
    await pool.end();
    results.dbConnection = "ok";
  } catch (e: any) {
    results.dbConnection = `error: ${e.message}`;
  }

  return res.json(results);
}
