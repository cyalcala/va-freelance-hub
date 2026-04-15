import { db, schema } from "../packages/db/client";
import { desc, eq } from "drizzle-orm";

async function verify() {
  console.log("🔍 Verification Audit: Uniformity & Freshness...");
  
  const sample = await db.select()
    .from(schema.opportunities)
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(20);

  console.table(sample.map(s => ({
    title: s.title.slice(0, 30),
    company: s.company.slice(0, 15),
    platform: s.sourcePlatform,
    location: s.locationType,
    tier: s.tier,
    latest: new Date(s.latestActivityMs).toISOString()
  })));

  // Check for duplicates in platforms
  const platforms = await db.select({ p: schema.opportunities.sourcePlatform }).from(schema.opportunities);
  const counts = platforms.reduce((acc: any, {p}) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  console.log("--- Platform Distribution ---");
  console.log(counts);
}

verify();
