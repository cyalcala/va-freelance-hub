import { createClient, type Client } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as dbSchema from "./schema";

/**
 * VA.INDEX Titanium Database Client
 * Optimized for serverless edge workers (Trigger.dev / Vercel Edge).
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
      console.error(`[va-hub/db] 🔴 CRITICAL: Missing database credentials.`);
    }
  }

  const client = createClient({
    url: url || "file::memory:",
    authToken: authToken || "",
    // @ts-ignore - Edge-optimized fetching (Injected in DBRE audit)
    intliant: true, 
    // @ts-ignore - increase busy_timeout to mitigate SQLITE_BUSY on Turso
    busy_timeout: 30000, 
  });

  const db = drizzle(client, { schema: dbSchema });
  instance = { db, client, schema: dbSchema };
  return instance;
}

// Global Singletons (Preferred for all tasks)
export const { db, client, schema } = createDb();
export const closeDb = () => client.close();

