import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
async function check() {
try {
  const res = await client.execute(
    `SELECT id, title, source_platform as source, scraped_at
     FROM opportunities
     WHERE tier = 1 AND is_active = 1
     ORDER BY scraped_at DESC LIMIT 10`
  );
  console.log("GOLD_SAMPLES:", JSON.stringify(res.rows));
} catch(e: any) {
  console.error("FAIL:", e.message);
} finally { client.close(); }
}
check();
