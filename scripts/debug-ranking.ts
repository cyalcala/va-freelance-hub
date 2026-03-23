import { createDb } from "../jobs/lib/db";
import { opportunities } from "../packages/db/schema";
import { asc, desc, eq, not, sql } from "drizzle-orm";

async function run() {
  const db = await createDb();
  console.log("=== TOP 5 by DB ORDER BY ===");
  const res1 = await db.select({
    id: opportunities.id,
    title: opportunities.title,
    tier: opportunities.tier,
    postedAt: opportunities.postedAt,
    scrapedAt: opportunities.scrapedAt
  }).from(opportunities)
    .where(not(eq(opportunities.tier, 4)))
    .orderBy(
      asc(opportunities.tier),
      sql`COALESCE(posted_at, scraped_at) DESC`
    ).limit(5);
  console.table(res1);

  console.log("\n=== TOP 5 LATEST BY SCRAPED_AT ===");
  const res2 = await db.select({
    id: opportunities.id,
    title: opportunities.title,
    tier: opportunities.tier,
    postedAt: opportunities.postedAt,
    scrapedAt: opportunities.scrapedAt
  }).from(opportunities)
    .where(not(eq(opportunities.tier, 4)))
    .orderBy(desc(opportunities.scrapedAt))
    .limit(5);
  console.table(res2);
}
run();
