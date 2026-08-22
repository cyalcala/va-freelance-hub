#!/usr/bin/env bun
/**
 * DATA-03: Read-only, source-stratified data-quality cohort baseline.
 *
 * This is a MEASUREMENT tool. It contains only `SELECT` queries and performs no
 * writes of any kind. It is the single source of truth for the cohort SQL: the
 * fixture test (`data-quality-cohorts.test.ts`) and the remote runner workflow
 * (`.github/workflows/gha-data-quality-cohorts.yml`) both consume the exact same
 * query strings emitted here, so the tested query is the executed query.
 *
 * Cohorts (all over the live `opportunities` table):
 *   - activity        : active vs inactive vs total (reconciliation anchors)
 *   - staleness       : active older than 30 days on effective posted date
 *   - unseen          : active not seen in feed for 14+ days
 *   - never-verified  : active never link-verified
 *   - missing-company : active with null/blank company
 *   - undated         : active whose effective date does not parse (date drift)
 *   - eligibility     : PH eligibility distribution over active
 *   - category        : category distribution over active
 *   - inactive-reason : inactive_reason distribution over inactive
 *   - source-strata   : every cohort above, grouped by source_platform
 *   - duplicates      : same lower(title)+lower(company) active groups
 *
 * Cutoffs are fixed from a single `asOf` timestamp (default: now, injectable for
 * deterministic tests) and recorded in the meta output, so a given snapshot and
 * asOf always produce the same report.
 *
 * CLI:
 *   bun scripts/diagnostics/data-quality-cohorts.ts emit <outDir> [--as-of ISO]
 *       writes <outDir>/cohorts.sql, cohorts-plans.sql, cohorts-meta.json
 *   bun scripts/diagnostics/data-quality-cohorts.ts sql   [--as-of ISO]   -> stdout
 *   bun scripts/diagnostics/data-quality-cohorts.ts plans [--as-of ISO]   -> stdout
 *   bun scripts/diagnostics/data-quality-cohorts.ts meta  [--as-of ISO]   -> stdout
 *   bun scripts/diagnostics/data-quality-cohorts.ts reconcile <results.json> <meta.json>
 *       validates that partitions reconcile; exits non-zero on any non-zero delta.
 */

const DAY_SECONDS = 86_400;

export interface Cutoffs {
  /** The instant the cutoffs are measured against. */
  asOf: Date;
  /** Unix seconds; effective posted date strictly before this is "stale". */
  cut30: number;
  /** Unix seconds; last_seen_in_feed_at strictly before this is "unseen". */
  cut14: number;
}

export function computeCutoffs(asOf: Date): Cutoffs {
  const asOfSec = Math.floor(asOf.getTime() / 1000);
  return {
    asOf,
    cut30: asOfSec - 30 * DAY_SECONDS,
    cut14: asOfSec - 14 * DAY_SECONDS,
  };
}

export interface CohortQuery {
  name: string;
  /** One row of aggregates, or many rows for a distribution. */
  shape: "single" | "distribution";
  /** Whether this query is a candidate for an EXPLAIN QUERY PLAN probe. */
  plan: boolean;
  sql: (c: Cutoffs) => string;
}

// Effective posted date = coalesce(posted_at, scraped_at). scraped_at is NOT NULL
// in the schema, so this is null only when the stored text does not parse.
const EFFECTIVE_EPOCH = "unixepoch(coalesce(posted_at, scraped_at))";

/**
 * Ordered cohort queries. Order is the contract between the emitted multi-
 * statement SQL, the wrangler `--json` result array, and reconciliation.
 */
export const COHORT_QUERIES: CohortQuery[] = [
  {
    name: "core_totals",
    shape: "single",
    plan: false,
    sql: () => `SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
FROM opportunities;`,
  },
  {
    name: "active_cohorts",
    shape: "single",
    plan: true,
    sql: (c) => `SELECT
  COUNT(*) AS active,
  SUM(CASE WHEN ${EFFECTIVE_EPOCH} < ${c.cut30} THEN 1 ELSE 0 END) AS stale_30d,
  SUM(CASE WHEN last_seen_in_feed_at IS NOT NULL AND unixepoch(last_seen_in_feed_at) < ${c.cut14} THEN 1 ELSE 0 END) AS unseen_14d,
  SUM(CASE WHEN last_seen_in_feed_at IS NULL THEN 1 ELSE 0 END) AS never_seen_in_feed,
  SUM(CASE WHEN last_verified_at IS NULL THEN 1 ELSE 0 END) AS never_verified,
  SUM(CASE WHEN company IS NULL OR trim(company) = '' THEN 1 ELSE 0 END) AS missing_company,
  SUM(CASE WHEN ${EFFECTIVE_EPOCH} IS NULL THEN 1 ELSE 0 END) AS undated
FROM opportunities
WHERE is_active = 1;`,
  },
  {
    name: "eligibility_dist",
    shape: "distribution",
    plan: false,
    sql: () => `SELECT
  coalesce(ph_eligibility, '(null)') AS ph_eligibility,
  COUNT(*) AS n
FROM opportunities
WHERE is_active = 1
GROUP BY coalesce(ph_eligibility, '(null)')
ORDER BY n DESC, ph_eligibility ASC;`,
  },
  {
    name: "category_dist",
    shape: "distribution",
    plan: false,
    sql: () => `SELECT
  category,
  COUNT(*) AS n
FROM opportunities
WHERE is_active = 1
GROUP BY category
ORDER BY n DESC, category ASC;`,
  },
  {
    name: "inactive_reason_dist",
    shape: "distribution",
    plan: false,
    sql: () => `SELECT
  coalesce(inactive_reason, '(null)') AS inactive_reason,
  COUNT(*) AS n
FROM opportunities
WHERE is_active = 0
GROUP BY coalesce(inactive_reason, '(null)')
ORDER BY n DESC, inactive_reason ASC;`,
  },
  {
    name: "source_cohorts",
    shape: "distribution",
    plan: true,
    sql: (c) => `SELECT
  source_platform,
  COUNT(*) AS active,
  SUM(CASE WHEN ${EFFECTIVE_EPOCH} < ${c.cut30} THEN 1 ELSE 0 END) AS stale_30d,
  SUM(CASE WHEN last_seen_in_feed_at IS NOT NULL AND unixepoch(last_seen_in_feed_at) < ${c.cut14} THEN 1 ELSE 0 END) AS unseen_14d,
  SUM(CASE WHEN last_verified_at IS NULL THEN 1 ELSE 0 END) AS never_verified,
  SUM(CASE WHEN company IS NULL OR trim(company) = '' THEN 1 ELSE 0 END) AS missing_company,
  SUM(CASE WHEN ph_eligibility = 'unclear' THEN 1 ELSE 0 END) AS ph_unclear,
  SUM(CASE WHEN ph_eligibility = 'ineligible' THEN 1 ELSE 0 END) AS ph_ineligible
FROM opportunities
WHERE is_active = 1
GROUP BY source_platform
ORDER BY active DESC, source_platform ASC;`,
  },
  {
    name: "dup_summary",
    shape: "single",
    plan: false,
    sql: () => `SELECT
  COUNT(*) AS dup_groups,
  coalesce(SUM(grp_size), 0) AS rows_in_dup_groups,
  coalesce(SUM(grp_size - 1), 0) AS excess_rows
FROM (
  SELECT COUNT(*) AS grp_size
  FROM opportunities
  WHERE is_active = 1
  GROUP BY lower(title), lower(coalesce(company, ''))
  HAVING COUNT(*) > 1
);`,
  },
  {
    // Capped, redacted sample of the largest duplicate clusters for DATA-06
    // sampling. Public factual metadata only: no URLs, ids, or descriptions.
    name: "dup_top",
    shape: "distribution",
    plan: false,
    sql: () => `SELECT
  MIN(title) AS sample_title,
  MIN(coalesce(company, '')) AS sample_company,
  COUNT(*) AS n
FROM opportunities
WHERE is_active = 1
GROUP BY lower(title), lower(coalesce(company, ''))
HAVING COUNT(*) > 1
ORDER BY n DESC, sample_title ASC
LIMIT 20;`,
  },
];

export function emitSql(c: Cutoffs): string {
  const header = `-- DATA-03 read-only quality cohort bundle
-- asOf: ${c.asOf.toISOString()}
-- cut30 (stale, unix s): ${c.cut30} (${new Date(c.cut30 * 1000).toISOString()})
-- cut14 (unseen, unix s): ${c.cut14} (${new Date(c.cut14 * 1000).toISOString()})
-- Read-only: SELECT statements only, no mutations.
`;
  const body = COHORT_QUERIES.map(
    (q) => `-- [${q.name}]\n${q.sql(c)}`,
  ).join("\n\n");
  return `${header}\n${body}\n`;
}

export function emitPlans(c: Cutoffs): string {
  const header = `-- DATA-03 EXPLAIN QUERY PLAN probes for the heaviest cohorts
-- asOf: ${c.asOf.toISOString()}
`;
  const body = COHORT_QUERIES.filter((q) => q.plan)
    .map((q) => `-- [plan:${q.name}]\nEXPLAIN QUERY PLAN\n${q.sql(c)}`)
    .join("\n\n");
  return `${header}\n${body}\n`;
}

export interface CohortMeta {
  unit: "DATA-03";
  asOf: string;
  cut30Unix: number;
  cut30Iso: string;
  cut14Unix: number;
  cut14Iso: string;
  queryOrder: string[];
}

export function emitMeta(c: Cutoffs): CohortMeta {
  return {
    unit: "DATA-03",
    asOf: c.asOf.toISOString(),
    cut30Unix: c.cut30,
    cut30Iso: new Date(c.cut30 * 1000).toISOString(),
    cut14Unix: c.cut14,
    cut14Iso: new Date(c.cut14 * 1000).toISOString(),
    queryOrder: COHORT_QUERIES.map((q) => q.name),
  };
}

// ─── Reconciliation ───────────────────────────────────────────────────────────
// The report is trustworthy only if independent partitions add up. Every delta
// below must be exactly zero; a non-zero delta means a cohort is mis-counted or
// the data has drift (e.g. mixed date formats) that invalidates the cutoffs.

export interface ReconResult {
  ok: boolean;
  deltas: Record<string, number>;
  notes: string[];
}

type Row = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sumBy(rows: Row[], key: string): number {
  return rows.reduce((acc, r) => acc + num(r[key]), 0);
}

/**
 * @param byName cohort name -> result rows (already extracted from wrangler json)
 */
export function reconcile(byName: Record<string, Row[]>): ReconResult {
  const deltas: Record<string, number> = {};
  const notes: string[] = [];

  const core = byName["core_totals"]?.[0] ?? {};
  const active = num(core["active"]);
  const inactive = num(core["inactive"]);
  const total = num(core["total"]);

  deltas["total_vs_active_plus_inactive"] = total - (active + inactive);

  const activeCohorts = byName["active_cohorts"]?.[0] ?? {};
  deltas["active_cohorts_active_vs_core"] = num(activeCohorts["active"]) - active;

  const elig = byName["eligibility_dist"] ?? [];
  deltas["eligibility_sum_vs_active"] = sumBy(elig, "n") - active;

  const cat = byName["category_dist"] ?? [];
  deltas["category_sum_vs_active"] = sumBy(cat, "n") - active;

  const inactiveReason = byName["inactive_reason_dist"] ?? [];
  deltas["inactive_reason_sum_vs_inactive"] = sumBy(inactiveReason, "n") - inactive;

  const src = byName["source_cohorts"] ?? [];
  deltas["source_active_sum_vs_active"] = sumBy(src, "active") - active;
  deltas["source_stale_sum_vs_global"] =
    sumBy(src, "stale_30d") - num(activeCohorts["stale_30d"]);
  deltas["source_unseen_sum_vs_global"] =
    sumBy(src, "unseen_14d") - num(activeCohorts["unseen_14d"]);
  deltas["source_never_verified_sum_vs_global"] =
    sumBy(src, "never_verified") - num(activeCohorts["never_verified"]);
  deltas["source_missing_company_sum_vs_global"] =
    sumBy(src, "missing_company") - num(activeCohorts["missing_company"]);

  const undated = num(activeCohorts["undated"]);
  if (undated > 0) {
    notes.push(
      `${undated} active rows have an unparseable effective date; they are excluded from the stale cohort. Investigate date-format drift before any stale-based mutation.`,
    );
  }

  const ok = Object.values(deltas).every((d) => d === 0);
  return { ok, deltas, notes };
}

/**
 * Map a wrangler `d1 execute --json --file` result array to cohort name -> rows,
 * using the meta query order. Accepts either the raw array or an object with a
 * `result`/`results` array wrapper (wrangler shapes have varied across versions).
 */
export function extractByName(
  wranglerJson: unknown,
  meta: CohortMeta,
): Record<string, Row[]> {
  let arr: unknown[] = [];
  if (Array.isArray(wranglerJson)) {
    arr = wranglerJson;
  } else if (wranglerJson && typeof wranglerJson === "object") {
    const obj = wranglerJson as Record<string, unknown>;
    if (Array.isArray(obj["result"])) arr = obj["result"] as unknown[];
    else if (Array.isArray(obj["results"])) arr = obj["results"] as unknown[];
  }
  if (arr.length !== meta.queryOrder.length) {
    throw new Error(
      `Result count ${arr.length} does not match query order length ${meta.queryOrder.length}; cannot reconcile.`,
    );
  }
  const byName: Record<string, Row[]> = {};
  meta.queryOrder.forEach((name, i) => {
    const entry = arr[i] as Record<string, unknown> | undefined;
    const rows = (entry && (entry["results"] as Row[] | undefined)) ?? [];
    byName[name] = Array.isArray(rows) ? rows : [];
  });
  return byName;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseAsOf(argv: string[]): Date {
  const flagIdx = argv.indexOf("--as-of");
  const raw =
    flagIdx >= 0 ? argv[flagIdx + 1] : process.env.DATA03_AS_OF ?? undefined;
  if (raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid --as-of value: ${raw}`);
    }
    return d;
  }
  return new Date();
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  const asOf = parseAsOf(process.argv);
  const c = computeCutoffs(asOf);

  switch (cmd) {
    case "sql":
      process.stdout.write(emitSql(c));
      return;
    case "plans":
      process.stdout.write(emitPlans(c));
      return;
    case "meta":
      process.stdout.write(JSON.stringify(emitMeta(c), null, 2) + "\n");
      return;
    case "emit": {
      const { writeFileSync, mkdirSync } = await import("fs");
      const { join } = await import("path");
      const outDir = rest[0];
      if (!outDir) throw new Error("emit requires an output directory argument");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "cohorts.sql"), emitSql(c));
      writeFileSync(join(outDir, "cohorts-plans.sql"), emitPlans(c));
      writeFileSync(
        join(outDir, "cohorts-meta.json"),
        JSON.stringify(emitMeta(c), null, 2) + "\n",
      );
      process.stdout.write(`Wrote cohorts.sql, cohorts-plans.sql, cohorts-meta.json to ${outDir}\n`);
      return;
    }
    case "reconcile": {
      const { readFileSync } = await import("fs");
      const [resultsPath, metaPath] = rest;
      if (!resultsPath || !metaPath) {
        throw new Error("reconcile requires <results.json> <meta.json>");
      }
      const wranglerJson = JSON.parse(readFileSync(resultsPath, "utf-8"));
      const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as CohortMeta;
      const byName = extractByName(wranglerJson, meta);
      const result = reconcile(byName);
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      if (!result.ok) {
        process.stderr.write("Reconciliation FAILED: non-zero partition delta.\n");
        process.exit(1);
      }
      return;
    }
    default:
      process.stderr.write(
        "Usage: data-quality-cohorts.ts <emit <dir>|sql|plans|meta|reconcile <results.json> <meta.json>> [--as-of ISO]\n",
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
