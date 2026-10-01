import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";

  const logFilter = `resource.type="cloud_run_job" AND resource.labels.job_name="lake-publish-job"`;
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
      orderBy: "timestamp desc",
      pageSize: 50,
    }),
  });

  if (logRes.ok) {
    const data = await logRes.json();
    console.log(`Found ${(data.entries || []).length} log entries:`);
    for (const e of (data.entries || []).reverse()) {
      console.log(`[${e.timestamp}] [${e.severity || "DEFAULT"}] ${e.textPayload || JSON.stringify(e.jsonPayload)}`);
    }
  } else {
    console.error("Error:", logRes.status, await logRes.text());
  }
}

main().catch(console.error);
