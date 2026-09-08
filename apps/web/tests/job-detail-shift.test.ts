import { expect, test } from "bun:test";
import { classifyShift } from "@va-hub/scraper";
import { readFileSync } from "node:fs";

test("job detail renders only source-stated schedule hints, with no guessed PHT window", () => {
  const source = readFileSync(new URL("../src/pages/jobs/[id].astro", import.meta.url), "utf8");
  expect(source).toContain("shiftInfo.category !== 'unknown'");
  expect(source).toContain("Schedule mentioned");
  expect(source).toContain("Confirm exact hours in the original listing.");
  expect(source).not.toContain("{shiftInfo.phWorkingHours}");
  expect(classifyShift({ clientTimezone: "AEST", description: "Australian client" }).category).toBe("unknown");
  expect(classifyShift({ description: "Night shift" }).category).toBe("night_shift");
});
