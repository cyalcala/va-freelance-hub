import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env") });

import { createClient } from "@libsql/client/http";

async function dropAll() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("🧹 Dropping all legacy tables...");
  
  const tables = ["content_digests", "opportunities", "va_directory", "__drizzle_migrations"];
  
  for (const table of tables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`✅ Dropped ${table}`);
    } catch (e) {
      console.warn(`⚠️ Could not drop ${table}:`, e.message);
    }
  }

  client.close();
}

dropAll().catch(console.error);
