import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";

  const jobName = process.argv[2] || "lake-publish-job";

  const res = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.ok) {
    const job = await res.json();
    console.log(JSON.stringify(job, null, 2));
  } else {
    console.error("Error:", res.status, await res.text());
  }
}

main().catch(console.error);
