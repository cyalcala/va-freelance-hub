import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const jobName = "lake-publish-job";

  console.log("=== 1. VERIFYING SECRET MANAGER ACCESS ===");
  const secrets = [
    "va-hub-proxy-secret",
    "va-hub-turso-database-url",
    "va-hub-turso-auth-token",
    "va-hub-cloudflare-api-token",
    "va-hub-cloudflare-account-id",
  ];

  for (const s of secrets) {
    const res = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${s}/versions/latest:access`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.error(`❌ Cannot access secret ${s}: HTTP ${res.status}`);
      console.log("\nPlease run this command in Google Cloud Shell first:");
      console.log(`gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:va-hub-scheduler-invoker@${projectId}.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"`);
      process.exit(1);
    }
    console.log(`✓ Access verified for ${s}`);
  }

  console.log("\n=== 2. REFRESHING CLOUD RUN JOB READY STATE ===");
  const saEmail = `va-hub-scheduler-invoker@${projectId}.iam.gserviceaccount.com`;
  const imageTag = `${region}-docker.pkg.dev/${projectId}/va-hub-runner/lake-publish:latest`;
  const jobPayload = {
    template: {
      taskCount: 1,
      template: {
        containers: [
          {
            image: imageTag,
            env: [
              { name: "NODE_ENV", value: "production" },
              {
                name: "PROXY_SECRET",
                valueSource: {
                  secretKeyRef: { secret: "va-hub-proxy-secret", version: "latest" },
                },
              },
              {
                name: "TURSO_DATABASE_URL",
                valueSource: {
                  secretKeyRef: { secret: "va-hub-turso-database-url", version: "latest" },
                },
              },
              {
                name: "TURSO_AUTH_TOKEN",
                valueSource: {
                  secretKeyRef: { secret: "va-hub-turso-auth-token", version: "latest" },
                },
              },
              {
                name: "CLOUDFLARE_API_TOKEN",
                valueSource: {
                  secretKeyRef: { secret: "va-hub-cloudflare-api-token", version: "latest" },
                },
              },
              {
                name: "CLOUDFLARE_ACCOUNT_ID",
                valueSource: {
                  secretKeyRef: { secret: "va-hub-cloudflare-account-id", version: "latest" },
                },
              },
            ],
            resources: { limits: { cpu: "1", memory: "512Mi" } },
          },
        ],
        maxRetries: 1,
        timeout: "300s",
        serviceAccount: saEmail,
        executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
      },
    },
  };

  const updateRes = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jobPayload),
    }
  );

  if (!updateRes.ok) {
    throw new Error(`Job update failed: HTTP ${updateRes.status} - ${await updateRes.text()}`);
  }
  console.log("✓ Cloud Run Job specification refreshed!");

  // Wait for Ready status
  console.log("Waiting for Ready condition...");
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const checkRes = await fetch(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const jobData = await checkRes.json();
    const cond = jobData.terminalCondition || {};
    if (cond.state === "CONDITION_SUCCEEDED") {
      console.log("✓ Job Ready condition: CONDITION_SUCCEEDED!");
      break;
    }
    if (cond.state === "CONDITION_FAILED" && i === 9) {
      throw new Error(`Job failed to become ready: ${cond.message}`);
    }
  }

  console.log("\n=== 3. TRIGGERING LIVE EXECUTION ===");
  const runUrl = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}:run`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!runRes.ok) {
    throw new Error(`Execution trigger failed: HTTP ${runRes.status} - ${await runRes.text()}`);
  }

  const runData = (await runRes.json()) as any;
  const executionId = runData.name.split("/").pop();
  console.log(`Live execution started! ID: ${executionId}`);

  let done = false;
  while (!done) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}/executions/${executionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!pollRes.ok) continue;
    const execData = (await pollRes.json()) as any;
    const cond = execData.terminalCondition || {};
    process.stdout.write(`Execution status: ${cond.state || "RUNNING"}\r`);

    if (cond.state === "CONDITION_SUCCEEDED" || cond.state === "CONDITION_FAILED") {
      done = true;
      console.log(`\n\nFinal execution state: ${cond.state}`);

      // Query logs
      const logFilter = `resource.type="cloud_run_job" AND resource.labels.job_name="${jobName}" AND labels."run.googleapis.com/execution_name"="${executionId}"`;
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
        console.log("\n=== EXECUTION LOGS ===");
        for (const entry of logData.entries || []) {
          console.log(`[${entry.timestamp}] ${entry.textPayload || JSON.stringify(entry.jsonPayload)}`);
        }
      }

      if (cond.state !== "CONDITION_SUCCEEDED") {
        throw new Error(`Execution failed: ${cond.message || "Unknown error"}`);
      }
      console.log("\n🎉 Unit GCP-02 is 100% verified and operating in production!");
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
