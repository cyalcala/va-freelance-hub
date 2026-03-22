import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [sg, td, ph] = await Promise.all([
    c.execute(`SELECT COUNT(*) AS total_active, COUNT(DISTINCT LOWER(TRIM(title)) || '|' || LOWER(TRIM(COALESCE(company, '_null')))) AS unique_fps FROM opportunities WHERE is_active = 1`),
    c.execute(`SELECT COUNT(*) AS count, SUM(CASE WHEN scraped_at < unixepoch('now', '-60 days') THEN 1 ELSE 0 END) AS eligible FROM opportunities WHERE is_active = 0`),
    c.execute(`SELECT COUNT(*) AS at_risk FROM (SELECT title, company FROM opportunities WHERE is_active = 1 GROUP BY title, company HAVING COUNT(DISTINCT source_url) > 1)`)
  ]);

  const sg_row = sg.rows[0] as any;
  const td_row = td.rows[0] as any;
  const ph_row = ph.rows[0] as any;

  console.log("=== PHASE 2: SATURATION AUDIT ===\n");
  console.log(`  Active: ${sg_row.total_active} | Unique FPS: ${sg_row.unique_fps}`);
  console.log(`  Saturation: ${(sg_row.unique_fps / sg_row.total_active).toFixed(4)}`);
  console.log(`  Tombstone count: ${td_row.count} | Eligible for purge (>60d): ${td_row.eligible}`);
  console.log(`  Phantom insert risk: ${ph_row.at_risk}`);
} catch (e: any) {
  console.error("SATURATION_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
