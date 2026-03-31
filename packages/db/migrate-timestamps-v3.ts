import { createDb } from "./client";
import { opportunities } from "./schema";
import { sql } from "drizzle-orm";

async function migrate() {
    const { db, client } = createDb();
    try {
        console.log("🚀 Starting Titanic Timestamp Migration (s -> ms)...");
        
        const columns = ['scraped_at', 'posted_at', 'created_at', 'last_seen_at', 'latest_activity_ms'];
        
        for (const col of columns) {
            console.log(`- Auditing column: ${col}`);
            try {
                // Use raw SQL with CAST just in case types are loose in SQLite
                const result = await db.run(sql.raw(`
                    UPDATE opportunities 
                    SET ${col} = CAST(${col} AS INTEGER) * 1000 
                    WHERE ${col} IS NOT NULL AND ${col} > 0 AND ${col} < 10000000000
                `));
                console.log(`  Done. Rows affected: ${result.rowsAffected}`);
            } catch (colErr: any) {
                console.error(`  Failed on column ${col}:`, colErr.message);
            }
        }

        console.log("✅ Migration complete. All timestamps are now in milliseconds.");
    } catch (err: any) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        client.close();
    }
}

migrate();
