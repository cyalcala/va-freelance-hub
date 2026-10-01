import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const jobName = "lake-publish-job";
  const execName = process.argv[2] || "lake-publish-job-dzg8f";

  console.log(`Querying execution ${execName}...`);
  const res = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}/executions/${execName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.ok) {
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("HTTP error:", res.status, await res.text());
  }

  // Fetch logs from Cloud Logging
  console.log("\n=== LOGS FROM CLOUD LOGGING ===");
  const logFilter = `resource.type="cloud_run_job" AND resource.labels.job_name="${jobName}" AND labels."run.googleapis.com/execution_name"="${execName}"`;
  const loggingUrl = `https://logging.googleapis.com/v2/entries:list`;
  const logRes = await fetch(loggingUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
    for (const entry of logData.entries || []) {
      const ts = entry.timestamp;
      const text = entry.textPayload || JSON.stringify(entry.jsonPayload);
      console.log(`[${ts}] ${text}`);
    }
  } else {
    console.log("Failed to query logs:", logRes.status, await logRes.text());
  }
}

main().catch(console.error);
