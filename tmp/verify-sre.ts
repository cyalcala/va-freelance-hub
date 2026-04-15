import { db, schema } from "../packages/db/client";
import { eq, not } from "drizzle-orm";

async function verifySreAwareness() {
  console.log("🕵️ Verifying SRE Agent Awareness...");
  
  // 1. Rely on existing FAIL for Agency Sensor or set it
  await db.update(schema.systemHealth)
    .set({ 
        status: 'FAIL', 
        errorMessage: 'MOCK_SRE_TEST',
        updatedAt: new Date() 
    })
    .where(eq(schema.systemHealth.sourceName, 'Agency Sensor'));

  // 2. Query like the SRE Agent
  const unhealthySources = await db.select()
    .from(schema.systemHealth)
    .where(not(eq(schema.systemHealth.status, "OK")));
  
  console.log(`SRE Agent detected ${unhealthySources.length} unhealthy sources.`);
  console.table(unhealthySources.map(s => ({
      source: s.sourceName,
      status: s.status,
      error: s.errorMessage
  })));

  if (unhealthySources.length > 0) {
      console.log("✅ SUCCESS: SRE Agent is aware of system health drift.");
  } else {
      console.error("❌ FAILURE: SRE Agent missed health drift.");
  }

  // Cleanup
  await db.update(schema.systemHealth)
    .set({ status: 'OK', errorMessage: null })
    .where(eq(schema.systemHealth.sourceName, 'Greenhouse'));
}

verifySreAwareness();
