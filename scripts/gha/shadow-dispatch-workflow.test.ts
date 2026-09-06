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
  expect(yaml).toMatch(/cron:\s*'23 \* \* \* \*'/);
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
