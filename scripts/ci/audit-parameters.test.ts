import { expect, test } from "bun:test";
import { auditAcceptedParameters } from "./audit-parameters";
import { join } from "node:path";

const rootDir = join(import.meta.dir, "../..");

test("auditAcceptedParameters passes cleanly against live repository", () => {
  const result = auditAcceptedParameters(rootDir);
  expect(result.errors).toEqual([]);
});

test("detects invalid YAML syntax", () => {
  const result = auditAcceptedParameters(rootDir, "version: [invalid-yaml");
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.errors[0]).toContain("invalid YAML");
});

test("detects version mismatch", () => {
  const fakeYaml = `
version: 1
canonical: true
code_anchors: {}
autonomy:
  job_evaluation:
    current_level_by_class:
      remote_classification: L1
  job_flow:
    current_level_by_class:
      polling_cadence: L1
`;
  const result = auditAcceptedParameters(rootDir, fakeYaml);
  expect(result.errors).toContain("docs/ACCEPTED_PARAMETERS.yaml: expected version 2, got 1");
});

test("detects unearned autonomy promotion claims (non-L1)", () => {
  const fakeYaml = `
version: 2
canonical: true
code_anchors:
  policy_resolver: "packages/scraper/policy-resolver.ts"
autonomy:
  job_evaluation:
    current_level_by_class:
      remote_classification: L2
  job_flow:
    current_level_by_class:
      polling_cadence: L1
`;
  const result = auditAcceptedParameters(rootDir, fakeYaml);
  expect(result.errors.some((e) => e.includes("job_evaluation class remote_classification must be L1"))).toBe(true);
});

test("detects code constant drift in risk tiers", () => {
  const fakeYaml = `
version: 2
canonical: true
code_anchors:
  policy_resolver: "packages/scraper/policy-resolver.ts"
autonomy:
  job_evaluation:
    current_level_by_class:
      remote_classification: L1
  job_flow:
    current_level_by_class:
      polling_cadence: L1
risk_tiers_adr008:
  tier_a_direct_ats:
    shadow_window_days: 99
    canary_cap_per_tick: 10
    fast_track_eligible: true
`;
  const result = auditAcceptedParameters(rootDir, fakeYaml);
  expect(result.errors.some((e) => e.includes("Parity drift in Tier A minShadowDays"))).toBe(true);
});

test("detects missing code anchor files", () => {
  const fakeYaml = `
version: 2
canonical: true
code_anchors:
  non_existent: "packages/scraper/non-existent-anchor.ts"
autonomy:
  job_evaluation:
    current_level_by_class:
      remote_classification: L1
  job_flow:
    current_level_by_class:
      polling_cadence: L1
`;
  const result = auditAcceptedParameters(rootDir, fakeYaml);
  expect(result.errors.some((e) => e.includes("references missing file"))).toBe(true);
});
