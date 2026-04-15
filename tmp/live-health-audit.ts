import { db, schema } from "../packages/db/client";
import { count, desc, eq } from "drizzle-orm";

async function verifyAutonomy() {
    console.log("=== SOVEREIGN SRE HEALTH CHECK ===");
    
    // 1. Check AI Quota Context (Vitals)
    console.log("\n[1] Checking Vitals & Free-Tier Constraints...");
    const vitalsInfo = await db.select().from(schema.vitals).limit(1);
    console.table(vitalsInfo);

    // 2. Check recent Autonomous Decisions
    console.log("\n[2] Checking Recent Autonomous SRE Decisions (Last 3)...");
    const notes = await db.select()
        .from(schema.noteslog)
        .orderBy(desc(schema.noteslog.timestamp))
        .limit(3);
    
    console.table(notes.map(n => ({
        timestamp: new Date(n.timestamp).toISOString(),
        status: n.status,
        actions: n.actionsTaken,
        drift: `${n.driftMinutes}m`
    })));

    // 3. Print system health overview
    console.log("\n[3] Current Source System Health...");
    const health = await db.select().from(schema.systemHealth);
    
    console.table(health.map(h => ({
        source: h.sourceName,
        status: h.status,
        consecFails: h.consecutiveFailures,
        lastSuccess: h.lastSuccess ? new Date(h.lastSuccess).toISOString() : "Never",
        error: h.errorMessage ? h.errorMessage : "None"
    })));
}

verifyAutonomy();
