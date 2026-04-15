import { db, schema } from "../packages/db/client";
import { sql, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function verifyRetention() {
  console.log("🧪 Verifying Tiered Retention...");
  
  const nowSec = Math.floor(Date.now() / 1000);
  const DAY_SEC = 24 * 60 * 60;

  // Insert test data
  const testItems = [
    { id: uuidv4(), title: "Old Platinum", tier: 0, sourceUrl: "https://vaindex.ai/test1", latestActivityMs: (nowSec - 6 * DAY_SEC) * 1000, scrapedAt: new Date((nowSec - 6 * DAY_SEC)*1000), isActive: true }, // Should stay
    { id: uuidv4(), title: "Ancient Platinum", tier: 0, sourceUrl: "https://vaindex.ai/test2", latestActivityMs: (nowSec - 8 * DAY_SEC) * 1000, scrapedAt: new Date((nowSec - 8 * DAY_SEC)*1000), isActive: true }, // Should deactivate
    { id: uuidv4(), title: "Old Gold", tier: 1, sourceUrl: "https://vaindex.ai/test3", latestActivityMs: (nowSec - 3 * DAY_SEC) * 1000, scrapedAt: new Date((nowSec - 3 * DAY_SEC)*1000), isActive: true }, // Should stay
    { id: uuidv4(), title: "Ancient Gold", tier: 1, sourceUrl: "https://vaindex.ai/test4", latestActivityMs: (nowSec - 5 * DAY_SEC) * 1000, scrapedAt: new Date((nowSec - 5 * DAY_SEC)*1000), isActive: true }, // Should deactivate
    { id: uuidv4(), title: "Old Silver", tier: 2, sourceUrl: "https://vaindex.ai/test5", latestActivityMs: (nowSec - 1.5 * DAY_SEC) * 1000, scrapedAt: new Date((nowSec - 1.5 * DAY_SEC)*1000), isActive: true }, // Should stay
    { id: uuidv4(), title: "Ancient Silver", tier: 2, sourceUrl: "https://vaindex.ai/test6", latestActivityMs: (nowSec - 3 * DAY_SEC) * 1000, scrapedAt: new Date((nowSec - 3 * DAY_SEC)*1000), isActive: true }, // Should deactivate
  ];

  for (const item of testItems) {
    await db.insert(schema.opportunities).values(item).onConflictDoNothing();
  }

  // Run the logic from database-watchdog.ts
  const deactivateWatermelons = await db.run(sql`
    UPDATE opportunities 
    SET is_active = 0 
    WHERE is_active = 1 
    AND (title LIKE 'Old %' OR title LIKE 'Ancient %')
    AND scraped_at < CASE 
      WHEN tier = 0 THEN ${nowSec - 168 * 3600}
      WHEN tier = 1 THEN ${nowSec - 96 * 3600}
      WHEN tier = 2 THEN ${nowSec - 48 * 3600}
      ELSE ${nowSec - 24 * 3600}
    END
  `);

  console.log(`Deactivated ${deactivateWatermelons.rowsAffected} watermelons.`);

  const results = await db.select()
    .from(schema.opportunities)
    .where(sql`title LIKE 'Old %' OR title LIKE 'Ancient %'`);

  console.table(results.map(r => ({
    title: r.title,
    tier: r.tier,
    active: r.isActive,
    ageDays: (nowSec - Math.floor(new Date(r.scrapedAt).getTime() / 1000)) / DAY_SEC
  })));

  // Cleanup
  await db.run(sql`DELETE FROM opportunities WHERE title LIKE 'Old %' OR title LIKE 'Ancient %'`);
}

verifyRetention();
