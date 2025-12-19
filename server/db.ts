import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function initializeDatabase() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    if (!dbInstance) {
      throw new Error("Database not initialized. Call initializeDatabase() first.");
    }
    return (dbInstance as any)[prop];
  },
});
