import { createDb } from "../packages/db/client";
import { opportunities, systemHealth } from "../packages/db/schema";
import { desc } from "drizzle-orm";

async function check() {
  const { db, client } = createDb();
  try {
    const latest = await db.select({ 
      title: opportunities.title, 
      scrapedAt: opportunities.scrapedAt 
    })
    .from(opportunities)
    .orderBy(desc(opportunities.scrapedAt))
    .limit(5);

    console.log("--- Latest Opportunities ---");
    latest.forEach(o => {
      console.log(`${o.title} | Scraped: ${o.scrapedAt}`);
    });

    const health = await db.select().from(systemHealth);
    console.log("\n--- System Health ---");
    health.forEach(h => {
      console.log(`${h.sourceName}: ${h.status} | Last Success: ${h.lastSuccess}`);
    });

    const now = new Date();
    const lastTime = latest[0]?.scrapedAt ? new Date(latest[0].scrapedAt) : null;
    if (lastTime) {
       const diff = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
       console.log(`\nData Lag: ${diff.toFixed(2)} hours`);
    } else {
       console.log("\nNo data found in opportunities table.");
    }

  } finally {
    await client.close();
  }
}

check();
