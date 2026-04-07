import { client } from "../packages/db/client";

/**
 * 🏥 TURSO DATA HEALER v1.4 (NUCLEAR MODE)
 * 
 * Goal: Force-sync all 6 existing opportunities to the current timestamp
 * to guarantee they appear as "Live" on the frontend.
 */

async function heal() {
  console.log("🛠️ [HEALER] Starting Nuclear Data Sync...");

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  try {
    const result = await client.execute({
        sql: "UPDATE opportunities SET scraped_at = ?, latest_activity_ms = ?, is_active = 1, tier = 1 WHERE tier != 4",
        args: [nowIso, nowMs]
    });
    console.log(`✅ Force-synced ${result.rowsAffected} records to current time.`);

    const check = await client.execute("SELECT id, title, scraped_at FROM opportunities LIMIT 5");
    console.log("📊 Post-Heal Verification:", JSON.stringify(check.rows, null, 2));

  } catch (err: any) {
    console.error("🔴 [HEALER] NUCLEAR FAILURE:", err.message);
  }
}

heal();
