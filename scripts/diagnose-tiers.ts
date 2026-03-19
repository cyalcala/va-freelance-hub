import { createDb } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

async function diagnose() {
  const db = createDb();
  console.log("🧐 Diagnosing Feed Distribution...");

  const counts = await db.run(sql`
    SELECT tier, COUNT(*) as count 
    FROM opportunities 
    GROUP BY tier 
    ORDER BY tier
  `);
  
  console.table(counts.rows);

  const samples = await db.run(sql`
    SELECT id, title, company, source_platform, tier 
    FROM opportunities 
    WHERE tier = 4 
    LIMIT 20
  `);
  
  console.log("\nSample Tier 4 (Trash) Items:");
  console.table(samples.rows);
}

diagnose();
