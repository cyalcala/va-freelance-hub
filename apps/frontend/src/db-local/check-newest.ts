import { db } from "./client";
import { opportunities } from "./schema";
import { desc, sql } from "drizzle-orm";

async function run() {
  console.log("Fetching newest 5 opportunities...");

  try {
    const opps = await db.run(
      sql`SELECT id, title, scraped_at, posted_at, company FROM opportunities ORDER BY posted_at DESC LIMIT 5`
    );

    for (const o of opps.rows as any[]) {
      console.log(`- Posted At: [${o.posted_at}] | Scraped: [${o.scraped_at}] - ${o.title}`);
    }
  } catch (err) {
    console.error("DB Query Failed:", err);
  }
}

run();
