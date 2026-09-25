import { describe, test, expect, afterAll } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  ECONOMICS_SNAPSHOT_SCHEMA_VERSION,
  UNCLEAR_INVESTIGATION_THRESHOLD,
  buildSnapshot,
  snapshotKeyFor,
  writeSnapshot,
  loadSnapshotFiles,
  checkCoverage,
  buildNextActions,
  pruneSnapshots,
  type EconomicsSnapshot,
} from "./economics-snapshot";
import {
  computeWindows,
  emitMeta,
  reconcile,
  type EconMeta,
  type ReconResult,
} from "./source-economics";

// Same independently-verifiable fixture shape as source-economics.test.ts,
// compressed to the rows each snapshot metric reads.
const AS_OF = new Date("2026-08-29T00:00:00Z");
const META: EconMeta = emitMeta(computeWindows(AS_OF));

// Healthy fixture: five attributed families (the two Jobicy feeds fold to one),
// concentration within SLOs (top 26.6%, top-3 68.75%), unclear cohorts below
// the investigation threshold.
const HEALTHY_BY_NAME: Record<string, Record<string, unknown>[]> = {
  qualified_supply: [{ qualified_active: 866, qualified_new_7d: 117, qualified_new_30d: 458 }],
  identity_coverage: [{
    total: 5679, active: 1105, inactive: 4574,
    with_source_id: 5679, null_source_id: 0,
    active_with_source_id: 1105, active_null_source_id: 0,
  }],
  supply_totals: [{ active: 1105, net_new_7d: 200, net_new_14d: 300, net_new_30d: 640 }],
  source_supply: [
    { source_id: "we-work-remotely", source_platform: "WeWorkRemotely", active: 400, net_new_7d: 90, net_new_14d: 130, net_new_30d: 150, inactive: 100 },
    { source_id: "remotive", source_platform: "Remotive", active: 200, net_new_7d: 60, net_new_14d: 90, net_new_30d: 120, inactive: 50 },
    { source_id: "real-work-from-anywhere", source_platform: "RealWorkFromAnywhere", active: 100, net_new_7d: 20, net_new_14d: 30, net_new_30d: 100, inactive: 5 },
    { source_id: "remote-ok", source_platform: "RemoteOK", active: 90, net_new_7d: 30, net_new_14d: 50, net_new_30d: 100, inactive: 20 },
    { source_id: "jobicy-admin-support-apac", source_platform: "Jobicy", active: 50, net_new_7d: 10, net_new_14d: 20, net_new_30d: 90, inactive: 10 },
    { source_id: "jobicy-supporting-apac", source_platform: "Jobicy", active: 50, net_new_7d: 10, net_new_14d: 10, net_new_30d: 80, inactive: 10 },
  ],
  fetch_outcomes_7d: [],
  triage_outcomes_7d: [
    { source_id: "sourcefit", eligible: 1, unclear: 2, ineligible: 0, policy_rejected: 0, total_stored: 3 },
    { source_id: "20four7va", eligible: 2, unclear: 1, ineligible: 0, policy_rejected: 0, total_stored: 3 },
  ],
};

// Unhealthy fixture: concentration SLO flags tripped, large unclear cohorts.
const UNHEALTHY_BY_NAME: Record<string, Record<string, unknown>[]> = {
  ...HEALTHY_BY_NAME,
  source_supply: [
    { source_id: "we-work-remotely", source_platform: "WeWorkRemotely", active: 400, net_new_7d: 90, net_new_14d: 130, net_new_30d: 210, inactive: 100 },
    { source_id: "remotive", source_platform: "Remotive", active: 200, net_new_7d: 60, net_new_14d: 90, net_new_30d: 150, inactive: 50 },
    { source_id: "remote-ok", source_platform: "RemoteOK", active: 100, net_new_7d: 30, net_new_14d: 50, net_new_30d: 90, inactive: 20 },
    { source_id: "jobicy-admin-support-apac", source_platform: "Jobicy", active: 50, net_new_7d: 10, net_new_14d: 20, net_new_30d: 30, inactive: 10 },
    { source_id: "jobicy-supporting-apac", source_platform: "Jobicy", active: 50, net_new_7d: 10, net_new_14d: 10, net_new_30d: 20, inactive: 10 },
  ],
  triage_outcomes_7d: [
    { source_id: "sourcefit", eligible: 1, unclear: 46, ineligible: 2, policy_rejected: 0, total_stored: 49 },
    { source_id: "20four7va", eligible: 6, unclear: 37, ineligible: 0, policy_rejected: 0, total_stored: 43 },
    { source_id: "remote-ok", eligible: 4, unclear: 3, ineligible: 0, policy_rejected: 0, total_stored: 7 },
  ],
};

const RECON: ReconResult = { ok: true, deltas: {}, notes: [] };

function combined(byName: Record<string, Record<string, unknown>[]> = HEALTHY_BY_NAME, recon: ReconResult = RECON) {
  return { meta: META, byName, reconciliation: recon };
}

let tempDir: string | null = mkdtempSync(join(tmpdir(), "econ-snapshot-"));
afterAll(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

describe("buildSnapshot", () => {
  test("carries schema/metric versions, window bounds, and headline metrics", () => {
    const generatedAt = new Date("2026-09-25T02:35:00Z");
    const snapshot = buildSnapshot({ combined: combined(), generatedAt, runId: "12345" });
    expect(snapshot.schemaVersion).toBe(ECONOMICS_SNAPSHOT_SCHEMA_VERSION);
    expect(snapshot.metricVersion).toBe("SP-02");
    expect(snapshot.generatedAt).toBe("2026-09-25T02:35:00.000Z");
    expect(snapshot.runId).toBe("12345");
    expect(snapshot.window).toEqual({
      asOf: META.asOf, cut7Unix: META.cut7Unix, cut14Unix: META.cut14Unix, cut30Unix: META.cut30Unix, timezone: "UTC",
    });
    expect(snapshot.metrics.qualifiedNew7d).toBe(117);
    expect(snapshot.metrics.qualifiedPerDay7d).toBeCloseTo(117 / 7, 10);
    expect(snapshot.metrics.qualifiedNew30d).toBe(458);
    expect(snapshot.metrics.qualifiedPerDay30d).toBeCloseTo(458 / 30, 10);
    expect(snapshot.metrics.allActive).toBe(1105);
    expect(snapshot.metrics.identityCoverage).toEqual({ total: 5679, withSourceId: 5679, share: 1 });
    expect(snapshot.status).toBe("measured");
  });

  test("concentration folds the two Jobicy feeds into one family", () => {
    const snapshot = buildSnapshot({ combined: combined(HEALTHY_BY_NAME), generatedAt: new Date("2026-09-25T02:35:00Z") });
    // Attributed net-new-30d = 640; the Jobicy feeds fold to one family
    // (90 + 80 = 170, the largest); top-3 = 170 + 150 + 120 = 440/640 = 68.75%.
    expect(snapshot.metrics.concentration30d).toEqual({
      topFamily: "jobicy", topShare: 170 / 640, top3Share: 0.6875, topWarn: false, top3Warn: false,
    });
  });

  test("largestUnclear7d ranks cohorts without counting unclear as salvageable", () => {
    const snapshot = buildSnapshot({ combined: combined(UNHEALTHY_BY_NAME), generatedAt: new Date("2026-09-25T02:35:00Z") });
    expect(snapshot.metrics.largestUnclear7d).toEqual([
      { sourceId: "sourcefit", unclear: 46 },
      { sourceId: "20four7va", unclear: 37 },
      { sourceId: "remote-ok", unclear: 3 },
    ]);
    expect(snapshot.limitations.join(" ")).toContain("not counted as salvageable");
  });

  test("non-zero reconciliation deltas are surfaced and prior is linked by key", () => {
    const prior = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-24T02:35:00Z") });
    const failedRecon: ReconResult = { ok: false, deltas: { "total_vs_active_plus_inactive": -1 }, notes: [] };
    const snapshot = buildSnapshot({ combined: combined(HEALTHY_BY_NAME, failedRecon), generatedAt: new Date("2026-09-25T02:35:00Z"), prior });
    expect(snapshot.reconciliation.ok).toBe(false);
    expect(snapshot.reconciliation.nonZeroDeltas).toEqual(["total_vs_active_plus_inactive=-1"]);
    expect(snapshot.prior).toEqual({
      snapshotKey: "2026-09-24T02-35-00-000Z",
      generatedAt: "2026-09-24T02:35:00.000Z",
      qualifiedNew7d: 117,
      qualifiedPerDay7d: prior.metrics.qualifiedPerDay7d,
    });
  });

  test("prior is null when no prior snapshot is supplied", () => {
    const snapshot = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-25T02:35:00Z") });
    expect(snapshot.prior).toBeNull();
  });
});

describe("snapshot persistence", () => {
  test("writeSnapshot writes a timestamped file and a latest.json pointer", () => {
    const outDir = join(tempDir!, "persist");
    const snapshot = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-25T02:35:00Z") });
    const written = writeSnapshot(outDir, snapshot);
    expect(written.key).toBe("2026-09-25T02-35-00-000Z");
    expect(existsSync(written.snapshotPath)).toBe(true);
    const pointer = JSON.parse(readFileSync(written.latestPath, "utf-8"));
    expect(pointer).toEqual({ latestSnapshot: written.key, generatedAt: "2026-09-25T02:35:00.000Z" });
    const parsed = JSON.parse(readFileSync(written.snapshotPath, "utf-8")) as EconomicsSnapshot;
    expect(parsed.metrics.qualifiedNew7d).toBe(117);
  });

  test("loadSnapshotFiles round-trips snapshots and tolerates malformed files", () => {
    const outDir = join(tempDir!, "roundtrip");
    const s1 = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-24T02:35:00Z") });
    const s2 = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-25T02:35:00Z") });
    writeSnapshot(outDir, s1);
    writeSnapshot(outDir, s2);
    mkdirSync(join(outDir, "snapshots"), { recursive: true });
    writeFileSync(join(outDir, "snapshots", "broken.json"), "{ not json");
    const loaded = loadSnapshotFiles(outDir);
    expect(loaded.entries.map((e) => e.key)).toEqual(["2026-09-24T02-35-00-000Z", "2026-09-25T02-35-00-000Z"]);
    expect(loaded.latest?.generatedAt).toBe("2026-09-25T02:35:00.000Z");
    // The malformed file is retained as failed-collection evidence.
    expect(readdirSync(join(outDir, "snapshots")).some((n) => n === "broken.json")).toBe(true);
  });

  test("pruneSnapshots removes only beyond retention and never the latest file", () => {
    const outDir = join(tempDir!, "prune");
    const now = new Date("2026-12-25T00:00:00Z");
    const old = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-01T00:00:00Z") });
    const recent = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-12-24T00:00:00Z") });
    const boundary = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-25T00:00:00Z") });
    writeSnapshot(outDir, old);
    writeSnapshot(outDir, boundary);
    writeSnapshot(outDir, recent);
    // 90-day retention from 2026-12-25: 2026-09-01 is 115 days old (removed),
    // 2026-09-25 is exactly 91 days old (removed), 2026-12-24 is kept (and latest).
    const result = pruneSnapshots(outDir, { retentionDays: 90, now });
    expect(result.removed).toEqual(["2026-09-01T00-00-00-000Z", "2026-09-25T00-00-00-000Z"]);
    expect(result.kept).toBe(1);
    const loaded = loadSnapshotFiles(outDir);
    expect(loaded.entries.map((e) => e.key)).toEqual(["2026-12-24T00-00-00-000Z"]);
    expect(loaded.latest?.generatedAt).toBe("2026-12-24T00:00:00.000Z");
  });
});

describe("checkCoverage", () => {
  const base = { maxAgeHours: 30, now: new Date("2026-09-25T08:00:00Z") };

  test("single fresh snapshot is neither stale nor missing days", () => {
    const coverage = checkCoverage([{ key: "2026-09-25T02-35-00-000Z", generatedAt: "2026-09-25T02:35:00.000Z" }], base);
    expect(coverage.snapshotCount).toBe(1);
    expect(coverage.stale).toBe(false);
    expect(coverage.latestAgeHours).toBeCloseTo(65 / 12, 5);
    expect(coverage.missingDays).toEqual([]);
  });

  test("a stale latest snapshot is flagged", () => {
    const coverage = checkCoverage([{ key: "2026-09-23T02-35-00-000Z", generatedAt: "2026-09-23T02:35:00.000Z" }], base);
    expect(coverage.stale).toBe(true);
  });

  test("no snapshot at all is stale with a null latest", () => {
    const coverage = checkCoverage([], base);
    expect(coverage.snapshotCount).toBe(0);
    expect(coverage.stale).toBe(true);
    expect(coverage.latestSnapshotKey).toBeNull();
  });

  test("missing UTC days between first and latest are listed", () => {
    const coverage = checkCoverage([
      { key: "2026-09-22T02-35-00-000Z", generatedAt: "2026-09-22T02:35:00.000Z" },
      { key: "2026-09-25T02-35-00-000Z", generatedAt: "2026-09-25T02:35:00.000Z" },
    ], base);
    expect(coverage.missingDays).toEqual(["2026-09-23", "2026-09-24"]);
  });
});

describe("buildNextActions", () => {
  const freshCoverage = checkCoverage([{ key: "2026-09-25T02-35-00-000Z", generatedAt: "2026-09-25T02:35:00.000Z" }], {
    maxAgeHours: 30, now: new Date("2026-09-25T08:00:00Z"),
  });

  test("a healthy fresh snapshot queues no actions", () => {
    const snapshot = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-25T02:35:00Z") });
    expect(buildNextActions(snapshot, freshCoverage)).toEqual([]);
  });

  test("failed reconciliation queues the highest-priority reconcile action", () => {
    const failedRecon: ReconResult = { ok: false, deltas: { "a": 1, "b": -1 }, notes: [] };
    const snapshot = buildSnapshot({ combined: combined(HEALTHY_BY_NAME, failedRecon), generatedAt: new Date("2026-09-25T02:35:00Z") });
    const actions = buildNextActions(snapshot, freshCoverage);
    expect(actions[0].kind).toBe("reconcile");
    expect(actions[0].evidence).toContain("a=1");
  });

  test("stale coverage and missing days queue refresh actions", () => {
    const snapshot = buildSnapshot({ combined: combined(), generatedAt: new Date("2026-09-25T02:35:00Z") });
    const staleCoverage = checkCoverage([
      { key: "2026-09-22T02-35-00-000Z", generatedAt: "2026-09-22T02:35:00.000Z" },
      { key: "2026-09-25T02-35-00-000Z", generatedAt: "2026-09-25T02:35:00.000Z" },
    ], { maxAgeHours: 30, now: new Date("2026-09-28T08:00:00Z") });
    const actions = buildNextActions(snapshot, staleCoverage);
    const kinds = actions.map((a) => a.kind);
    expect(kinds).toContain("refresh");
    expect(actions.some((a) => a.id === "backfill-missing-days" && a.evidence.includes("2026-09-23"))).toBe(true);
  });

  test("concentration SLO flags and large unclear cohorts queue investigations", () => {
    const snapshot = buildSnapshot({ combined: combined(UNHEALTHY_BY_NAME), generatedAt: new Date("2026-09-25T02:35:00Z") });
    const actions = buildNextActions(snapshot, freshCoverage);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain("investigate-provider-concentration");
    expect(ids).toContain("investigate-unclear-sourcefit");
    expect(ids).toContain("investigate-unclear-20four7va");
    // remote-ok's 3 unclear rows are below the threshold and never queued.
    expect(ids).not.toContain("investigate-unclear-remote-ok");
    const thresholdAction = actions.find((a) => a.id === "investigate-unclear-sourcefit");
    expect(UNCLEAR_INVESTIGATION_THRESHOLD).toBe(5);
    expect(thresholdAction?.effectClass).toBe("read-only investigation");
  });

  test("no snapshot queues only the refresh action", () => {
    const actions = buildNextActions(null, checkCoverage([], { maxAgeHours: 30, now: new Date("2026-09-25T08:00:00Z") }));
    expect(actions.map((a) => a.id)).toEqual(["refresh-economics-snapshot"]);
  });
});
