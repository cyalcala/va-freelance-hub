import { getGcpAccessToken } from "./auth";

async function main() {
  const token = await getGcpAccessToken();
  const projectId = "antigravity-494415";
  const saEmail = `va-hub-scheduler-invoker@${projectId}.iam.gserviceaccount.com`;
  const member = `serviceAccount:${saEmail}`;

  console.log("=== GRANTING SECRET ACCESSOR ROLE AT PROJECT LEVEL ===");

  // 1. Get current project IAM policy
  const getPolicyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`;
  const getPolicyRes = await fetch(getPolicyUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!getPolicyRes.ok) {
    console.error("Failed to get project IAM policy:", getPolicyRes.status, await getPolicyRes.text());
    // Fallback: try setting IAM policy per-secret on Secret Manager API
    await grantPerSecret(token, projectId, member);
    return;
  }

  const policy = await getPolicyRes.json();
  const bindings = policy.bindings || [];

  // Check if role binding already exists
  let accessorBinding = bindings.find((b: any) => b.role === "roles/secretmanager.secretAccessor");
  if (!accessorBinding) {
    accessorBinding = { role: "roles/secretmanager.secretAccessor", members: [] };
    bindings.push(accessorBinding);
  }

  if (!accessorBinding.members.includes(member)) {
    accessorBinding.members.push(member);
    console.log(`Adding ${member} to roles/secretmanager.secretAccessor...`);

    const setPolicyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:setIamPolicy`;
    const setPolicyRes = await fetch(setPolicyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ policy }),
    });

    if (setPolicyRes.ok) {
      console.log("✓ Successfully granted roles/secretmanager.secretAccessor at project level!");
      return;
    } else {
      console.warn("Could not set project-level IAM policy:", setPolicyRes.status, await setPolicyRes.text());
    }
  } else {
    console.log("Member already has roles/secretmanager.secretAccessor at project level.");
    return;
  }

  // Fallback: set per secret
  await grantPerSecret(token, projectId, member);
}

async function grantPerSecret(token: string, projectId: string, member: string) {
  console.log("\nAttempting per-secret IAM policy updates...");
  const secrets = [
    "va-hub-proxy-secret",
    "va-hub-turso-database-url",
    "va-hub-turso-auth-token",
    "va-hub-cloudflare-api-token",
    "va-hub-cloudflare-account-id",
  ];

  for (const secret of secrets) {
    const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secret}:getIamPolicy`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.warn(`Failed to get policy for ${secret}:`, res.status);
      continue;
    }
    const policy = await res.json();
    const bindings = policy.bindings || [];
    let binding = bindings.find((b: any) => b.role === "roles/secretmanager.secretAccessor");
    if (!binding) {
      binding = { role: "roles/secretmanager.secretAccessor", members: [] };
      bindings.push(binding);
    }
    if (!binding.members.includes(member)) {
      binding.members.push(member);
    }
    policy.bindings = bindings;

    const setUrl = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secret}:setIamPolicy`;
    const setRes = await fetch(setUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ policy }),
    });

    if (setRes.ok) {
      console.log(`✓ Bound roles/secretmanager.secretAccessor to secret: ${secret}`);
    } else {
      console.error(`Failed to set IAM policy on ${secret}:`, setRes.status, await setRes.text());
    }
  }
}

main().catch(console.error);
