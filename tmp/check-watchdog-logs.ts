import { createDb } from "../packages/db/client";
import { logs, systemHealth } from "../packages/db/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Checking latest Resilience Watchdog heartbeats...");
    const latestLogs = await db.select()
      .from(logs)
      .where(eq(logs.level, 'snapshot'))
      .orderBy(desc(logs.timestamp))
      .limit(5);
    
    console.log("Latest Watchdog Snapshots:", JSON.stringify(latestLogs, null, 2));

    const sourceHealth = await db.select().from(systemHealth);
    console.log("Total Sources Monitored:", sourceHealth.length);
    console.log("Healthy Sources (OK):", sourceHealth.filter(s => s.status === 'OK').length);
    console.log("Degraded Sources (FAIL):", sourceHealth.filter(s => s.status === 'FAIL').length);

  } finally {
    await client.close();
  }
}

main();
