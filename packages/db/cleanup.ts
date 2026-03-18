import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

async function cleanGarbage() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // 1. Count before
  const before = await c.execute("SELECT COUNT(*) as cnt FROM opportunities");
  console.log(`Before cleanup: ${before.rows[0][0]} opportunities`);

  // 2. Delete HN entries with bad titles (too short, too long, or just locations)
  const badHN = await c.execute(`
    DELETE FROM opportunities 
    WHERE source_platform = 'HackerNews' 
    AND (
      LENGTH(title) < 10 
      OR LENGTH(title) > 200 
      OR title LIKE 'Remote%' AND LENGTH(title) < 40
      OR title LIKE 'San %'
      OR title LIKE 'Hi all%'
      OR title LIKE 'full-time'
      OR title LIKE 'Looking for%' AND LENGTH(title) > 150
    )
  `);
  console.log(`Removed ${badHN.rowsAffected} bad HN entries`);

  // 3. Delete OnlineJobs blog articles (not actual jobs)
  const blogArticles = await c.execute(`
    DELETE FROM opportunities 
    WHERE source_platform = 'OnlineJobs' 
    AND title NOT LIKE '%hire%' 
    AND title NOT LIKE '%job%' 
    AND title NOT LIKE '%apply%'
    AND title NOT LIKE '%career%'
    AND title NOT LIKE '%opening%'
    AND title NOT LIKE '%role%'
  `);
  console.log(`Removed ${blogArticles.rowsAffected} blog articles`);

  // 4. Delete duplicates (keep the first inserted by earliest scraped_at)
  const dupes = await c.execute(`
    DELETE FROM opportunities WHERE id IN (
      SELECT o2.id FROM opportunities o1 
      JOIN opportunities o2 ON o1.title = o2.title AND o1.id < o2.id
    )
  `);
  console.log(`Removed ${dupes.rowsAffected} exact duplicates`);
  
  // 5. Count after
  const after = await c.execute("SELECT COUNT(*) as cnt FROM opportunities");
  console.log(`After cleanup: ${after.rows[0][0]} opportunities`);

  // 6. Show source breakdown
  const breakdown = await c.execute(`
    SELECT source_platform, COUNT(*) as cnt 
    FROM opportunities 
    WHERE is_active = 1
    GROUP BY source_platform 
    ORDER BY cnt DESC
  `);
  console.log("\nSource breakdown:");
  for (const row of breakdown.rows) {
    console.log(`  ${row[0]}: ${row[1]}`);
  }

  c.close();
}

cleanGarbage().catch(console.error);
