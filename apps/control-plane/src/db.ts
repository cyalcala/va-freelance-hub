import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../../packages/db/schema.js";

// We'll use the environment variables from the root .env
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error(`[control-plane/db] ❌ Missing TURSO_DATABASE_URL or AUTH_TOKEN!`);
} else {
  console.log(`[control-plane/db] ✅ DB Connection strings detected.`);
}

const client = createClient({
  url: url || "file::memory:",
  authToken: authToken || "",
});

export const db = drizzle(client, { schema });
export { schema };
