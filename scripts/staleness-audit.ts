import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== STALENESS MANAGEMENT AUDIT (Heartbeat Density) ===");
    
    // Group active listings by 15-minute windows of age
    const res = await client.execute(`
      SELECT 
        (unixepoch() - scraped_at) / 60 as mins_ago,
        COUNT(*) as count
      FROM opportunities 
      WHERE is_active = 1 
      GROUP BY mins_ago / 15 
      ORDER BY mins_ago ASC 
      LIMIT 10
    `);

    console.log("Heartbeat Density Distribution:");
    const tableData = res.rows.map(r => ({
      "Age (Mins)": Number(r.mins_ago),
      "Listing Count": Number(r.count),
      "Status": Number(r.mins_ago) < 60 ? "✅ FRESH" : "⚠️ AGING"
    }));
    console.table(tableData);

    const globalMax = await client.execute("SELECT datetime(MAX(scraped_at), 'unixepoch') as last_write FROM opportunities");
    console.log(`\nLATEST SYSTEM HEARTBEAT: ${globalMax.rows[0].last_write} UTC`);
    
    const count30 = await client.execute("SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-30 minutes')");
    console.log(`WRITES IN LAST 30 MINS: ${count30.rows[0].c}`);

  } catch (e: any) {
    console.error("AUDIT FAILED:", e.message);
  } finally {
    client.close();
  }
}
run();
