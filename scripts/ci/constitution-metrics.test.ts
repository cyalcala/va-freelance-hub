import { expect, test } from "bun:test";
import { join } from "node:path";
import {
  auditPaperSystems,
  classifyCreationCohort,
  concentrationReport,
  CREATION_COHORTS,
  familyShares,
  measureGroundTruth,
  providerFamily,
  qualityCeilingStatus,
  TOP_PROVIDER_FAMILY_SHARE_MAX,
  TOP_SOURCE_SHARE_MAX,
  type CohortInput,
} from "./constitution-metrics";

const rootDir = join(import.meta.dir, "../..");
const windowStart = "2026-09-26T00:00:00.000Z";

function cohort(overrides: Partial<CohortInput> = {}): CohortInput {
  return {
    createdAt: "2026-09-26T02:00:00.000Z",
    sourcePostedAt: "2026-09-25T02:00:00.000Z",
    manilaDayStartUtc: windowStart,
    previouslyInactive: false,
    replayRecovery: false,
    freshHarvestVerified: false,
    historicalBackfill: false,
    ...overrides,
  };
}

test("every input maps to exactly one creation cohort", () => {
  const flags = [false, true];
  const posted = [null, "2026-09-25T02:00:00.000Z", "2026-08-01T00:00:00.000Z", "not-a-date"];
  for (const previouslyInactive of flags) {
    for (const replayRecovery of flags) {
      for (const freshHarvestVerified of flags) {
        for (const historicalBackfill of flags) {
          for (const sourcePostedAt of posted) {
            const label = classifyCreationCohort(cohort({
              previouslyInactive,
              replayRecovery,
              freshHarvestVerified,
              historicalBackfill,
              sourcePostedAt,
            }));
            expect(CREATION_COHORTS.includes(label)).toBe(true);
          }
        }
      }
    }
  }
});

test("a fresh dated posting inside the Manila day is FRESH_DISCOVERY", () => {
  expect(classifyCreationCohort(cohort())).toBe("FRESH_DISCOVERY");
});

test("a missing source date without harvest verification is not fresh supply", () => {
  expect(classifyCreationCohort(cohort({ sourcePostedAt: null }))).toBe("OTHER_NON_FRESH");
});

test("a missing source date with an explicit fresh harvest flag is FRESH_DISCOVERY", () => {
  expect(classifyCreationCohort(cohort({ sourcePostedAt: null, freshHarvestVerified: true }))).toBe("FRESH_DISCOVERY");
});

test("a posting older than seven days is BACKLOG_IMPORT", () => {
  expect(classifyCreationCohort(cohort({ sourcePostedAt: "2026-08-01T00:00:00.000Z" }))).toBe("BACKLOG_IMPORT");
});

test("reactivation outranks a fresh source date", () => {
  expect(classifyCreationCohort(cohort({ previouslyInactive: true }))).toBe("REACTIVATION");
  expect(classifyCreationCohort(cohort({ createdAt: "2026-09-25T23:00:00.000Z" }))).toBe("REACTIVATION");
});

test("replay outranks backlog but not reactivation", () => {
  expect(classifyCreationCohort(cohort({
    replayRecovery: true,
    sourcePostedAt: "2026-08-01T00:00:00.000Z",
  }))).toBe("REPLAY_RECOVERY");
  expect(classifyCreationCohort(cohort({
    replayRecovery: true,
    previouslyInactive: true,
  }))).toBe("REACTIVATION");
});

test("an unreadable created timestamp is not counted as fresh", () => {
  expect(classifyCreationCohort(cohort({ createdAt: "nope" }))).toBe("OTHER_NON_FRESH");
});

test("provider family uses the text before the first colon", () => {
  expect(providerFamily("greenhouse:canonical")).toBe("greenhouse");
  expect(providerFamily("we-work-remotely")).toBe("we-work-remotely");
  expect(providerFamily("  ")).toBe("unknown");
});

test("family share above 40% is a breach and an empty book is unknown", () => {
  const shares = familyShares([
    { sourceId: "we-work-remotely", count: 412 },
    { sourceId: "breezy:sourcefit", count: 200 },
    { sourceId: "greenhouse:gitlab", count: 388 },
  ]);
  const report = concentrationReport(shares, TOP_PROVIDER_FAMILY_SHARE_MAX);
  expect(report.status).toBe("BREACH");
  expect(report.topId).toBe("we-work-remotely");
  expect(report.topShare).toBeCloseTo(0.412, 3);
  expect(concentrationReport([], TOP_SOURCE_SHARE_MAX).status).toBe("UNKNOWN");
});

test("a single source above 25% breaches even when the family does not", () => {
  const report = concentrationReport(
    [{ id: "breezy:sourcefit", count: 26 }, { id: "breezy:other", count: 74 }],
    TOP_SOURCE_SHARE_MAX,
  );
  expect(report.status).toBe("BREACH");
});

test("an empty adjudication sample is UNKNOWN and cannot pass a quality ceiling", () => {
  const measurement = measureGroundTruth([]);
  expect(measurement.status).toBe("UNKNOWN");
  expect(qualityCeilingStatus(measurement)).toBe("UNKNOWN");
});

test("a small sample stays insufficient and does not certify the ceiling", () => {
  const measurement = measureGroundTruth([
    { systemPrediction: "eligible", groundTruthVerdict: "ineligible" },
  ]);
  expect(measurement.status).toBe("INSUFFICIENT_SAMPLE");
  expect(qualityCeilingStatus(measurement)).toBe("UNKNOWN");
  if (measurement.status === "INSUFFICIENT_SAMPLE") {
    expect(measurement.falsePhRate).toBe(1);
  }
});

test("a measured sample fails when the false-PH rate exceeds the ceiling", () => {
  const samples = Array.from({ length: 50 }, () => ({
    systemPrediction: "eligible" as const,
    groundTruthVerdict: "ineligible" as const,
  }));
  const measurement = measureGroundTruth(samples);
  expect(measurement.status).toBe("MEASURED");
  expect(qualityCeilingStatus(measurement)).toBe("FAIL");
});

test("a measured clean sample can pass", () => {
  const samples = Array.from({ length: 50 }, () => ({
    systemPrediction: "eligible" as const,
    groundTruthVerdict: "eligible" as const,
  }));
  expect(qualityCeilingStatus(measureGroundTruth(samples))).toBe("PASS");
});

test("the repository paper-system audit passes", () => {
  const result = auditPaperSystems(rootDir);
  expect(result.errors).toEqual([]);
});

test("the paper-system audit rejects an unconditional fresh fallback", () => {
  const metrics = `
ELSE 'OTHER_NON_FRESH'
ELSE 'FRESH_DISCOVERY'
FROM adjudication_audit_samples
measurement_status
scripts/ci/constitution-metrics.ts
`;
  const result = auditPaperSystems(rootDir, metrics);
  expect(result.errors.some((error) => error.includes("FRESH_DISCOVERY"))).toBe(true);
});
