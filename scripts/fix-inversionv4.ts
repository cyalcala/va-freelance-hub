import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  console.log("=== P1 REMEDIATION: TEMPORAL INVERSION DEACTIVATION ===\n");
  try {
    const res = await c.execute(`
      UPDATE opportunities 
      SET is_active = 0 
      WHERE is_active = 1 
      AND posted_at IS NOT NULL 
      AND posted_at > 0 
      AND posted_at < unixepoch('now', '-21 days')
    `);
    console.log(`Deactivated ${res.rowsAffected} zombies (> 21d old).`);
  } catch (e: any) {
    console.error("FIX_ERROR:", e.message);
  } finally {
    c.close();
  }
}

run();
