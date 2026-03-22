import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  console.log("=== PHASE 3.2: DELIVERY LAYER CACHE COHERENCE ===\n");
  
  // Turso read-after-write
  const sId = `audit_${Date.now()}`;
  const t0 = Date.now();
  await c.execute({
    sql: "INSERT INTO opportunities (id, title, company, source_url, source_platform, scraped_at, is_active, tier, content_hash) VALUES (?, 'audit', 'audit', ?, 'audit', unixepoch('now'), 0, 4, ?)",
    args: [sId, `https://audit/${sId}`, sId]
  });
  const t1 = Date.now();
  const res = await c.execute({ sql: "SELECT id FROM opportunities WHERE id = ?", args: [sId] });
  const t2 = Date.now();
  await c.execute({ sql: "DELETE FROM opportunities WHERE id = ?", args: [sId] });
  
  console.log(`  Turso Write: ${t1 - t0}ms | Read: ${t2 - t1}ms`);
  console.log(`  Read-after-write: ${res.rows.length > 0 ? "✅ CONSISTENT" : "⛔ STALE"}`);

  // Vercel CDN headers
  const healthUrl = "https://va-freelance-hub-web.vercel.app/api/health";
  const hRes = await fetch(healthUrl, { method: "HEAD" });
  console.log(`\n  Vercel Health Cache-Control: ${hRes.headers.get("cache-control")}`);
  console.log(`  Vercel Health X-Cache: ${hRes.headers.get("x-vercel-cache") || "N/A"}`);
} catch (e: any) {
  console.error("DELIVERY_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
