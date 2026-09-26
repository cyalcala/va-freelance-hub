/**
 * Executable metric semantics for Master Operating Constitution v3.0 Parts VIII–X.
 *
 * The markdown queries are not enforcement. These functions are.
 * An empty adjudication sample is UNKNOWN, never a 0% error rate.
 * A missing source date is OTHER_NON_FRESH, never FRESH_DISCOVERY.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CREATION_COHORTS = [
  "REACTIVATION",
  "REPLAY_RECOVERY",
  "BACKLOG_IMPORT",
  "FRESH_DISCOVERY",
  "OTHER_NON_FRESH",
] as const;

export type CreationCohort = (typeof CREATION_COHORTS)[number];

export const TOP_SOURCE_SHARE_MAX = 0.25;
export const TOP_PROVIDER_FAMILY_SHARE_MAX = 0.4;
export const FALSE_PH_RATE_MAX = 0.01;
export const FALSE_REMOTE_RATE_MAX = 0.005;
export const MIN_GROUND_TRUTH_SAMPLE = 50;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface CohortInput {
  createdAt: string;
  sourcePostedAt: string | null;
  manilaDayStartUtc: string;
  previouslyInactive: boolean;
  replayRecovery: boolean;
  freshHarvestVerified: boolean;
  historicalBackfill: boolean;
}

export interface ShareRow {
  id: string;
  count: number;
}

export interface ConcentrationReport {
  total: number;
  topId: string | null;
  topShare: number | null;
  status: "UNKNOWN" | "OK" | "BREACH";
  breaches: Array<{ id: string; share: number }>;
}

export type SystemPrediction = "eligible" | "ineligible" | "remote" | "non_remote" | "unclear";

export interface AdjudicationSample {
  systemPrediction: SystemPrediction;
  groundTruthVerdict: SystemPrediction;
}

export type QualityMeasurement =
  | { status: "UNKNOWN"; sampleSize: number; reason: string }
  | {
      status: "INSUFFICIENT_SAMPLE";
      sampleSize: number;
      required: number;
      falsePhCount: number;
      falseRemoteCount: number;
      falsePhRate: number;
      falseRemoteRate: number;
    }
  | {
      status: "MEASURED";
      sampleSize: number;
      falsePhCount: number;
      falseRemoteCount: number;
      falsePhRate: number;
      falseRemoteRate: number;
    };

export interface PaperAuditResult {
  errors: string[];
  warnings: string[];
}

export function classifyCreationCohort(input: CohortInput): CreationCohort {
  const created = Date.parse(input.createdAt);
  const windowStart = Date.parse(input.manilaDayStartUtc);
  if (!Number.isFinite(created) || !Number.isFinite(windowStart)) return "OTHER_NON_FRESH";
  // Priority matches METRICS.md §1.1. Earlier returns make the cohorts exclusive.
  if (input.previouslyInactive || created < windowStart) return "REACTIVATION";
  if (input.replayRecovery) return "REPLAY_RECOVERY";
  if (input.historicalBackfill) return "BACKLOG_IMPORT";
  if (input.sourcePostedAt) {
    const posted = Date.parse(input.sourcePostedAt);
    if (!Number.isFinite(posted)) return "OTHER_NON_FRESH";
    const ageMs = created - posted;
    if (ageMs < 0) return "OTHER_NON_FRESH";
    if (ageMs > SEVEN_DAYS_MS) return "BACKLOG_IMPORT";
    return "FRESH_DISCOVERY";
  }
  return input.freshHarvestVerified ? "FRESH_DISCOVERY" : "OTHER_NON_FRESH";
}

export function providerFamily(sourceId: string): string {
  const trimmed = sourceId.trim();
  if (!trimmed) return "unknown";
  const separator = trimmed.indexOf(":");
  return separator <= 0 ? trimmed : trimmed.slice(0, separator);
}

export function familyShares(rows: Array<{ sourceId: string; count: number }>): ShareRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!(row.count > 0)) continue;
    const family = providerFamily(row.sourceId);
    totals.set(family, (totals.get(family) ?? 0) + row.count);
  }
  return [...totals.entries()].map(([id, count]) => ({ id, count }));
}

export function concentrationReport(rows: ShareRow[], ceiling: number): ConcentrationReport {
  if (!(ceiling > 0 && ceiling <= 1)) {
    throw new Error("concentration ceiling must be in (0, 1]");
  }
  const usable = rows.filter((row) => row.count > 0 && row.id.trim().length > 0);
  const total = usable.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) {
    return { total: 0, topId: null, topShare: null, status: "UNKNOWN", breaches: [] };
  }
  const ranked = [...usable].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const breaches = ranked
    .map((row) => ({ id: row.id, share: row.count / total }))
    .filter((row) => row.share > ceiling);
  const top = ranked[0];
  const topShare = top.count / total;
  return {
    total,
    topId: top.id,
    topShare,
    status: topShare > ceiling ? "BREACH" : "OK",
    breaches,
  };
}

export function measureGroundTruth(samples: AdjudicationSample[]): QualityMeasurement {
  const sampleSize = samples.length;
  if (sampleSize === 0) {
    return {
      status: "UNKNOWN",
      sampleSize: 0,
      reason: "no independent adjudication samples; do not report 0%",
    };
  }
  const falsePhCount = samples.filter(
    (sample) => sample.systemPrediction === "eligible" && sample.groundTruthVerdict === "ineligible",
  ).length;
  const falseRemoteCount = samples.filter(
    (sample) => sample.systemPrediction === "remote" && sample.groundTruthVerdict === "non_remote",
  ).length;
  const falsePhRate = falsePhCount / sampleSize;
  const falseRemoteRate = falseRemoteCount / sampleSize;
  if (sampleSize < MIN_GROUND_TRUTH_SAMPLE) {
    return {
      status: "INSUFFICIENT_SAMPLE",
      sampleSize,
      required: MIN_GROUND_TRUTH_SAMPLE,
      falsePhCount,
      falseRemoteCount,
      falsePhRate,
      falseRemoteRate,
    };
  }
  return {
    status: "MEASURED",
    sampleSize,
    falsePhCount,
    falseRemoteCount,
    falsePhRate,
    falseRemoteRate,
  };
}

export function qualityCeilingStatus(
  measurement: QualityMeasurement,
  falsePhCeiling = FALSE_PH_RATE_MAX,
  falseRemoteCeiling = FALSE_REMOTE_RATE_MAX,
): "PASS" | "FAIL" | "UNKNOWN" {
  if (measurement.status !== "MEASURED") return "UNKNOWN";
  if (measurement.falsePhRate > falsePhCeiling || measurement.falseRemoteRate > falseRemoteCeiling) return "FAIL";
  return "PASS";
}

function sameNumber(actual: unknown, expected: number): boolean {
  return typeof actual === "number" && Number.isFinite(actual) && Math.abs(actual - expected) < 1e-12;
}

export function auditPaperSystems(
  rootDir: string = join(import.meta.dir, "../.."),
  metricsOverride?: string,
): PaperAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const migrationPath = join(rootDir, "packages/db/migrations/0050_adjudication_audit_samples.sql");
  const schemaPath = join(rootDir, "packages/db/schema.ts");
  const metricsPath = join(rootDir, "docs/METRICS.md");
  const yamlPath = join(rootDir, "docs/ACCEPTED_PARAMETERS.yaml");

  if (!existsSync(migrationPath)) {
    errors.push("packages/db/migrations/0050_adjudication_audit_samples.sql: missing");
  } else {
    const sql = readFileSync(migrationPath, "utf-8");
    if (!sql.includes("CREATE TABLE IF NOT EXISTS adjudication_audit_samples")) {
      errors.push("0050: adjudication_audit_samples table is not created");
    }
    if (!sql.includes("ground_truth_verdict") || !sql.includes("system_prediction")) {
      errors.push("0050: system_prediction and ground_truth_verdict must be separate columns");
    }
    if (!sql.includes("length(adjudicator) > 0")) {
      errors.push("0050: empty adjudicator must be rejected");
    }
  }

  if (!existsSync(schemaPath) || !readFileSync(schemaPath, "utf-8").includes('sqliteTable("adjudication_audit_samples"')) {
    errors.push("packages/db/schema.ts: adjudication_audit_samples is not declared");
  }

  let metrics = metricsOverride;
  if (metrics === undefined) {
    if (!existsSync(metricsPath)) {
      errors.push("docs/METRICS.md: missing");
      metrics = "";
    } else {
      metrics = readFileSync(metricsPath, "utf-8");
    }
  }
  if (metrics.includes("ELSE 'FRESH_DISCOVERY'")) {
    errors.push("docs/METRICS.md: Query 1 must not assign unknown rows to FRESH_DISCOVERY");
  }
  if (!metrics.includes("ELSE 'OTHER_NON_FRESH'")) {
    errors.push("docs/METRICS.md: Query 1 must classify unknown rows as OTHER_NON_FRESH");
  }
  if (!metrics.includes("FROM adjudication_audit_samples")) {
    errors.push("docs/METRICS.md: Query 3B must read adjudication_audit_samples");
  }
  if (!metrics.includes("measurement_status")) {
    errors.push("docs/METRICS.md: Query 3B must emit measurement_status and must not imply 0% from an empty sample");
  }
  if (!metrics.includes("scripts/ci/constitution-metrics.ts")) {
    errors.push("docs/METRICS.md: must name the executable classifier scripts/ci/constitution-metrics.ts");
  }

  if (!existsSync(yamlPath)) {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing");
  } else {
    const yamlText = readFileSync(yamlPath, "utf-8");
    let parsed: any;
    try {
      parsed = (Bun as any).YAML.parse(yamlText);
    } catch (error) {
      errors.push(`docs/ACCEPTED_PARAMETERS.yaml: invalid YAML (${error instanceof Error ? error.message : String(error)})`);
      parsed = null;
    }
    if (parsed) {
      if (!sameNumber(parsed.diversity?.top_source_share_max, TOP_SOURCE_SHARE_MAX)) {
        errors.push("diversity.top_source_share_max drifted from constitution-metrics.ts TOP_SOURCE_SHARE_MAX");
      }
      if (!sameNumber(parsed.diversity?.top_provider_family_share_max, TOP_PROVIDER_FAMILY_SHARE_MAX)) {
        errors.push("diversity.top_provider_family_share_max drifted from constitution-metrics.ts TOP_PROVIDER_FAMILY_SHARE_MAX");
      }
      if (!sameNumber(parsed.quality?.false_ph_eligibility_rate_max, FALSE_PH_RATE_MAX)) {
        errors.push("quality.false_ph_eligibility_rate_max drifted from constitution-metrics.ts FALSE_PH_RATE_MAX");
      }
      if (!sameNumber(parsed.quality?.false_remote_classification_rate_max, FALSE_REMOTE_RATE_MAX)) {
        errors.push("quality.false_remote_classification_rate_max drifted from constitution-metrics.ts FALSE_REMOTE_RATE_MAX");
      }
    }
  }

  warnings.push(
    "REPLAY_RECOVERY and previouslyInactive are caller-supplied flags. opportunities has no replay column, so production SQL cannot see them and must not invent FRESH_DISCOVERY for that gap.",
  );
  warnings.push(
    "Concentration status is a measurement. It does not throttle publication; an automatic brake remains a paper risk because cutting the top family can drop flow below the floor.",
  );

  return { errors, warnings };
}
