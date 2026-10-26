import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowText = readFileSync(resolve(import.meta.dir, "../../.github/workflows/sync-secrets-to-gcp.yml"), "utf8");
const workflow = Bun.YAML.parse(workflowText) as any;

// Keep manual secret provisioning available for the GCP runtime while removing
// the retired repository diagnostic job and its credential access.
test("manual secret sync remains the only supported operation", () => {
  expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
  expect(workflow.on.workflow_dispatch.inputs.operation).toEqual({
    description: "Operation to perform", type: "choice", required: true,
    default: "sync-secrets", options: ["sync-secrets"],
  });
  expect(Object.keys(workflow.jobs)).toEqual(["sync-secrets"]);
  const expression = workflow.jobs["sync-secrets"].if.match(/^\$\{\{\s*([\s\S]+?)\s*\}\}$/)?.[1];
  expect(expression).toBeDefined();
  expect(/^[\w.\s'()=!&|\-]+$/.test(expression)).toBe(true);
  const selected = new Function("github", "inputs", `return (${expression});`);
  for (const operation of ["", "sync-secrets"]) {
    expect(selected({ event_name: "workflow_dispatch" }, { operation })).toBe(true);
    for (const event_name of ["push", "schedule", "pull_request", "workflow_call"]) {
      expect(selected({ event_name }, { operation })).toBe(false);
    }
  }
  expect(selected({ event_name: "workflow_dispatch" }, { operation: "unknown" })).toBe(false);
});

test("retained manual workflow provisions only existing runtime secrets", () => {
  expect(workflow.permissions).toEqual({ contents: "read" });
  const steps = workflow.jobs["sync-secrets"].steps;
  expect(steps.map((step: any) => step.uses).filter(Boolean)).toEqual([
    "google-github-actions/auth@v2", "google-github-actions/setup-gcloud@v2",
  ]);
  const provision = steps.find((step: any) => step.run);
  expect(provision.env.PROJECT_ID).toBe("antigravity-494415");
  expect(provision.run.match(/^\s*ensure_secret "[^"]+"/gm)?.map((line: string) => line.trim())).toEqual([
    'ensure_secret "va-hub-turso-database-url"',
    'ensure_secret "va-hub-turso-auth-token"',
    'ensure_secret "va-hub-cloudflare-api-token"',
    'ensure_secret "va-hub-cloudflare-account-id"',
    'ensure_secret "va-hub-proxy-secret"',
  ]);
  expect(workflowText).not.toMatch(/git (?:push|fetch|ls-remote)|sourcemanager|verify-ssm|instances create/);
});
