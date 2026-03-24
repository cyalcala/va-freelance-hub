import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function count() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const r = await c.execute("SELECT COUNT(*) as cnt FROM opportunities");
  console.log("TOTAL OPPORTUNITIES:", r.rows[0].cnt);

  const r2 = await c.execute("SELECT title, source_platform, scraped_at FROM opportunities ORDER BY scraped_at DESC LIMIT 10");
  console.log("\nMost Recent 10:");
  r2.rows.forEach((x, i) => {
    const ts = x.scraped_at ? new Date(Number(x.scraped_at) * 1000).toISOString() : "N/A";
    console.log(`  ${i + 1}. [${x.source_platform}] ${x.title} — ${ts}`);
  });

  c.close();
}

count();
