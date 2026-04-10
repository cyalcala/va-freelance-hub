import { db } from "../../packages/db";
import { opportunities } from "../../packages/db/schema";
import { eq, or, like } from "drizzle-orm";

/**
 * 🧹 PURGE-FOREIGN-GOLD (SRE TACTICAL)
 * 
 * Scans the database for jobs that match the new hardened Geo-Exclusion list
 * and marks them as inactive to immediately clean up the directory.
 */

const GEO_KILL_PATTERNS = [
  "%US Only%", "%UK Only%", "%USA Only%", "%United States Only%",
  "%must be authorized to work in the us%", "%us work authorization%",
  "%must live in the us%", "%w-2 employee%", "%w2 only%", "%w-2 only%",
  "%1099 only%", "%c2c only%", "%no c2c%", "%no 1099%",
  "%must reside in the us%", "%authorized to work in the us%",
  "%eligible to work in the us%", "%social security number%", "% must have a ssn%",
  "%us citizen%", "%uk citizen%", "%permanent resident%",
  "%canada only%", "%australia only%", "%united kingdom only%"
];

async function main() {
  console.log("🛠️ [SRE] Starting Foreign Gold Purge...");

  let purgeCount = 0;

  for (const pattern of GEO_KILL_PATTERNS) {
    console.log(`🔍 Checking pattern: ${pattern}`);
    
    // Find matching opportunities
    const matches = await db.select({ id: opportunities.id, title: opportunities.title })
      .from(opportunities)
      .where(or(
        like(opportunities.description, pattern),
        like(opportunities.title, pattern)
      ));

    if (matches.length > 0) {
      console.log(`🧨 Found ${matches.length} signals matching '${pattern}'. Purging...`);
      
      for (const match of matches) {
        await db.update(opportunities)
          .set({ isActive: false })
          .where(eq(opportunities.id, match.id));
        
        purgeCount++;
      }
    }
  }

  console.log(`✅ [SRE] Purge complete. ${purgeCount} foreign signals have been shadow-deleted.`);
  process.exit(0);
}

main().catch(err => {
  console.error("❌ [SRE] Purge failed:", err);
  process.exit(1);
});
