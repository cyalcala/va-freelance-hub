import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [claimed, visible, stale] = await Promise.all([
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1 AND tier != 4 AND tier IS NOT NULL`),
    c.execute(`SELECT (unixepoch('now') - MAX(scraped_at)) / 3600.0 AS staleness_proc, (unixepoch('now') - MAX(created_at)) / 3600.0 AS staleness_ingest FROM opportunities WHERE is_active = 1`)
  ]);

  const claimed_n = (claimed.rows[0] as any).n;
  const visible_n = (visible.rows[0] as any).n;
  const st = stale.rows[0] as any;

  console.log("=== PHASE 3.3: METRIC INDEPENDENCE TEST ===\n");
  console.log(`  Health claims: ${claimed_n} | Visible: ${visible_n} | Gap: ${claimed_n - visible_n}`);
  console.log(`  Divergence: ${Math.abs(st.staleness_ingest - st.staleness_proc).toFixed(2)}h`);
} catch (e: any) {
  console.error("INDEPENDENCE_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
