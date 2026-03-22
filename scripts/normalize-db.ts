import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== DATABASE NORMALIZATION (Casing Alignment) ===");
    
    // 1. Lowercase and trim all existing titles and companies
    console.log("Unifying casing for unique index alignment...");
    const res = await client.execute("UPDATE opportunities SET title = lower(trim(title)), company = lower(trim(company))");
    console.log("Rows normalized:", res.rowsAffected);

    // 2. Identify any newly created duplicates after normalization
    console.log("Checking for post-normalization duplicates...");
    const dups = await client.execute(`
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY title, company ORDER BY scraped_at DESC) as rn 
        FROM opportunities
      ) WHERE rn > 1
    `);
    
    if (dups.rows.length > 0) {
      console.log(`Purging ${dups.rows.length} new duplicates...`);
      await client.execute(`
        DELETE FROM opportunities 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY title, company ORDER BY scraped_at DESC) as rn 
            FROM opportunities
          ) WHERE rn > 1
        )
      `);
    }

    console.log("DATABASE ALIGNED.");

  } catch (e: any) {
    console.error("NORMALIZATION FAILED:", e.message);
  } finally {
    client.close();
  }
}
run();
