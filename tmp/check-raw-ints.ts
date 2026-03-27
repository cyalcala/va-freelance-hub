import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function run() {
  const { db, client } = createDb();
  try {
    const results = await db.run(sql`SELECT source_name, last_success, updated_at FROM system_health`);
    console.log(JSON.stringify(results.rows, null, 2));
  } finally {
    await client.close();
  }
}

run();
