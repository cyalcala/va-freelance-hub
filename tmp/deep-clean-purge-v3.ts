import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const killList = [
      '%onlyfans%', '%chatter%', '%closer%', '%moderator%', 
      '%side hustle%', '%sidehustle%', '%earn%', '%php%', 
      '%crypto%', '%pretttytitty%', '%recent_detail%', 
      '%hr_kimberly%', '%moderators%'
    ];

    console.log("Systemic Junk Purge Start (Raw SQL)...");
    let total = 0;
    for (const pattern of killList) {
       // Use raw SQL string with explicit parameter
       const resTitle = await db.run(sql.raw(`UPDATE opportunities SET is_active = 0, tier = 4 WHERE title LIKE '${pattern}'`));
       const resDesc = await db.run(sql.raw(`UPDATE opportunities SET is_active = 0, tier = 4 WHERE content LIKE '${pattern}'`));
       total += (resTitle.rowsAffected + resDesc.rowsAffected);
    }

    console.log(`Purge Complete. Deactivated ${total} junk signals.`);

  } finally {
    await client.close();
  }
}

main();
