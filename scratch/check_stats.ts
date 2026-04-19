import { db } from '../packages/db';
import { opportunities } from '../packages/db/schema';
import { sql } from 'drizzle-orm';

async function check() {
  console.log("\n--- OPPORTUNITIES STATS ---");
  const totalResult = await db.run(sql`SELECT count(*) as n FROM opportunities`);
  const last24hResult = await db.run(sql`SELECT count(*) as n FROM opportunities WHERE scraped_at > (unixepoch('now', '-24 hours') * 1000)`);
  const activeResult = await db.run(sql`SELECT count(*) as n FROM opportunities WHERE is_active = 1`);
  
  console.log(`Total: ${totalResult.rows[0].n}`);
  console.log(`New (24h): ${last24hResult.rows[0].n}`);
  console.log(`Active: ${activeResult.rows[0].n}`);
}

check().catch(console.error);
