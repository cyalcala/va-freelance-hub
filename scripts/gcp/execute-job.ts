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
  const operationName = runData.name;
  console.log(`Operation triggered: ${operationName}`);

  // Resolve the actual execution URI from Operation metadata or Job resource
  let executionUri = runData.metadata?.name || "";
  let executionId = executionUri ? executionUri.split("/").pop() : "";

  if (!executionUri) {
    console.log("Resolving execution URI from job...");
    await new Promise((r) => setTimeout(r, 2000));
    const jobRes = await fetch(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (jobRes.ok) {
      const jobData = (await jobRes.json()) as any;
      executionUri = jobData.latestCreatedExecution?.name || "";
      executionId = executionUri ? executionUri.split("/").pop() : "";
    }
  }

  console.log(`Execution started! ID: ${executionId || "resolving..."}`);
  if (executionUri) console.log(`Execution URI: ${executionUri}`);

  console.log("\nPolling execution status...");
  let done = false;
  let status = "PENDING";
  const startTime = Date.now();
  const maxTimeoutMs = 5 * 60 * 1000; // 5 minutes max timeout

  while (!done) {
    if (Date.now() - startTime > maxTimeoutMs) {
      throw new Error(`Execution polling timed out after 5 minutes.`);
    }

    await new Promise((r) => setTimeout(r, 3000));
    const pollToken = await getGcpAccessToken();

    // 1. Poll the Operation first (guaranteed valid endpoint)
    const opRes = await fetch(`https://run.googleapis.com/v2/${operationName}`, {
      headers: { Authorization: `Bearer ${pollToken}` },
    });

    if (opRes.ok) {
      const opData = (await opRes.json()) as any;
      if (!executionUri && opData.metadata?.name) {
        executionUri = opData.metadata.name;
        executionId = executionUri.split("/").pop();
      }

      if (opData.done) {
        done = true;
        if (opData.error) {
          throw new Error(`Operation failed: ${opData.error.message || JSON.stringify(opData.error)}`);
        }
        console.log(`\n\nOperation completed successfully!`);
        break;
      }
    }

    // 2. Poll the execution directly if URI is known for fine-grained conditions
    if (executionUri) {
      const execRes = await fetch(`https://run.googleapis.com/v2/${executionUri}`, {
        headers: { Authorization: `Bearer ${pollToken}` },
      });
      if (execRes.ok) {
        const execData = (await execRes.json()) as any;
        const cond = (execData.conditions || []).find((c: any) => c.type === "Completed") || {};
        status = cond.state || execData.completionStatus || "RUNNING";
        process.stdout.write(`Status: ${status} (${cond.message || cond.type || "Running"})\r`);

        if (status === "CONDITION_SUCCEEDED" || status === "CONDITION_FAILED" || execData.completionTime) {
          done = true;
          console.log(`\n\nExecution finished with state: ${status}`);
          break;
        }
      }
    }
  }

  // Query Cloud Logging for container logs once execution finishes
  if (executionId) {
    console.log("\n=== CLOUD LOGGING LOG ENTRIES ===");
    const pollToken = await getGcpAccessToken();
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
      if (entries.length === 0) {
        console.log("(Logs will appear in Cloud Logging shortly)");
      }
      for (const entry of entries) {
        const text = entry.textPayload || JSON.stringify(entry.jsonPayload);
        console.log(`[${entry.timestamp}] ${text}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
