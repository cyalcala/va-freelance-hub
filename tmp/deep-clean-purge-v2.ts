import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, or, like } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const killList = [
      '%onlyfans%', '%chatter%', '%closer%', '%moderator%', 
      '%side hustle%', '%sidehustle%', '%earn%', '%php%', 
      '%crypto%', '%pretttytitty%', '%recent_detail%', 
      '%hr_kimberly%', '%moderators%'
    ];

    console.log("Systemic Junk Purge Start (Iterative)...");
    let total = 0;
    for (const pattern of killList) {
       const resTitle = await db.update(opportunities).set({ isActive: false, tier: 4 }).where(like(opportunities.title, pattern));
       const resDesc = await db.update(opportunities).set({ isActive: false, tier: 4 }).where(like(opportunities.content, pattern));
       total += (resTitle.rowsAffected + resDesc.rowsAffected);
    }

    console.log(`Purge Complete. Deactivated ${total} junk signals.`);

  } finally {
    await client.close();
  }
}

main();
