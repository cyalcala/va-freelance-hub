import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
try {
  const now = new Date();
  const nowSeconds = Math.floor(
    now.getTime() / 1000
  );
  const fifteenMinsAgo = nowSeconds - 15 * 60;
  const oneHourAgo = nowSeconds - 60 * 60;
  
  const [
    total, active, last15, last1hr,
    newest, topFive
  ] = await Promise.all([
    client.execute(
      `SELECT COUNT(*) as c
       FROM opportunities
       WHERE is_active = 1`
    ),
    client.execute(
      `SELECT COUNT(*) as c
       FROM opportunities
       WHERE is_active = 1`
    ),
    client.execute(
      `SELECT COUNT(*) as c
       FROM opportunities
       WHERE scraped_at > ${fifteenMinsAgo}`
    ),
    client.execute(
      `SELECT COUNT(*) as c
       FROM opportunities
       WHERE scraped_at > ${oneHourAgo}`
    ),
    client.execute(
      `SELECT scraped_at
       FROM opportunities
       ORDER BY scraped_at DESC LIMIT 1`
    ),
    client.execute(
      `SELECT title, source_platform
       as source, tier, scraped_at
       FROM opportunities
       WHERE is_active = 1
       ORDER BY scraped_at DESC LIMIT 5`
    )
  ]);
  
  const newestVal =
    (newest.rows[0] as any)?.scraped_at;
  const newestTs = new Date(
    typeof newestVal === 'number'
    ? newestVal * 1000
    : newestVal
  );
  const staleHrs = Math.round(
    (now.getTime() - newestTs.getTime())
    / 3600000
  ) / 10;
  
  const last15Count =
    (last15.rows[0] as any).c;
  const last1hrCount =
    (last1hr.rows[0] as any).c;
  
  console.log("=== TURSO GROUND TRUTH ===");
  console.log("AUDIT_TIME:", now.toISOString());
  console.log("VISIBLE_ACTIVE:",
    (total.rows[0] as any).c);
  console.log("TOTAL_ACTIVE:",
    (active.rows[0] as any).c);
  console.log("WRITTEN_LAST_15MIN:", last15Count);
  console.log("WRITTEN_LAST_1HR:", last1hrCount);
  console.log("NEWEST_RECORD:",
    newestTs.toISOString());
  console.log("DATA_STALE_HRS:", staleHrs);
  
  console.log("\nTOP_5_NEWEST_IN_DB:");
  topFive.rows.forEach((r: any) => {
    const scrapedAt = new Date(
      typeof r.scraped_at === 'number'
      ? r.scraped_at * 1000
      : r.scraped_at
    );
    const ageMins = Math.round(
      (now.getTime() - scrapedAt.getTime())
      / 60000
    );
    console.log({
      title: r.title?.substring(0, 45),
      source: r.source,
      tier: r.tier,
      age_mins: ageMins
    });
  });
  
  console.log("\nTURSO_VERDICT:",
    last15Count > 0
    ? "FRESH — new data written in last 15min"
    : staleHrs < 1
    ? "RECENT — last write under 1 hour"
    : `STALE — last write ${staleHrs} hours ago`
  );
} catch (err: any) {
  console.error("TURSO_FAIL:", err.message);
} finally {
  client.close();
}
