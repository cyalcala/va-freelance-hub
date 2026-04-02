import { createClient } from "@libsql/client/http";
import { normalizeDate } from "../packages/db";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
async function check() {
try {
  const [total, recent, newest] =
    await Promise.all([
      client.execute(
        `SELECT COUNT(*) as c FROM opportunities
         WHERE is_active=1 AND is_restricted=0`
      ),
      client.execute(
        `SELECT COUNT(*) as c FROM opportunities
         WHERE scraped_at >
         unixepoch('now', '-30 minutes')`
      ),
      client.execute(
        `SELECT id, title, source_platform as source, tier,
         scraped_at as created_at FROM opportunities
         WHERE is_active=1
         ORDER BY scraped_at DESC LIMIT 5`
      )
    ]);
  console.log("TURSO_ACTIVE:",
    (total.rows[0] as any).c);
  console.log("WRITTEN_LAST_30MIN:",
    (recent.rows[0] as any).c);
  console.log("NEWEST_5_LISTINGS:");
  newest.rows.forEach((r: any) =>
    console.log({
      title: r.title?.substring(0,40),
      source: r.source,
      tier: r.tier,
      age_mins: Math.round(
        (Date.now() -
        normalizeDate(r.created_at).getTime())
        / 60000
      )
    })
  );
} catch(e: any) {
  console.error("FAIL:", e.message);
} finally { client.close(); }
}
check();
