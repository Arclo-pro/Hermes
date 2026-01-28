import { Pool } from "pg";

// Connection pool for serverless - reuses connections across invocations
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Serverless should use minimal connections
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// User type for auth
export interface User {
  id: number;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: string;
  plan: string;
  addons: Record<string, boolean> | null;
  default_website_id: string | null;
  verified_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface VerificationToken {
  id: number;
  user_id: number;
  token: string;
  purpose: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}
