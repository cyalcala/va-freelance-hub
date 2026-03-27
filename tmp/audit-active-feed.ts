import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, desc, eq, and } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const stats = await db.select({
      tier: opportunities.tier,
      count: sql<number>`count(*)`
    })
    .from(opportunities)
    .where(eq(opportunities.isActive, true))
    .groupBy(opportunities.tier);

    console.log("Active Signal Tier Distribution:", JSON.stringify(stats, null, 2));

    const samples = await db.select({
      title: opportunities.title,
      tier: opportunities.tier,
      company: opportunities.company
    })
    .from(opportunities)
    .where(eq(opportunities.isActive, true))
    .orderBy(desc(opportunities.createdAt))
    .limit(20);

    console.log("Latest 20 Active Signals:", JSON.stringify(samples, null, 2));

  } finally {
    await client.close();
  }
}

main();
