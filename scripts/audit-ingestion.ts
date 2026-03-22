import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [ingestion_buckets, processing_buckets, per_source, write_latency_dist, amplification_detail] = await Promise.all([
    c.execute(`SELECT SUM(CASE WHEN created_at > unixepoch('now','-15 minutes') THEN 1 ELSE 0 END) AS new_15m, SUM(CASE WHEN created_at > unixepoch('now','-1 hour') THEN 1 ELSE 0 END) AS new_1h, SUM(CASE WHEN created_at > unixepoch('now','-3 hours') THEN 1 ELSE 0 END) AS new_3h, SUM(CASE WHEN created_at > unixepoch('now','-6 hours') THEN 1 ELSE 0 END) AS new_6h, SUM(CASE WHEN created_at > unixepoch('now','-24 hours') THEN 1 ELSE 0 END) AS new_24h, SUM(CASE WHEN created_at > unixepoch('now','-7 days') THEN 1 ELSE 0 END) AS new_7d FROM opportunities`),
    c.execute(`SELECT SUM(CASE WHEN scraped_at > unixepoch('now','-15 minutes') THEN 1 ELSE 0 END) AS proc_15m, SUM(CASE WHEN scraped_at > unixepoch('now','-1 hour') THEN 1 ELSE 0 END) AS proc_1h, SUM(CASE WHEN scraped_at > unixepoch('now','-3 hours') THEN 1 ELSE 0 END) AS proc_3h FROM opportunities`),
    c.execute(`SELECT source_platform, COUNT(*) AS total, SUM(CASE WHEN created_at > unixepoch('now','-1 hour') THEN 1 ELSE 0 END) AS ingested_1h, SUM(CASE WHEN scraped_at > unixepoch('now','-1 hour') AND created_at <= unixepoch('now','-1 hour') THEN 1 ELSE 0 END) AS refreshed_1h, MIN(created_at) AS oldest_ingestion, MAX(created_at) AS newest_ingestion FROM opportunities WHERE is_active = 1 GROUP BY source_platform ORDER BY total DESC`),
    c.execute(`SELECT CASE WHEN (created_at - posted_at) < 3600 THEN '< 1 hour' WHEN (created_at - posted_at) < 21600 THEN '1h – 6h' WHEN (created_at - posted_at) < 86400 THEN '6h – 24h' WHEN (created_at - posted_at) < 604800 THEN '1d – 7d' ELSE '> 7 days' END AS latency_bucket, COUNT(*) AS count, AVG(created_at - posted_at) / 3600.0 AS avg_hrs FROM opportunities WHERE posted_at IS NOT NULL AND posted_at > 0 AND created_at IS NOT NULL GROUP BY latency_bucket ORDER BY MIN(created_at - posted_at)`),
    c.execute(`SELECT SUM(CASE WHEN scraped_at > unixepoch('now','-15 minutes') THEN 1 ELSE 0 END) AS total_touched_15m, SUM(CASE WHEN created_at > unixepoch('now','-15 minutes') THEN 1 ELSE 0 END) AS truly_new_15m, SUM(CASE WHEN scraped_at > unixepoch('now','-1 hour') THEN 1 ELSE 0 END) AS total_touched_1h, SUM(CASE WHEN created_at > unixepoch('now','-1 hour') THEN 1 ELSE 0 END) AS truly_new_1h FROM opportunities`)
  ]);

  const ib = ingestion_buckets.rows[0] as any;
  const pb = processing_buckets.rows[0] as any;
  const amp = amplification_detail.rows[0] as any;

  console.log("=== PHASE 1: FRESHNESS AUDIT ===\n");
  console.log(`  New 15m: ${ib.new_15m}`);
  console.log(`  New 1h:  ${ib.new_1h}`);
  console.log(`  Touched 15m: ${pb.proc_15m}`);
  console.log(`  Write Amp 15m: ${amp.truly_new_15m > 0 ? (amp.total_touched_15m / amp.truly_new_15m).toFixed(1) + 'x' : '∞'}`);
} catch (e: any) {
  console.error("INGESTION_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
