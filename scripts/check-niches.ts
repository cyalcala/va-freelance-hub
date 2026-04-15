import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  const counts = await db.select({ 
    niche: opportunities.niche, 
    count: sql`count(*)` 
  }).from(opportunities).groupBy(opportunities.niche);
  
  console.log("📊 Niche Distribution:");
  console.table(counts);
}

run().catch(console.error);
