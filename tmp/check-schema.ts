import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const res = await db.run(sql`SELECT json_group_array(name) as names FROM sqlite_master WHERE type='index' AND tbl_name='system_health'`);
    console.log("Indexes on system_health:", res.rows[0].names);
    
    // Also check the table definition directly
    const info = await db.run(sql`PRAGMA table_info(system_health)`);
    console.log("Table info:", JSON.stringify(info.rows, null, 2));

    const dd = await db.run(sql`SELECT sql FROM sqlite_master WHERE name='system_health'`);
    console.log("DDL:", dd.rows[0].sql);
  } finally {
    await client.close();
  }
}

main();
