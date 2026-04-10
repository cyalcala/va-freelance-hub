import { db } from "../packages/db/client";
import { vitals } from "../packages/db/schema";

async function checkVitals() {
  const records = await db.select().from(vitals);
  if (records.length === 0) {
    console.log("No vitals records found.");
    return;
  }

  console.log(`═══ VITALS AUDIT (${records.length} records) ═══`);
  for (const record of records) {
    console.log(`\nID:                 ${record.id}`);
    console.log(`Region:             ${record.region || "N/A"}`);
    console.log(`Trigger Credits:    ${record.triggerCreditsOk ? "OK ✅" : "EXHAUSTED ❌"}`);
    console.log(`Last Ingestion:     ${record.lastIngestionHeartbeatMs ? new Date(Number(record.lastIngestionHeartbeatMs)).toISOString() : "N/A"}`);
    console.log(`Last Processing:    ${record.lastProcessingHeartbeatMs ? new Date(Number(record.lastProcessingHeartbeatMs)).toISOString() : "N/A"}`);
    console.log(`Heartbeat Source:   ${record.heartbeatSource || "N/A"}`);
  }
}

checkVitals().catch(console.error);
