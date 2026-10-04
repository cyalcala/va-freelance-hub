import { getLakeClient } from "./client";
import { toContentHash } from "../../packages/scraper/contentHash";
import { decideAutoPublish, parseJevRaw, type InventorySnapshot } from "./auto-publish-policy";
import {
  formatUnconfirmedPublishNotice,
  parseD1BatchConfirmation,
  selectConfirmedCandidateIds,
} from "./d1-batch-confirmation";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface CandidateRow {
  id: number;
  source_id: string;
  source_platform: string;
  source_url: string;
  title: string;
  company: string | null;
  category: string;
  location_raw: string | null;
  description: string | null;
  application_url: string | null;
  posted_at: string | null;
  geo_scope: string;
  ph_eligibility: string;
  fingerprint_hash: string;
}

// Canonical exact-six + active registry sources (always authorized)
const BASE_AUTHORIZED_SOURCE_IDS = new Set([
  "we-work-remotely",
  "remotive",
  "real-work-from-anywhere",
  "jobicy-admin-support-apac",
  "jobicy-supporting-apac",
  "remote-ok",
  "himalayas:remote-jobs",
  "breezy:20four7va",
  "breezy:sourcefit",
  "breezy:yokly",
  "breezy:remote-craft",
  "breezy:value-virtual-assistants",
]);

/**
 * Auto-approved lake tenants publish when `decideAutoPublish` says so.
 * There is no human approval flag. `--hold-auto-approved` is the kill switch.
 * `--allow-auto-approved` remains as a no-op alias so older commands still run.
 */
export function parseSyncArgs(argv: string[]): {
  limit: number;
  dryRun: boolean;
  holdAutoApproved: boolean;
} {
  const DEFAULT_LIMIT = 200;
  const MAX_LIMIT = 500;
  let limit = DEFAULT_LIMIT;
  for (const arg of argv) {
    const n = Number.parseInt(arg, 10);
    if (Number.isSafeInteger(n) && n > 0) {
      limit = Math.min(n, MAX_LIMIT);
      break;
    }
  }
  return {
    limit,
    dryRun: argv.includes("--dry-run"),
    holdAutoApproved: argv.includes("--hold-auto-approved"),
  };
}

export interface HeldSourceRow {
  source_id: string;
  held_count: number;
}

/**
 * The line a publisher tick prints about its own result. `warn` whenever the tick
 * published nothing while qualified supply was held, because a success exit that reads as
 * "healthy" is exactly what let a day of held supply pass unremarked.
 */
export interface PublishOutcomeNotice {
  level: "warn" | "log";
  line: string;
}

/**
 * INCIDENT-0410(v) — publisher honesty for a run that publishes nothing.
 *
 * A publisher tick that returns success while qualified supply sits held by the source
 * gate is indistinguishable, in the exit status and in the durable record, from a run with
 * nothing to publish. That is how 60 held rows stayed invisible for a day. These two pure
 * functions turn the run's own outcome and the held cohort into what the operator actually
 * reads: which source_ids the gate refused, how many rows each holds, the total, and
 * whether this tick published anything at all.
 *
 * They report. They authorize nothing, publish nothing, and add no threshold: the rows stay
 * held exactly as before and the sync decision is untouched.
 */
export function formatPublishOutcomeNotice(
  published: number,
  held: readonly HeldSourceRow[],
): PublishOutcomeNotice {
  const heldTotal = held.reduce((sum, row) => sum + (Number.isFinite(row.held_count) ? row.held_count : 0), 0);
  const heldSources = held.filter((row) => Number.isFinite(row.held_count) && row.held_count > 0).length;
  if (published > 0) {
    return {
      level: "log",
      line: `Successfully synced ${published} qualified opportunities from Turso Lake into Production D1!`,
    };
  }
  if (published < 0) {
    return {
      level: "warn",
      line: `Reported a publication count of ${published}, which no run can produce. The receipt is untrustworthy; treat this tick as unobserved rather than healthy.`,
    };
  }
  if (heldTotal > 0) {
    return {
      level: "warn",
      line: `Published 0 opportunities while ${heldTotal} qualified row(s) across ${heldSources} source(s) remain held by the source gate. A success exit here means supply-starved, not healthy.`,
    };
  }
  return {
    level: "log",
    line: "Published 0 opportunities: no authorized QUALIFIED_READY candidate was visible to this tick.",
  };
}
/**
 * Which qualified rows the source gate is withholding, most-held first, so the reason a
 * tick published nothing is readable without opening a database. Silent for an empty or
 * all-zero cohort, so a healthy run is never warned about.
 */
export function formatHeldSupplyNotice(held: readonly HeldSourceRow[], topN = 5): string[] {
  const rows = held
    .filter((row) => row.held_count > 0)
    .sort((a, b) => b.held_count - a.held_count || a.source_id.localeCompare(b.source_id));
  if (rows.length === 0) return [];

  const total = rows.reduce((sum, row) => sum + row.held_count, 0);
  const shown = rows.slice(0, Math.max(0, topN));
  const lines = shown.map(
    (row) =>
      `  [Queue] HELD ${row.held_count} QUALIFIED_READY row(s) — source gate: "${row.source_id}" is not an authorized source_id.`,
  );
  if (rows.length > shown.length) {
    lines.push(
      `  [Queue] HELD ... and ${rows.length - shown.length} more source(s) withheld by the same gate.`,
    );
  }
  lines.push(
    `  [Queue] HELD TOTAL ${total} qualified row(s) cannot publish: the source gate refused their source_id.`,
  );
  return lines;
}

export interface DiscoveryTenantRow {
  source_id: string;
  job_count: number;
  qualified_ready: number;
  ph_rate: number;
  jev_raw: string | null;
}

export interface PlannedSource {
  sourceId: string;
  publishCount: number;
  reason: string;
}

export function planAutoPublishSources(
  tenants: DiscoveryTenantRow[],
  inventory: InventorySnapshot | null,
  holdAutoApproved: boolean,
): PlannedSource[] {
  if (holdAutoApproved) return [];
  const planned: PlannedSource[] = [];
  for (const tenant of tenants) {
    if (!tenant.source_id) continue;
    const jev = parseJevRaw(tenant.jev_raw);
    const qualifiedReady = Math.max(tenant.qualified_ready, 0);
    const totalJobs = Math.max(tenant.job_count, qualifiedReady);
    const decision = decideAutoPublish({
      sourceId: tenant.source_id,
      totalJobs,
      qualifiedReady,
      jevChoice: jev?.choice ?? null,
      jevConfidence: jev?.confidence ?? null,
      inventory,
    });
    console.log(`  [AutoPublish] ${tenant.source_id}: ${decision.action} x${decision.publishCount} — ${decision.reason}`);
    if (decision.action === "PUBLISH" && decision.publishCount > 0) {
      planned.push({ sourceId: tenant.source_id, publishCount: decision.publishCount, reason: decision.reason });
    }
  }
  return planned;
}

export async function loadAutoApprovedTenants(
  client: ReturnType<typeof getLakeClient>,
): Promise<DiscoveryTenantRow[]> {
  try {
    const res = await client.execute(`
      SELECT source_id, job_count, qualified_ready, ph_rate, jev_raw
      FROM lake_ats_discovery
      WHERE review_status = 'auto_approved';
    `);
    return res.rows.map((row) => ({
      source_id: String(row.source_id ?? ""),
      job_count: Number(row.job_count ?? 0),
      qualified_ready: Number(row.qualified_ready ?? 0),
      ph_rate: Number(row.ph_rate ?? 0),
      jev_raw: row.jev_raw == null ? null : String(row.jev_raw),
    }));
  } catch (err: any) {
    if (!err.message?.includes("no such table")) {
      console.warn(`  [AuthSet] Could not query lake_ats_discovery: ${err.message}`);
    }
    return [];
  }
}

/**
 * SQLite string-literal escaping for the generated D1 batch file.
 * Single quotes are doubled (SQLite convention); NUL bytes are stripped
 * because SQLite text cannot contain them.
 */
export function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/\0/g, "").replace(/'/g, "''")}'`;
}

/** Minimum-field guard: rows without a title and canonical URL are never synced. */
export function isSyncableCandidate(job: Pick<CandidateRow, "title" | "source_url">): boolean {
  return Boolean(job.title?.trim()) && Boolean(job.source_url?.trim());
}

/**
 * `freshness.max_days_since_post` from `docs/ACCEPTED_PARAMETERS.yaml` (line 76). Mirrored,
 * not invented: `scripts/ci/audit-parameters.ts` does not register a code anchor for it,
 * which is precisely why this module is the first consumer on the publisher path.
 */
export const MAX_DAYS_SINCE_POST = 30;

/** One qualified candidate's freshness decision, before it is allowed near a public write. */
export type FreshnessVerdict =
  | { kind: "within_window"; ageDays: number }
  | { kind: "stale"; ageDays: number; postedAt: string }
  | { kind: "unknown_date"; raw: string | null };

/**
 * INCIDENT-0410(x) — the publisher had no freshness ceiling at all.
 *
 * `CANDIDATE_SELECT` filtered on `status`, `ph_eligibility` and `source_id` only, and the
 * candidate loop consulted `posted_at` never. CONSTITUTION §3.2 condition 5 (Freshness
 * Compliance) was therefore unenforced at the one statement that sets `is_active = 1`, and
 * §8.4 C19 makes that `UNENFORCED — PAPER RISK`. The lake really does hold such rows:
 * 60 `QUALIFIED_READY` rows were measured on 2026-10-04, the oldest `posted_at` being
 * `2022-02-16T19:45:10.612Z`. They are invisible today only because their `source_id` is
 * unauthorized — the age check cannot be delegated to the source gate.
 *
 * Honesty rules this shares with `buildSyncSql`:
 * - A missing or unparseable date is `unknown_date`, never `now()` and never "fresh". It is
 *   reported, not blocked: changing how undated rows are treated is a separate decision
 *   (`unknown_date_policy: retain-unknown-do-not-publish`) and is not taken here.
 * - The decision is a pure function of the stored date and one `now` captured per tick, so a
 *   re-run cannot drift and rediscovery cannot reset it.
 * - No threshold is added, lowered or widened: the window is the accepted parameter.
 */
export function classifyCandidateFreshness(
  postedAt: string | null | undefined,
  now: Date = new Date(),
  maxAgeDays: number = MAX_DAYS_SINCE_POST,
): FreshnessVerdict {
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0) {
    throw new RangeError(`maxAgeDays must be a non-negative integer, received ${String(maxAgeDays)}`);
  }
  const raw = typeof postedAt === "string" ? postedAt.trim() : null;
  if (!raw) return { kind: "unknown_date", raw: null };
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return { kind: "unknown_date", raw };
  // A future-dated stamp is not evidence of staleness; it is not clamped into an age either.
  const ageDays = Math.max(0, (now.getTime() - parsed) / (1000 * 60 * 60 * 24));
  if (ageDays > maxAgeDays) return { kind: "stale", ageDays, postedAt: raw };
  return { kind: "within_window", ageDays };
}

export interface StaleWithheldRow {
  source_id: string;
  posted_at: string;
  age_days: number;
}

/**
 * The rows this tick refused to publish for age, per source, most-withheld first.
 *
 * Same honesty shape as `formatHeldSupplyNotice`: a withheld cohort that is only counted in
 * aggregate is invisible, and an invisible drop on the publication path is the failure mode
 * INCIDENT-0410(v) and (w) were written to remove. Reporting authorizes nothing.
 */
export function formatStaleSupplyNotice(
  withheld: readonly StaleWithheldRow[],
  topN = 5,
): string[] {
  const bySource = new Map<string, { count: number; oldestDays: number }>();
  for (const row of withheld) {
    if (!row.source_id || row.age_days <= 0) continue;
    const entry = bySource.get(row.source_id) ?? { count: 0, oldestDays: 0 };
    entry.count += 1;
    entry.oldestDays = Math.max(entry.oldestDays, row.age_days);
    bySource.set(row.source_id, entry);
  }
  const rows = [...bySource.entries()]
    .map(([sourceId, entry]) => ({ sourceId, ...entry }))
    .sort((a, b) => b.count - a.count || b.oldestDays - a.oldestDays || a.sourceId.localeCompare(b.sourceId));
  if (rows.length === 0) return [];

  const shown = rows.slice(0, topN);
  const lines = shown.map(
    (row) =>
      `  [Freshness] WITHHELD ${row.count} qualified row(s) from "${row.sourceId}" — oldest is` +
      ` ${Math.floor(row.oldestDays)} day(s) old, past the accepted ${MAX_DAYS_SINCE_POST}-day window.`,
  );
  if (rows.length > shown.length) {
    lines.push(`  [Freshness] WITHHELD ... and ${rows.length - shown.length} more source(s) past the freshness window.`);
  }
  lines.push(
    `  [Freshness] WITHHELD TOTAL ${withheld.length} qualified row(s) past the` +
      ` freshness.max_days_since_post=${MAX_DAYS_SINCE_POST} window; not published, not counted as supply.`,
  );
  return lines;
}

/** Builds one idempotent upsert statement for a qualified lake candidate.
 *
 * HONESTY CONTRACT (§20 freshness, §2 anti-fabrication):
 * - Unknown `posted_at` stays SQL NULL (never `now()`). A sync event is not
 *   a posting event; downstream ordering already falls back via
 *   `coalesce(posted_at, scraped_at)`.
 * - `ph_eligibility` must already be `eligible_verified`/`eligible_likely`
 *   (the SELECT guarantees this); anything else throws instead of
 *   defaulting to `eligible_verified`.
 * - Unknown `geo_scope` stays `'unknown'` (the schema's honest value),
 *   never `'worldwide'`.
 */
export function buildSyncSql(job: CandidateRow): string {
  if (job.ph_eligibility !== "eligible_verified" && job.ph_eligibility !== "eligible_likely") {
    throw new Error(
      `Refusing to sync row id=${job.id} with ph_eligibility=${JSON.stringify(job.ph_eligibility)} (must be eligible_verified/eligible_likely).`
    );
  }
  const titleVal = escapeSql(job.title);
  const companyVal = escapeSql(job.company || "Unknown");
  const sourceUrlVal = escapeSql(job.source_url);
  const sourcePlatformVal = escapeSql(job.source_platform);
  const sourceIdVal = escapeSql(job.source_id);
  const categoryVal = escapeSql(job.category || "other");
  const locationRawVal = escapeSql(job.location_raw || "Remote");
  const descriptionVal = escapeSql(job.description?.slice(0, 1000) || "");
  const applicationUrlVal = escapeSql(job.application_url || job.source_url);
  const postedAtVal = job.posted_at?.trim() ? escapeSql(job.posted_at) : "NULL";
  const canonicalHash = toContentHash(job.title, job.source_url);
  const contentHashVal = escapeSql(canonicalHash);
  const geoScopeVal = escapeSql(job.geo_scope?.trim() ? job.geo_scope : "unknown");
  const phEligibilityVal = escapeSql(job.ph_eligibility);

  return `
      INSERT INTO opportunities (
        title, company, type, source_url, source_platform, source_id,
        category, location_type, location_raw, description,
        application_url, posted_at, is_active, content_hash,
        geo_scope, ph_eligibility, scraped_at, last_seen_in_feed_at
      ) VALUES (
        ${titleVal}, ${companyVal}, 'freelance', ${sourceUrlVal}, ${sourcePlatformVal}, ${sourceIdVal},
        ${categoryVal}, 'remote', ${locationRawVal}, ${descriptionVal},
        ${applicationUrlVal}, ${postedAtVal}, 1, ${contentHashVal},
        ${geoScopeVal}, ${phEligibilityVal}, datetime('now'), datetime('now')
      )
      ON CONFLICT(source_url) DO UPDATE SET
        last_seen_in_feed_at = datetime('now'),
        is_active = 1,
        ph_eligibility = excluded.ph_eligibility,
        geo_scope = excluded.geo_scope;
    `.trim();
}

/** Builds an idempotent publication receipt statement for the ledger (F1 repair). */
export function buildPublicationReceiptSql(
  sourceId: string,
  count: number,
  now: string = new Date().toISOString()
): string {
  const tickKey = escapeSql(`lake-sync:${now}`);
  const retryKey = escapeSql(`lake-sync:${now}:${sourceId}:${count}`);
  const sourceIdEsc = escapeSql(sourceId);
  const nowEsc = escapeSql(now);
  return `
      INSERT INTO source_publication_ledger (
        source_id, tick_key, retry_key, mode, proposed_count, published_count, published_ids_json, decided_at
      ) VALUES (
        ${sourceIdEsc}, ${tickKey}, ${retryKey}, 'unlimited', ${count}, ${count}, '[]', ${nowEsc}
      );
    `.trim();
}

/** Fetches current production serving inventory snapshot from Cloudflare D1 (F2 repair). */
export function fetchD1InventorySnapshot(cwd = process.cwd()): InventorySnapshot | null {
  try {
    const sql = "SELECT source_id as sourceId, count(*) as count FROM opportunities WHERE is_active = 1 GROUP BY source_id;";
    const cmd = `bun run --cwd apps/web wrangler d1 execute DB --remote --env production --command "${sql}"`;
    const output = execSync(cmd, { cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
    const startIdx = output.indexOf("[");
    if (startIdx === -1) return null;
    const parsed = JSON.parse(output.slice(startIdx));
    const rows = (parsed[0]?.results ?? []) as Array<{ sourceId: string | null; count: number }>;
    const bySource = rows.map((r) => ({
      sourceId: r.sourceId || "unattributed",
      count: Number(r.count || 0),
    }));
    const activeTotal = bySource.reduce((sum, r) => sum + r.count, 0);
    return { activeTotal, bySource };
  } catch (err: any) {
    console.warn("  [Inventory] Could not fetch D1 inventory snapshot:", err.message);
    return null;
  }
}

/** Remote D1 rejects SQL BEGIN/COMMIT, so the batch is a sequence of idempotent statements. */
export function buildBatchSql(statements: string[]): string {
  return statements.join("\n\n");
}

/** Repo-pinned wrangler invocation (matches the savepoint's MODULE_NOT_FOUND lesson). */
function wranglerD1Command(tempSqlFile: string): string {
  const repoRoot = path.resolve(import.meta.dir, "..", "..");
  const pinned = path.join(repoRoot, "node_modules", "wrangler", "bin", "wrangler.js");
  const config = path.join(repoRoot, "apps", "web", "wrangler.jsonc");
  if (fs.existsSync(pinned)) {
    return `bun "${pinned}" d1 execute DB --remote --env production --config "${config}" --file="${tempSqlFile}"`;
  }
  return `bunx wrangler@4.143.0 d1 execute DB --remote --env production --config "${config}" --file="${tempSqlFile}"`;
}

const CANDIDATE_SELECT = `
  SELECT id, source_id, source_platform, source_url, title, company,
         category, location_raw, description, application_url,
         posted_at, geo_scope, ph_eligibility, fingerprint_hash
  FROM lake_candidate_jobs
  WHERE status = 'QUALIFIED_READY'
    AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
    AND source_id IN (`;

/**
 * INCIDENT-0410(y) — candidate selection was ordered by insertion, so a tenant's stale rows
 * consumed its whole publish budget and then kept their place at the head of the queue.
 *
 * Measured 2026-10-04 (read-only, Turso lake): of the 60 `QUALIFIED_READY` rows, 50 are older
 * than the accepted 30-day window and only 10 are inside it. `ORDER BY id ASC LIMIT ?` handed the
 * oldest rows to the budget first, `classifyCandidateFreshness` then withheld them for age, and a
 * withheld row keeps its status — so the next tick re-selected the same head of the queue and the
 * in-window rows behind it were never reached. That is permanent head-of-line blocking, and it caps
 * a source's real output below what the source gate authorised.
 *
 * Newest first, undated last, `id ASC` as the deterministic tiebreak:
 * - It cannot publish anything new. The `status`, `ph_eligibility` and `source_id` predicates are
 *   unchanged, and `classifyCandidateFreshness` still withholds every out-of-window row. Ordering
 *   only decides which rows reach that gate first.
 * - No date is invented or substituted. `posted_at` is read exactly as stored; `julianday()` only
 *   ranks it, and an unparseable date ranks with the undated ones instead of being treated as fresh.
 * - `id ASC` last keeps the selection reproducible, so a re-run cannot reshuffle a cohort.
 */
const CANDIDATE_PUBLISH_ORDER = `ORDER BY
     (posted_at IS NULL OR TRIM(posted_at) = '') ASC,
     julianday(posted_at) DESC,
     id ASC`;

/** The one statement both publisher call sites use, so their ordering can never diverge. */
export function buildCandidateSelectSql(sourceIds: readonly string[]): string {
  const placeholders = sourceIds.map(() => "?").join(",");
  return `${CANDIDATE_SELECT}${placeholders}) ${CANDIDATE_PUBLISH_ORDER} LIMIT ?;`;
}

export async function syncQualifiedJobsToD1(
  limit = 200,
  dryRun = false,
  opts: { holdAutoApproved?: boolean; inventory?: InventorySnapshot | null } = {}
) {
  console.log(`\n=== Starting automatic lake sync to Cloudflare D1 (Limit: ${limit}, DryRun: ${dryRun}) ===`);
  const client = getLakeClient();
  const holdAutoApproved = opts.holdAutoApproved === true;
  const inventory = opts.inventory !== undefined ? opts.inventory : (dryRun ? null : fetchD1InventorySnapshot());
  if (inventory) {
    console.log(`  [Inventory] Loaded serving snapshot: ${inventory.activeTotal} active opportunities across ${inventory.bySource.length} sources.`);
  }
  const tenants = await loadAutoApprovedTenants(client);
  const planned = planAutoPublishSources(tenants, inventory, holdAutoApproved);
  if (holdAutoApproved && tenants.length > 0) {
    console.warn(`  [AutoPublish] Kill switch held ${tenants.length} auto-approved tenant(s).`);
  }
  const baseIds = [...BASE_AUTHORIZED_SOURCE_IDS];
  console.log(`  [AuthSet] Base sources ${baseIds.length}; auto-publish sources ${planned.length}.`);

  const candidates: CandidateRow[] = [];
  const seen = new Set<number>();
  let remaining = limit;

  for (const source of planned) {
    if (remaining <= 0) break;
    const take = Math.min(source.publishCount, remaining);
    const res = await client.execute({
      sql: buildCandidateSelectSql([source.sourceId]),
      args: [source.sourceId, take],
    });
    for (const row of res.rows as unknown as CandidateRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      candidates.push(row);
      remaining -= 1;
    }
  }

  if (remaining > 0 && baseIds.length > 0) {
    const res = await client.execute({
      sql: buildCandidateSelectSql(baseIds),
      args: [...baseIds, remaining],
    });
    for (const row of res.rows as unknown as CandidateRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      candidates.push(row);
    }
  }

  const authorizedList = [...baseIds, ...planned.map((source) => source.sourceId)];
  const heldPlaceholders = authorizedList.map(() => "?").join(",");
  let heldRows: HeldSourceRow[] = [];
  try {
    const held = await client.execute({
      sql: `
        SELECT source_id, COUNT(*) AS held_count FROM lake_candidate_jobs
        WHERE status = 'QUALIFIED_READY'
          AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
          AND source_id NOT IN (${heldPlaceholders})
        GROUP BY source_id
        ORDER BY held_count DESC, source_id ASC;`,
      args: [...authorizedList],
    });
    heldRows = held.rows as unknown as HeldSourceRow[];
    for (const line of formatHeldSupplyNotice(heldRows)) console.warn(line);
  } catch {
    // Observability only; never blocks the sync.
  }

  if (candidates.length === 0) {
    const notice = formatPublishOutcomeNotice(0, heldRows);
    if (notice.level === "warn") console.warn(notice.line);
    else console.log(notice.line);
    return { syncedCount: 0 };
  }

  console.log(`Found ${candidates.length} authorized qualified jobs in Turso Lake ready for D1 sync.`);

  // 2. Generate idempotent D1 SQL statements with canonical content hash
  const sqlStatements: string[] = [];
  const syncedIds: number[] = [];
  const countsBySource = new Map<string, number>();
  const staleWithheld: StaleWithheldRow[] = [];
  // One clock for the whole tick, so a re-run cannot drift a row across the boundary.
  const tickNow = new Date();

  for (const job of candidates) {
    if (!isSyncableCandidate(job)) {
      console.warn(`  [Sync] Skipping unsyncable row id=${job.id} (missing title or source_url).`);
      continue;
    }
    const verdict = classifyCandidateFreshness(job.posted_at, tickNow);
    if (verdict.kind === "stale") {
      staleWithheld.push({ source_id: job.source_id, posted_at: verdict.postedAt, age_days: verdict.ageDays });
      console.warn(
        `  [Sync] Withholding row id=${job.id} (${job.source_id}): posted_at=${verdict.postedAt}` +
          ` is ${Math.floor(verdict.ageDays)} day(s) old, past the accepted ${MAX_DAYS_SINCE_POST}-day window.`,
      );
      continue;
    }
    try {
      sqlStatements.push(buildSyncSql(job));
      countsBySource.set(job.source_id, (countsBySource.get(job.source_id) || 0) + 1);
    } catch (err: any) {
      console.warn(`  [Sync] Skipping row id=${job.id}: ${err.message}`);
      continue;
    }
    syncedIds.push(job.id);
  }

  for (const line of formatStaleSupplyNotice(staleWithheld)) console.warn(line);

  // Record publication receipts for all synced sources (F1 repair)
  const receiptNow = new Date().toISOString();
  for (const [sourceId, count] of countsBySource.entries()) {
    sqlStatements.push(buildPublicationReceiptSql(sourceId, count, receiptNow));
  }

  if (dryRun) {
    console.log(`[DRY RUN] Generated ${sqlStatements.length} SQL statements. Sample:`);
    console.log(sqlStatements[0]);
    return { syncedCount: sqlStatements.length, sample: sqlStatements[0] };
  }

  // Remote D1 rejects SQL BEGIN/COMMIT. Statements are idempotent, so a retry is safe.
  const tempSqlFile = path.join(os.tmpdir(), `va-hub-lake-sync-${Date.now()}.sql`);
  const batchSql = buildBatchSql(sqlStatements);
  fs.writeFileSync(tempSqlFile, batchSql, "utf-8");

  try {
    console.log(`Executing batch sync of ${sqlStatements.length} opportunities into Cloudflare D1...`);
    const cmd = wranglerD1Command(tempSqlFile);
    const output = execSync(cmd, { encoding: "utf-8" });
    console.log("Wrangler D1 execution output:", output);

    // 4. Mark only the candidate rows D1 actually applied as SYNCED_TO_D1 in the lake.
    // A non-throwing execSync is an exit code, not a landing, so the receipt is conditional on the
    // batch count. Statements are emitted in file order, so only the confirmed prefix is receipted;
    // unconfirmed rows stay QUALIFIED_READY and are retried next tick (upserts are idempotent).
    const confirmation = parseD1BatchConfirmation(output, syncedIds.length);
    const confirmedIds = selectConfirmedCandidateIds(syncedIds, confirmation);
    if (confirmedIds.length < syncedIds.length) {
      console.warn(formatUnconfirmedPublishNotice(confirmation, sqlStatements.length));
    }

    console.log("Marking candidate rows as SYNCED_TO_D1 in Turso Lake...");
    for (const id of confirmedIds) {
      await client.execute({
        sql: `UPDATE lake_candidate_jobs SET status = 'SYNCED_TO_D1', synced_to_d1_at = datetime('now') WHERE id = ?;`,
        args: [id],
      });
    }

    const notice = formatPublishOutcomeNotice(confirmedIds.length, heldRows);
    if (notice.level === "warn") console.warn(notice.line);
    else console.log(notice.line);
    return { syncedCount: confirmedIds.length };
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const { limit, dryRun, holdAutoApproved } = parseSyncArgs(args);

  syncQualifiedJobsToD1(limit, dryRun, { holdAutoApproved }).catch((err) => {
    console.error("Sync to D1 failed:", err);
    process.exit(1);
  });
}
