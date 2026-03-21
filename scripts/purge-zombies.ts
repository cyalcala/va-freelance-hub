import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== STARTING ZOMBIE PURGE ===");
    
    // 1. Identify duplicates to keep (the newest one for each title|company)
    // 2. Delete everything else.
    // SQLite doesn't support complex joins in DELETE easily, so we use a subquery.
    
    const res = await client.execute(`
      DELETE FROM opportunities 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY title, company ORDER BY scraped_at DESC, posted_at DESC) as rn
          FROM opportunities
          WHERE is_active = 1
        ) WHERE rn = 1
      )
      AND is_active = 1
    `);
    
    console.log("PURGE COMPLETE.");
    console.log("Changes:", res.rowsAffected);
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    client.close();
  }
}
run();
