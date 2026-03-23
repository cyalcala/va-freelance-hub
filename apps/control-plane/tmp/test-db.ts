import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function test() {
  try {
    const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables found:", res.rows.map(r => r.name));
  } catch (err: any) {
    console.error("Test failed:", err.message);
  } finally {
    client.close();
  }
}

test();
