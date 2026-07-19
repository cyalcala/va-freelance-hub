import type { APIRoute } from "astro";
import { getDb, opportunities, sourceFetchState, sourceFetchEvents, vaDirectory, type NewOpportunity, type SourceFetchState } from "@va-hub/db";
import { isNotNull, and, inArray, eq, lt } from "drizzle-orm";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";

export const prerender = false;
import { disabledSources, rssSources, htmlSources, jsonSources, sources as staticSources, fetchRSSFeed, fetchHTMLSource, fetchJSONSource, fetchATSFeed, triageJob, geoGate, chunkArray, maxRowsPerD1Batch, isAutoPaused, autoPauseNote, autoPauseEntries, sanitizeApplyUrl, type CollectionMethod, type ComplianceStatus, type Source, type ConditionalState, type SourceFetchOutput } from "@va-hub/scraper";

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function mapTriageCategoryToUiCategory(cat: string): string {
  switch (cat) {
    case "admin": return "admin";
    case "design":
    case "creative": return "design";
    case "tech": return "tech";
    case "marketing":
    case "social-media": return "marketing";
    case "customer-service":
    case "customer-support": return "customer-service";
    case "finance": return "finance";
    default: return "other";
  }
}

type SourceType = "RSS" | "HTML" | "JSON" | "ATS";

interface SourceFetchResult {
  sourceId?: string;
  sourceName: string;
  sourceType: SourceType;
  collectionMethod: CollectionMethod | "public_ats_json";
  complianceStatus: ComplianceStatus;
  complianceNotes?: string;
  ok: boolean;
  count: number;
  durationMs: number;
  items: NewOpportunity[];
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  // Conditional-fetch outcome (freshness masterplan): true when the feed was
  // unchanged (304 / identical body) and parse+triage were skipped. Validators
  // are carried forward to source_fetch_state.
  notModified?: boolean;
  etag?: string | null;
  lastModified?: string | null;
  bodyHash?: string | null;
}

interface InsertError {
  batchStart: number;
  batchSize: number;
  error: string;
}

type AppDb = ReturnType<typeof getDb>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourceStatus(result: SourceFetchResult) {
  const { items: _items, ...status } = result;
  return status;
}

function toSourceType(source: Source): SourceType {
  if (source.type === "rss") return "RSS";
  if (source.type === "html") return "HTML";
  return "JSON";
}

function skippedSourceResult(source: Source, skipReason = source.complianceNotes): SourceFetchResult {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceType: toSourceType(source),
    collectionMethod: source.collectionMethod,
    complianceStatus: source.complianceStatus,
    complianceNotes: source.complianceNotes,
    ok: true,
    count: 0,
    durationMs: 0,
    items: [],
    skipped: true,
    skipReason,
  };
}

const D1_INSERT_BATCH_SIZE = 3;

interface AtsAgency {
  id: number;
  companyName: string;
  atsPlatform: string | null;
  atsToken: string | null;
  verifiedAt: string | null;
}

type AtsPlatform = "lever" | "greenhouse" | "workable" | "breezy" | "ashby";

interface AtsPlatformPolicy {
  enabled: boolean;
  complianceStatus: ComplianceStatus;
  complianceNotes: string;
}

const ATS_PLATFORM_POLICIES: Record<AtsPlatform, AtsPlatformPolicy> = {
  ashby: {
    // Platform default is paused; specific reviewed tokens are enabled in
    // ATS_TOKEN_POLICIES below (fail-closed for any unreviewed Ashby org).
    enabled: false,
    complianceStatus: "paused",
    complianceNotes:
      "Paused 2026-07-12: unknown Ashby orgs require source-specific review; reviewed tokens are enabled individually.",
  },
  breezy: {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes:
      "Paused 2026-06-12: Breezy ATS tokens require source-specific review before fetching.",
  },
  workable: {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes:
      "Paused 2026-06-12: repeated Workable HTTP 429s and no reviewed source-supported access path; do not fetch until permission or supported API terms are confirmed.",
  },
  greenhouse: {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes:
      "Paused 2026-06-12: no current reviewed directory source uses Greenhouse; require source-specific review before enabling.",
  },
  lever: {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes:
      "Paused 2026-06-12: no current reviewed directory source uses Lever; require source-specific review before enabling.",
  },
};

const ATS_TOKEN_POLICIES: Record<string, AtsPlatformPolicy> = {
  // RemoteWork3.8 review 2026-07-12: Ashby public posting API (jobs.ashbyhq.com
  // boards) is a documented job-board distribution endpoint; each token below
  // was probed live and returns published, listed roles. Collect minimal
  // metadata, link back to the Ashby-hosted posting, pause on objection.
  "ashby:supabase": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: public Ashby posting API returned 51 published jobs; link back to jobs.ashbyhq.com and pause on objection or clarified hostile terms.",
  },
  "ashby:camunda": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: public Ashby posting API returned 36 published jobs; link back to jobs.ashbyhq.com and pause on objection or clarified hostile terms.",
  },
  "ashby:tremendous": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: public Ashby posting API returned 20 published jobs; link back to jobs.ashbyhq.com and pause on objection or clarified hostile terms.",
  },
  "ashby:amplify": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: public Ashby posting API returned 35 published jobs; link back to jobs.ashbyhq.com and pause on objection or clarified hostile terms.",
  },
  "ashby:ashby": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: public Ashby posting API returned 64 published jobs; link back to jobs.ashbyhq.com and pause on objection or clarified hostile terms.",
  },
  "greenhouse:grafanalabs": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: Greenhouse Job Board API is public and returned published jobs; collect minimal metadata, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "greenhouse:nearform": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "RemoteWork3.8 review 2026-07-12: Greenhouse Job Board API returned 34 published jobs; collect minimal metadata, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "greenhouse:gitlab": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Gold777 review 2026-07-03: Greenhouse Job Board API endpoint is public and returns published jobs; collect minimal factual metadata, include location context for triage, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "greenhouse:ghost": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Gold777 review 2026-07-03: Greenhouse Job Board API endpoint is public and returns published jobs; collect minimal factual metadata, include location context for triage, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "greenhouse:remotecom": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Gold777 review 2026-07-03: Greenhouse Job Board API endpoint is public and returns published jobs; collect minimal factual metadata, include location context for triage, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "breezy:20four7va": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Goldilocks review 2026-06-12: public Breezy career endpoint is robots-allowed and CORS-readable; collect minimal factual metadata only, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "breezy:sourcefit": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Goldilocks review 2026-06-12: public Breezy career endpoint is robots-allowed and CORS-readable; collect minimal factual metadata only, link back to ATS-hosted URLs, and pause on objection or clarified hostile terms.",
  },
  "breezy:vaaphilippines-recruitment": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Goldilocks review 2026-06-12: public Breezy career endpoint is robots-allowed and CORS-readable but currently returns zero jobs; keep minimal monitored access and pause on objection or clarified hostile terms.",
  },
  "breezy:time-etc": {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Gold777 review 2026-07-03: public Breezy career endpoint is robots-allowed and returns published jobs; collect minimal factual metadata, include location context for triage, link back to Breezy-hosted URLs, and pause on objection or clarified hostile terms.",
  },
};

interface DuplicateAtsAgency {
  agency: AtsAgency;
  primaryCompanyName: string;
}

interface SkippedAtsAgency {
  agency: AtsAgency;
  policy: AtsPlatformPolicy;
  skipReason: string;
}

function atsSourceKey(agency: AtsAgency): string {
  return `${agency.atsPlatform}:${agency.atsToken}`;
}

function atsPlatformPolicy(agency: AtsAgency): AtsPlatformPolicy {
  const platform = agency.atsPlatform as AtsPlatform | null;
  const sourceKey = platform && agency.atsToken ? `${platform}:${agency.atsToken}` : null;
  // Sentinel auto-pauses (paused-sources.json) take precedence over static
  // token policies; the pause reason flows into skip reporting via notes.
  if (sourceKey && isAutoPaused(sourceKey)) {
    return {
      enabled: false,
      complianceStatus: "paused",
      complianceNotes: autoPauseNote(sourceKey) ?? `Auto-paused by sentinel-bot.`,
    };
  }
  if (sourceKey && sourceKey in ATS_TOKEN_POLICIES) {
    return ATS_TOKEN_POLICIES[sourceKey];
  }

  if (platform && platform in ATS_PLATFORM_POLICIES) {
    return ATS_PLATFORM_POLICIES[platform];
  }

  return {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: `Paused 2026-06-09: unknown ATS platform "${agency.atsPlatform}" is not configured for safe collection.`,
  };
}

function atsComplianceNotes(agency: AtsAgency): string {
  return atsPlatformPolicy(agency).complianceNotes;
}

function skippedAtsResult({ agency, policy, skipReason }: SkippedAtsAgency): SourceFetchResult {
  return {
    sourceId: atsSourceKey(agency),
    sourceName: agency.companyName,
    sourceType: "ATS",
    collectionMethod: "public_ats_json",
    complianceStatus: policy.complianceStatus,
    complianceNotes: policy.complianceNotes,
    ok: true,
    count: 0,
    durationMs: 0,
    items: [],
    skipped: true,
    skipReason,
  };
}

function skippedDuplicateAtsResult({ agency, primaryCompanyName }: DuplicateAtsAgency): SourceFetchResult {
  return skippedAtsResult({
    agency,
    policy: atsPlatformPolicy(agency),
    skipReason: `Duplicate ATS token already fetched for ${primaryCompanyName}; skipped to avoid duplicate requests and duplicate source URLs.`,
  });
}

async function fetchSourceWithStatus(
  sourceName: string,
  sourceType: SourceType,
  collectionMethod: SourceFetchResult["collectionMethod"],
  complianceStatus: ComplianceStatus,
  complianceNotes: string | undefined,
  fetcher: () => Promise<NewOpportunity[] | SourceFetchOutput>,
  sourceId?: string
): Promise<SourceFetchResult> {
  const startedAt = Date.now();
  try {
    const raw = await fetcher();
    // Feed fetchers return SourceFetchOutput (items + validators); the ATS
    // path still returns a bare array. Normalize both.
    const output: SourceFetchOutput = Array.isArray(raw)
      ? { items: raw, notModified: false, etag: null, lastModified: null, bodyHash: null }
      : raw;
    return {
      sourceId,
      sourceName,
      sourceType,
      collectionMethod,
      complianceStatus,
      complianceNotes,
      ok: true,
      count: output.items.length,
      durationMs: Date.now() - startedAt,
      items: output.items,
      notModified: output.notModified,
      etag: output.etag,
      lastModified: output.lastModified,
      bodyHash: output.bodyHash,
    };
  } catch (error) {
    return {
      sourceId,
      sourceName,
      sourceType,
      collectionMethod,
      complianceStatus,
      complianceNotes,
      ok: false,
      count: 0,
      durationMs: Date.now() - startedAt,
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface SourceFetchStateLoad {
  states: Map<string, SourceFetchState>;
  available: boolean;
  error?: string;
}

// Coarse run-level mutual exclusion using a reserved source_fetch_state row.
// A run may not exceed this before its lock is considered stale and reclaimable.
const RUN_LOCK_ID = "__scrape_run_lock__";
const RUN_LOCK_TTL_MIN = 8;

async function acquireRunLock(db: AppDb, observedAt: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - RUN_LOCK_TTL_MIN * 60_000).toISOString();
  try {
    // Seed the lock row once (no-op if it already exists). Placeholder metadata
    // keeps the NOT NULL columns satisfied; this row is never a real source.
    await db.insert(sourceFetchState).values({
      sourceId: RUN_LOCK_ID,
      sourceName: "run lock",
      sourceType: "lock",
      collectionMethod: "lock",
      complianceStatus: "lock",
      lastAttemptAt: "1970-01-01T00:00:00.000Z", // start clearly stale so the first run claims it
      updatedAt: observedAt,
    }).onConflictDoNothing();

    // Atomic claim: only succeeds if the current lock is stale (or first run).
    const res: any = await db.update(sourceFetchState)
      .set({ lastAttemptAt: observedAt, updatedAt: observedAt })
      .where(and(eq(sourceFetchState.sourceId, RUN_LOCK_ID), lt(sourceFetchState.lastAttemptAt, cutoff)));
    const changed = res?.meta?.changes ?? res?.rowsAffected ?? 0;
    return changed > 0;
  } catch (error) {
    // If the lock mechanism itself fails, do not block scraping — degrade to
    // the prior (lock-free) behavior rather than stalling the pipeline.
    console.warn("[api/cron/scrape] Run-lock unavailable; proceeding without it:", errorMessage(error));
    return true;
  }
}

async function loadSourceFetchStates(db: AppDb): Promise<SourceFetchStateLoad> {
  try {
    const rows = await db.select().from(sourceFetchState);
    return { states: new Map(rows.map((row) => [row.sourceId, row])), available: true };
  } catch (error) {
    const message = errorMessage(error);
    console.warn("[api/cron/scrape] Source fetch state unavailable; cadence guards will be skipped for this run:", message);
    return { states: new Map(), available: false, error: message };
  }
}

function sourceCadenceSkipReason(
  source: Source,
  state: SourceFetchState | undefined,
  observedAt: string
): string | null {
  if (!source.minFetchIntervalMinutes || !state?.lastAttemptAt) return null;

  const lastAttemptMs = Date.parse(state.lastAttemptAt);
  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(lastAttemptMs) || !Number.isFinite(observedMs)) return null;

  const intervalMs = source.minFetchIntervalMinutes * 60_000;
  const nextAllowedMs = lastAttemptMs + intervalMs;
  if (observedMs >= nextAllowedMs) return null;

  return `Skipped cadence guard: last attempted at ${state.lastAttemptAt}; ${source.minFetchIntervalMinutes}-minute minimum interval.`;
}

async function recordSourceFetchState(
  db: AppDb,
  source: Source,
  result: SourceFetchResult,
  observedAt: string
): Promise<void> {
  const updateValues = {
    sourceName: source.name,
    sourceType: toSourceType(source),
    collectionMethod: source.collectionMethod,
    complianceStatus: source.complianceStatus,
    lastAttemptAt: observedAt,
    lastCount: result.count,
    lastError: result.ok ? null : result.error ?? "Unknown source fetch error",
    updatedAt: observedAt,
    // Persist conditional-request validators so the next run can send
    // If-None-Match / If-Modified-Since and skip an unchanged feed.
    etag: result.etag ?? null,
    lastModified: result.lastModified ?? null,
    lastBodyHash: result.bodyHash ?? null,
    ...(result.ok ? { lastSuccessAt: observedAt } : {}),
  };

  try {
    await db.insert(sourceFetchState).values({
      sourceId: source.id,
      ...updateValues,
      lastSuccessAt: result.ok ? observedAt : null,
    }).onConflictDoUpdate({
      target: sourceFetchState.sourceId,
      set: updateValues,
    });
  } catch (error) {
    console.warn(`[api/cron/scrape] Failed to record source fetch state for ${source.name}:`, errorMessage(error));
  }
}

interface FetchEventLogResult {
  attempted: number;
  recorded: number;
  failedBatches: number;
  errors: string[];
}

// source_fetch_events rows bind 12 SQL variables each. D1 rejects statements
// with more than 100 bound parameters, so a full run's ~25 source results in a
// single insert always failed with "too many SQL variables" — silently, because
// the failure only reached console.warn. Chunk the insert and surface the
// outcome in the scrape response so Hunter can annotate regressions.
const FETCH_EVENT_COLUMNS = 12;

async function recordSourceFetchEvents(
  db: AppDb,
  results: any[],
  observedAt: string
): Promise<FetchEventLogResult> {
  const events = results.map(r => ({
    sourceId: r.sourceId ?? r.sourceName,
    sourceName: r.sourceName,
    sourceType: r.sourceType,
    collectionMethod: r.collectionMethod,
    complianceStatus: r.complianceStatus,
    timestamp: observedAt,
    ok: r.ok ?? false,
    skipped: r.skipped ?? false,
    count: r.count ?? 0,
    durationMs: r.durationMs ?? 0,
    error: r.error ?? null,
    skipReason: r.skipReason ?? null,
  }));

  const outcome: FetchEventLogResult = {
    attempted: events.length,
    recorded: 0,
    failedBatches: 0,
    errors: [],
  };
  if (events.length === 0) return outcome;

  for (const batch of chunkArray(events, maxRowsPerD1Batch(FETCH_EVENT_COLUMNS))) {
    try {
      await db.insert(sourceFetchEvents).values(batch);
      outcome.recorded += batch.length;
    } catch (error) {
      outcome.failedBatches += 1;
      outcome.errors.push(errorMessage(error));
      console.warn(`[api/cron/scrape] Failed to record a batch of ${batch.length} source fetch events:`, errorMessage(error));
    }
  }
  console.log(`[api/cron/scrape] Recorded ${outcome.recorded}/${outcome.attempted} source fetch events (${outcome.failedBatches} failed batches).`);
  return outcome;
}

async function fetchConfiguredSourceWithStatus(
  db: AppDb,
  source: Source,
  sourceType: SourceType,
  sourceFetchStates: Map<string, SourceFetchState>,
  observedAt: string,
  fetcher: (state: ConditionalState | undefined) => Promise<SourceFetchOutput>
): Promise<SourceFetchResult> {
  const prevState = sourceFetchStates.get(source.id);
  const skipReason = sourceCadenceSkipReason(source, prevState, observedAt);
  if (skipReason) {
    return skippedSourceResult(source, skipReason);
  }

  const result = await fetchSourceWithStatus(
    source.name,
    sourceType,
    source.collectionMethod,
    source.complianceStatus,
    source.complianceNotes,
    () => fetcher({ etag: prevState?.etag, lastModified: prevState?.lastModified, lastBodyHash: prevState?.lastBodyHash }),
    source.id
  );
  // An unchanged feed produced no items this run; carry the prior count forward
  // for reporting so it does not read as a zero-count source.
  if (result.notModified && prevState) {
    result.count = prevState.lastCount ?? 0;
  }
  await recordSourceFetchState(db, source, result, observedAt);
  return result;
}

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/scrape] Starting execution...");
  
  const env = locals.runtime.env as any;
  const db = getDb(env);
  const observedAt = nowUtcIso();

  // 1. Rate Limiting Check
  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: clientIp });
    if (!success) {
      console.warn(`[api/cron/scrape] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: "Too Many Requests" }), { 
        status: 429, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  // 2. Authorization Check — supports both header formats and env var names for compatibility
  const proxySecret = env?.PROXY_SECRET || env?.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronSecretHeader;
  if (!proxySecret || !providedSecret || providedSecret !== proxySecret) {
    console.warn("[api/cron/scrape] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 2b. Run-level lock (concurrency guard). With two triggers now firing the
    // scrape endpoint — the GitHub Hunter and a Cloudflare Worker cron — two
    // runs could otherwise overlap and double-fetch every source (compliance +
    // Workers AI cost). Claim a single lock row with an atomic conditional
    // UPDATE; if a fresh lock is already held, exit early. This also closes the
    // cadence-guard TOCTOU noted in the 2026-07 audit.
    const lockAcquired = await acquireRunLock(db, observedAt);
    if (!lockAcquired) {
      console.log("[api/cron/scrape] Another run holds the lock; exiting.");
      return new Response(JSON.stringify({ skipped: true, reason: "run-lock-held", message: "Another scrape run is in progress." }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Fetch all raw items
    const fetchStateLoad = await loadSourceFetchStates(db);
    const sourceFetchStates = fetchStateLoad.states;

    const rssResults = await Promise.all(
      rssSources.map((source) =>
        fetchConfiguredSourceWithStatus(db, source, "RSS", sourceFetchStates, observedAt, (state) => fetchRSSFeed(source, state))
      )
    );
    const rssItems = rssResults.flatMap((result) => result.items);

    const htmlResults = await Promise.all(
      htmlSources.map((source) =>
        fetchConfiguredSourceWithStatus(db, source, "HTML", sourceFetchStates, observedAt, (state) => fetchHTMLSource(source, state))
      )
    );
    const htmlItems = htmlResults.flatMap((result) => result.items);

    const jsonResults = await Promise.all(
      jsonSources.map((source) =>
        fetchConfiguredSourceWithStatus(db, source, "JSON", sourceFetchStates, observedAt, (state) => fetchJSONSource(source, state))
      )
    );
    const jsonItems = jsonResults.flatMap((result) => result.items);

    const atsAgencies = await db.select().from(vaDirectory).where(
      and(
        isNotNull(vaDirectory.atsPlatform),
        isNotNull(vaDirectory.atsToken)
      )
    );
    
    console.log(`[api/cron/scrape] Found ${atsAgencies.length} ATS-enabled agencies in the directory.`);

    // Reconcile Sentinel auto-pauses against the actual source universe: an
    // entry whose sourceId matches neither a static source id nor any ATS
    // platform:token key pauses nothing — surface that instead of silently
    // fetching a source the bot believed it paused.
    const knownPauseTargets = new Set<string>([
      ...staticSources.map((s) => s.id),
      ...atsAgencies
        .filter((a) => a.atsPlatform && a.atsToken)
        .map((a) => `${a.atsPlatform}:${a.atsToken}`),
    ]);
    const unmatchedPauses = autoPauseEntries
      .map((e) => e.sourceId)
      .filter((id) => !knownPauseTargets.has(id));
    if (unmatchedPauses.length > 0) {
      console.warn(`[api/cron/scrape] ${unmatchedPauses.length} auto-pause entr(ies) match no known source and pause nothing:`, unmatchedPauses.join(", "));
    }

        const sortedAtsAgencies = [...atsAgencies].sort((a, b) =>
      atsSourceKey(a).localeCompare(atsSourceKey(b)) ||
      a.companyName.localeCompare(b.companyName)
    );

    // Staggered Workable Polling: Select only the 2 oldest/unscraped Workable agencies
    const workableAgencies = sortedAtsAgencies.filter(a => a.atsPlatform === "workable");
    workableAgencies.sort((a, b) => {
      if (!a.verifiedAt && b.verifiedAt) return -1;
      if (a.verifiedAt && !b.verifiedAt) return 1;
      if (!a.verifiedAt && !b.verifiedAt) return 0;
      return a.verifiedAt!.localeCompare(b.verifiedAt!);
    });
    const allowedWorkableTokens = new Set(workableAgencies.slice(0, 2).map(a => a.atsToken));

    const primaryAtsCompanies = new Map<string, string>();
    const uniqueAtsAgencies: AtsAgency[] = [];
    const duplicateAtsAgencies: DuplicateAtsAgency[] = [];
    const policySkippedAtsAgencies: SkippedAtsAgency[] = [];

    for (const agency of sortedAtsAgencies) {
      const policy = atsPlatformPolicy(agency);
      if (!policy.enabled) {
        policySkippedAtsAgencies.push({
          agency,
          policy,
          skipReason: policy.complianceNotes,
        });
        continue;
      }

      // Skip Workable agencies not in the current active rotation slice
      if (agency.atsPlatform === "workable" && !allowedWorkableTokens.has(agency.atsToken)) {
        policySkippedAtsAgencies.push({
          agency,
          policy,
          skipReason: "Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs)."
        });
        continue;
      }

      const sourceKey = atsSourceKey(agency);
      const primaryCompanyName = primaryAtsCompanies.get(sourceKey);
      if (primaryCompanyName) {
        duplicateAtsAgencies.push({ agency, primaryCompanyName });
      } else {
        primaryAtsCompanies.set(sourceKey, agency.companyName);
        uniqueAtsAgencies.push(agency);
      }
    }

    if (duplicateAtsAgencies.length > 0) {
      console.warn(
        `[api/cron/scrape] Skipping ${duplicateAtsAgencies.length} duplicate ATS director${duplicateAtsAgencies.length === 1 ? "y" : "ies"}.`
      );
    }
    if (policySkippedAtsAgencies.length > 0) {
      console.warn(
        `[api/cron/scrape] Skipping ${policySkippedAtsAgencies.length} ATS director${policySkippedAtsAgencies.length === 1 ? "y" : "ies"} due to platform policy or rotation.`
      );
    }
    
    const atsResults: SourceFetchResult[] = [];
    for (const agency of uniqueAtsAgencies) {
      const policy = atsPlatformPolicy(agency);
      const result = await fetchSourceWithStatus(
        agency.companyName,
        "ATS",
        "public_ats_json",
        policy.complianceStatus,
        policy.complianceNotes,
        () => fetchATSFeed(agency.atsPlatform as any, agency.atsToken as string, agency.companyName),
        atsSourceKey(agency)
      );
      atsResults.push(result);

      if (result.ok && agency.atsPlatform === "workable") {
        try {
          await db.update(vaDirectory)
            .set({ verifiedAt: observedAt })
            .where(eq(vaDirectory.id, agency.id));
          console.log(`[api/cron/scrape] Updated verifiedAt to ${observedAt} for Workable agency: ${agency.companyName}`);
        } catch (error) {
          console.error(`[api/cron/scrape] Failed to update verifiedAt for Workable agency: ${agency.companyName}`, error);
        }
      }

      if (agency.atsPlatform === "workable") {
        await sleep(1_000);
      }
    }
    const atsItems = atsResults.flatMap((result) => result.items);

    const skippedResults = disabledSources.map((source) => skippedSourceResult(source));
    const skippedAtsResults = [
      ...policySkippedAtsAgencies.map(skippedAtsResult),
      ...duplicateAtsAgencies.map(skippedDuplicateAtsResult),
    ];
    // Conditional-fetch efficiency: how many feeds were unchanged this run and
    // skipped parse+triage (the freshness/efficiency win).
    const sourcesUnchanged = [...rssResults, ...htmlResults, ...jsonResults].filter((r) => r.notModified).length;
    const sourceResults = [...rssResults, ...htmlResults, ...jsonResults, ...skippedResults, ...atsResults, ...skippedAtsResults].map(sourceStatus);
    const fetchEventLog = await recordSourceFetchEvents(db, sourceResults, observedAt);
    const cadenceGuards = {
      stateAvailable: fetchStateLoad.available,
      ...(fetchStateLoad.error ? { stateError: fetchStateLoad.error } : {}),
    };
    const failedSources = sourceResults
      .filter((result) => !result.ok)
      .map((result) => `${result.sourceName} (${result.sourceType}): ${result.error}`);

    const allItems = [...rssItems, ...htmlItems, ...jsonItems, ...atsItems];
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML, ${jsonItems.length} JSON, ${atsItems.length} ATS)`);

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        actualChanges: 0,
        acceptedForInsert: 0,
        attemptedInsert: 0,
        insertFailedBatches: 0,
        insertErrors: [],
        skipped: 0,
        unmatchedPauses,
        failedSources,
        sourceResults,
        fetchEventLog,
        cadenceGuards,
        sourcesUnchanged,
        message: "No jobs scraped"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 4. De-duplicate against existing database entries by source URL (batch check, not full-table scan)
    const allScrapedUrls = allItems.map(item => item.sourceUrl).filter(Boolean);
    // Items without a usable sourceUrl can neither dedup nor insert — count
    // them so the raw -> dedup -> triage -> insert funnel stays closed-form.
    const droppedNoUrl = allItems.length - allScrapedUrls.length;
    if (droppedNoUrl > 0) {
      console.warn(`[api/cron/scrape] ${droppedNoUrl} scraped item(s) had no usable sourceUrl and were dropped.`);
    }
    const BATCH_SIZE = 50;
    const existingUrls = new Set<string>();
    for (let i = 0; i < allScrapedUrls.length; i += BATCH_SIZE) {
      const batch = allScrapedUrls.slice(i, i + BATCH_SIZE);
      const found = await db.select({ sourceUrl: opportunities.sourceUrl })
        .from(opportunities)
        .where(inArray(opportunities.sourceUrl, batch));
      found.forEach((r: any) => existingUrls.add(r.sourceUrl));
    }

    // Update lastSeenInFeedAt for jobs still in feeds (prevents false stale archiving)
    if (existingUrls.size > 0) {
      const existingUrlArray = Array.from(existingUrls);
      for (let i = 0; i < existingUrlArray.length; i += BATCH_SIZE) {
        const batch = existingUrlArray.slice(i, i + BATCH_SIZE);
        await db.update(opportunities)
          .set({ lastSeenInFeedAt: observedAt, updatedAt: observedAt })
          .where(inArray(opportunities.sourceUrl, batch));
      }
      console.log(`[api/cron/scrape] Updated lastSeenInFeedAt for ${existingUrls.size} existing jobs`);
    }

    const newItems = allItems.filter((item) => item.sourceUrl && !existingUrls.has(item.sourceUrl));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after URL dedup`);

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        actualChanges: 0,
        acceptedForInsert: 0,
        attemptedInsert: 0,
        insertFailedBatches: 0,
        insertErrors: [],
        skipped: allItems.length,
        droppedNoUrl,
        unmatchedPauses,
        failedSources,
        sourceResults,
        fetchEventLog,
        cadenceGuards,
        sourcesUnchanged,
        message: "Zero new jobs after dedup"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 5. Triage and classify new items
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const itemsToProcess = newItems.slice(0, limit);
    console.log(`[api/cron/scrape] Processing ${itemsToProcess.length} out of ${newItems.length} new items (limit: ${limit})`);

    const triagedItems: typeof opportunities.$inferInsert[] = [];
    // Ineligible jobs are persisted as INACTIVE rows so their source_url
    // enters dedup: previously they were dropped with no record, re-entered
    // newItems on every run, were re-triaged (Workers AI cost) indefinitely,
    // and a cluster of persistent ineligible listings at the head of a large
    // feed could permanently starve items behind the per-run limit.
    const rejectedItems: typeof opportunities.$inferInsert[] = [];
    const concurrency = 3;
    // Jobs whose triage call threw are dropped from this run. Count them so the
    // response (and Hunter annotations) can distinguish "filtered out by
    // policy" from "lost to a triage error" — previously these vanished with
    // only a console.error.
    let triageFailures = 0;
    // Jobs the AI never actually classified (binding missing / all models
    // failed). FAIL CLOSED: skip them this run — their URLs are not inserted,
    // so they naturally retry on the next run when AI recovers. Previously
    // these failed open as eligible/other and an AI outage silently filled
    // the board with unfiltered listings.
    let triageAiUnavailable = 0;
    // Deterministic geo-gate rejections (geo masterplan L1): counted
    // separately from AI rejections so the response shows how much the gate
    // catches — and how many Workers AI calls it saves.
    let geoGateRejected = 0;

    // L1: run the deterministic geo-gate BEFORE any AI call. Ineligible items
    // are persisted as inactive rows (same dedup rationale as triage
    // rejections) without spending a Workers AI invocation. Everything else
    // carries its gate verdict forward so approved rows get geo fields.
    const gatePassedItems: { item: (typeof itemsToProcess)[number]; gate: ReturnType<typeof geoGate> }[] = [];
    for (const item of itemsToProcess) {
      const gate = geoGate({
        title: item.title,
        description: item.description,
        locationRaw: (item as { locationRaw?: string | null }).locationRaw ?? null,
        tags: item.tags,
      });
      if (gate.phEligibility === "ineligible") {
        geoGateRejected += 1;
        console.log(`[api/cron/scrape] Geo-gate rejected "${item.title}": ${gate.evidence}`);
        const cleanDesc = (item.description || "").slice(0, 1500);
        rejectedItems.push({
          ...item,
          isActive: false,
          tags: Array.from(new Set([...(item.tags || []), "geo-gate-rejected"])),
          category: "other",
          geoScope: gate.geoScope,
          phEligibility: gate.phEligibility,
          geoEvidence: gate.evidence,
          geoCheckedAt: observedAt,
          descriptionHash: await generateHash(item.title + cleanDesc),
          applicationUrl: sanitizeApplyUrl(item.applicationUrl) || item.sourceUrl,
          postedAt: normalizeUtcIso(item.postedAt),
          scrapedAt: observedAt,
          lastSeenInFeedAt: observedAt,
          updatedAt: observedAt,
        });
        continue;
      }
      gatePassedItems.push({ item, gate });
    }
    if (geoGateRejected > 0) {
      console.log(`[api/cron/scrape] Geo-gate rejected ${geoGateRejected}/${itemsToProcess.length} items before AI triage.`);
    }

    for (let i = 0; i < gatePassedItems.length; i += concurrency) {
      const chunk = gatePassedItems.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async ({ item, gate }) => {
          console.log(`[api/cron/scrape] Triaging: "${item.title}"`);
          try {
            const triage = await triageJob(item.title, item.description || "", env);
            return { item, gate, triage };
          } catch (err) {
            console.error(`[api/cron/scrape] Triage failed for "${item.title}":`, err);
            triageFailures += 1;
            return { item, gate, triage: null };
          }
        })
      );

      for (const { item, gate, triage } of results) {
        if (!triage) continue;

        if (triage.aiUnavailable) {
          triageAiUnavailable += 1;
          console.warn(`[api/cron/scrape] AI unavailable for "${item.title}"; deferring to next run (fail closed).`);
          continue;
        }

        const cleanDesc = (item.description || "").slice(0, 1500);
        const descriptionHash = await generateHash(item.title + cleanDesc);

        if (!triage.eligibleForFilipinos) {
          console.log(`[api/cron/scrape] Filtering out ineligible job: "${item.title}". Reason: ${triage.reason}`);
          rejectedItems.push({
            ...item,
            isActive: false,
            tags: Array.from(new Set([...(item.tags || []), "triage-rejected"])),
            category: "other",
            geoScope: gate.geoScope,
            phEligibility: "ineligible",
            geoEvidence: `AI triage: ${(triage.reason || "ineligible").slice(0, 200)}`,
            geoCheckedAt: observedAt,
            descriptionHash,
            applicationUrl: sanitizeApplyUrl(item.applicationUrl) || item.sourceUrl,
            postedAt: normalizeUtcIso(item.postedAt),
            scrapedAt: observedAt,
            lastSeenInFeedAt: observedAt,
            updatedAt: observedAt,
          });
          continue;
        }

        // Merge tags: combine scraper sources tags, LLM category, and LLM skills/tags
        const mergedTags = Array.from(
          new Set([
            ...(item.tags || []),
            triage.category,
            ...(triage.tags || []),
          ])
        )
          .filter(Boolean)
          .map((t) => typeof t === 'string' ? t.toLowerCase().trim() : t);

        triagedItems.push({
          ...item,
          // Geo verdict (masterplan L1): gate-verified positives keep their
          // strong verdict; gate-unknown items that passed AI triage are
          // "eligible_likely" — the AI affirmed them but no structured
          // signal did.
          geoScope: gate.geoScope,
          phEligibility: gate.phEligibility === "unclear" ? "eligible_likely" : gate.phEligibility,
          geoEvidence: gate.geoScope === "unknown" ? `AI triage passed: ${(triage.reason || "eligible").slice(0, 200)}` : gate.evidence,
          geoCheckedAt: observedAt,
          // Sanitized precedence: the LLM-extracted apply link only wins when
          // it is a real http(s)/mailto URL — previously the raw model string
          // overrode verified URLs with no validation.
          applicationUrl: sanitizeApplyUrl(triage.applicationUrl) || sanitizeApplyUrl(item.applicationUrl) || item.sourceUrl,
          tags: mergedTags,
          payRange: triage.payRange,
          category: mapTriageCategoryToUiCategory(triage.category),
          experienceLevel: triage.experienceLevel,
          type: triage.employmentType === "contract" ? "freelance" : (triage.employmentType || "freelance"),
          descriptionHash,
          postedAt: normalizeUtcIso(item.postedAt),
          scrapedAt: observedAt,
          lastSeenInFeedAt: observedAt,
          updatedAt: observedAt,
        });
      }
    }

    console.log(`[api/cron/scrape] ${triagedItems.length} jobs approved after AI triaging`);
    // Note: no early return when triagedItems is empty — rejected items must
    // still be persisted below so an all-ineligible batch is not re-triaged
    // forever. The insert loops are no-ops on empty arrays.

    // 6. Batch insert into D1
    let actualChanges = 0;
    let attemptedInsert = 0;
    let insertFailedBatches = 0;
    const insertErrors: InsertError[] = [];
    for (let i = 0; i < triagedItems.length; i += D1_INSERT_BATCH_SIZE) {
      const batch = triagedItems.slice(i, i + D1_INSERT_BATCH_SIZE);
      attemptedInsert += batch.length;
      try {
        console.log(`[api/cron/scrape] Inserting batch of ${batch.length} items:`, batch.map(b => `${b.title} (${b.sourceUrl})`));
        const res = await db.insert(opportunities).values(batch).onConflictDoNothing();
        console.log(`[api/cron/scrape] D1 insert result:`, JSON.stringify(res));
        if (res && (res as any).meta && typeof (res as any).meta.changes === "number") {
          actualChanges += (res as any).meta.changes;
        } else {
          insertErrors.push({
            batchStart: i,
            batchSize: batch.length,
            error: "D1 insert metadata did not include meta.changes",
          });
        }
      } catch (err) {
        insertFailedBatches += 1;
        insertErrors.push({
          batchStart: i,
          batchSize: batch.length,
          error: errorMessage(err),
        });
        console.error(`[api/cron/scrape] Batch insert failed (index ${i}):`, err);
      }
    }

    // 6b. Persist triage-rejected items as inactive rows so their URLs join
    // dedup and they are never re-triaged. Failures here must not fail the
    // run — they are counted and surfaced instead.
    let rejectedPersisted = 0;
    let rejectedInsertFailedBatches = 0;
    for (let i = 0; i < rejectedItems.length; i += D1_INSERT_BATCH_SIZE) {
      const batch = rejectedItems.slice(i, i + D1_INSERT_BATCH_SIZE);
      try {
        const res = await db.insert(opportunities).values(batch).onConflictDoNothing();
        if (res && (res as any).meta && typeof (res as any).meta.changes === "number") {
          rejectedPersisted += (res as any).meta.changes;
        }
      } catch (err) {
        rejectedInsertFailedBatches += 1;
        console.warn(`[api/cron/scrape] Rejected-item batch insert failed (index ${i}):`, errorMessage(err));
      }
    }
    if (rejectedItems.length > 0) {
      console.log(`[api/cron/scrape] Persisted ${rejectedPersisted}/${rejectedItems.length} triage-rejected items as inactive rows (${rejectedInsertFailedBatches} failed batches).`);
    }

    console.log(`[api/cron/scrape] Finished. Processed ${itemsToProcess.length}, accepted ${triagedItems.length}, attempted ${attemptedInsert}, actual DB changes: ${actualChanges}, failed batches: ${insertFailedBatches}`);
    return new Response(JSON.stringify({
      inserted: actualChanges,
      actualChanges,
      acceptedForInsert: triagedItems.length,
      attemptedInsert,
      insertFailedBatches,
      insertErrors,
      triageFailures,
      triageAiUnavailable,
      geoGateRejected,
      rejectedPersisted,
      rejectedInsertFailedBatches,
      droppedNoUrl,
      unmatchedPauses,
      filteredOut: itemsToProcess.length - triagedItems.length,
      processed: itemsToProcess.length,
      backlogRemaining: newItems.length - itemsToProcess.length,
      skipped: allItems.length - actualChanges,
      failedSources,
      sourceResults,
      fetchEventLog,
      cadenceGuards,
      sourcesUnchanged,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
