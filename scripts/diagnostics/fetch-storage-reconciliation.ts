/**
 * INCIDENT-0410(m) — fetch-to-storage reconciliation for ONE named scrape run.
 *
 * The 2026-10-04 incident is "no new job row has been stored since
 * 2026-10-03T14:01:02Z", while `source_fetch_events` shows the acquisition layer
 * fetching 107–849 items per run with zero errors. The scrape route's own funnel
 * telemetry (`inserted`, `acceptedForInsert`, `attemptedInsert`, `geoGateRejected`,
 * `droppedNoUrl`) is console-only, and the one durable run row
 * (`source_fetch_state.__ingest_diag__`) is overwritten on every 10-minute tick,
 * so the per-run funnel is destroyed before it can be read. Nothing in the repo
 * joins the fetch layer to storage, so the acquisition-side hypothesis is UNKNOWN
 * rather than confirmed or refuted.
 *
 * This module supplies that missing measurement and nothing else: a pure
 * reconciliation over rows already retrieved read-only, plus the SELECT statements
 * a maintainer can run by hand. It performs no I/O of its own, mutates nothing,
 * contacts no host, and can neither authorize a source nor publish a job.
 *
 * Three honesty constraints are load-bearing and each has a test:
 *
 * 1. ONE RUN, NOT A SUM. `source_fetch_events.count` is the item count of one
 *    fetch payload; summed over a day it counts sightings, not distinct URLs, and
 *    a sighting total is not a denominator. The input is therefore the event rows
 *    of a single run only.
 * 2. THE DEBOUNCE BOUNDS "ALREADY KNOWN". `apps/web/src/pages/api/cron/scrape.ts`
 *    writes `last_seen_in_feed_at` only when it is null or has drifted more than
 *    `SEEN_DEBOUNCE_MS` (12h), so a URL present in the payload carries a stamp no
 *    older than the debounce. Counting stamps from `run - debounce` onward
 *    therefore yields an UPPER BOUND on the known rows (a stamp written by a later
 *    tick of the same source also counts, which can only over-count), so
 *    `unexplained` is UNDER-counted: a positive `unexplained` is a strong claim
 *    (even the generous reading leaves a gap), and a zero `unexplained` is NOT
 *    proof of health. Both directions are reported as caveats rather than left for
 *    the reader to infer.
 * 3. NO GUESSED IDENTITY. A source is attributed to a storage platform only by an
 *    exact or separator/case-normalized name match, and only when the match is
 *    unambiguous. Anything else is UNKNOWN, never zero. A weaker join would
 *    silently invent the very attribution this measurement depends on.
 */

/** Mirrors SEEN_DEBOUNCE_MS in apps/web/src/pages/api/cron/scrape.ts. */
export const FETCH_STORAGE_DEBOUNCE_HOURS = 12;

export interface FetchEventRow {
  source_id: string;
  source_name: string | null;
  /** Item count of this run's payload for this source. */
  count: number;
  /** 1 when a cadence guard suppressed the fetch. */
  skipped: number;
  /** 1 when the fetch reported success. */
  ok: number;
  error: string | null;
}

export interface KnownRow {
  source_platform: string;
  last_seen_in_feed_at: string;
}

export interface StoredRow {
  source_platform: string;
  scraped_at: string;
}

export type PlatformMatch = "exact" | "normalized" | "none" | "collision";

export type FetchStorageClass =
  | "storing_new"
  | "known_only"
  | "platform_population_unresolved"
  | "fetched_but_unaccounted"
  | "fetch_failed"
  | "skipped"
  | "unmapped_unknown"
  | "censored_unknown";

export interface SourceReconciliation {
  sourceId: string;
  sourceName: string | null;
  platform: string | null;
  platformMatch: PlatformMatch;
  fetched: number;
  skipped: number;
  ok: number;
  error: string | null;
  /** Upper bound on rows already stored whose URL reappeared in this run. */
  alreadyKnown: number | null;
  /** Rows this run stored for the first time. */
  newlyStored: number;
  /** fetched - alreadyKnown - newlyStored, floored at 0. */
  unexplained: number | null;
  /**
   * Rows the serving table holds for this platform over its whole lifetime, when the
   * caller supplied them. It bounds nothing about these specific URLs: a platform can
   * hold more rows than the run fetched and still be missing every one of them.
   */
  platformRowTotal: number | null;
  anomalous: boolean;
  class: FetchStorageClass;
}

export interface FetchStorageReconciliation {
  runAt: string;
  trailingWindowHours: number;
  debounceHours: number;
  /** False when the trailing window cannot bound the debounce. */
  measurable: boolean;
  censored: string | null;
  caveats: string[];
  sources: SourceReconciliation[];
  totals: {
    fetched: number;
    alreadyKnown: number | null;
    newlyStored: number;
    unexplained: number | null;
    unmappedSources: number;
    anomalousSources: number;
  };
}

export interface ReconcileInput {
  /** ISO instant of the single run being reconciled. */
  runAt: string;
  trailingWindowHours: number;
  /** `source_fetch_events` rows for that one run. */
  events: FetchEventRow[];
  /** `opportunities` rows carrying a `last_seen_in_feed_at` stamp. */
  knownRows: KnownRow[];
  /** `opportunities` rows whose first storage happened in that run. */
  storedRows: StoredRow[];
  /**
   * Every `source_platform` the serving table has ever carried, regardless of the
   * trailing window. Attribution can only join a source whose platform name is in
   * the set, and a source that has stopped stamping drops out of a
   * window-bounded row set — which is exactly the failure this module exists to
   * find, so omitting it turns a real gap into `unmapped_unknown`.
   */
  platformNames?: string[];
  /**
   * Lifetime row count per `source_platform`, from a `GROUP BY` over the serving table
   * with no time bound. Used only to keep the module from calling a gap a storage loss
   * that its own columns cannot support: when the platform already holds at least as
   * many rows as the run fetched, "never stored" and "stored with an aged stamp" are
   * indistinguishable here, and per-URL evidence from the raw payload is required.
   */
  platformRowCounts?: ReadonlyArray<{ source_platform: string; rows: number }>;
}

/**
 * Fold case and separator differences so one platform identity joins to itself
 * ("Remote OK" and "RemoteOK"). Two genuinely different names stay apart: the
 * rule merges formatting, never meaning.
 */
export function normalizePlatformKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function windowStartMs(runAtMs: number, trailingWindowHours: number): number {
  return runAtMs - trailingWindowHours * 3_600_000;
}

function debounceStartMs(runAtMs: number, debounceHours: number): number {
  return runAtMs - debounceHours * 3_600_000;
}

function countRowsWithin(rows: { value: string }[], fromMs: number, toMs: number): number {
  let total = 0;
  for (const row of rows) {
    const at = Date.parse(row.value);
    if (!Number.isFinite(at)) continue;
    if (at >= fromMs && at <= toMs) total += 1;
  }
  return total;
}

function resolvePlatform(
  events: FetchEventRow[],
  platforms: Set<string>,
): Map<string, { platform: string | null; match: PlatformMatch }> {
  const exactByName = new Map<string, string>();
  for (const platform of platforms) {
    const key = platform.toLowerCase();
    if (!exactByName.has(key)) exactByName.set(key, platform);
  }

  const candidates = new Map<string, { platform: string | null; match: PlatformMatch }>();
  for (const event of events) {
    const name = event.source_name;
    if (!name) {
      candidates.set(event.source_id, { platform: null, match: "none" });
      continue;
    }
    const exact = exactByName.get(name.toLowerCase());
    if (exact) {
      candidates.set(event.source_id, { platform: exact, match: "exact" });
      continue;
    }
    // Accept the normalized join only when exactly one platform carries that key.
    const normalized = normalizePlatformKey(name);
    const matches = [...platforms].filter((platform) => normalizePlatformKey(platform) === normalized);
    candidates.set(
      event.source_id,
      matches.length === 1
        ? { platform: matches[0]!, match: "normalized" }
        : { platform: null, match: matches.length === 0 ? "none" : "collision" },
    );
  }

  // Two sources claiming one platform in the same run would double-count the same
  // storage rows and hide each other's gap, so every claimant is refused.
  const claimants = new Map<string, string[]>();
  for (const event of events) {
    const platform = candidates.get(event.source_id)?.platform;
    if (!platform) continue;
    claimants.set(platform, [...(claimants.get(platform) ?? []), event.source_id]);
  }
  const contested = new Set([...claimants.values()].filter((ids) => ids.length > 1).flat());

  const resolved = new Map<string, { platform: string | null; match: PlatformMatch }>();
  for (const event of events) {
    const candidate = candidates.get(event.source_id) ?? { platform: null, match: "none" as PlatformMatch };
    resolved.set(
      event.source_id,
      contested.has(event.source_id) ? { platform: null, match: "collision" } : candidate,
    );
  }
  return resolved;
}

function classifySource(input: {
  fetched: number;
  skipped: number;
  ok: number;
  error: string | null;
  platform: string | null;
  alreadyKnown: number | null;
  newlyStored: number;
  unexplained: number | null;
  platformRowTotal: number | null;
  measurable: boolean;
}): FetchStorageClass {
  if (!input.measurable) return "censored_unknown";
  if (input.platform === null) return "unmapped_unknown";
  if (input.error !== null || input.ok === 0) return "fetch_failed";
  if (input.fetched === 0) return input.skipped > 0 ? "skipped" : "known_only";
  if (input.newlyStored > 0) return "storing_new";
  if ((input.unexplained ?? 0) > 0) {
    // The gap stays unexplained either way; this only refuses to attribute it. The
    // population count cannot identify these URLs, so a gap on a platform that already
    // holds more rows than were fetched is reported as unresolved, not as loss.
    return input.platformRowTotal !== null && input.platformRowTotal >= input.fetched
      ? "platform_population_unresolved"
      : "fetched_but_unaccounted";
  }
  return "known_only";
}

export function reconcileFetchStorage(input: ReconcileInput): FetchStorageReconciliation {
  const runAtMs = Date.parse(input.runAt);
  const debounceHours = FETCH_STORAGE_DEBOUNCE_HOURS;
  const measurable = Number.isFinite(runAtMs) && input.trailingWindowHours > debounceHours;
  const censored = !Number.isFinite(runAtMs)
    ? "run instant is not a valid timestamp"
    : measurable
      ? null
      : `trailing window ${input.trailingWindowHours}h does not outlast the ${debounceHours}h last-seen debounce, so "already known" cannot be bounded`;

  const caveats = [
    "One run only: event counts are per-payload item counts, so summing runs would count sightings rather than distinct URLs.",
    `"already known" is an UPPER BOUND (a stamp is written at most once per ${debounceHours}h), so "unexplained" is UNDER-counted.`,
    "A zero unexplained is therefore NOT proof of health; the over-counted known side can absorb a real gap.",
    "Only an exact or separator/case-normalized platform name match attributes a source; every other source stays UNKNOWN rather than zero.",
  ];
  if (!measurable) {
    caveats.push("This run is CENSORED: no anomaly is claimed and no source is cleared.");
  }

  const platforms = new Set<string>([
    ...(input.platformNames ?? []),
    ...input.knownRows.map((row) => row.source_platform),
    ...input.storedRows.map((row) => row.source_platform),
  ]);
  const attribution = resolvePlatform(input.events, platforms);

  if (input.platformNames === undefined) {
    caveats.push(
      "No platform universe was supplied, so only platforms carrying a row inside the trailing window can be joined; a source whose stamps have all expired is reported unmapped_unknown rather than as a gap.",
    );
  }
  if (input.platformRowCounts === undefined) {
    caveats.push(
      "No platform row totals were supplied, so an unexplained gap is reported as unattributed; see the per-URL note in this module for why the durable columns cannot separate storage loss from an aged stamp.",
    );
  }

  const rowTotals = new Map<string, number>();
  for (const entry of input.platformRowCounts ?? []) {
    if (!rowTotals.has(entry.source_platform)) rowTotals.set(entry.source_platform, Number(entry.rows) || 0);
  }

  const fromMs = Number.isFinite(runAtMs) ? windowStartMs(runAtMs, input.trailingWindowHours) : Number.NaN;
  const knownFromMs = Number.isFinite(runAtMs) ? debounceStartMs(runAtMs, debounceHours) : Number.NaN;

  const sources = input.events.map((event) => {
    const { platform, match } = attribution.get(event.source_id) ?? { platform: null, match: "none" as PlatformMatch };
    const platformRows = platform === null ? [] : input.knownRows.filter((row) => row.source_platform === platform);
    const alreadyKnown = measurable && platform !== null
      ? countRowsWithin(
          platformRows.map((row) => ({ value: row.last_seen_in_feed_at })),
          knownFromMs,
          Number.POSITIVE_INFINITY,
        )
      : null;
    const newlyStored = platform === null || !Number.isFinite(fromMs)
      ? 0
      : input.storedRows.filter(
          (row) => row.source_platform === platform && Date.parse(row.scraped_at) >= runAtMs,
        ).length;
    const fetched = Number(event.count) || 0;
    const unexplained = alreadyKnown === null ? null : Math.max(0, fetched - alreadyKnown - newlyStored);
    const platformRowTotal = platform === null ? null : rowTotals.get(platform) ?? null;

    return {
      sourceId: event.source_id,
      sourceName: event.source_name,
      platform,
      platformMatch: match,
      fetched,
      skipped: Number(event.skipped) || 0,
      ok: Number(event.ok) || 0,
      error: event.error,
      alreadyKnown,
      newlyStored,
      unexplained,
      platformRowTotal,
      anomalous: measurable && unexplained !== null && unexplained > 0,
      class: classifySource({
        fetched,
        skipped: Number(event.skipped) || 0,
        ok: Number(event.ok) || 0,
        error: event.error,
        platform,
        alreadyKnown,
        newlyStored,
        unexplained,
        platformRowTotal,
        measurable,
      }),
    } satisfies SourceReconciliation;
  });

  if (sources.some((source) => source.class === "platform_population_unresolved")) {
    caveats.push(
      "A platform row total is not per-URL identity: where the serving table already holds at least as many rows for the platform as the run fetched, \"never stored\" and \"stored with a stamp older than the debounce\" are indistinguishable here, so the gap is left unresolved and only per-URL evidence from the raw payload can settle it.",
    );
  }

  const mapped = sources.filter((source) => source.alreadyKnown !== null);
  const knownSum = mapped.length === sources.length
    ? mapped.reduce((sum, source) => sum + (source.alreadyKnown ?? 0), 0)
    : null;
  const unexplainedSum = measurable
    ? sources.reduce((sum, source) => sum + (source.unexplained ?? 0), 0)
    : null;

  return {
    runAt: input.runAt,
    trailingWindowHours: input.trailingWindowHours,
    debounceHours,
    measurable,
    censored,
    caveats,
    sources,
    totals: {
      fetched: sources.reduce((sum, source) => sum + source.fetched, 0),
      alreadyKnown: knownSum,
      newlyStored: sources.reduce((sum, source) => sum + source.newlyStored, 0),
      unexplained: unexplainedSum,
      unmappedSources: sources.filter((source) => source.platform === null).length,
      anomalousSources: sources.filter((source) => source.anomalous).length,
    },
  };
}

/** Per-source classes in event order, so a caller can print or assert them directly. */
export function classifyFetchStorage(report: FetchStorageReconciliation): FetchStorageClass[] {
  return report.sources.map((source) => source.class);
}

/**
 * Read-only SELECTs for a maintainer to run by hand against prod D1. Kept beside
 * the function that consumes their rows so the field names cannot drift apart.
 * These return data and write nothing; substitute the run instant first.
 */
export const FETCH_STORAGE_RECONCILIATION_SQL = {
  events:
    "SELECT source_id, source_name, count, skipped, ok, error FROM source_fetch_events WHERE timestamp = ? ORDER BY source_id",
  known:
    "SELECT source_platform, last_seen_in_feed_at FROM opportunities WHERE last_seen_in_feed_at IS NOT NULL AND last_seen_in_feed_at >= ? AND last_seen_in_feed_at <= ?",
  // Feed this to ReconcileInput.platformNames. Without it a source whose last-seen
  // stamps have all expired cannot be joined to its own platform name at all.
  platforms:
    "SELECT DISTINCT source_platform FROM opportunities WHERE source_platform IS NOT NULL",
  // Feed this to ReconcileInput.platformRowCounts. It bounds nothing per URL; it only
  // stops the module from calling an unattributed gap a storage loss.
  platformRowCounts:
    "SELECT source_platform, COUNT(*) AS rows FROM opportunities WHERE source_platform IS NOT NULL GROUP BY source_platform",
  stored:
    "SELECT source_platform, scraped_at FROM opportunities WHERE scraped_at >= ?",
} as const;