#!/usr/bin/env bun
/**
 * DATA-05B: directory website provenance report + approval-gated CAS repair.
 *
 * Transport model (mirrors data-quality-cohorts.ts): this tool NEVER connects
 * to D1 itself. It emits the exact read-only report queries, then consumes the
 * wrangler `--json` outputs of those queries, so the tested logic and the
 * executed SQL cannot drift. Mutation artifacts are likewise emitted as
 * guarded per-row SQL files intended to be applied one statement at a time via
 * `wrangler d1 execute DB --remote --file=...`, which yields per-row
 * `rows_written` counts for the audit trail.
 *
 * Safety contract:
 *   - Default posture is read-only. Every emitted report statement is SELECT.
 *   - Apply requires a human-approved evidence file listing exact row IDs and
 *     the expected current website value (compare-and-set pre-check).
 *   - A row is eligible only when the fresh report demonstrates a support gap:
 *     enrichment-note evidence, a shared-host anomaly, or a company/host
 *     mismatch. The repeated-domain guard flags but never mutates by itself;
 *     shared-host rows additionally require `sharedDomainReviewed: true`.
 *   - More than MAX_APPLY_ROWS approved rows aborts the whole apply (bounded).
 *   - Every apply run emits an undo artifact whose restore statements are
 *     themselves CAS-guarded on the repaired state (`website IS NULL AND
 *     website_source = 'repair_cleared'`), so drifted rows are never restored
 *     blindly. Undo is a gated, human-disciplined step like apply: it emits
 *     SQL only, and an operator runs it deliberately with the artifact at
 *     hand.
 *
 * CLI:
 *   bun scripts/diagnostics/directory-website-repair.ts sql [--out <dir>]
 *       emit report-totals.sql / report-rows.sql / meta.json
 *   bun ... collect <resultsDir> <meta.json> [--out <report.json>]
 *       classify + reconcile wrangler results into a redacted report
 *   bun ... apply-sql --evidence <approved.json> --report <report.json>
 *            [--dry-run] [--out <dir>]
 *       validate evidence against the fresh report; emit guarded UPDATEs +
 *       undo-artifact.json (+ summary). --dry-run prints the plan only.
 *   bun ... undo-sql --artifact <undo-artifact.json> [--out <dir>]
 *       emit guarded restore statements from the undo artifact
 */

import { createHash } from "node:crypto";

/** Hard ceiling on rows mutated by one apply run (contract stop condition). */
export const MAX_APPLY_ROWS = 50;

export const WEBSITE_SOURCE_VALUES = [
  "curated",
  "manual",
  "enrichment",
  "repair_cleared",
] as const;

// ─── Read-only report queries ─────────────────────────────────────────────────

export interface ReportQuery {
  name: string;
  sql: string;
}

/**
 * Ordered read-only report queries. Order is the contract between the emitted
 * files and the `collect` step.
 */
export const REPORT_QUERIES: ReportQuery[] = [
  {
    name: "report-totals",
    // Reconciliation anchor: every website row is either still unclassified
    // (counted again by report-rows) or already carries provenance.
    sql: `SELECT
  COUNT(*) AS total_rows,
  SUM(CASE WHEN website IS NOT NULL AND trim(website) <> '' THEN 1 ELSE 0 END) AS with_website,
  SUM(CASE WHEN website IS NOT NULL AND trim(website) <> '' AND website_source IS NOT NULL THEN 1 ELSE 0 END) AS classified
FROM va_directory;`,
  },
  {
    name: "report-rows",
    // Unclassified website rows with their anomaly signals plus every
    // link-health field the repair clears (needed verbatim by the undo
    // artifact). Only factual metadata leaves the database: id, company name,
    // host, link state, and a boolean enrichment-note marker — never full
    // notes text.
    sql: `SELECT
  id,
  company_name AS companyName,
  website,
  link_status AS linkStatus,
  link_checked_at AS linkCheckedAt,
  link_evidence AS linkEvidence,
  link_fail_count AS linkFailCount,
  CASE WHEN notes LIKE '%[enrich%' AND notes LIKE '%website=%' THEN 1 ELSE 0 END AS enrichWebsiteNote
FROM va_directory
WHERE website IS NOT NULL AND trim(website) <> '' AND website_source IS NULL
ORDER BY id;`,
  },
];

export interface TotalsRow {
  total_rows: number;
  with_website: number;
  classified: number;
}

export interface ReportRow {
  id: number;
  companyName: string;
  website: string;
  linkStatus: string | null;
  linkCheckedAt: string | null;
  linkEvidence: string | null;
  linkFailCount: number;
  enrichWebsiteNote: number;
}

// ─── Classification ───────────────────────────────────────────────────────────

/** Lowercase hostname without a leading `www.`; null when unparseable. */
export function extractHost(websiteUrl: string): string | null {
  const raw = websiteUrl.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    try {
      url = new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
  if (!url.hostname) return null;
  const host = url.hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Deterministic heuristic: does any company-name token (length >= 3) appear in
 * the hostname? This is an anomaly SIGNAL for human review, never proof of
 * correctness in either direction.
 */
export function companyMatchesHost(companyName: string, host: string | null): boolean {
  if (!host) return false;
  const normalizedHost = host.toLowerCase();
  const tokens = companyName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  return tokens.some((t) => normalizedHost.includes(t));
}

export type RowFlag = "enrichment_note_evidence" | "shared_host" | "name_host_mismatch";

export interface ClassifiedRow extends ReportRow {
  host: string | null;
  flags: RowFlag[];
}

export interface SharedHostGroup {
  host: string;
  companies: string[];
  ids: number[];
}

export interface Reconciliation {
  ok: boolean;
  deltas: Record<string, number>;
}

export interface Report {
  meta: { unit: "DATA-05B"; generatedFrom: "wrangler-collect"; queryOrder: string[] };
  totals: TotalsRow;
  rows: ClassifiedRow[];
  sharedHostGroups: SharedHostGroup[];
  summary: {
    unclassifiedWebsiteRows: number;
    withEnrichmentNoteEvidence: number;
    inSharedHostGroups: number;
    withNameHostMismatch: number;
  };
  reconciliation: Reconciliation;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function reconcileReport(totals: TotalsRow, rowCount: number): Reconciliation {
  const deltas: Record<string, number> = {
    rows_plus_classified_vs_with_website: rowCount + totals.classified - totals.with_website,
    negative_margin: Math.min(0, totals.with_website - totals.classified),
  };
  return { ok: Object.values(deltas).every((d) => d === 0), deltas };
}

type WranglerOutput = unknown;

function rowsOf(output: WranglerOutput): Record<string, unknown>[] {
  const arr = Array.isArray(output) ? output : [];
  const first = arr[0] as Record<string, unknown> | undefined;
  const rows = first && (first["results"] as Record<string, unknown>[] | undefined);
  return Array.isArray(rows) ? rows : [];
}

/** Build the redacted report from wrangler `--json` outputs, in query order. */
export function classifyReport(
  outputs: Record<string, WranglerOutput>,
): Report {
  const totalsRows = rowsOf(outputs["report-totals"]);
  if (totalsRows.length !== 1) {
    throw new Error(`Expected exactly one totals row, got ${totalsRows.length}`);
  }
  const t = totalsRows[0];
  const totals: TotalsRow = {
    total_rows: Number(t["total_rows"] ?? 0),
    with_website: Number(t["with_website"] ?? 0),
    classified: Number(t["classified"] ?? 0),
  };

  const rawRows = rowsOf(outputs["report-rows"]) as unknown as ReportRow[];
  const rows: ClassifiedRow[] = [];
  const byHost = new Map<string, ClassifiedRow[]>();

  for (const r of rawRows) {
    const host = extractHost(String(r.website));
    const row: ClassifiedRow = {
      ...r,
      id: Number(r.id),
      enrichWebsiteNote: Number(r.enrichWebsiteNote),
      linkFailCount: Number(r.linkFailCount ?? 0),
      host,
      flags: [],
    };
    if (row.enrichWebsiteNote === 1) row.flags.push("enrichment_note_evidence");
    if (!companyMatchesHost(String(row.companyName), host)) row.flags.push("name_host_mismatch");
    if (host) {
      const bucket = byHost.get(host);
      if (bucket) bucket.push(row);
      else byHost.set(host, [row]);
    }
    rows.push(row);
  }

  const sharedHostGroups: SharedHostGroup[] = [];
  for (const [host, bucket] of byHost) {
    const companies = [...new Set(bucket.map((r) => String(r.companyName).trim().toLowerCase()))];
    if (companies.length > 1) {
      sharedHostGroups.push({ host, companies, ids: bucket.map((r) => r.id) });
      for (const r of bucket) {
        if (!r.flags.includes("shared_host")) r.flags.push("shared_host");
      }
    }
  }
  sharedHostGroups.sort((a, b) => b.companies.length - a.companies.length || a.host.localeCompare(b.host));

  const reconciliation = reconcileReport(totals, rows.length);

  return {
    meta: { unit: "DATA-05B", generatedFrom: "wrangler-collect", queryOrder: REPORT_QUERIES.map((q) => q.name) },
    totals,
    rows,
    sharedHostGroups,
    summary: {
      unclassifiedWebsiteRows: rows.length,
      withEnrichmentNoteEvidence: rows.filter((r) => r.flags.includes("enrichment_note_evidence")).length,
      inSharedHostGroups: rows.filter((r) => r.flags.includes("shared_host")).length,
      withNameHostMismatch: rows.filter((r) => r.flags.includes("name_host_mismatch")).length,
    },
    reconciliation,
  };
}

// ─── Approved evidence file ───────────────────────────────────────────────────

export interface EvidenceEntry {
  id: number;
  currentWebsite: string;
  reason: string;
  sharedDomainReviewed?: boolean;
}

export interface EvidenceFile {
  unit: "DATA-05B";
  approvedBy: string;
  approvedAt: string;
  rows: EvidenceEntry[];
}

/** Strict, fail-closed parsing of the human-approved evidence file. */
export function parseEvidenceFile(raw: unknown): EvidenceFile {
  if (typeof raw !== "object" || raw === null) throw new Error("evidence file must be a JSON object");
  const obj = raw as Record<string, unknown>;
  if (obj["unit"] !== "DATA-05B") throw new Error(`evidence file unit must be "DATA-05B"`);
  if (typeof obj["approvedBy"] !== "string" || !obj["approvedBy"].trim()) {
    throw new Error("evidence file requires a non-empty approvedBy");
  }
  if (typeof obj["approvedAt"] !== "string" || Number.isNaN(Date.parse(obj["approvedAt"]))) {
    throw new Error("evidence file requires an ISO approvedAt timestamp");
  }
  if (!Array.isArray(obj["rows"])) throw new Error("evidence file requires a rows array");
  const rows: EvidenceEntry[] = [];
  for (const r of obj["rows"]) {
    if (typeof r !== "object" || r === null) throw new Error("evidence row must be an object");
    const e = r as Record<string, unknown>;
    const id = Number(e["id"]);
    if (!Number.isInteger(id) || id <= 0) throw new Error(`evidence row has invalid id: ${JSON.stringify(e["id"])}`);
    if (typeof e["currentWebsite"] !== "string" || !e["currentWebsite"].trim()) {
      throw new Error(`evidence row ${id} requires a non-empty currentWebsite`);
    }
    if (typeof e["reason"] !== "string" || e["reason"].trim().length < 10) {
      throw new Error(`evidence row ${id} requires a reason of at least 10 characters`);
    }
    if (e["sharedDomainReviewed"] !== undefined && typeof e["sharedDomainReviewed"] !== "boolean") {
      throw new Error(`evidence row ${id} sharedDomainReviewed must be boolean`);
    }
    const entry: EvidenceEntry = {
      id,
      currentWebsite: e["currentWebsite"],
      reason: e["reason"].trim(),
    };
    if (e["sharedDomainReviewed"] === true) entry.sharedDomainReviewed = true;
    rows.push(entry);
  }
  if (rows.length > MAX_APPLY_ROWS) {
    throw new Error(`evidence file approves ${rows.length} rows; hard cap is ${MAX_APPLY_ROWS}`);
  }
  return {
    unit: "DATA-05B",
    approvedBy: (obj["approvedBy"] as string).trim(),
    approvedAt: obj["approvedAt"] as string,
    rows,
  };
}

export function evidenceFileHash(evidence: EvidenceFile): string {
  return sha256Hex(JSON.stringify(evidence));
}

// ─── Apply planning (CAS) ─────────────────────────────────────────────────────

export type SkipReason =
  | "unknown_id"
  | "row_missing_or_already_cleared"
  | "cas_drift_current_website_changed"
  | "no_demonstrated_support_gap"
  | "shared_domain_needs_explicit_review";

export interface PlannedRepair {
  id: number;
  companyName: string;
  /** Normalized expected value used in the WHERE guard. */
  expectedWebsite: string;
  reason: string;
}

export interface SkippedRepair {
  id: number;
  reason: SkipReason;
}

export interface UndoRecord {
  id: number;
  companyName: string;
  oldWebsite: string;
  oldLinkStatus: string | null;
  oldLinkCheckedAt: string | null;
  oldLinkEvidence: string | null;
  oldLinkFailCount: number;
}

export interface ApplyPlan {
  unit: "DATA-05B";
  evidenceSha256: string;
  evidenceApprovedBy: string;
  evidenceApprovedAt: string;
  plannedAt: string;
  planned: PlannedRepair[];
  skipped: SkippedRepair[];
  undo: UndoRecord[];
}

/**
 * Deliberately coarse equivalence class for clearing anomalous values: trim,
 * strip trailing slashes, lowercase everything including the path. Paths are
 * case-sensitive in principle, but this tool only ever clears a whole value;
 * it never rewrites one value into another.
 *
 * The SQL-side guard in buildApplyStatements must normalize IDENTICALLY —
 * `lower(rtrim(trim(website), '/'))` — or planned rows silently no-op.
 */
export function normalizeWebsite(website: string): string {
  return website.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Validate the approved evidence file against a FRESH report and produce the
 * bounded repair plan. Refuses everything (throws) when the cap is exceeded;
 * skips individual rows that fail their pre-checks, with counted reasons.
 */
export function planApply(
  evidenceRaw: unknown,
  report: Report,
  plannedAt: Date = new Date(),
): ApplyPlan {
  const evidence = parseEvidenceFile(evidenceRaw);
  if (evidence.rows.length > MAX_APPLY_ROWS) {
    throw new Error(`approved set (${evidence.rows.length}) exceeds MAX_APPLY_ROWS (${MAX_APPLY_ROWS}); refusing the whole apply`);
  }

  const byId = new Map(report.rows.map((r) => [r.id, r]));
  const sharedIds = new Set(report.sharedHostGroups.flatMap((g) => g.ids));

  const planned: PlannedRepair[] = [];
  const skipped: SkippedRepair[] = [];
  const undo: UndoRecord[] = [];

  for (const entry of evidence.rows) {
    const row = byId.get(entry.id);
    if (!row) {
      skipped.push({ id: entry.id, reason: "row_missing_or_already_cleared" });
      continue;
    }
    if (normalizeWebsite(row.website) !== normalizeWebsite(entry.currentWebsite)) {
      skipped.push({ id: entry.id, reason: "cas_drift_current_website_changed" });
      continue;
    }
    if (row.flags.length === 0) {
      skipped.push({ id: entry.id, reason: "no_demonstrated_support_gap" });
      continue;
    }
    if (sharedIds.has(entry.id) && entry.sharedDomainReviewed !== true) {
      skipped.push({ id: entry.id, reason: "shared_domain_needs_explicit_review" });
      continue;
    }
    planned.push({
      id: entry.id,
      companyName: String(row.companyName),
      expectedWebsite: normalizeWebsite(entry.currentWebsite),
      reason: entry.reason.slice(0, 120),
    });
    undo.push({
      id: entry.id,
      companyName: String(row.companyName),
      oldWebsite: String(row.website),
      oldLinkStatus: row.linkStatus ?? null,
      oldLinkCheckedAt: row.linkCheckedAt ?? null,
      oldLinkEvidence: row.linkEvidence ?? null,
      oldLinkFailCount: Number(row.linkFailCount) || 0,
    });
  }

  return {
    unit: "DATA-05B",
    evidenceSha256: evidenceFileHash(evidence),
    evidenceApprovedBy: evidence.approvedBy,
    evidenceApprovedAt: evidence.approvedAt,
    plannedAt: plannedAt.toISOString(),
    planned,
    skipped,
    undo,
  };
}

// ─── Guarded SQL emission ─────────────────────────────────────────────────────

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * One guarded CAS UPDATE per approved row. The WHERE clause pins both the id
 * and the expected current website using the SAME normalization as
 * planApply's pre-check (trim + rtrim '/' + lowercase), so a value that
 * passes planning cannot silently match zero rows, and concurrent edits turn
 * the update into a counted no-op instead of an overwrite.
 */
export function buildApplyStatements(plan: ApplyPlan): string[] {
  const hash12 = plan.evidenceSha256.slice(0, 12);
  const note = `[repair DATA-05B ev=${hash12}] cleared unsupported website`;
  return plan.planned.map((p) => `UPDATE va_directory
SET website = NULL,
    website_source = 'repair_cleared',
    website_evidence = ${sqlString(`${hash12} ${p.reason}`)},
    website_set_at = ${sqlString(plan.plannedAt)},
    link_status = NULL,
    link_checked_at = NULL,
    link_evidence = NULL,
    link_fail_count = 0,
    notes = coalesce(notes || ' | ', '') || ${sqlString(note)}
WHERE id = ${p.id}
  AND lower(rtrim(trim(website), '/')) = ${sqlString(p.expectedWebsite)};`);
}

/**
 * Restore statements from the undo artifact. Each is guarded on the repaired
 * state; a drifted row yields zero changed rows instead of a wrong restore.
 * Note: link-health fields are restored to their plan-time values by design;
 * if directory-audit refreshes them between apply and undo, the restore
 * intentionally reverts to the exact pre-repair state.
 */
export function buildRestoreStatements(undo: UndoRecord[]): string[] {
  for (const u of undo) {
    const idOk = typeof u.id === "number" && Number.isInteger(u.id) && u.id > 0;
    const stringsOk =
      [u.oldWebsite, u.oldLinkStatus, u.oldLinkCheckedAt, u.oldLinkEvidence].every(
        (v) => v === null || typeof v === "string",
      ) && typeof u.oldWebsite === "string";
    if (!idOk || !stringsOk) {
      throw new Error(`undo artifact contains a malformed record for id ${JSON.stringify((u as { id?: unknown }).id)}; refusing to emit restore SQL`);
    }
  }
  return undo.map((u) => `UPDATE va_directory
SET website = ${sqlString(u.oldWebsite)},
    website_source = NULL,
    website_evidence = NULL,
    website_set_at = NULL,
    link_status = ${u.oldLinkStatus === null ? "NULL" : sqlString(u.oldLinkStatus)},
    link_checked_at = ${u.oldLinkCheckedAt === null ? "NULL" : sqlString(u.oldLinkCheckedAt)},
    link_evidence = ${u.oldLinkEvidence === null ? "NULL" : sqlString(u.oldLinkEvidence)},
    link_fail_count = ${Number(u.oldLinkFailCount) || 0},
    notes = coalesce(notes || ' | ', '') || '[repair DATA-05B] restored website from undo artifact'
WHERE id = ${u.id}
  AND website IS NULL
  AND website_source = 'repair_cleared';`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function writeOut(dir: string | undefined, files: Record<string, string>): Promise<void> {
  if (!dir) return;
  const { mkdirSync, writeFileSync } = await import("fs");
  const { join } = await import("path");
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
}

function parseFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case "sql": {
      const outDir = parseFlag(rest, "--out");
      const files: Record<string, string> = {};
      for (const q of REPORT_QUERIES) files[`${q.name}.sql`] = `${q.sql}\n`;
      files["meta.json"] = JSON.stringify(
        { unit: "DATA-05B", readOnly: true, queryOrder: REPORT_QUERIES.map((q) => q.name) },
        null,
        2,
      );
      await writeOut(outDir, files);
      if (!outDir) {
        for (const q of REPORT_QUERIES) process.stdout.write(`-- [${q.name}]\n${q.sql}\n\n`);
      }
      return;
    }
    case "collect": {
      const { readFileSync, readdirSync } = await import("fs");
      const { join } = await import("path");
      const [resultsDir, metaPath] = rest;
      if (!resultsDir || !metaPath) throw new Error("collect requires <resultsDir> <meta.json>");
      const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as { queryOrder: string[] };
      const present = new Set(readdirSync(resultsDir));
      const outputs: Record<string, WranglerOutput> = {};
      for (const name of meta.queryOrder) {
        if (!present.has(`${name}.json`)) throw new Error(`missing result file: ${name}.json`);
        outputs[name] = JSON.parse(readFileSync(join(resultsDir, `${name}.json`), "utf-8"));
      }
      const report = classifyReport(outputs);
      const outPath = parseFlag(rest, "--out");
      const serialized = JSON.stringify(report, null, 2) + "\n";
      if (outPath) {
        const { mkdirSync, writeFileSync } = await import("fs");
        const { dirname } = await import("path");
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, serialized);
      }
      process.stdout.write(serialized);
      if (!report.reconciliation.ok) {
        process.stderr.write("Reconciliation FAILED: non-zero partition delta.\n");
        process.exit(1);
      }
      return;
    }
    case "apply-sql": {
      const { readFileSync } = await import("fs");
      const evidencePath = parseFlag(rest, "--evidence");
      const reportPath = parseFlag(rest, "--report");
      const outDir = parseFlag(rest, "--out");
      const dryRun = rest.includes("--dry-run");
      if (!evidencePath || !reportPath) {
        throw new Error("apply-sql requires --evidence <approved.json> --report <fresh-report.json>");
      }
      const evidenceRaw = JSON.parse(readFileSync(evidencePath, "utf-8"));
      const report = JSON.parse(readFileSync(reportPath, "utf-8")) as Report;
      // The fresh report is the CAS premise. A report whose partitions did not
      // reconcile (or that came from another unit) must never feed an apply.
      if (report.meta?.unit !== "DATA-05B") {
        throw new Error("report file is not a DATA-05B report; refusing to plan an apply");
      }
      if (report.reconciliation?.ok !== true) {
        throw new Error("fresh report failed reconciliation; re-run collect before any apply");
      }
      const plan = planApply(evidenceRaw, report);
      if (dryRun) {
        process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
        process.stderr.write(`DRY RUN: ${plan.planned.length} planned, ${plan.skipped.length} skipped; nothing written.\n`);
        return;
      }
      if (plan.planned.length === 0) {
        process.stderr.write("Nothing planned; refusing to write empty artifacts.\n");
        process.exit(1);
      }
      const files: Record<string, string> = {
        "undo-artifact.json": JSON.stringify(
          { ...plan, restoreStatementsPreview: buildRestoreStatements(plan.undo) },
          null,
          2,
        ) + "\n",
        "apply-summary.json": JSON.stringify(
          {
            unit: "DATA-05B",
            evidenceSha256: plan.evidenceSha256,
            planned: plan.planned.map((p) => p.id),
            skipped: plan.skipped,
            note: "Apply each numbered .sql file once, in order, via wrangler d1 execute; record rows_written per file.",
          },
          null,
          2,
        ) + "\n",
      };
      buildApplyStatements(plan).forEach((stmt, i) => {
        files[`apply-${String(i + 1).padStart(3, "0")}-id-${plan.planned[i].id}.sql`] = stmt + "\n";
      });
      if (outDir) {
        await writeOut(outDir, files);
        process.stdout.write(
          `Wrote ${Object.keys(files).length} artifact files to ${outDir}: ${plan.planned.length} planned, ${plan.skipped.length} skipped. Nothing has been executed.\n`,
        );
      } else {
        // No --out: print instead of silently discarding the artifacts.
        for (const [name, content] of Object.entries(files)) {
          process.stdout.write(`-- >>> ${name}\n${content}\n`);
        }
        process.stdout.write(
          `${plan.planned.length} planned, ${plan.skipped.length} skipped; printed to stdout (use --out <dir> to write files). Nothing has been executed.\n`,
        );
      }
      return;
    }
    case "undo-sql": {
      const { readFileSync } = await import("fs");
      const artifactPath = parseFlag(rest, "--artifact");
      const outDir = parseFlag(rest, "--out");
      if (!artifactPath) throw new Error("undo-sql requires --artifact <undo-artifact.json>");
      const parsed = JSON.parse(readFileSync(artifactPath, "utf-8")) as { undo?: UndoRecord[] } & UndoRecord[];
      const undo = parsed.undo ?? parsed;
      const stmts = buildRestoreStatements(undo);
      if (outDir) {
        const files: Record<string, string> = {};
        stmts.forEach((stmt, i) => {
          files[`restore-${String(i + 1).padStart(3, "0")}-id-${undo[i].id}.sql`] = stmt + "\n";
        });
        await writeOut(outDir, files);
        process.stdout.write(`Wrote ${stmts.length} restore files to ${outDir}. Nothing has been executed.\n`);
      } else {
        process.stdout.write(stmts.join("\n\n") + "\n");
      }
      return;
    }
    default:
      process.stderr.write(
        "Usage: directory-website-repair.ts <sql|collect|apply-sql|undo-sql> [flags]\n",
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
