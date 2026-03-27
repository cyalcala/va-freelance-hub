import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

async function createVitalsTable() {
  const { db, client } = createDb();
  try {
    console.log("🛠️  Manually Provisioning 'vitals' table...");
    
    await db.run(sql`DROP TABLE IF EXISTS vitals`);
    await db.run(sql`
      CREATE TABLE vitals (
        id TEXT PRIMARY KEY,
        ai_quota_count INTEGER DEFAULT 0,
        ai_quota_date TEXT,
        lock_status TEXT DEFAULT 'IDLE',
        lock_updated_at INTEGER,
        successive_failure_count INTEGER DEFAULT 0,
        last_error_hash TEXT,
        last_recovery_at INTEGER
      );
    `);
    
    console.log("✅  'vitals' table provisioned successfully.");
  } catch (err) {
    console.error("❌  Failed to provision 'vitals' table:", err);
  } finally {
    await client.close();
  }
}

createVitalsTable();
