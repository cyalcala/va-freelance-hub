import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  try {
    const [counts, saturation, watermark, lateArrivals] = await Promise.all([
      c.execute(`SELECT 
        COUNT(*) AS total, 
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN tier = 1 THEN 1 ELSE 0 END) AS gold,
        SUM(CASE WHEN tier = 2 THEN 1 ELSE 0 END) AS silver,
        SUM(CASE WHEN tier = 3 THEN 1 ELSE 0 END) AS bronze,
        SUM(CASE WHEN tier = 4 THEN 1 ELSE 0 END) AS trash
      FROM opportunities`),
      c.execute(`SELECT 
        COUNT(DISTINCT LOWER(TRIM(title)) || '|' || LOWER(TRIM(COALESCE(company, '_null')))) AS unique_active_fps
      FROM opportunities WHERE is_active = 1`),
      c.execute(`SELECT 
        MIN(posted_at) AS watermark_floor,
        MAX(created_at) AS latest_ingestion
      FROM opportunities WHERE is_active = 1`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1 AND (created_at - posted_at) > 1209600`)
    ]);

    console.log("=== FINAL SYSTEM SNAPSHOT ===");
    console.log(JSON.stringify({
      counts: counts.rows[0],
      saturation: saturation.rows[0],
      watermark: watermark.rows[0],
      lateArrivals: lateArrivals.rows[0],
      audit_iso: new Date().toISOString()
    }, null, 2));
  } catch (e: any) {
    console.error("SNAPSHOT_ERROR:", e.message);
  } finally {
    c.close();
  }
}

run();
