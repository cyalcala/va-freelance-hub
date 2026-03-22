import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== SOURCE STAGNATION AUDIT ===");
    
    // Group active listings by source to see when they were last refreshed
    const res = await client.execute(`
      SELECT 
        source_platform, 
        COUNT(*) as count, 
        CAST((unixepoch() - MIN(scraped_at)) / 60 as INTEGER) as min_age_mins,
        CAST((unixepoch() - MAX(scraped_at)) / 60 as INTEGER) as max_age_mins
      FROM opportunities 
      WHERE is_active = 1 
      GROUP BY source_platform
      ORDER BY min_age_mins ASC
    `);

    console.log("Source Yield Map:");
    const tableData = res.rows.map(r => ({
      "Source": r.source_platform,
      "Count": Number(r.count),
      "Age (Newest)": Number(r.min_age_mins),
      "Age (Oldest)": Number(r.max_age_mins)
    }));
    console.table(tableData);

  } catch (e: any) {
    console.error("AUDIT FAILED:", e.message);
  } finally {
    client.close();
  }
}
run();
