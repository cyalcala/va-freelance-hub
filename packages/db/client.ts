import { createClient, type Client } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export interface DbInstance {
  db: LibSQLDatabase<typeof schema>;
  client: Client;
  schema: typeof schema;
}

export function createDb(): DbInstance {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[va-hub/db] CRITICAL: Missing env vars — TURSO_DATABASE_URL=${url ? 'SET' : 'MISSING'}`);
    }
  }

  const client = createClient({
    url: url || "file::memory:",
    authToken: authToken || "",
  });

  return {
    db: drizzle(client, { schema }),
    client,
    schema
  };
}

// Singleton for Astro / Long-running processes
const defaultInstance = createDb();
export const db = defaultInstance.db;
export const client = defaultInstance.client;
export const closeDb = () => client.close();
export { schema };

