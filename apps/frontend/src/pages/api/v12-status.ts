export const prerender = false;
import { db, schema } from '@va-hub/db/client';
import { eq, sql } from 'drizzle-orm';


export const GET = async () => {
  let latestHeartbeat = 0;
  
  try {
    const [vitals] = await db.select().from(schema.vitals).where(eq(schema.vitals.id, 'GLOBAL')).limit(1);
    latestHeartbeat = vitals?.lastIngestionHeartbeatMs || 0;
  } catch (err) {
    console.error("Failed to fetch heartbeat for status API:", err);
  }

  return new Response(
    JSON.stringify({ 
      status: "online", 
      v12: true, 
      timestamp: new Date().toISOString(),
      latestHeartbeat,
      engine: "SRE-V12-TITANIUM"
    }), 
    {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    }
  );
};
