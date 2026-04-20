import { db } from '../packages/db';
import { logs } from '../packages/db/schema';
import { sql, desc } from 'drizzle-orm';

async function check() {
  const chefLogs = await db.select().from(logs).where(sql`message LIKE '%CHEF%' OR message LIKE '%Kitchen%'`).orderBy(desc(logs.timestamp)).limit(20);
  console.log("\n--- LATEST CHEF LOGS ---");
  chefLogs.forEach(l => {
    console.log(`[${l.timestamp.toISOString()}] [${l.level}] ${l.message}`);
  });
}

check().catch(console.error);
