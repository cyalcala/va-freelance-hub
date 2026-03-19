import { createDb, opportunities } from "../jobs/lib/db";
import { eq, or, like } from "drizzle-orm";

const db = createDb();

console.log("🧹 Purging Blog Infiltration...");

const result = await db.delete(opportunities).where(
  or(
    eq(opportunities.sourcePlatform, "OnlineJobs"),
    like(opportunities.title, "%Reading This%"),
    like(opportunities.title, "%Stability Matters%"),
    like(opportunities.title, "%Success Story%")
  )
);

console.log("✅ Purge Complete.");
process.exit(0);
