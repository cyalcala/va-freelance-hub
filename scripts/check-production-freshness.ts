import { createDb } from "../packages/db/client";
import { opportunities as opportunitiesSchema } from "../packages/db/schema";
import { isNotNull, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { db, client } = createDb();
  
  try {
    const stats = await db.select({
      total: sql<number>`count(*)`,
      withLastSeen: sql<number>`count(case when last_seen_at is not null then 1 end)`,
      maxLastSeen: sql<number>`max(last_seen_at)`,
    }).from(opportunitiesSchema);

    console.log("📊 Production Freshness Audit:");
    console.log(`Total Opportunities: ${stats[0].total}`);
    console.log(`With lastSeenAt: ${stats[0].withLastSeen}`);
    console.log(`Max lastSeenAt: ${stats[0].maxLastSeen ? new Date(stats[0].maxLastSeen).toISOString() : "N/A"}`);
  } catch (error) {
    console.error("🔴 Audit failed:", error);
  } finally {
    client.close();
  }
}

main();
