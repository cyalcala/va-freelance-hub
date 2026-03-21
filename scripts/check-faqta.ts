import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
async function check() {
try {
  const res = await client.execute(
    `SELECT id, title, scraped_at FROM opportunities
     WHERE title LIKE '%FAQTA%'
     LIMIT 1`
  );
  console.log("FAQTA_RECORD:", JSON.stringify(res.rows[0]));
} catch(e: any) {
  console.error("FAIL:", e.message);
} finally { client.close(); }
}
check();
