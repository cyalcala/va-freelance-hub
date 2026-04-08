import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { count } from "drizzle-orm";

async function verify() {
  console.log("🔍 [VERIFICATION] Checking database state...");
  try {
    const totalCount = await db.select({ value: count() }).from(opportunities);
    console.log(`📊 Total Opportunities: ${totalCount[0].value}`);
    
    const v12Count = await db.run(
      "SELECT count(*) as count FROM opportunities WHERE source_platform LIKE 'Trigger Sifter%' OR source_platform LIKE 'V12 Mesh%'"
    );
    console.log(`📊 V12 Rooted Jobs: ${v12Count.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification Failed:", err);
    process.exit(1);
  }
}

verify();
