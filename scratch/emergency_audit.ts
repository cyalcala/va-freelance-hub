import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, isNull, eq, or, not } from "drizzle-orm";

async function audit() {
  const total = await db.select({ count: sql`count(*)` }).from(opportunities);
  const activeCount = await db.select({ count: sql`count(*)` }).from(opportunities).where(eq(opportunities.isActive, true));
  const nullActive = await db.select({ count: sql`count(*)` }).from(opportunities).where(isNull(opportunities.isActive));
  const falseActive = await db.select({ count: sql`count(*)` }).from(opportunities).where(eq(opportunities.isActive, false));
  const noActivity = await db.select({ count: sql`count(*)` }).from(opportunities).where(or(isNull(opportunities.latestActivityMs), eq(opportunities.latestActivityMs, 0)));
  const tier4 = await db.select({ count: sql`count(*)` }).from(opportunities).where(eq(opportunities.tier, 4));

  console.log("═══ EMERGENCY AUDIT ═══");
  console.log(`Total Jobs:          ${total[0].count}`);
  console.log(`Active (True):       ${activeCount[0].count}`);
  console.log(`Active (False):      ${falseActive[0].count}`);
  console.log(`Active (Null):       ${nullActive[0].count}`);
  console.log(`Tier 4 (Trash):      ${tier4[0].count}`);
  console.log(`No Activity TS:      ${noActivity[0].count}`);
  
  const sample = await db.select().from(opportunities).where(not(eq(opportunities.id, "audit-%"))).limit(1);
  console.log("\nSample Legacy Data:", JSON.stringify(sample[0], null, 2));
}

audit().catch(console.error);
