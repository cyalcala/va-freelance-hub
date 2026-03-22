import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const query = process.argv[2];
  try {
    const res = await client.execute(query);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    client.close();
  }
}

run();
