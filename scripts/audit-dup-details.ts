import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== SEMANTIC DUPLICATE DEEP DIVE ===");
    const res = await client.execute(`
      SELECT title, company, COUNT(*) as c 
      FROM opportunities 
      WHERE is_active = 1 
      GROUP BY title, company 
      HAVING c > 1 
      ORDER BY c DESC 
      LIMIT 20
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    client.close();
  }
}
run();
