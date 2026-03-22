import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  console.log("\n=== CERTIFICATION SUITE ===\n");

  try {
    const [
      visible, gold, proc30m,
      ingested1h, temporal_inv,
      null_tiers, duplicates,
      growth24h, saturation
    ] = await Promise.all([
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier != 4 AND tier IS NOT NULL`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE tier=1 AND is_active=1`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now', '-30 minutes')`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE created_at > unixepoch('now', '-1 hour')`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND created_at > unixepoch('now', '-6 hours') AND posted_at IS NOT NULL AND posted_at > 0 AND posted_at < unixepoch('now', '-14 days')`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE tier IS NULL AND is_active=1`),
      c.execute(`SELECT COUNT(*) AS n FROM (SELECT title, company FROM opportunities WHERE is_active=1 GROUP BY LOWER(TRIM(title)), LOWER(TRIM(COALESCE(company,''))) HAVING COUNT(*) > 1)`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE created_at > unixepoch('now', '-24 hours')`),
      c.execute(`SELECT COUNT(DISTINCT LOWER(TRIM(title)) || '|' || LOWER(TRIM(COALESCE(company,'_null')))) * 1.0 / COUNT(*) AS sat FROM opportunities WHERE is_active=1`)
    ]);

    const v = (visible.rows[0] as any).n;
    const g = (gold.rows[0] as any).n;
    const p30 = (proc30m.rows[0] as any).n;
    const i1h = (ingested1h.rows[0] as any).n;
    const ti = (temporal_inv.rows[0] as any).n;
    const nt = (null_tiers.rows[0] as any).n;
    const dup = (duplicates.rows[0] as any).n;
    const g24 = (growth24h.rows[0] as any).n;
    const sat = (saturation.rows[0] as any).sat;

    console.log("--- Standard (System Health) ---");
    console.log(v > 273 ? `✅ C1 PASS: ${v} records visible` : `❌ C1 FAIL: ${v} visible`);
    console.log(g > 0 ? `✅ C2 PASS: ${g} GOLD` : `❌ C2 FAIL: zero GOLD`);
    console.log(p30 > 0 ? `✅ C3 PASS: ${p30} touched in 30m` : `❌ C3 FAIL: pipeline stalled`);

    console.log("\n--- Data Quality (True Freshness) ---");
    console.log(i1h > 0 ? `✅ C-DQ1 PASS: ${i1h} new (1h)` : `❌ C-DQ1 FAIL: 0 new (1h)`);
    console.log(Number(ti) === 0 ? `✅ C-DQ2 PASS: no inversion` : `❌ C-DQ2 FAIL: ${ti} inversions`);
    console.log(Number(nt) === 0 ? `✅ C-DQ3 PASS: no null tiers` : `❌ C-DQ3 FAIL: ${nt} null tiers`);
    console.log(Number(dup) === 0 ? `✅ C-DQ4 PASS: no duplicates` : `❌ C-DQ4 FAIL: ${dup} dups`);
    console.log(Number(g24) > 0 ? `✅ C-DQ5 PASS: feed growing` : `❌ C-DQ5 FAIL: no growth`);

  } catch (e: any) {
    console.error("CERT_ERROR:", e.message);
  } finally {
    c.close();
  }
}

run();
