import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { count, eq, like } from "drizzle-orm";

async function check() {
  const allCount = await db.select({ count: count() }).from(opportunities).where(eq(opportunities.isActive, true));
  const redditCount = await db.select({ count: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), like(opportunities.sourcePlatform, "Reddit%")));
  const greenhouseCount = await db.select({ count: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), like(opportunities.sourcePlatform, "%Greenhouse%")));
  const leverCount = await db.select({ count: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), like(opportunities.sourcePlatform, "%Lever%")));

  console.log({
    total: allCount[0].count,
    reddit: redditCount[0].count,
    greenhouse: greenhouseCount[0].count,
    lever: leverCount[0].count
  });
}

import { and } from "drizzle-orm";
check().catch(console.error);
