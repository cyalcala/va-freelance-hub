import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

async function check() {
  const { db } = createDb();
  console.log("🔍 [AUDIT] Fetching last 20 records...");
  
  const recent = await db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.scrapedAt))
    .limit(20);

  recent.forEach(r => {
    console.log(`- [${r.scrapedAt?.toISOString() || 'N/A'}] ID: ${r.id.slice(0,8)} | Title: ${r.title} | Company: ${r.company} | URL: ${r.url}`);
  });
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
