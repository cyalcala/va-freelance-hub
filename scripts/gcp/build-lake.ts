import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getGcpAccessToken } from "./auth";

async function main() {
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const bucketName = `${projectId}_cloudbuild`;
  const timestamp = Date.now();
  const tarName = `lake-publish-${timestamp}.tgz`;
  const storageObject = `source/${tarName}`;
  const localTarPath = path.resolve(process.cwd(), "tmp_build.tgz");

  console.log("=== 1. CREATING REPOSITORY SLICE ARCHIVE ===");
  // Create tarball containing files needed for the Docker build without local node_modules
  const tarCmd = `tar --exclude="node_modules" --exclude="*.test.ts" -czf "${localTarPath}" infra/gcp packages apps/web/wrangler.jsonc scripts/lake scripts/diagnostics scripts/gcp scripts/ci package.json`;
  console.log(`Running: ${tarCmd}`);
  execSync(tarCmd, { stdio: "inherit" });

  const stats = fs.statSync(localTarPath);
  console.log(`Created ${localTarPath} (${(stats.size / 1024).toFixed(1)} KB)`);

  console.log("\n=== 2. UPLOADING ARCHIVE TO GOOGLE CLOUD STORAGE ===");
  const token = await getGcpAccessToken();
  const tarBuffer = fs.readFileSync(localTarPath);

  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(
    storageObject
  )}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/gzip",
    },
    body: tarBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: HTTP ${uploadRes.status} - ${await uploadRes.text()}`);
  }
  console.log(`Successfully uploaded to gs://${bucketName}/${storageObject}`);

  // Cleanup local archive
  fs.unlinkSync(localTarPath);

  console.log("\n=== 3. SUBMITTING BUILD TO CLOUD BUILD API ===");
  const imageTag = `${region}-docker.pkg.dev/${projectId}/va-hub-runner/lake-publish:latest`;
  const buildPayload = {
    source: {
      storageSource: {
        bucket: bucketName,
        object: storageObject,
      },
    },
    steps: [
      {
        name: "gcr.io/cloud-builders/docker",
        args: [
          "build",
          "--progress=plain",
          "-t",
          imageTag,
          "-f",
          "infra/gcp/lake-publish/Dockerfile",
          ".",
        ],
      },
    ],
    images: [imageTag],
  };

  const createRes = await fetch(`https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPayload),
  });

  if (!createRes.ok) {
    throw new Error(`Cloud Build submission failed: HTTP ${createRes.status} - ${await createRes.text()}`);
  }

  const buildData = (await createRes.json()) as any;
  const buildId = buildData.metadata?.build?.id || buildData.id;
  console.log(`Cloud Build started! Build ID: ${buildId}`);
  console.log(`Logs URL: https://console.cloud.google.com/cloud-build/builds/${buildId}?project=${projectId}`);

  console.log("\n=== 4. POLLING BUILD PROGRESS ===");
  let completed = false;
  let status = "QUEUED";

  while (!completed) {
    await new Promise((r) => setTimeout(r, 4000));
    const pollToken = await getGcpAccessToken();
    const pollRes = await fetch(
      `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds/${buildId}`,
      { headers: { Authorization: `Bearer ${pollToken}` } }
    );
    if (!pollRes.ok) {
      console.warn(`Polling error: ${pollRes.status}`);
      continue;
    }
    const currentBuild = await pollRes.json();
    status = currentBuild.status;
    process.stdout.write(`Current status: ${status}\r`);

    if (["SUCCESS", "FAILURE", "INTERNAL_ERROR", "TIMEOUT", "CANCELLED"].includes(status)) {
      completed = true;
      console.log(`\nFinal Build Status: ${status}`);

      // Fetch build log from storage if available
      if (currentBuild.logsBucket) {
        const logBucket = currentBuild.logsBucket.replace("gs://", "").split("/")[0];
        const logPath = `log-${buildId}.txt`;
        const logUrl = `https://storage.googleapis.com/storage/v1/b/${logBucket}/o/${encodeURIComponent(
          logPath
        )}?alt=media`;
        const logRes = await fetch(logUrl, { headers: { Authorization: `Bearer ${pollToken}` } });
        if (logRes.ok) {
          const logContent = await logRes.text();
          console.log("\n=== CLOUD BUILD LOG OUTPUT ===");
          console.log(logContent);
        }
      }

      if (status !== "SUCCESS") {
        throw new Error(`Cloud Build failed with status: ${status}`);
      }
    }
  }

  console.log(`\n🎉 Image successfully built and pushed to: ${imageTag}`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
