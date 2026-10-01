import { getGcpAccessToken } from "./auth";

async function inspectBuild(buildId = process.argv[2] || "12fe215c-0988-4f7c-9b25-b0287ca093f9") {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";

  console.log(`Querying Cloud Build API for build ${buildId}...`);
  const url = `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds/${buildId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("HTTP error:", res.status, await res.text());
    return;
  }

  const build = await res.json();
  console.log("Status:", build.status);
  console.log("Status Detail:", build.statusDetail);
  console.log("Failure Info:", JSON.stringify(build.failureInfo, null, 2));

  if (build.logUrl) {
    console.log("Log URL:", build.logUrl);
  }

  // Also query Google Cloud Storage for the build log if logsBucket is present
  if (build.logsBucket) {
    const bucketName = build.logsBucket.replace("gs://", "").split("/")[0];
    const logPath = `log-${buildId}.txt`;
    console.log(`Attempting to read log from bucket ${bucketName}/${logPath}...`);
    const storageUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(logPath)}?alt=media`;
    const logRes = await fetch(storageUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (logRes.ok) {
      const logText = await logRes.text();
      console.log("\n=== BUILD LOG CONTENT ===");
      console.log(logText.slice(-3000)); // Last 3000 chars
    } else {
      console.log("Could not fetch log directly from storage:", logRes.status);
    }
  }
}

inspectBuild().catch(console.error);
