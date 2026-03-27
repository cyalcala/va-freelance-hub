import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const res = await db.run(sql`PRAGMA table_info(opportunities)`);
    console.log("Table info (opportunities):", JSON.stringify(res.rows, null, 2));
  } finally {
    await client.close();
  }
}

main();
