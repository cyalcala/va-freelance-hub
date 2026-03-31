import { db, schema } from "./index";
import { sql, eq } from 'drizzle-orm';

async function verify() {
    try {
        const stats = await db.select({
          total: sql<number>`count(*)`,
          maxActivity: sql<number>`max(latest_activity_ms)`,
          maxScraped: sql<number>`max(scraped_at)`,
          maxLastSeen: sql<number>`max(last_seen_at)`,
        }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

        const { total, maxActivity, maxScraped, maxLastSeen } = stats[0];
        
        console.log("--- DB VITALS ---");
        console.log(`Total Active: ${total}`);
        console.log(`Max Activity (ms): ${maxActivity} -> ${new Date(maxActivity).toISOString()}`);
        console.log(`Max Scraped (ms/s): ${maxScraped} -> ${new Date(maxScraped).toISOString()}`);
        console.log(`Max Last Seen (ms/s): ${maxLastSeen} -> ${new Date(maxLastSeen).toISOString()}`);
        
        const now = Date.now();
        console.log(`Current Time: ${now} -> ${new Date(now).toISOString()}`);
        
        const staleness = (now - Math.max(maxActivity, maxScraped)) / (1000 * 60 * 60);
        console.log(`Calculated Staleness: ${staleness.toFixed(2)} hours`);
        
        if (staleness < 2) {
            console.log("✅ RESULT: SYSTEM SHOULD BE HEALTHY");
        } else {
            console.log("❌ RESULT: SYSTEM STILL STALE");
        }

    } catch (err: any) {
        console.error("Verification failed:", err.message);
    } finally {
        // client.close() is handled if we had a reference, but here we use index.ts
    }
}

verify();
