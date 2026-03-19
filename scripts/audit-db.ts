import { createDb } from "../jobs/lib/db";
import { sql } from "drizzle-orm";

async function audit() {
  const db = createDb();
  console.log("🧐 Auditing 'opportunities' table info...");
  const result: any = await db.run(sql`PRAGMA table_info(opportunities)`);
  console.log("Columns found:");
  result.rows.forEach((row: any) => {
    console.log(`  - ${row.name} (${row.type})`);
  });
}

audit().catch(console.error);
