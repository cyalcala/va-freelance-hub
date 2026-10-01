import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const jobName = process.argv[2] || "lake-publish-job";

  console.log(`=== TRIGGERING LIVE EXECUTION OF ${jobName} ===`);
  const runUrl = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}:run`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!runRes.ok) {
    throw new Error(`Failed to trigger job run: HTTP ${runRes.status} - ${await runRes.text()}`);
  }

  const runData = (await runRes.json()) as any;
  const executionName = runData.name;
  const executionId = executionName.split("/").pop();
  console.log(`Execution started! ID: ${executionId}`);
  console.log(`URI: ${executionName}`);

  console.log("\nPolling execution status...");
  let done = false;
  let status = "PENDING";

  while (!done) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollToken = await getGcpAccessToken();
    const pollRes = await fetch(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}/executions/${executionId}`,
      { headers: { Authorization: `Bearer ${pollToken}` } }
    );
    if (!pollRes.ok) {
      console.warn(`Polling error: ${pollRes.status}`);
      continue;
    }
    const execData = (await pollRes.json()) as any;
    const cond = execData.terminalCondition || {};
    status = cond.state || "RUNNING";
    process.stdout.write(`Status: ${status} (${cond.type || "Running"})\r`);

    if (cond.state === "CONDITION_SUCCEEDED" || cond.state === "CONDITION_FAILED") {
      done = true;
      console.log(`\n\nExecution finished with state: ${cond.state}`);
      console.log("Completion Status:", execData.completionStatus);
      if (cond.message) {
        console.log("Message:", cond.message);
      }

      // Query Cloud Logging for container logs
      console.log("\n=== CLOUD LOGGING LOG ENTRIES ===");
      const logFilter = `resource.type="cloud_run_job" AND resource.labels.job_name="${jobName}" AND labels."run.googleapis.com/execution_name"="${executionId}"`;
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
        for (const entry of entries) {
          const text = entry.textPayload || JSON.stringify(entry.jsonPayload);
          console.log(`[${entry.timestamp}] ${text}`);
        }
      } else {
        console.log("Could not query logging API:", logRes.status, await logRes.text());
      }

      if (cond.state !== "CONDITION_SUCCEEDED") {
        throw new Error(`Job execution failed: ${cond.message || "Unknown error"}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
