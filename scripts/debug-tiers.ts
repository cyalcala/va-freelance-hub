import { db } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function run() {
  const r = await db.run(sql`SELECT tier, COUNT(*) as n FROM opportunities GROUP BY tier`);
  console.table(r.rows);
}

run();
