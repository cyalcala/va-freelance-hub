import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const yaml = readFileSync(
  resolve(import.meta.dir, "../../.github/workflows/gha-shadow-dispatch.yml"),
  "utf8",
);

test("EX-03 schedules shadow-dispatch without scraping or publishing", () => {
  expect(yaml).toMatch(/name:\s*EX-03 Shadow Dispatch/);
  expect(yaml).toMatch(/schedule:/);
  expect(yaml).toMatch(/cron:\s*'9 \* \* \* \*'/);
  expect(yaml).toMatch(/workflow_dispatch:/);
  expect(yaml).toContain("https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch");
  expect(yaml).toMatch(/PROXY_SECRET/);
  expect(yaml).toMatch(/Authorization: Bearer/);
  expect(yaml).toMatch(/jq -e '\.totalRegistryRows >= 1'/);
  expect(yaml).not.toMatch(/\/api\/cron\/scrape/);
  expect(yaml).not.toMatch(/\/api\/cron\/source-admit/);
  expect(yaml).not.toMatch(/onlinejobs|dribbble|authenticjobs|smartrecruiters/i);
  expect(yaml).not.toMatch(/\bschedule:[\s\S]*source-admit/);
});

test("EX-03 is a fenced GCP fallback: gate first, dispatch only on takeover", () => {
  expect(yaml).toMatch(/Fenced GCP Fallback/);
  expect(yaml).toMatch(/gcp-fallback-gate\.ts --job shadow-dispatch-job/);
  expect(yaml).toMatch(/id: gate/);
  // The POST step must be gated on the fence decision.
  const post = yaml.slice(yaml.indexOf("- name: POST shadow-dispatch"));
  expect(post).toMatch(/^- name: POST shadow-dispatch[^\n]*\n\s+if: \$\{\{ steps\.gate\.outputs\.proceed == 'true' \}\}/);
  // The gate step precedes the POST step.
  expect(yaml.indexOf("gcp-fallback-gate.ts")).toBeLessThan(yaml.indexOf("curl -sS"));
  // PROXY_SECRET is scoped to the POST step, not the whole job.
  expect(yaml.slice(0, yaml.indexOf("- name: POST shadow-dispatch"))).not.toMatch(/PROXY_SECRET:/);
  // Emergency force input exists and only reaches the gate via FORCE.
  expect(yaml).toMatch(/force:\s*\n\s+description:/);
  expect(yaml).toMatch(/FORCE: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.force == true \}\}/);
  // Concurrency: never two GHA dispatches at once.
  expect(yaml).toMatch(/concurrency:\s*\n\s+group: gha-shadow-dispatch\s*\n\s+cancel-in-progress: false/);
  // The deploy-capable GCP admin key is never used for the health check.
  expect(yaml).not.toMatch(/secrets\.GCP_SA_KEY/);
});
