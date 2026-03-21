import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== TITANIUM SYSTEM HEALTH AUDIT (Warden Protocol) ===");
    
    // 1. Database Listing Metrics
    const metrics = await client.execute(`
      SELECT 
        (SELECT COUNT(*) FROM opportunities WHERE is_active = 1) as active,
        (SELECT COUNT(*) FROM opportunities WHERE is_active = 1 AND tier = 1) as gold,
        (SELECT COUNT(*) FROM opportunities WHERE is_active = 1 AND tier = 2) as silver,
        (SELECT COUNT(*) FROM opportunities WHERE is_active = 1 AND tier = 3) as bronze,
        (SELECT COUNT(*) FROM opportunities) as total
    `);
    console.log("Listing Metrics:", JSON.stringify(metrics.rows[0], null, 2));

    // 2. Duplicate Check (Semantic)
    const dups = await client.execute(`
      SELECT title, company, COUNT(*) as c 
      FROM opportunities 
      WHERE is_active = 1 
      GROUP BY title, company 
      HAVING c > 1
    `);
    console.log("Semantic Duplicates Found:", dups.rows.length);

    // 3. System Health Watchdogs
    const health = await client.execute(`
      SELECT source_name, status, datetime(last_success, 'unixepoch') as last_success, error_message
      FROM system_health
      ORDER BY last_success DESC
    `);
    console.log("System Watchdogs Status:");
    console.table(health.rows);

    // 4. Source Platform Distribution
    const sources = await client.execute(`
      SELECT source_platform, COUNT(*) as c
      FROM opportunities
      WHERE is_active = 1
      GROUP BY source_platform
      ORDER BY c DESC
    `);
    console.log("Source Distribution (Active Only):");
    console.table(sources.rows);

    // 5. Staleness Check
    const staleness = await client.execute(`
      SELECT (unixepoch() - MAX(scraped_at)) / 3600.0 as stalenessHrs
      FROM opportunities
      WHERE is_active = 1
    `);
    console.log("Data Staleness:", staleness.rows[0].stalenessHrs, "hours ago");

  } catch (e: any) {
    console.error("AUDIT FAILED:", e.message);
  } finally {
    client.close();
  }
}
run();
