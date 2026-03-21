async function run() {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) throw new Error("TRIGGER_SECRET_KEY missing");

  const headers = { "Authorization": `Bearer ${secretKey}` };

  console.log("=== REGISTERED TASKS ===");
  const tasksRes = await fetch("https://api.trigger.dev/api/v3/tasks", { headers });
  const tasks = await tasksRes.json();
  console.log(JSON.stringify(tasks.data?.map((t: any) => ({
    slug: t.slug,
    version: t.currentVersion,
    active: t.active
  })), null, 2));

  console.log("\n=== ALL SCHEDULES ===");
  const schedulesRes = await fetch("https://api.trigger.dev/api/v3/schedules", { headers });
  const schedules = await schedulesRes.json();
  console.log(JSON.stringify(schedules.data?.map((s: any) => ({
    id: s.id,
    task: s.task.identifier,
    cron: s.cron,
    active: s.active,
    nextRun: s.nextRun,
    lastRun: s.lastRun
  })), null, 2));

  console.log("\n=== LAST 20 RUNS ===");
  const runsRes = await fetch("https://api.trigger.dev/api/v3/runs?limit=20", { headers });
  const runs = await runsRes.json();
  
  const groupedTasks: Record<string, any[]> = {};
  runs.data?.forEach((run: any) => {
    if (!groupedTasks[run.taskIdentifier]) groupedTasks[run.taskIdentifier] = [];
    groupedTasks[run.taskIdentifier].push(run);
  });

  const report = Object.entries(groupedTasks).map(([task, runs]) => {
    const sorted = runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const last = sorted[0];
    return {
      task,
      total: runs.length,
      green: runs.filter(r => r.status === "COMPLETED").length,
      red: runs.filter(r => ["FAILED", "CRASHED"].includes(r.status)).length,
      lastRun: last.createdAt,
      lastStatus: last.status,
      lastVersion: last.version
    };
  });
  console.log(JSON.stringify(report, null, 2));
}
run().catch(console.error);
