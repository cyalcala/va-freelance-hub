import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

async function migrate() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("🛰️  CHRONOS: Initiating Temporal Normalization Migration...");

  // 1. Fetch all records with potentially hallucinated dates
  const result = await c.execute("SELECT id, posted_at, scraped_at, last_seen_at, latest_activity_ms FROM opportunities");
  console.log(`   Found ${result.rows.length} opportunities to audit.`);

  let fixCount = 0;

  for (const row of result.rows) {
    const id = row.id as string;
    const updates: Record<string, number> = {};

    const normalize = (val: any): number => {
      if (!val) return 0;
      let num = Number(val);
      if (num > 250000000000000) num = num / 1000;
      return num < 10000000000 ? num * 1000 : num;
    };

    const posted = normalize(row.posted_at);
    const scraped = normalize(row.scraped_at);
    const seen = normalize(row.last_seen_at);
    const activity = normalize(row.latest_activity_ms);

    if (posted !== Number(row.posted_at)) updates.posted_at = posted;
    if (scraped !== Number(row.scraped_at)) updates.scraped_at = scraped;
    if (seen !== Number(row.last_seen_at)) updates.last_seen_at = seen;
    if (activity !== Number(row.latest_activity_ms)) updates.latest_activity_ms = activity;

    if (Object.keys(updates).length > 0) {
      const setClause = Object.entries(updates).map(([k, v]) => `${k} = ${v}`).join(", ");
      await c.execute(`UPDATE opportunities SET ${setClause} WHERE id = '${id}'`);
      fixCount++;
    }
  }

  console.log(`✅  Migration Complete. Normalized ${fixCount} records.`);
  c.close();
}

migrate().catch(console.error);
