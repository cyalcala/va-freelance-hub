import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    const [total, active, gold, silver, bronze, newest, last1hr] = await Promise.all([
      client.execute("SELECT COUNT(*) as c FROM opportunities"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 1 AND is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 2 AND is_active = 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 3 AND is_active = 1"),
      client.execute("SELECT scraped_at FROM opportunities ORDER BY scraped_at DESC LIMIT 1"),
      client.execute("SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-1 hour')")
    ]);

    console.log("=== TURSO STATE ===");
    console.log("TOTAL:", (total.rows[0] as any).c);
    console.log("ACTIVE:", (active.rows[0] as any).c);
    console.log("GOLD:", (gold.rows[0] as any).c);
    console.log("SILVER:", (silver.rows[0] as any).c);
    console.log("BRONZE:", (bronze.rows[0] as any).c);
    const newestTs = (newest.rows[0] as any)?.scraped_at;
    console.log("NEWEST:", newestTs ? new Date(newestTs * 1000).toISOString() : "N/A");
    console.log("WRITTEN_LAST_1HR:", (last1hr.rows[0] as any).c);

    console.log("\n=== TRIGGER.DEV TASKS ===");
    const key = process.env.TRIGGER_SECRET_KEY;
    const tasksRes = await fetch("https://api.trigger.dev/api/v1/tasks", {
      headers: { "Authorization": `Bearer ${key}` }
    });
    const rawTasks = await tasksRes.text();
    try {
      const tasksData = JSON.parse(rawTasks);
      console.log(JSON.stringify(tasksData.data?.map((t: any) => ({
        slug: t.slug,
        version: t.currentVersion,
        active: t.active
      })), null, 2));
    } catch (e) {
      console.error("TASKS_PARSE_FAIL:", e.message);
      console.log("RAW_TASKS:", rawTasks.substring(0, 500));
    }

    console.log("\n=== RECENT RUNS ===");
    const runsRes = await fetch("https://api.trigger.dev/api/v1/runs?limit=5", {
      headers: { "Authorization": `Bearer ${key}` }
    });
    const rawRuns = await runsRes.text();
    try {
      const runsData = JSON.parse(rawRuns);
      console.log(JSON.stringify(runsData.data?.map((r: any) => ({
        task: r.taskIdentifier,
        status: r.status,
        createdAt: r.createdAt
      })), null, 2));
    } catch (e) {
      console.error("RUNS_PARSE_FAIL:", e.message);
      console.log("RAW_RUNS:", rawRuns.substring(0, 500));
    }

    console.log("\n=== VERCEL HEALTH ===");
    const healthRes = await fetch("https://va-freelance-hub-web.vercel.app/api/health");
    const healthData = await healthRes.json();
    console.log(JSON.stringify(healthData, null, 2));

  } catch (e: any) {
    console.error("CAPTURE_FAIL:", e.message);
  } finally {
    client.close();
  }
}

run();
