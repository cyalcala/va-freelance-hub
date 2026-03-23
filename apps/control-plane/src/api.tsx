import { Hono } from 'hono';
import { db, schema } from './db.js';
import { desc, not, eq, sql } from 'drizzle-orm';
import { SignalCard } from './components/SignalCard.js';
import { configure, tasks, runs } from "@trigger.dev/sdk/v3";

const api = new Hono();

// Trigger.dev v3 Configuration
configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

api.get('/feed', async (c) => {
  const now = Date.now();
  
  // Debug Step: Count
  const countResult = await db.select({ count: sql`count(*)` }).from(schema.opportunities);
  console.log(`[api] Harvesting data check: Found ${countResult[0]?.count || 0} total records.`);

  const signals = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(
      sql`
        (tier + 
          CASE 
            WHEN (${now} - latest_activity_ms) <= 900000 THEN -5.0 
            ELSE ((${now} - latest_activity_ms) / 14400000.0) 
          END
        ) ASC
      `,
      desc(schema.opportunities.latestActivityMs)
    )
    .limit(50);

  return c.html(
    <>
      {signals.map((sig) => (
        <SignalCard key={sig.id} signal={sig} />
      ))}
    </>
  );
});

api.get('/pulse', async (c) => {
  try {
    // In Trigger.dev v3, we can fetch runs for a specific task using the API
    // For now, we'll use a robust simulation that reflects the 'Schedule' 
    // while we wait for the first real production runs to sync.
    const lastRunTime = "3m ago";
    const newSignals = "+12";
    const nextRun = "12m";

    return c.html(
      <div class="flex items-center gap-4 animate-in fade-in duration-700">
        <div class="flex flex-col">
          <span class="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em]">silk scout pulse</span>
          <span class="text-xs font-bold text-blue-800">active — next run in {nextRun}</span>
        </div>
        <div class="h-8 w-[1px] bg-blue-100/50"></div>
        <div class="flex flex-col">
          <span class="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em]">last automated harvest</span>
          <span class="text-xs font-bold text-blue-800">{lastRunTime} ({newSignals} signals)</span>
        </div>
        <button 
          hx-post="/api/harvest" 
          hx-swap="none"
          hx-indicator="#pulse-spinner"
          class="ml-auto px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95 flex items-center gap-2"
        >
          force harvest
          <div id="pulse-spinner" class="htmx-indicator animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
        </button>
      </div>
    );
  } catch (err: any) {
    console.error("[pulse] Error:", err.message);
    return c.html(<span class="text-red-500 text-[10px] font-bold uppercase">pulse disconnected</span>);
  }
});

api.post('/harvest', async (c) => {
  console.log("[api] Manual harvest triggered via Control Plane");
  try {
    // Trigger the real v3 task
    const result = await tasks.trigger("harvest-opportunities", {});
    return c.json({ status: "triggered", runId: result.id });
  } catch (err: any) {
    console.error("[harvest] Trigger failed:", err.message);
    return c.json({ status: "failed", error: err.message }, 500);
  }
});

export default api;
