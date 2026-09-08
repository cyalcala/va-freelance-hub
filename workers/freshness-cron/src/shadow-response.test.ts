import { expect, test } from "bun:test";
import { assessShadowResponse } from "./shadow-response";

const healthy = { totalRegistryRows: 3, eligible: 3, dispatched: 3, skippedIneligible: 0,
  skippedInvalidProvider: 0, skippedInvalidEvidence: 0, skippedRunCap: 0,
  probeFailures: 0, rejectedProbeResults: 0, evidenceErrors: [], invalidProviderErrors: [],
  outcomes: { HEALTHY_WITH_RESULTS: 3 } };
test("accepts healthy runs and cadence skips", () => {
  expect(assessShadowResponse(JSON.stringify(healthy))).toContain("dispatched=3");
  expect(assessShadowResponse(JSON.stringify({ ...healthy, totalRegistryRows: 5, skippedRunCap: 2 }))).toContain("dispatched=3");
  expect(assessShadowResponse(JSON.stringify({ ...healthy, eligible: 0, dispatched: 0, skippedIneligible: 3, outcomes: {} }))).toContain("dispatched=0");
});
test("fails HTTP-200 malformed, unhealthy, and inconsistent summaries", () => {
  for (const body of [null, {}, { totalRegistryRows: 3 }, { ...healthy, probeFailures: 1 },
    { ...healthy, evidenceErrors: [{}] }, { ...healthy, outcomes: { SCHEMA_BROKEN: 3 } },
    { ...healthy, dispatched: 2 }, { ...healthy, eligible: 4 }]) {
    expect(() => assessShadowResponse(JSON.stringify(body))).toThrow();
  }
});
