import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const yaml = readFileSync(
  resolve(import.meta.dir, "../../.github/workflows/gha-shadow-dispatch-watchdog.yml"),
  "utf8",
);

test("EX-03 schedule watchdog is read-only evidence", () => {
  expect(yaml).toMatch(/name:\s*EX-03 Schedule Watchdog/);
  expect(yaml).toMatch(/schedule:/);
  expect(yaml).toMatch(/cron:\s*'37 \* \* \* \*'/);
  expect(yaml).toMatch(/workflow_dispatch:/);
  // Read-only: it must never POST the shadow-dispatch route and needs no
  // route credential. The only writes are the OPS-05 tracking issue.
  expect(yaml).not.toMatch(/api\/cron\/shadow-dispatch/);
  expect(yaml).not.toMatch(/PROXY_SECRET/);
  expect(yaml).not.toMatch(/curl .-X POST/);
  expect(yaml).toMatch(/gh run list --workflow gha-shadow-dispatch\.yml/);
  expect(yaml).toMatch(/actions: read/);
  expect(yaml).toMatch(/issues: write/);
});

test("EX-03 schedule watchdog wires the OPS-05 lifecycle", () => {
  expect(yaml).toMatch(/INCIDENT_KEY: shadow-dispatch-schedule/);
  expect(yaml).toMatch(/source-alert-lifecycle\.ts/);
  expect(yaml).toMatch(/evaluate-schedule-silence\.ts/);
  expect(yaml).toMatch(/HEALTHY_THRESHOLD: '2'/);
  expect(yaml).toMatch(/<!-- incident-key: \$\{INCIDENT_KEY\} -->/);
  expect(yaml).toMatch(/healthy-streak/);
});
