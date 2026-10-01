import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";

  console.log("=== GCP STATUS REPORT ===");
  console.log(`Project: ${projectId} | Region: ${region}\n`);

  // 1. Secrets
  console.log("--- Secret Manager ---");
  const secretsRes = await fetch(
    `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (secretsRes.ok) {
    const data = await secretsRes.json();
    const secretNames = (data.secrets || []).map((s: any) => s.name.split("/").pop());
    console.log("Found secrets:", secretNames);
  } else {
    console.log("Failed to list secrets:", secretsRes.status, await secretsRes.text());
  }

  // 2. Cloud Run Jobs
  console.log("\n--- Cloud Run Jobs ---");
  const jobsRes = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (jobsRes.ok) {
    const data = await jobsRes.json();
    const jobList = (data.jobs || []).map((j: any) => ({
      name: j.name.split("/").pop(),
      image: j.template?.template?.containers?.[0]?.image,
      lastExecution: j.latestCreatedExecution?.name?.split("/").pop(),
    }));
    console.log("Cloud Run Jobs:", JSON.stringify(jobList, null, 2));
  } else {
    console.log("Failed to list jobs:", jobsRes.status, await jobsRes.text());
  }

  // 3. Cloud Scheduler Jobs
  console.log("\n--- Cloud Scheduler Jobs ---");
  const schedRes = await fetch(
    `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${region}/jobs`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (schedRes.ok) {
    const data = await schedRes.json();
    const schedList = (data.jobs || []).map((j: any) => ({
      name: j.name.split("/").pop(),
      schedule: j.schedule,
      state: j.state,
      targetUri: j.httpTarget?.uri,
    }));
    console.log("Cloud Scheduler Jobs:", JSON.stringify(schedList, null, 2));
  } else {
    console.log("Failed to list scheduler jobs:", schedRes.status, await schedRes.text());
  }
}

main().catch(console.error);
