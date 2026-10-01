import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const region = "asia-southeast1";
  const jobName = "lake-publish-job";
  const schedulerName = "lake-publish-hourly";
  const cronSchedule = "47 * * * *";
  const saEmail = `va-hub-scheduler-invoker@${projectId}.iam.gserviceaccount.com`;
  const imageTag = `${region}-docker.pkg.dev/${projectId}/va-hub-runner/lake-publish:latest`;

  console.log("=== 1. DEPLOYING CLOUD RUN JOB ===");
  console.log(`Job: ${jobName}`);
  console.log(`Image: ${imageTag}`);

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
                  secretKeyRef: {
                    secret: "va-hub-proxy-secret",
                    version: "latest",
                  },
                },
              },
              {
                name: "TURSO_DATABASE_URL",
                valueSource: {
                  secretKeyRef: {
                    secret: "va-hub-turso-database-url",
                    version: "latest",
                  },
                },
              },
              {
                name: "TURSO_AUTH_TOKEN",
                valueSource: {
                  secretKeyRef: {
                    secret: "va-hub-turso-auth-token",
                    version: "latest",
                  },
                },
              },
              {
                name: "CLOUDFLARE_API_TOKEN",
                valueSource: {
                  secretKeyRef: {
                    secret: "va-hub-cloudflare-api-token",
                    version: "latest",
                  },
                },
              },
              {
                name: "CLOUDFLARE_ACCOUNT_ID",
                valueSource: {
                  secretKeyRef: {
                    secret: "va-hub-cloudflare-account-id",
                    version: "latest",
                  },
                },
              },
            ],
            resources: {
              limits: {
                cpu: "1",
                memory: "512Mi",
              },
            },
          },
        ],
        maxRetries: 1,
        timeout: "300s",
        serviceAccount: saEmail,
        executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
      },
    },
  };

  const getJobRes = await fetch(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let deployRes: Response;
  if (getJobRes.status === 404) {
    console.log("Job does not exist. Creating new Cloud Run Job...");
    deployRes = await fetch(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs?jobId=${jobName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobPayload),
      }
    );
  } else if (getJobRes.ok) {
    console.log("Job exists. Updating existing Cloud Run Job...");
    deployRes = await fetch(
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
  } else {
    throw new Error(`Failed to check existing job: HTTP ${getJobRes.status} - ${await getJobRes.text()}`);
  }

  if (!deployRes.ok) {
    throw new Error(`Deploy failed: HTTP ${deployRes.status} - ${await deployRes.text()}`);
  }

  const deployData = await deployRes.json();
  console.log("✓ Cloud Run Job deployed successfully!");

  console.log("\n=== 2. CONFIGURING CLOUD SCHEDULER ===");
  console.log(`Scheduler: ${schedulerName} (${cronSchedule})`);

  const schedPayload = {
    name: `projects/${projectId}/locations/${region}/jobs/${schedulerName}`,
    schedule: cronSchedule,
    timeZone: "UTC",
    httpTarget: {
      uri: `https://${region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${projectId}/jobs/${jobName}:run`,
      httpMethod: "POST",
      oauthToken: {
        serviceAccountEmail: saEmail,
      },
    },
  };

  const getSchedRes = await fetch(
    `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${region}/jobs/${schedulerName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let schedRes: Response;
  if (getSchedRes.status === 404) {
    console.log("Scheduler does not exist. Creating new Cloud Scheduler Job...");
    schedRes = await fetch(
      `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${region}/jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(schedPayload),
      }
    );
  } else if (getSchedRes.ok) {
    console.log("Scheduler exists. Updating existing Cloud Scheduler Job...");
    schedRes = await fetch(
      `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${region}/jobs/${schedulerName}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(schedPayload),
      }
    );
  } else {
    throw new Error(`Failed to check existing scheduler: HTTP ${getSchedRes.status} - ${await getSchedRes.text()}`);
  }

  if (!schedRes.ok) {
    throw new Error(`Scheduler configuration failed: HTTP ${schedRes.status} - ${await schedRes.text()}`);
  }

  console.log("✓ Cloud Scheduler configured successfully!");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
