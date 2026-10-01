import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const jobName = process.argv[2] || "lake-publish-job";

  const res = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}/executions`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    console.error("HTTP error:", res.status, await res.text());
    return;
  }

  const data = (await res.json()) as any;
  console.log(`Found ${data.executions?.length || 0} executions for ${jobName}`);
  for (const exec of (data.executions || []).slice(0, 5)) {
    const id = exec.name.split("/").pop();
    const cond = (exec.conditions || []).find((c: any) => c.type === "Completed") || {};
    console.log(`- ${id} | status: ${exec.completionStatus || cond.state || "RUNNING"} | createTime: ${exec.createTime} | completionTime: ${exec.completionTime || "running"}`);
  }
}

main().catch(console.error);
