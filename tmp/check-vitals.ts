import { db, schema } from "../packages/db/client";
import { count, desc } from "drizzle-orm";

async function run() {
    const v = await db.select().from(schema.vitals).limit(1);
    console.table(v.map(v => ({ aiQuotaDate: v.aiQuotaDate, aiQuotaCount: v.aiQuotaCount })));
    
    // Check signals
    const signals = await db.select({ count: count() }).from(schema.opportunities).where(schema.opportunities.isActive);
    console.log("Active Signals: ", signals[0].count);
}
run();
