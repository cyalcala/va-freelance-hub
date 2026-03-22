import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  console.log("\n╔═══════════════════════════════════╗");
  console.log("║  VA.INDEX CERTIFICATION SUITE v4  ║");
  console.log("╚═══════════════════════════════════╝\n");

  try {
    const [C1, C2, C3, DQ1, DQ2, DQ3, DQ4, DQ5] = await Promise.all([
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier != 4`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE tier=1 AND is_active=1`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now', '-30 minutes')`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE created_at > unixepoch('now', '-1 hour')`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND created_at > unixepoch('now', '-6 hours') AND posted_at IS NOT NULL AND posted_at > 0 AND posted_at < unixepoch('now', '-14 days')`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE tier IS NULL AND is_active=1`),
      c.execute(`SELECT COUNT(*) AS n FROM (SELECT title, company FROM opportunities WHERE is_active=1 GROUP BY title, company HAVING COUNT(*) > 1)`),
      c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE created_at > unixepoch('now', '-24 hours')`)
    ]);

    const v = Number((C1.rows[0] as any).n);
    console.log(v > 100 ? `  ✅ C1  PASS: ${v} visible` : `  ❌ C1  FAIL: only ${v} visible`);
    
    const ti = Number((DQ2.rows[0] as any).n);
    console.log(ti === 0 ? `  ✅ DQ2 PASS: no inversion` : `  ❌ DQ2 FAIL: ${ti} inversions`);

    const dq1 = Number((DQ1.rows[0] as any).n);
    console.log(dq1 > 0 ? `  ✅ DQ1 PASS: ${dq1} new ingested last hour` : `  ⚠️ DQ1 WARN: 0 new ingestion`);
    
  } catch (e: any) {
    console.error("CERT_ERROR:", e.message);
  } finally {
    c.close();
  }
}

run();
