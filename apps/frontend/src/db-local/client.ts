import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error(`[va-hub/db] CRITICAL: Missing env vars — TURSO_DATABASE_URL=${url ? 'SET' : 'MISSING'}, TURSO_AUTH_TOKEN=${authToken ? 'SET' : 'MISSING'}`);
}

const client = createClient({
  url: url || "file::memory:",  // In-memory fallback — queries will fail gracefully but import won't crash
  authToken: authToken || "",
});

export const db = drizzle(client, { schema });
export { schema };

