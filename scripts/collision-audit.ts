import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== COLLISION AUDIT (Signal Swallowing) ===");
    
    // Find cases where multiple different URLs have been merged into the same title
    // In our current system, we only keep the LATEST URL for a title.
    // So we can only see this by checking the harvest results history (not available in DB)
    // OR by checking if we have multiple items with the same Fingerprint in the 'items' batch.

    // Let's check the current DB content distribution
    const res = await client.execute(`
      SELECT title, company, COUNT(DISTINCT source_url) as url_variants, COUNT(*) as c
      FROM opportunities
      GROUP BY title, company
      HAVING c > 1
      LIMIT 10
    `);
    console.log("Existing Multi-Records (Should be 0 if UNIQUE index is working):", res.rows.length);

    // Let's check if we have any very similar titles
    const similar = await client.execute(`
      SELECT a.title, b.title, a.company
      FROM opportunities a
      JOIN opportunities b ON a.company = b.company 
        AND a.id < b.id
        AND a.title LIKE '%' || b.title || '%'
      LIMIT 10
    `);
    console.log("Similar Titles (Potential Collisions):");
    console.table(similar.rows);

  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    client.close();
  }
}
run();
