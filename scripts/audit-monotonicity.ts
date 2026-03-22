import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [m1_unit_bug, m2_order_violation, m3_scraped_precedes_created, clock_skew_candidates] = await Promise.all([
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE created_at > 4102444800`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at < created_at - 60`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1 AND created_at IS NULL`),
    c.execute(`SELECT source_platform, MIN(created_at) AS min_ca, MAX(created_at) AS max_ca, MAX(created_at) - MIN(created_at) AS spread_secs, COUNT(*) AS n FROM opportunities WHERE created_at > unixepoch('now', '-24 hours') GROUP BY source_platform HAVING spread_secs > 3600 ORDER BY spread_secs DESC`)
  ]);

  console.log("=== MONOTONICITY PRE-CHECK ===\n");
  const unitBug = Number((m1_unit_bug.rows[0] as any).n);
  const orderVio = Number((m2_order_violation.rows[0] as any).n);
  const nullCa = Number((m3_scraped_precedes_created.rows[0] as any).n);

  console.log(`M1 — Timestamp unit bug (ms as sec): ${unitBug}`);
  console.log(`M2 — scraped_at < created_at:        ${orderVio}`);
  console.log(`M3 — NULL created_at (active):       ${nullCa}`);

  if (unitBug === 0 && orderVio === 0 && nullCa === 0) {
    console.log("\n  ✅ All monotonicity invariants hold.");
    console.log("  Timestamp measurements are admissible.");
  } else {
    console.log("\n  ⚠️ Invariants violated. Manual review required.");
  }
} catch (e: any) {
  console.error("MONOTONICITY_CHECK_ERROR:", e.message);
} finally {
  c.close();
}
