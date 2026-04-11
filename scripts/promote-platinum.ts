import { db } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Analyzing for Platinum candidates...");
  
  // Find top 10 most relevant Tier 1 records
  const result = await db.run(sql`
    SELECT id, title, company, relevance_score 
    FROM opportunities 
    WHERE tier = 1 AND is_active = 1
    ORDER BY relevance_score DESC, latest_activity_ms DESC
    LIMIT 10
  `);

  if (result.rows.length === 0) {
    console.log("No Tier 1 records found.");
    return;
  }

  const ids = result.rows.map(r => r.id);
  console.log(`Promoting ${ids.length} candidates to Tier 0 (Platinum)...`);
  
  await db.run(sql`
    UPDATE opportunities 
    SET tier = 0 
    WHERE id IN (${sql.raw(ids.map(id => `'${id}'`).join(','))})
  `);

  console.log("Promotion successful.");
}

run();
