import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq, sql } from "drizzle-orm";

async function auditNiches() {
  const stats = await db.select({
    niche: opportunities.niche,
    count: sql<number>`count(*)`
  })
  .from(opportunities)
  .where(eq(opportunities.isActive, true))
  .groupBy(opportunities.niche);

  console.log("📊 Niche Distribution (Active):");
  console.table(stats);
}

auditNiches();
