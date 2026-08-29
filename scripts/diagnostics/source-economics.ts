#!/usr/bin/env bun
/**
 * SP-02: Read-only source-economics baseline, keyed on the exact `source_id`
 * that SP-01 now persists on every new opportunity.
 *
 * This is a MEASUREMENT tool. It contains only `SELECT` queries and performs no
 * writes of any kind. Like `data-quality-cohorts.ts`, this module is the single
 * source of truth for the SQL: the fixture test and any remote runner consume
 * the exact query strings emitted here, so the tested query is the executed
 * query and the tested report is the generated report.
 *
 * What it answers (replacing "items seen" as a supply proxy):
 *   - identity_coverage : how many rows carry an exact source_id vs the legacy
 *                         NULL gap SP-01 does not backfill.
 *   - supply_totals     : net-new accepted (active) jobs at 7/14/30-day
 *                         freshness — the primary supply KPI.
 *   - source_supply     : the same, grouped by the exact source_id (concentration
 *                         and net-new per source).
 *   - fetch_outcomes_7d : per-source real fetches vs intentional skips vs
 *                         failures vs zero-yield, from source_fetch_events, so a
 *                         quiet source is not confused with a failing one.
 *
 * Provider-family folding (ADR-006 §7: count provider/origin family, not token)
 * and concentration SLO flags are computed in tested TS from the per-source_id
 * rows, so the SQL stays simple and the family logic stays auditable.
 *
 * CLI:
 *   bun scripts/diagnostics/source-economics.ts sql   [--as-of ISO]  -> stdout
 *   bun scripts/diagnostics/source-economics.ts meta  [--as-of ISO]  -> stdout
 *   bun scripts/diagnostics/source-economics.ts emit <outDir> [--as-of ISO]
 *       writes queries/<name>.sql and economics-meta.json
 *   bun scripts/diagnostics/source-economics.ts collect <resultsDir> <meta.json> [combinedOut.json]
 *       reassembles per-query `--command --json` outputs, reconciles, prints/writes combined JSON
 *   bun scripts/diagnostics/source-economics.ts report <combined.json> [--as-of ISO]
 *       renders the markdown baseline from a combined.json (or {byName,meta})
 */

const DAY_SECONDS = 86_400;

export interface Windows {
  /** The instant the freshness windows are measured against. */
  asOf: Date;
  /** Unix seconds; scraped_at at/after this is "net-new in 7 days". */
  cut7: number;
  cut14: number;
  cut30: number;
}

export function computeWindows(asOf: Date): Windows {
  const asOfSec = Math.floor(asOf.getTime() / 1000);
  return {
    asOf,
    cut7: asOfSec - 7 * DAY_SECONDS,
    cut14: asOfSec - 14 * DAY_SECONDS,
    cut30: asOfSec - 30 * DAY_SECONDS,
  };
}

export interface EconQuery {
  name: string;
  shape: "single" | "distribution";
  sql: (w: Windows) => string;
}

// Net-new "accepted" supply = an active row first stored within the window.
// scraped_at is the insert instant (observedAt); reactivation touches
// updated_at/last_seen_in_feed_at, not scraped_at, so it is a stable first-seen
// proxy. unixepoch parses both ISO-8601 (with Z/fraction) and space forms.
const SCRAPED_EPOCH = "unixepoch(scraped_at)";

/**
 * Ordered queries. Order is the contract between the emitted per-query SQL, the
 * wrangler `--json` result array, and reconciliation.
 */
export const ECONOMICS_QUERIES: EconQuery[] = [
  {
    name: "identity_coverage",
    shape: "single",
    sql: () => `SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive,
  SUM(CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END) AS with_source_id,
  SUM(CASE WHEN source_id IS NULL THEN 1 ELSE 0 END) AS null_source_id,
  SUM(CASE WHEN is_active = 1 AND source_id IS NOT NULL THEN 1 ELSE 0 END) AS active_with_source_id,
  SUM(CASE WHEN is_active = 1 AND source_id IS NULL THEN 1 ELSE 0 END) AS active_null_source_id
FROM opportunities;`,
  },
  {
    name: "supply_totals",
    shape: "single",
    sql: (w) => `SELECT
  COUNT(*) AS active,
  SUM(CASE WHEN ${SCRAPED_EPOCH} >= ${w.cut7} THEN 1 ELSE 0 END) AS net_new_7d,
  SUM(CASE WHEN ${SCRAPED_EPOCH} >= ${w.cut14} THEN 1 ELSE 0 END) AS net_new_14d,
  SUM(CASE WHEN ${SCRAPED_EPOCH} >= ${w.cut30} THEN 1 ELSE 0 END) AS net_new_30d
FROM opportunities
WHERE is_active = 1;`,
  },
  {
    name: "source_supply",
    shape: "distribution",
    sql: (w) => `SELECT
  coalesce(source_id, '(unknown)') AS source_id,
  MIN(source_platform) AS source_platform,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = 1 AND ${SCRAPED_EPOCH} >= ${w.cut7} THEN 1 ELSE 0 END) AS net_new_7d,
  SUM(CASE WHEN is_active = 1 AND ${SCRAPED_EPOCH} >= ${w.cut14} THEN 1 ELSE 0 END) AS net_new_14d,
  SUM(CASE WHEN is_active = 1 AND ${SCRAPED_EPOCH} >= ${w.cut30} THEN 1 ELSE 0 END) AS net_new_30d,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
FROM opportunities
GROUP BY coalesce(source_id, '(unknown)')
ORDER BY active DESC, source_id ASC;`,
  },
  {
    name: "fetch_outcomes_7d",
    shape: "distribution",
    // Reserved diagnostic rows (__scrape_run_lock__, __sweep_diag__, …) are not
    // sources; exclude any id whose first two chars are "__".
    sql: (w) => `SELECT
  source_id,
  SUM(CASE WHEN ok = 1 AND skipped = 0 THEN 1 ELSE 0 END) AS real_fetches,
  SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS skips,
  SUM(CASE WHEN ok = 0 AND skipped = 0 THEN 1 ELSE 0 END) AS failures,
  SUM(CASE WHEN ok = 1 AND skipped = 0 AND count = 0 THEN 1 ELSE 0 END) AS zero_yield,
  SUM(CASE WHEN ok = 1 AND skipped = 0 THEN count ELSE 0 END) AS items
FROM source_fetch_events
WHERE unixepoch(timestamp) >= ${w.cut7}
  AND substr(source_id, 1, 2) <> '__'
GROUP BY source_id
ORDER BY real_fetches DESC, source_id ASC;`,
  },
];

export function emitSql(w: Windows): string {
  const header = `-- SP-02 read-only source-economics bundle
-- asOf: ${w.asOf.toISOString()}
-- cut7  (unix s): ${w.cut7} (${new Date(w.cut7 * 1000).toISOString()})
-- cut14 (unix s): ${w.cut14} (${new Date(w.cut14 * 1000).toISOString()})
-- cut30 (unix s): ${w.cut30} (${new Date(w.cut30 * 1000).toISOString()})
-- Read-only: SELECT statements only, no mutations.
`;
  const body = ECONOMICS_QUERIES.map((q) => `-- [${q.name}]\n${q.sql(w)}`).join("\n\n");
  return `${header}\n${body}\n`;
}

export interface EconMeta {
  unit: "SP-02";
  asOf: string;
  cut7Unix: number;
  cut14Unix: number;
  cut30Unix: number;
  queryOrder: string[];
}

export function emitMeta(w: Windows): EconMeta {
  return {
    unit: "SP-02",
    asOf: w.asOf.toISOString(),
    cut7Unix: w.cut7,
    cut14Unix: w.cut14,
    cut30Unix: w.cut30,
    queryOrder: ECONOMICS_QUERIES.map((q) => q.name),
  };
}

// ─── Provider families and concentration (ADR-006 §7) ──────────────────────────

type Row = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sumBy(rows: Row[], key: string): number {
  return rows.reduce((acc, r) => acc + num(r[key]), 0);
}

export const UNKNOWN_SOURCE = "(unknown)";

// Static source ids that share one provider/origin risk family. The two Jobicy
// APAC feeds are one provider; every other current static id is its own family.
const STATIC_FAMILY: Record<string, string> = {
  "jobicy-admin-support-apac": "jobicy",
  "jobicy-supporting-apac": "jobicy",
};

/**
 * Fold an exact source_id to its provider/origin risk family. ATS ids are
 * `platform:token`, so ten tenants on one ATS collapse to one family. Never a
 * guess: an unmapped static id folds to itself.
 */
export function providerFamilyForSourceId(sourceId: string): string {
  if (!sourceId || sourceId === UNKNOWN_SOURCE) return UNKNOWN_SOURCE;
  const colon = sourceId.indexOf(":");
  if (colon > 0) return sourceId.slice(0, colon);
  return STATIC_FAMILY[sourceId] ?? sourceId;
}

export interface FamilyRow {
  family: string;
  active: number;
  net_new_7d: number;
  net_new_14d: number;
  net_new_30d: number;
  inactive: number;
  sourceIds: string[];
}

/** Group per-source_id supply rows into provider families, sorted by active desc. */
export function foldProviderFamilies(sourceSupply: Row[]): FamilyRow[] {
  const byFamily = new Map<string, FamilyRow>();
  for (const r of sourceSupply) {
    const sourceId = String(r["source_id"] ?? UNKNOWN_SOURCE);
    const family = providerFamilyForSourceId(sourceId);
    const cur = byFamily.get(family) ?? {
      family, active: 0, net_new_7d: 0, net_new_14d: 0, net_new_30d: 0,
      inactive: 0, sourceIds: [],
    };
    cur.active += num(r["active"]);
    cur.net_new_7d += num(r["net_new_7d"]);
    cur.net_new_14d += num(r["net_new_14d"]);
    cur.net_new_30d += num(r["net_new_30d"]);
    cur.inactive += num(r["inactive"]);
    if (!cur.sourceIds.includes(sourceId)) cur.sourceIds.push(sourceId);
    byFamily.set(family, cur);
  }
  return [...byFamily.values()].sort(
    (a, b) => b.active - a.active || a.family.localeCompare(b.family),
  );
}

export interface Concentration {
  metric: string;
  total: number;
  topFamily: string;
  topShare: number; // 0..1 of the metric held by the single largest family
  top3Share: number;
  /** ADR-006 §7 flags. Warn above 40% single provider; concern above 70% top-3. */
  topWarn: boolean;
  top3Warn: boolean;
}

/**
 * Concentration of one metric across provider families. `(unknown)` is excluded
 * from the denominator: unattributed legacy rows must not dilute or inflate a
 * provider's real share.
 */
export function summarizeConcentration(families: FamilyRow[], metric: keyof FamilyRow): Concentration {
  const attributed = families.filter((f) => f.family !== UNKNOWN_SOURCE);
  const values = attributed
    .map((f) => ({ family: f.family, n: num(f[metric] as unknown) }))
    .sort((a, b) => b.n - a.n || a.family.localeCompare(b.family));
  const total = values.reduce((acc, v) => acc + v.n, 0);
  const top = values[0]?.n ?? 0;
  const top3 = values.slice(0, 3).reduce((acc, v) => acc + v.n, 0);
  const topShare = total > 0 ? top / total : 0;
  const top3Share = total > 0 ? top3 / total : 0;
  return {
    metric: String(metric),
    total,
    topFamily: values[0]?.family ?? "(none)",
    topShare,
    top3Share,
    topWarn: topShare > 0.4,
    top3Warn: top3Share > 0.7,
  };
}

// ─── Reconciliation ────────────────────────────────────────────────────────────
// The report is trustworthy only if independent partitions add up. Every delta
// must be exactly zero.

export interface ReconResult {
  ok: boolean;
  deltas: Record<string, number>;
  notes: string[];
}

export function reconcile(byName: Record<string, Row[]>): ReconResult {
  const deltas: Record<string, number> = {};
  const notes: string[] = [];

  const id = byName["identity_coverage"]?.[0] ?? {};
  const total = num(id["total"]);
  const active = num(id["active"]);
  const inactive = num(id["inactive"]);
  deltas["total_vs_active_plus_inactive"] = total - (active + inactive);
  deltas["total_vs_with_plus_null_source_id"] =
    total - (num(id["with_source_id"]) + num(id["null_source_id"]));
  deltas["active_vs_active_with_plus_null_source_id"] =
    active - (num(id["active_with_source_id"]) + num(id["active_null_source_id"]));

  const totals = byName["supply_totals"]?.[0] ?? {};
  deltas["supply_totals_active_vs_identity"] = num(totals["active"]) - active;

  const supply = byName["source_supply"] ?? [];
  deltas["source_active_sum_vs_active"] = sumBy(supply, "active") - active;
  deltas["source_inactive_sum_vs_inactive"] = sumBy(supply, "inactive") - inactive;
  deltas["source_net7_sum_vs_totals"] = sumBy(supply, "net_new_7d") - num(totals["net_new_7d"]);
  deltas["source_net14_sum_vs_totals"] = sumBy(supply, "net_new_14d") - num(totals["net_new_14d"]);
  deltas["source_net30_sum_vs_totals"] = sumBy(supply, "net_new_30d") - num(totals["net_new_30d"]);

  const unknown = num(id["active_null_source_id"]);
  if (unknown > 0) {
    notes.push(
      `${unknown} active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.`,
    );
  }

  const ok = Object.values(deltas).every((d) => d === 0);
  return { ok, deltas, notes };
}

/**
 * Map a wrangler `--json` result array (one entry per query, in query order) to
 * name -> rows. Accepts the raw array or a {result|results:[...]} wrapper.
 */
export function extractByName(wranglerJson: unknown, meta: EconMeta): Record<string, Row[]> {
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

/**
 * Reassemble per-query single-statement `--command --json` outputs (each a
 * `[{results,success,meta}]` array) into name -> rows, in query order.
 */
export function collectByName(perQuery: Record<string, unknown>, meta: EconMeta): Record<string, Row[]> {
  const byName: Record<string, Row[]> = {};
  for (const name of meta.queryOrder) {
    const wj = perQuery[name];
    const arr: unknown[] = Array.isArray(wj) ? wj : [];
    const first = arr[0] as Record<string, unknown> | undefined;
    const rows = (first && (first["results"] as Row[] | undefined)) ?? [];
    byName[name] = Array.isArray(rows) ? rows : [];
  }
  return byName;
}

// ─── Markdown report ────────────────────────────────────────────────────────────

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/** Render the human baseline. Pure: same inputs always produce the same text. */
export function renderReport(byName: Record<string, Row[]>, meta: EconMeta): string {
  const id = byName["identity_coverage"]?.[0] ?? {};
  const totals = byName["supply_totals"]?.[0] ?? {};
  const supply = byName["source_supply"] ?? [];
  const outcomes = byName["fetch_outcomes_7d"] ?? [];
  const families = foldProviderFamilies(supply);
  const recon = reconcile(byName);
  const conc30 = summarizeConcentration(families, "net_new_30d");
  const concActive = summarizeConcentration(families, "active");

  const total = num(id["total"]);
  const withId = num(id["with_source_id"]);
  const coverage = total > 0 ? withId / total : 0;
  const activeTotal = num(id["active"]);
  const activeWithId = num(id["active_with_source_id"]);
  const activeCoverage = activeTotal > 0 ? activeWithId / activeTotal : 0;
  // Concentration over provider families is only meaningful once most active
  // rows carry an exact source_id. SP-01 does not backfill legacy rows, so
  // immediately after it ships the attributed base is tiny and the shares below
  // are provisional, not a real concentration incident.
  const concentrationReliable = activeCoverage >= 0.5;

  const lines: string[] = [];
  lines.push(`# Source economics — latest (SP-02)`);
  lines.push("");
  lines.push(`- **As of:** ${meta.asOf}`);
  lines.push(`- **Windows:** 7d/14d/30d net-new by \`scraped_at\``);
  lines.push(`- **Reconciliation:** ${recon.ok ? "OK (every partition delta is zero)" : "FAILED"}`);
  lines.push(`- Read-only report; regenerate with \`scripts/diagnostics/source-economics.ts\`.`);
  lines.push("");

  lines.push(`## Identity coverage (SP-01)`);
  lines.push("");
  lines.push(`| total | with source_id | null source_id | coverage | active null-id |`);
  lines.push(`| ---: | ---: | ---: | ---: | ---: |`);
  lines.push(
    `| ${total} | ${withId} | ${num(id["null_source_id"])} | ${pct(coverage)} | ${num(id["active_null_source_id"])} |`,
  );
  lines.push("");

  lines.push(`## Net-new accepted supply`);
  lines.push("");
  lines.push(`| active | net-new 7d | net-new 14d | net-new 30d |`);
  lines.push(`| ---: | ---: | ---: | ---: |`);
  lines.push(
    `| ${num(totals["active"])} | ${num(totals["net_new_7d"])} | ${num(totals["net_new_14d"])} | ${num(totals["net_new_30d"])} |`,
  );
  lines.push("");

  lines.push(`## Provider-family concentration (ADR-006 §7)`);
  lines.push("");
  if (!concentrationReliable) {
    lines.push(
      `> ⚠️ **Provisional:** only ${pct(activeCoverage)} of active rows carry an exact source_id ` +
        `(SP-01 does not backfill legacy rows). The shares below reflect that small attributed base, ` +
        `not a real concentration incident; they stabilize as coverage grows.`,
    );
    lines.push("");
  }
  lines.push(
    `- **Net-new 30d:** top family \`${conc30.topFamily}\` ${pct(conc30.topShare)}${conc30.topWarn ? " ⚠️ >40%" : ""}; top-3 ${pct(conc30.top3Share)}${conc30.top3Warn ? " ⚠️ >70%" : ""}.`,
  );
  lines.push(
    `- **Active:** top family \`${concActive.topFamily}\` ${pct(concActive.topShare)}${concActive.topWarn ? " ⚠️ >40%" : ""}; top-3 ${pct(concActive.top3Share)}${concActive.top3Warn ? " ⚠️ >70%" : ""}.`,
  );
  lines.push(`- \`(unknown)\` legacy rows are excluded from these shares.`);
  lines.push("");
  lines.push(`| provider family | active | net-new 30d | net-new 7d | source ids |`);
  lines.push(`| --- | ---: | ---: | ---: | --- |`);
  for (const f of families) {
    lines.push(
      `| ${f.family} | ${f.active} | ${f.net_new_30d} | ${f.net_new_7d} | ${f.sourceIds.join(", ")} |`,
    );
  }
  lines.push("");

  lines.push(`## Supply by exact source_id`);
  lines.push("");
  lines.push(`| source_id | platform | active | net-new 7d | net-new 30d | inactive |`);
  lines.push(`| --- | --- | ---: | ---: | ---: | ---: |`);
  for (const r of supply) {
    lines.push(
      `| ${String(r["source_id"])} | ${String(r["source_platform"] ?? "")} | ${num(r["active"])} | ${num(r["net_new_7d"])} | ${num(r["net_new_30d"])} | ${num(r["inactive"])} |`,
    );
  }
  lines.push("");

  lines.push(`## Fetch outcomes (last 7 days)`);
  lines.push("");
  lines.push(`Separates real fetches from intentional skips, failures, and zero-yield.`);
  lines.push("");
  lines.push(`| source_id | real fetches | skips | failures | zero-yield | items |`);
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: |`);
  for (const r of outcomes) {
    lines.push(
      `| ${String(r["source_id"])} | ${num(r["real_fetches"])} | ${num(r["skips"])} | ${num(r["failures"])} | ${num(r["zero_yield"])} | ${num(r["items"])} |`,
    );
  }
  lines.push("");

  if (recon.notes.length > 0) {
    lines.push(`## Notes`);
    lines.push("");
    for (const n of recon.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  if (!recon.ok) {
    lines.push(`## Reconciliation deltas (non-zero — investigate)`);
    lines.push("");
    for (const [k, v] of Object.entries(recon.deltas)) {
      if (v !== 0) lines.push(`- \`${k}\` = ${v}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────────

function parseAsOf(argv: string[]): Date {
  const flagIdx = argv.indexOf("--as-of");
  const raw = flagIdx >= 0 ? argv[flagIdx + 1] : process.env.SP02_AS_OF ?? undefined;
  if (raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid --as-of value: ${raw}`);
    return d;
  }
  return new Date();
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  const asOf = parseAsOf(process.argv);
  const w = computeWindows(asOf);

  switch (cmd) {
    case "sql":
      process.stdout.write(emitSql(w));
      return;
    case "meta":
      process.stdout.write(JSON.stringify(emitMeta(w), null, 2) + "\n");
      return;
    case "emit": {
      const { writeFileSync, mkdirSync } = await import("fs");
      const { join } = await import("path");
      const outDir = rest[0];
      if (!outDir) throw new Error("emit requires an output directory argument");
      const queriesDir = join(outDir, "queries");
      mkdirSync(queriesDir, { recursive: true });
      for (const q of ECONOMICS_QUERIES) {
        writeFileSync(join(queriesDir, `${q.name}.sql`), q.sql(w) + "\n");
      }
      writeFileSync(join(outDir, "economics.sql"), emitSql(w));
      writeFileSync(join(outDir, "economics-meta.json"), JSON.stringify(emitMeta(w), null, 2) + "\n");
      process.stdout.write(`Wrote queries/*.sql, economics.sql, economics-meta.json to ${outDir}\n`);
      return;
    }
    case "collect": {
      const { readFileSync, readdirSync, writeFileSync } = await import("fs");
      const { join } = await import("path");
      const [resultsDir, metaPath, combinedOut] = rest;
      if (!resultsDir || !metaPath) {
        throw new Error("collect requires <resultsDir> <meta.json> [combinedOut.json]");
      }
      const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as EconMeta;
      const perQuery: Record<string, unknown> = {};
      const missing: string[] = [];
      const present = readdirSync(resultsDir);
      for (const name of meta.queryOrder) {
        if (!present.includes(`${name}.json`)) { missing.push(name); continue; }
        perQuery[name] = JSON.parse(readFileSync(join(resultsDir, `${name}.json`), "utf-8"));
      }
      if (missing.length) throw new Error(`Missing per-query result files: ${missing.join(", ")}`);
      const byName = collectByName(perQuery, meta);
      const result = reconcile(byName);
      const combined = { meta, byName, reconciliation: result };
      const out = JSON.stringify(combined, null, 2) + "\n";
      if (combinedOut) writeFileSync(combinedOut, out);
      process.stdout.write(out);
      if (!result.ok) {
        process.stderr.write("Reconciliation FAILED: non-zero partition delta.\n");
        process.exit(1);
      }
      return;
    }
    case "report": {
      const { readFileSync } = await import("fs");
      const combinedPath = rest[0];
      if (!combinedPath) throw new Error("report requires <combined.json>");
      const parsed = JSON.parse(readFileSync(combinedPath, "utf-8")) as {
        meta: EconMeta; byName: Record<string, Row[]>;
      };
      process.stdout.write(renderReport(parsed.byName, parsed.meta).replace(/\s*$/, "") + "\n");
      return;
    }
    default:
      process.stderr.write(
        "Usage: source-economics.ts <sql|meta|emit <dir>|collect <resultsDir> <meta.json> [out.json]|report <combined.json>> [--as-of ISO]\n",
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
