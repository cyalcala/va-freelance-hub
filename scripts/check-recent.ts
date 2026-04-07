import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { desc, gt } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

async function check() {
  const { db } = createDb();
  // 5 minutes ago
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  console.log(`🔍 [AUDIT] Fetching records created since ${threshold.toISOString()}...`);
  
  const recent = await db
    .select()
    .from(opportunities)
    .where(gt(opportunities.scrapedAt, threshold));

  if (recent.length === 0) {
    console.log("❌ [ZERO] No records found in the last 5 minutes.");
    return;
  }

  recent.forEach(r => {
    console.log(`- [${r.scrapedAt?.toISOString()}] ${r.title} | ${r.company}`);
  });
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
