import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, desc, or, like } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load env vars from root .env.production or .env
dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

async function check() {
  console.log("🔍 [AUDIT] Checking Database for Ghost Payload...");
  
  const { db } = createDb();
  
  // Check by URL (most unique)
  const byUrl = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.url, "https://careers.ph/confidential/v12-genesis-test"));

  if (byUrl.length > 0) {
    console.log("✅ [FOUND] Record detected by URL!");
    console.log(JSON.stringify(byUrl[0], null, 2));
    return;
  }

  // Check by Title (fuzzy)
  const byTitle = await db
    .select()
    .from(opportunities)
    .where(like(opportunities.title, "%Senior Technical VA%"));

  if (byTitle.length > 0) {
    console.log("✅ [FOUND] Record detected by Title (Fuzzy)!");
    console.log(JSON.stringify(byTitle[0], null, 2));
    return;
  }

  // Check by Company
  const byCompany = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.company, "Confidential Client"));

  if (byCompany.length > 0) {
    console.log(`⚠️ [POTENTIAL] Found ${byCompany.length} records with 'Confidential Client'. Checking for recent one...`);
    const sorted = byCompany.sort((a, b) => (b.scrapedAt?.getTime() || 0) - (a.scrapedAt?.getTime() || 0));
    console.log(JSON.stringify(sorted[0], null, 2));
    return;
  }

  // Check most recent
  console.log("❌ [NOT FOUND] Exact match not found. Listing last 5 entries:");
  const recent = await db
    .select()
    .from(opportunities)
    .orderBy(desc(opportunities.scrapedAt))
    .limit(5);

  recent.forEach(r => {
    console.log(`- [${r.scrapedAt?.toISOString() || 'N/A'}] ${r.title} (${r.company})`);
  });
}

check().then(() => process.exit(0)).catch(err => {
  console.error("❌ [ERROR]", err);
  process.exit(1);
});
