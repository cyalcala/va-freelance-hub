import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, or, like } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Systemic Junk Purge Start...");
    
    const killList = [
      '%onlyfans%', '%chatter%', '%closer%', '%moderator%', 
      '%side hustle%', '%sidehustle%', '%earn%', '%php%', 
      '%crypto%', '%pretttytitty%', '%recent_detail%', 
      '%hr_kimberly%', '%moderators%'
    ];

    const conditions = killList.map(p => like(opportunities.title, p));
    const conditionsDesc = killList.map(p => like(opportunities.content, p));

    const result = await db.update(opportunities)
      .set({ isActive: false, tier: 4 })
      .where(or(...conditions, ...conditionsDesc));

    console.log(`Purge Complete. Deactivated ${result.rowsAffected} junk signals.`);

  } finally {
    await client.close();
  }
}

main();
