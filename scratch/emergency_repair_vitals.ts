import { db, schema } from "../packages/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🛠️ [SRE] Emergency Schema Repair Initiated...");
  
  try {
    // 1. Add missing columns to 'vitals'
    console.log("📡 Adding 'last_harvest_at'...");
    await db.run(sql`ALTER TABLE vitals ADD COLUMN last_harvest_at INTEGER;`);
  } catch (e: any) {
    console.warn(`⚠️ Column 'last_harvest_at' might already exist: ${e.message}`);
  }

  try {
    console.log("📡 Adding 'last_harvest_engine'...");
    await db.run(sql`ALTER TABLE vitals ADD COLUMN last_harvest_engine TEXT;`);
  } catch (e: any) {
    console.warn(`⚠️ Column 'last_harvest_engine' might already exist: ${e.message}`);
  }

  console.log("✅ [SRE] Emergency Repair Complete. Verification pulse...");
  
  try {
    const res = await db.select().from(schema.vitals).limit(1);
    console.log("📊 Record verified:", JSON.stringify(res[0], null, 2));
  } catch (e: any) {
    console.error("❌ Verification failed:", e.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("❌ [SRE] Repair failed:", err);
  process.exit(1);
});
