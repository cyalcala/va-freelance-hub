#!/usr/bin/env bun
/**
 * Versioned daily outcome snapshots over the existing SP-02 economics pipeline.
 *
 * This extends the existing `source-economics.ts` collector — it does not add a
 * second collector, clock, or D1 write. A refreshed `latest` Markdown report is
 * a pointer, not durable trend data; this module persists comparable
 * timestamped JSON snapshots plus a `latest.json` pointer so 28/30-day outcome
 * claims survive the 14-day raw-event retention window.
 *
 * Each snapshot carries: schema/metric version, generated time, run ID, window
 * bounds (UTC), the headline metrics, reconciliation status, fixed limitation
 * strings, and the prior comparable snapshot value. Snapshots are pure reads of
 * an already-collected `combined.json` — no D1 access here at all.
 *
 * The `check` subcommand is a detector, not an enforcer: it reports freshness
 * (stale latest snapshot), day coverage (missing UTC dates), and a ranked,
 * evidence-backed next-step queue of read-only investigations. It never
 * mutates sources, never promotes, and never deactivates anything; a stale
 * telemetry finding is a measurement incident to investigate, not an automatic
 * action.
 *
 * CLI:
 *   bun scripts/diagnostics/economics-snapshot.ts snapshot <combined.json> <outDir>
 *       [--run-id ID] [--generated-at ISO]
 *       writes snapshots/<key>.json + latest.json, refuses a failed reconciliation
 *   bun scripts/diagnostics/economics-snapshot.ts check <outDir> [--max-age-hours N] [--now ISO]
 *       prints coverage + next-step queue JSON; exit 0 always (detector)
 *   bun scripts/diagnostics/economics-snapshot.ts prune <outDir> [--retention-days N] [--now ISO]
 *       deletes snapshots older than retention; never deletes the latest pointer's file
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
  foldProviderFamilies,
  summarizeConcentration,
  type EconMeta,
  type ReconResult,
} from "./source-economics";

export const ECONOMICS_SNAPSHOT_SCHEMA_VERSION = 1;
export const DEFAULT_MAX_AGE_HOURS = 30;
export const DEFAULT_RETENTION_DAYS = 90;
/** Bounded iteration guard for missing-day detection. */
const MAX_COVERAGE_DAYS = 400;
/** Unclear-cohort size above which a stratified investigation is queued. */
export const UNCLEAR_INVESTIGATION_THRESHOLD = 5;

export interface EconomicsSnapshot {
  schemaVersion: number;
  /** Metric/query contract version, carried from the economics meta unit. */
  metricVersion: string;
  generatedAt: string;
  runId?: string;
  window: {
    asOf: string;
    cut7Unix: number;
    cut14Unix: number;
    cut30Unix: number;
    timezone: "UTC";
  };
  status: "measured";
  metrics: {
    qualifiedActive: number;
    qualifiedNew7d: number;
    qualifiedPerDay7d: number;
    qualifiedNew30d: number;
    qualifiedPerDay30d: number;
    allActive: number;
    identityCoverage: { total: number; withSourceId: number; share: number };
    concentration30d: {
      topFamily: string;
      topShare: number;
      top3Share: number;
      topWarn: boolean;
      top3Warn: boolean;
    };
    /** Largest 7-day unclear cohorts; stratified investigation inputs only. */
    largestUnclear7d: Array<{ sourceId: string; unclear: number }>;
  };
  reconciliation: { ok: boolean; nonZeroDeltas: string[] };
  limitations: string[];
  prior: {
    snapshotKey: string;
    generatedAt: string;
    qualifiedNew7d: number;
    qualifiedPerDay7d: number;
  } | null;
}

type Row = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const LIMITATIONS: readonly string[] = [
  "First-stored proxy: not verified remote-only first publication.",
  "Current-active filtering has survivorship bias.",
  "scraped_at is the storage instant; canonical first-publication history is not reconstructed.",
  "UTC windows; the product-target Manila-day reconciliation remains a separate contract.",
  "largestUnclear7d cohorts are investigation inputs; unclear rows are not counted as salvageable.",
];

export function buildSnapshot(input: {
  combined: { meta: EconMeta; byName: Record<string, Row[]>; reconciliation: ReconResult };
  generatedAt: Date;
  runId?: string;
  prior?: EconomicsSnapshot | null;
}): EconomicsSnapshot {
  const { combined, generatedAt } = input;
  const qualified = combined.byName["qualified_supply"]?.[0] ?? {};
  const identity = combined.byName["identity_coverage"]?.[0] ?? {};
  const totals = combined.byName["supply_totals"]?.[0] ?? {};
  const triage = combined.byName["triage_outcomes_7d"] ?? [];
  const families = foldProviderFamilies(combined.byName["source_supply"] ?? []);
  const conc30 = summarizeConcentration(families, "net_new_30d");
  const identityTotal = num(identity["total"]);
  const identityWithId = num(identity["with_source_id"]);

  const nonZeroDeltas = Object.entries(combined.reconciliation.deltas)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k}=${v}`);

  const largestUnclear7d = triage
    .map((r) => ({ sourceId: String(r["source_id"] ?? "(unknown)"), unclear: num(r["unclear"]) }))
    .filter((r) => r.unclear > 0)
    .sort((a, b) => b.unclear - a.unclear || a.sourceId.localeCompare(b.sourceId))
    .slice(0, 5);

  return {
    schemaVersion: ECONOMICS_SNAPSHOT_SCHEMA_VERSION,
    metricVersion: combined.meta.unit,
    generatedAt: generatedAt.toISOString(),
    runId: input.runId,
    window: {
      asOf: combined.meta.asOf,
      cut7Unix: combined.meta.cut7Unix,
      cut14Unix: combined.meta.cut14Unix,
      cut30Unix: combined.meta.cut30Unix,
      timezone: "UTC",
    },
    status: "measured",
    metrics: {
      qualifiedActive: num(qualified["qualified_active"]),
      qualifiedNew7d: num(qualified["qualified_new_7d"]),
      qualifiedPerDay7d: num(qualified["qualified_new_7d"]) / 7,
      qualifiedNew30d: num(qualified["qualified_new_30d"]),
      qualifiedPerDay30d: num(qualified["qualified_new_30d"]) / 30,
      allActive: num(totals["active"]),
      identityCoverage: {
        total: identityTotal,
        withSourceId: identityWithId,
        share: identityTotal > 0 ? identityWithId / identityTotal : 0,
      },
      concentration30d: {
        topFamily: conc30.topFamily,
        topShare: conc30.topShare,
        top3Share: conc30.top3Share,
        topWarn: conc30.topWarn,
        top3Warn: conc30.top3Warn,
      },
      largestUnclear7d,
    },
    reconciliation: { ok: combined.reconciliation.ok, nonZeroDeltas },
    limitations: [...LIMITATIONS],
    prior: input.prior
      ? {
          snapshotKey: snapshotKeyFor(new Date(input.prior.generatedAt)),
          generatedAt: input.prior.generatedAt,
          qualifiedNew7d: input.prior.metrics.qualifiedNew7d,
          qualifiedPerDay7d: input.prior.metrics.qualifiedPerDay7d,
        }
      : null,
  };
}

/** Filesystem-safe snapshot key from the generated instant. */
export function snapshotKeyFor(generatedAt: Date): string {
  return generatedAt.toISOString().replace(/[:.]/g, "-");
}

export interface SnapshotWriteResult {
  key: string;
  snapshotPath: string;
  latestPath: string;
}

export function writeSnapshot(outDir: string, snapshot: EconomicsSnapshot): SnapshotWriteResult {
  const snapshotsDir = join(outDir, "snapshots");
  mkdirSync(snapshotsDir, { recursive: true });
  const key = snapshotKeyFor(new Date(snapshot.generatedAt));
  const snapshotPath = join(snapshotsDir, `${key}.json`);
  const latestPath = join(outDir, "latest.json");
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
  writeFileSync(latestPath, JSON.stringify({ latestSnapshot: key, generatedAt: snapshot.generatedAt }, null, 2) + "\n");
  return { key, snapshotPath, latestPath };
}

export interface SnapshotCoverage {
  snapshotCount: number;
  firstSnapshotKey: string | null;
  latestSnapshotKey: string | null;
  latestGeneratedAt: string | null;
  latestAgeHours: number | null;
  stale: boolean;
  /** UTC dates between the first and latest snapshot with no snapshot file. */
  missingDays: string[];
}

export function checkCoverage(
  entries: Array<{ key: string; generatedAt: string }>,
  options: { maxAgeHours?: number; now?: Date },
): SnapshotCoverage {
  const maxAgeHours = options.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  const now = options.now ?? new Date();
  const sorted = [...entries].sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
  const first = sorted[0] ?? null;
  const latest = sorted[sorted.length - 1] ?? null;
  const latestAgeHours = latest
    ? (now.getTime() - Date.parse(latest.generatedAt)) / 3_600_000
    : null;
  const missingDays: string[] = [];
  if (first && latest) {
    const dates = new Set(sorted.map((e) => e.generatedAt.slice(0, 10)));
    const cursor = new Date(first.generatedAt.slice(0, 10) + "T00:00:00Z");
    const endUtcDate = latest.generatedAt.slice(0, 10);
    for (let i = 0; i < MAX_COVERAGE_DAYS && cursor.toISOString().slice(0, 10) <= endUtcDate; i++) {
      const day = cursor.toISOString().slice(0, 10);
      if (!dates.has(day)) missingDays.push(day);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return {
    snapshotCount: sorted.length,
    firstSnapshotKey: first?.key ?? null,
    latestSnapshotKey: latest?.key ?? null,
    latestGeneratedAt: latest?.generatedAt ?? null,
    latestAgeHours,
    stale: latestAgeHours === null ? true : latestAgeHours > maxAgeHours,
    missingDays,
  };
}

/** A detector-proposed, read-only next step. Never an automatic action. */
export interface NextAction {
  id: string;
  kind: "reconcile" | "refresh" | "investigate";
  evidence: string;
  effectClass: "read-only investigation";
}

export function buildNextActions(
  snapshot: EconomicsSnapshot | null,
  coverage: SnapshotCoverage,
): NextAction[] {
  const actions: NextAction[] = [];
  if (snapshot && !snapshot.reconciliation.ok) {
    actions.push({
      id: "reconcile-partition-deltas",
      kind: "reconcile",
      evidence: `non-zero partition deltas: ${snapshot.reconciliation.nonZeroDeltas.join(", ")}`,
      effectClass: "read-only investigation",
    });
  }
  if (coverage.stale) {
    actions.push({
      id: "refresh-economics-snapshot",
      kind: "refresh",
      evidence: coverage.latestSnapshotKey
        ? `latest snapshot ${coverage.latestSnapshotKey} is ${Math.round(coverage.latestAgeHours ?? 0)}h old (max ${DEFAULT_MAX_AGE_HOURS}h)`
        : "no snapshot exists yet",
      effectClass: "read-only investigation",
    });
  }
  if (coverage.missingDays.length > 0) {
    actions.push({
      id: "backfill-missing-days",
      kind: "refresh",
      evidence: `${coverage.missingDays.length} UTC day(s) without a snapshot between ${coverage.missingDays[0]} and ${coverage.missingDays[coverage.missingDays.length - 1]}`,
      effectClass: "read-only investigation",
    });
  }
  if (!snapshot) return actions;
  const conc = snapshot.metrics.concentration30d;
  if (conc.topWarn || conc.top3Warn) {
    actions.push({
      id: "investigate-provider-concentration",
      kind: "investigate",
      evidence: `net-new 30d top family ${conc.topFamily} at ${(conc.topShare * 100).toFixed(1)}%${conc.topWarn ? " (>40% SLO)" : ""}; top-3 ${(conc.top3Share * 100).toFixed(1)}%${conc.top3Warn ? " (>70% SLO)" : ""}`,
      effectClass: "read-only investigation",
    });
  }
  for (const cohort of snapshot.metrics.largestUnclear7d) {
    if (cohort.unclear >= UNCLEAR_INVESTIGATION_THRESHOLD) {
      actions.push({
        id: `investigate-unclear-${cohort.sourceId}`,
        kind: "investigate",
        evidence: `${cohort.unclear} unclear rows in the 7d cohort; stratified evidence investigation required before counting any as recoverable`,
        effectClass: "read-only investigation",
      });
    }
  }
  return actions;
}

export function loadSnapshotFiles(outDir: string): {
  latest: EconomicsSnapshot | null;
  entries: Array<{ key: string; generatedAt: string }>;
  latestPointerPath: string;
} {
  const snapshotsDir = join(outDir, "snapshots");
  const latestPointerPath = join(outDir, "latest.json");
  const entries: Array<{ key: string; generatedAt: string }> = [];
  if (existsSync(snapshotsDir)) {
    for (const name of readdirSync(snapshotsDir).filter((n) => n.endsWith(".json")).sort()) {
      try {
        const parsed = JSON.parse(readFileSync(join(snapshotsDir, name), "utf-8")) as EconomicsSnapshot;
        entries.push({ key: name.replace(/\.json$/, ""), generatedAt: parsed.generatedAt });
      } catch {
        // A malformed snapshot is retained as failed-collection evidence, not deleted.
      }
    }
  }
  let latest: EconomicsSnapshot | null = null;
  if (existsSync(latestPointerPath)) {
    try {
      const pointer = JSON.parse(readFileSync(latestPointerPath, "utf-8")) as { latestSnapshot: string };
      const path = join(snapshotsDir, `${pointer.latestSnapshot}.json`);
      if (existsSync(path)) latest = JSON.parse(readFileSync(path, "utf-8")) as EconomicsSnapshot;
    } catch {
      latest = null;
    }
  }
  return { latest, entries, latestPointerPath };
}

export function pruneSnapshots(
  outDir: string,
  options: { retentionDays?: number; now?: Date },
): { removed: string[]; kept: number } {
  const retentionDays = options.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const now = options.now ?? new Date();
  const snapshotsDir = join(outDir, "snapshots");
  if (!existsSync(snapshotsDir)) return { removed: [], kept: 0 };
  const { latest } = loadSnapshotFiles(outDir);
  const protectedKey = latest ? snapshotKeyFor(new Date(latest.generatedAt)) : null;
  const removed: string[] = [];
  let kept = 0;
  for (const name of readdirSync(snapshotsDir).filter((n) => n.endsWith(".json")).sort()) {
    const key = name.replace(/\.json$/, "");
    if (key === protectedKey) { kept += 1; continue; }
    try {
      const parsed = JSON.parse(readFileSync(join(snapshotsDir, name), "utf-8")) as EconomicsSnapshot;
      const ageDays = (now.getTime() - Date.parse(parsed.generatedAt)) / 86_400_000;
      if (ageDays > retentionDays) {
        unlinkSync(join(snapshotsDir, name));
        removed.push(key);
      } else {
        kept += 1;
      }
    } catch {
      // Malformed snapshots are retained, never silently deleted.
      kept += 1;
    }
  }
  return { removed, kept };
}

// ─── CLI ────────────────────────────────────────────────────────────────────────

function flagValue(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  const nowRaw = flagValue(process.argv, "--now");
  const now = nowRaw ? new Date(nowRaw) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid --now value: ${nowRaw}`);

  switch (cmd) {
    case "snapshot": {
      const [combinedPath, outDir] = rest;
      if (!combinedPath || !outDir) throw new Error("snapshot requires <combined.json> <outDir>");
      const combined = JSON.parse(readFileSync(combinedPath, "utf-8")) as {
        meta: EconMeta; byName: Record<string, Row[]>; reconciliation: ReconResult;
      };
      if (!combined.reconciliation?.ok) {
        throw new Error("Refusing to write a measured snapshot from a failed reconciliation; fix the partition deltas first.");
      }
      const generatedAtRaw = flagValue(process.argv, "--generated-at");
      const generatedAt = generatedAtRaw ? new Date(generatedAtRaw) : now;
      if (Number.isNaN(generatedAt.getTime())) throw new Error(`Invalid --generated-at value: ${generatedAtRaw}`);
      const { latest } = loadSnapshotFiles(outDir);
      const runId = flagValue(process.argv, "--run-id");
      const snapshot = buildSnapshot({ combined, generatedAt, runId, prior: latest });
      const written = writeSnapshot(outDir, snapshot);
      process.stdout.write(JSON.stringify({
        key: written.key,
        snapshotPath: written.snapshotPath,
        latestPath: written.latestPath,
        metricVersion: snapshot.metricVersion,
        qualifiedNew7d: snapshot.metrics.qualifiedNew7d,
        qualifiedPerDay7d: Number(snapshot.metrics.qualifiedPerDay7d.toFixed(2)),
        prior: snapshot.prior,
      }, null, 2) + "\n");
      return;
    }
    case "check": {
      const [outDir] = rest;
      if (!outDir) throw new Error("check requires <outDir>");
      const maxAgeRaw = flagValue(process.argv, "--max-age-hours");
      const maxAgeHours = maxAgeRaw ? Number(maxAgeRaw) : DEFAULT_MAX_AGE_HOURS;
      const { latest, entries } = loadSnapshotFiles(outDir);
      const coverage = checkCoverage(entries, { maxAgeHours, now });
      const actions = buildNextActions(latest, coverage);
      const status = actions.length > 0 ? "attention" : "ok";
      process.stdout.write(JSON.stringify({ status, coverage, nextActions: actions }, null, 2) + "\n");
      return;
    }
    case "prune": {
      const [outDir] = rest;
      if (!outDir) throw new Error("prune requires <outDir>");
      const retentionRaw = flagValue(process.argv, "--retention-days");
      const retentionDays = retentionRaw ? Number(retentionRaw) : DEFAULT_RETENTION_DAYS;
      const result = pruneSnapshots(outDir, { retentionDays, now });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    default:
      process.stderr.write(
        "Usage: economics-snapshot.ts <snapshot <combined.json> <outDir>|check <outDir>|prune <outDir>> [--run-id ID] [--max-age-hours N] [--retention-days N] [--now ISO]\n",
      );
      process.exit(2);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
}
