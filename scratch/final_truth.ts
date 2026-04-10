import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, isNull, eq } from "drizzle-orm";

async function audit() {
  console.log("═══ THE FINAL TRUTH ═══");
  
  const total = await db.select({ count: sql`count(*)` }).from(opportunities);
  const active = await db.select({ count: sql`count(*)` }).from(opportunities).where(eq(opportunities.isActive, true));
  const trash = await db.select({ count: sql`count(*)` }).from(opportunities).where(eq(opportunities.tier, 4));
  const niches = await db.select({ niche: opportunities.niche, count: sql`count(*)` }).from(opportunities).groupBy(opportunities.niche);

  console.log(`Total Records:    ${total[0].count}`);
  console.log(`Active Records:   ${active[0].count}`);
  console.log(`Tier 4 Records:   ${trash[0].count}`);
  console.log("\nNiche Distribution:");
  console.log(JSON.stringify(niches, null, 2));

  const sample = await db.select().from(opportunities).limit(2);
  console.log("\nSample Data:", JSON.stringify(sample, null, 2));
}

audit().catch(console.error);
