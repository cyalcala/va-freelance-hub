import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const yaml = readFileSync(
  resolve(import.meta.dir, "../../.github/workflows/gha-lake-publish.yml"),
  "utf8",
);

function step(name: string): string {
  const start = yaml.indexOf(`- name: ${name}`);
  expect(start).toBeGreaterThan(-1);
  const next = yaml.indexOf("\n      - name:", start + 1);
  return yaml.slice(start, next === -1 ? undefined : next);
}

test("lake publish is a fenced GCP fallback", () => {
  expect(yaml).toMatch(/name:\s*Automatic Lake Publish \(Fenced GCP Fallback\)/);
  expect(yaml).toMatch(/cron:\s*'7 4,16 \* \* \*'/);
  expect(yaml).toMatch(/gcp-fallback-gate\.ts --job lake-publish-job/);
  expect(yaml).toMatch(/concurrency:\s*\n\s+group: gha-lake-publish\s*\n\s+cancel-in-progress: false/);
  expect(yaml).not.toMatch(/secrets\.GCP_SA_KEY/);
});

test("every GCP-duplicating write step runs only on a fence takeover", () => {
  for (const name of ["Publish qualified rows", "Enroll published sources"]) {
    expect(step(name)).toMatch(/if: \$\{\{ steps\.gate\.outputs\.proceed == 'true' \}\}/);
  }
  expect(step("Publish qualified rows")).toMatch(/bun run lake:sync\b/);
  expect(yaml.indexOf("gcp-fallback-gate.ts")).toBeLessThan(yaml.indexOf("bun run lake:sync"));
});

test("GHA-only discovery is manual and still time-fenced", () => {
  const discover = step("Discover a bounded cohort");
  expect(discover).toMatch(/if: \$\{\{ inputs\.discover == true && steps\.gate\.outputs\.window_ok == 'true' \}\}/);
  expect(discover).not.toMatch(/github\.event\.schedule/);
});

test("manual force skips only the health check", () => {
  expect(yaml).toMatch(/force:\s*\n\s+description: "EMERGENCY: skip the GCP health check \(time fence still applies\)"/);
  expect(yaml).toMatch(/FORCE: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.force == true \}\}/);
});
