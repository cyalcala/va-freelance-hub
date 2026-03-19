import { createDb } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

async function verify() {
  const db = createDb();
  console.log("🧐 Verifying Refinement Results...");

  // 1. Check for Beijing roles in visibility tiers (1, 2, 3)
  const beijing: any = await db.run(sql`
    SELECT title, tier, source_platform 
    FROM opportunities 
    WHERE (title LIKE '%Beijing%' OR description LIKE '%Beijing%') 
    AND tier != 4
  `);
  
  if (beijing.rows.length === 0) {
    console.log("✅ SUCCESS: No 'Beijing' roles found in visible tiers.");
  } else {
    console.log(`❌ FAILURE: Found ${beijing.rows.length} 'Beijing' roles in visible tiers:`);
    beijing.rows.forEach((r: any) => console.log(`  - ${r.title} [Tier ${r.tier}]`));
  }

  // 2. Check for Source Priority Promotion (Tier 1)
  const priority: any = await db.run(sql`
    SELECT title, source_platform, tier 
    FROM opportunities 
    WHERE (source_platform LIKE '%Reddit%' OR source_platform LIKE '%Brave%' OR source_platform LIKE '%Greenhouse%') 
    AND tier = 1 
    LIMIT 10
  `);

  if (priority.rows.length > 0) {
    console.log(`✅ SUCCESS: Found ${priority.rows.length} Priority Source roles in Tier 1.`);
    priority.rows.forEach((r: any) => console.log(`  - ${r.title} [${r.source_platform}]`));
  } else {
    console.log("❌ FAILURE: No Priority Source roles found in Tier 1.");
  }
}

verify().catch(console.error);
