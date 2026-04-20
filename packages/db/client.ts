import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as dbSchema from "./schema";
import { sql } from "drizzle-orm";

/**
 * VA.INDEX Titanium Database Client
 * Uses HTTP transport (/web) for universal compatibility — no native bindings needed.
 * Works in Vercel Serverless, Trigger.dev workers, and local Bun dev.
 */

export interface DbInstance {
  db: LibSQLDatabase<typeof dbSchema>;
  client: Client;
  schema: typeof dbSchema;
}

let instance: DbInstance | null = null;

export function createDb(): DbInstance {
  if (instance) return instance;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[va-hub/db] 🔴 CRITICAL: Missing database credentials in production. Aborting to prevent ghost state.`);
    }
    console.warn(`[va-hub/db] 🟡 WARNING: Database credentials missing. Falling back to in-memory database.`);
  }

  const client = createClient({
    url: url || "file::memory:",
    authToken: authToken || "",
  });

  const db = drizzle(client, { schema: dbSchema });
  instance = { db, client, schema: dbSchema };
  return instance;
}

// Global Singletons (Preferred for all tasks)
export const { db, client, schema } = createDb();
export const closeDb = () => client.close();

/**
 * 🛰️ TITANIUM HEALTH CHECK
 */
export async function dbAlive(): Promise<boolean> {
  try {
    await db.run(sql`SELECT 1`);
    return true;
  } catch (e) {
    console.error(`[va-hub/db] 💔 Turso disconnected:`, e);
    return false;
  }
}

/**
 * 🛡️ TITANIUM RETRY WRAPPER
 * Sophisticated exponential backoff for S1 operations.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.message?.includes('busy') || err.message?.includes('timeout') || err.message?.includes('connection');
      if (!isRetryable || attempt === maxAttempts) break;
      
      const wait = delayMs * Math.pow(2, attempt - 1);
      console.warn(`[va-hub/db] 🔄 Retry attempt ${attempt}/${maxAttempts} (Wait ${wait}ms) for error: ${err.message}`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastError;
}

