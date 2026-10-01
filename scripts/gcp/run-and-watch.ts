import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const jobName = "lake-publish-job";

  console.log(`=== 1. TRIGGERING EXECUTION OF ${jobName} ===`);
  const runUrl = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}:run`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!runRes.ok) {
    throw new Error(`Failed to trigger job: HTTP ${runRes.status} - ${await runRes.text()}`);
  }

  // Get the newly created execution name from the job
  console.log("Triggered. Fetching execution ID...");
  await new Promise((r) => setTimeout(r, 2000));

  const jobRes = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const jobData = await jobRes.json();
  const execName = jobData.latestCreatedExecution?.name;
  console.log(`Execution Name: ${execName}`);

  if (!execName) {
    throw new Error("Could not find latestCreatedExecution on job.");
  }

  console.log("\n=== 2. POLLING EXECUTION STATUS ===");
  let done = false;
  let lastState = "";

  while (!done) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollToken = await getGcpAccessToken();
    const pollRes = await fetch(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}/executions/${execName}`,
      { headers: { Authorization: `Bearer ${pollToken}` } }
    );
    if (!pollRes.ok) continue;

    const execData = (await pollRes.json()) as any;
    const cond = (execData.conditions || []).find((c: any) => c.type === "Completed") || {};
    const state = cond.state || execData.completionStatus || "RUNNING";

    if (state !== lastState) {
      console.log(`Status: ${state} (message: ${cond.message || "none"})`);
      lastState = state;
    }

    if (state === "CONDITION_SUCCEEDED" || state === "CONDITION_FAILED" || execData.completionTime) {
      done = true;
      console.log(`\nExecution finished! Completion status: ${execData.completionStatus}`);
      console.log("Conditions:", JSON.stringify(execData.conditions, null, 2));

      // Wait a moment for Cloud Logging to ingest logs
      console.log("\nWaiting 5s for Cloud Logging ingest...");
      await new Promise((r) => setTimeout(r, 5000));

      console.log("\n=== 3. FETCHING CONTAINER LOGS ===");
      const logFilter = `resource.type="cloud_run_job" AND resource.labels.job_name="${jobName}" AND labels."run.googleapis.com/execution_name"="${execName}"`;
      const loggingUrl = `https://logging.googleapis.com/v2/entries:list`;
      const logRes = await fetch(loggingUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pollToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceNames: [`projects/${projectId}`],
          filter: logFilter,
          orderBy: "timestamp asc",
          pageSize: 100,
        }),
      });

      if (logRes.ok) {
        const logData = (await logRes.json()) as any;
        const entries = logData.entries || [];
        console.log(`Retrieved ${entries.length} log entries:`);
        for (const entry of entries) {
          const text = entry.textPayload || JSON.stringify(entry.jsonPayload);
          console.log(`[${entry.timestamp}] ${text}`);
        }
      } else {
        console.warn("Failed to fetch logs:", logRes.status, await logRes.text());
      }

      if (cond.state === "CONDITION_SUCCEEDED" || execData.completionStatus === "EXECUTION_SUCCEEDED") {
        console.log("\n🎉 LIVE EXECUTION SUCCEEDED WITH ZERO ERRORS!");
      } else {
        throw new Error(`Execution failed with state: ${cond.state || execData.completionStatus}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
