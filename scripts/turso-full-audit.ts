import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    const now = new Date();
    // Use numeric tiers as per schema (1=Gold, 2=Silver, 3=Bronze)
    const [
      total, active, gold, silver, bronze,
      last15, last1hr, last6hr, newest, oldest,
      topGold
    ] = await Promise.all([
      client.execute("SELECT COUNT(*) as c FROM opportunities"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 1 AND is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 2 AND is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 3 AND is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes')"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-1 hour')"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-6 hours')"),
      client.execute("SELECT scraped_at as c FROM opportunities ORDER BY scraped_at DESC LIMIT 1"),
      client.execute("SELECT scraped_at as c FROM opportunities ORDER BY scraped_at ASC LIMIT 1"),
      client.execute("SELECT title, source_platform as source, tier, scraped_at FROM opportunities WHERE tier = 1 AND is_active = 1 ORDER BY scraped_at DESC LIMIT 5")
    ]);
    
    const newestTsValue = (newest.rows[0]?.c as any);
    const newestTs = new Date((typeof newestTsValue === 'bigint' ? Number(newestTsValue) : (newestTsValue || 0)) * 1000);
    const staleHrs = Math.round((now.getTime() - newestTs.getTime()) / 360000) / 10;
    
    console.log("=== TURSO FULL AUDIT ===");
    console.log("TOTAL_ALL:", (total.rows[0] as any).c);
    console.log("TOTAL_ACTIVE:", (active.rows[0] as any).c);
    console.log("GOLD:", (gold.rows[0] as any).c);
    console.log("SILVER:", (silver.rows[0] as any).c);
    console.log("BRONZE:", (bronze.rows[0] as any).c);
    console.log("WRITTEN_LAST_15MIN:", (last15.rows[0] as any).c);
    console.log("WRITTEN_LAST_1HR:", (last1hr.rows[0] as any).c);
    console.log("WRITTEN_LAST_6HR:", (last6hr.rows[0] as any).c);
    console.log("NEWEST_RECORD:", newestTs.toISOString());
    console.log("OLDEST_RECORD:", new Date(Number(oldest.rows[0]?.c || 0) * 1000).toISOString());
    console.log("DATA_STALE_HRS:", staleHrs);
    
    console.log("\nTOP_5_GOLD_LISTINGS:");
    topGold.rows.forEach((r: any) =>
      console.log({
        title: r.title?.substring(0, 50),
        source: r.source,
        age_mins: Math.round((now.getTime() - new Date(Number(r.scraped_at) * 1000).getTime()) / 60000)
      })
    );
    
    console.log("\n=== TURSO VERDICT ===");
    const v = Number((active.rows[0] as any).c);
    const r15 = Number((last15.rows[0] as any).c);
    if (v === 0) {
      console.log("VERDICT: EMPTY — no active listings");
    } else if (staleHrs > 2) {
      console.log("VERDICT: STALE —", staleHrs, "hours since last write");
    } else {
      console.log("VERDICT: HEALTHY —", v, "visible,", r15, "written in last 15min");
    }
  } catch (err: any) {
    console.error("TURSO_FAIL:", err.message);
  } finally {
    client.close();
  }
}
run();
