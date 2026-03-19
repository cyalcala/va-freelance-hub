import { createDb } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

async function audit() {
  const db = createDb();
  console.log("🔍 Automation Vital Signs Audit...");

  // 1. Check last 10 inserted items and their scrape times
  const lastScrapes = await db.run(sql`
    SELECT title, source_platform, scraped_at 
    FROM opportunities 
    ORDER BY scraped_at DESC 
    LIMIT 10
  `);
  
  console.log("\nLast 10 Scraped Items:");
  console.table(lastScrapes.rows);

  // 2. Count items scraped in the last 24 hours vs older
  const stats = await db.run(sql`
    SELECT 
      CASE 
        WHEN datetime(scraped_at, 'unixepoch') > datetime('now', '-2 hours') THEN 'Last 2 Hours (Fresh)'
        WHEN datetime(scraped_at, 'unixepoch') > datetime('now', '-24 hours') THEN 'Last 24 Hours'
        ELSE 'Older'
      END as freshness,
      COUNT(*) as count
    FROM opportunities
    GROUP BY freshness
  `);

  console.log("\nFreshness Distribution:");
  console.table(stats.rows);
}

audit();
