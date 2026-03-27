import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Purging stale system_health records...");
    await db.run(sql`DELETE FROM system_health`);
    console.log("Telemetry reset complete.");
  } finally {
    await client.close();
  }
}

main();
