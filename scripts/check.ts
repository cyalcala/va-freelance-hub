import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const opps = await client.execute("SELECT COUNT(*) as c FROM opportunities");
const dir = await client.execute("SELECT COUNT(*) as c FROM va_directory");
const digests = await client.execute("SELECT COUNT(*) as c FROM content_digests");

console.log("✓ Turso connection OK");
console.log(`  opportunities:    ${opps.rows[0].c} rows`);
console.log(`  va_directory:     ${dir.rows[0].c} rows`);
console.log(`  content_digests:  ${digests.rows[0].c} rows`);

client.close();
