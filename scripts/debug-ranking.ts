import { createDb } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

async function debugRanking() {
  const db = createDb();
  console.log("🧐 Auditing Top 20 Feed Results...");

  // Match the logic in index.astro
  const rows: any = await db.run(sql`
    SELECT title, company, source_platform, tier, scraped_At 
    FROM opportunities 
    WHERE tier != 4
    ORDER BY tier ASC, scraped_At DESC
    LIMIT 50
  `);

  console.table(rows.rows.map((r: any) => ({
    Title: r.title.slice(0, 50),
    Company: r.company?.slice(0, 20),
    Source: r.source_platform,
    Tier: r.tier,
    Age: r.scraped_at
  })));
}

debugRanking().catch(console.error);
