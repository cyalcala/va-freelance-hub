import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== SURGICAL FIX v3 (Warden Protocol) ===");
    
    // 1. Backfill NULL Tiers (Restores visibility)
    console.log("Backfilling NULL Tiers to 3 (Bronze)...");
    const res1 = await client.execute("UPDATE opportunities SET tier = 3 WHERE tier IS NULL");
    console.log("Rows updated:", res1.rowsAffected);

    // 2. Backfill NULL Companies (Activates Unique Index)
    console.log("Backfilling NULL Companies to 'Generic'...");
    const res2 = await client.execute("UPDATE opportunities SET company = 'Generic' WHERE company IS NULL");
    console.log("Rows updated:", res2.rowsAffected);

    // 3. Purge Residual Semantic Duplicates
    console.log("Purging residual semantic duplicates...");
    const res3 = await client.execute(`
      DELETE FROM opportunities 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY title, company ORDER BY scraped_at DESC) as rn 
          FROM opportunities
        ) WHERE rn > 1
      )
    `);
    console.log("Duplicates purged:", res3.rowsAffected);

    // 4. Verify Baseline Post-Fix
    const audit = await client.execute(`
      SELECT 
        (SELECT COUNT(*) FROM opportunities WHERE is_active = 1) as active,
        (SELECT COUNT(*) FROM opportunities WHERE tier = 1 AND is_active = 1) as gold
    `);
    console.log("FINAL STATE:", JSON.stringify(audit.rows[0], null, 2));

  } catch (e: any) {
    console.error("FIX FAILED:", e.message);
  } finally {
    client.close();
  }
}
run();
