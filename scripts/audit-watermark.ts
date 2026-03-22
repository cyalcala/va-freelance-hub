import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [wm_now, wm_6h_ago] = await Promise.all([
    c.execute(`SELECT MIN(posted_at) AS wm_floor, MAX(posted_at) AS wm_ceiling, AVG(posted_at) AS wm_center, COUNT(*) AS sample_size FROM opportunities WHERE created_at > unixepoch('now', '-1 hour') AND posted_at IS NOT NULL AND posted_at > 0`),
    c.execute(`SELECT MIN(posted_at) AS wm_floor, MAX(posted_at) AS wm_ceiling, AVG(posted_at) AS wm_center, COUNT(*) AS sample_size FROM opportunities WHERE created_at BETWEEN unixepoch('now', '-7 hours') AND unixepoch('now', '-6 hours') AND posted_at IS NOT NULL AND posted_at > 0`)
  ]);

  const now = Math.floor(Date.now() / 1000);
  const wm = wm_now.rows[0] as any;
  const wm_old = wm_6h_ago.rows[0] as any;

  console.log("=== WATERMARK ANALYSIS ===\n");
  if (wm.wm_floor) {
    console.log(`  W(t) Center Now: ${Math.round((now - wm.wm_center) / 3600)}h ago`);
    if (wm_old.wm_center) {
      const adv = wm.wm_center - wm_old.wm_center;
      const velocity = adv / (6 * 3600);
      console.log(`  Velocity: ${velocity.toFixed(3)} (1.0 = keeping pace)`);
    }
  } else {
    console.log("  No ingestion in last hour to compute watermark.");
  }
} catch (e: any) {
  console.error("WATERMARK_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
