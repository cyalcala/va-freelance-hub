import type { APIRoute } from "astro";
import { getDb, opportunities, sourceFetchState, sourceFetchEvents, vaDirectory, type NewOpportunity, type SourceFetchState } from "@va-hub/db";
import { isNotNull, isNull, or, and, inArray, eq, lt, asc, gte } from "drizzle-orm";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import {
  buildSourceIdsByUrl,
  conditionalValidatorsForPersistence,
  sourceIdsForUrls,
} from "@/lib/conditional-state";
import { isFeedRecoverableInactiveReason, RECOVERABLE_INACTIVE_REASONS } from "@/lib/inactive-reason";
import { runLockOutcome } from "@/lib/run-lock";
import { d1Changes } from "@/lib/d1-result";
import { createRobotsStore } from "@/lib/robots-store";
import {
  buildIngestDiagRow,
  buildIngestDiagUpdate,
  summarizeRunDiagnostics,
  type RunDiagnosticsInput,
} from "@/lib/run-diagnostics";

export const prerender = false;
import { disabledSources, rssSources, htmlSources, jsonSources, sources as staticSources, fetchRSSFeed, fetchHTMLSource, fetchJSONSource, fetchATSFeed, triageJob, skepticEligibilityCheck, geoGate, decideTriage, chunkArray, maxRowsPerD1Batch, isAutoPaused, autoPauseNote, autoPauseEntries, sanitizeApplyUrl, sanitizeSourceUrl, toContentHash, sha256Hex, errorMessage, type CollectionMethod, type ComplianceStatus, type Source, type ConditionalState, type SourceFetchOutput, checkRobots, COLLECTION_USER_AGENT, type RobotsGateResult, type RobotsMode, type RobotsVerdict } from "@va-hub/scraper";

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

/**
 * Robots enforcement mode (masterplan 4A).
 *
 * "observe" computes, caches and reports every robots decision but still
 * performs the fetch. "enforce" skips a source whose robots.txt disallows it,
 * or whose robots.txt could not be read (withheld consent is not consent).
 *
 * Shipping straight to "enforce" against a live pipeline would risk a silent
 * ingestion halt from a parser bug or a transient wave of 5xx responses, with
 * a drop in job counts as the first symptom. Observe first, then flip once the
 * `robotsWouldBlock` counter in the scrape response has shown a full cycle of
 * real traffic.
 *
 * Flip checklist:
 *   1. robotsWouldBlock stays 0 across ~24h of runs, or every non-zero case is
 *      explained and accepted;
 *   2. robots_cache holds a row per active origin;
 *   3. record the decision in IMPLEMENTATION_STATUS.md, then change this to
 *      "enforce" in its own commit so it can be reverted alone.
 */
const ROBOTS_MODE: RobotsMode = "observe";

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
  // Robots provenance (masterplan 4A/4E). Recorded for every configured-source
  // fetch so the compliance claim is auditable rather than asserted.
  robotsVerdict?: RobotsVerdict;
  robotsEvidence?: string;
  robotsCrawlDelay?: number | null;
  /** True when enforce mode would have skipped this fetch. */
  robotsWouldBlock?: boolean;
}

export function normalizeScrapedItems(rawItems: NewOpportunity[]): {
  items: NewOpportunity[];
  droppedNoUrl: number;
} {
  const items = rawItems.flatMap((item) => {
    const sourceUrl = sanitizeSourceUrl(item.sourceUrl);
    if (!sourceUrl) return [];
    return [{
      ...item,
      sourceUrl,
      applicationUrl: sanitizeApplyUrl(item.applicationUrl) ?? sourceUrl,
      contentHash: toContentHash(item.title, sourceUrl),
    }];
  });
  return { items, droppedNoUrl: rawItems.length - items.length };
}

export function buildNoJobsScrapedOutcome(input: {
  droppedNoUrl: number;
  fetchEventFailedBatches: number;
  failedSourceCount: number;
  cadenceStateAvailable: boolean;
  details: Record<string, unknown>;
}): { diagnostics: RunDiagnosticsInput; response: Record<string, unknown> } {
  return {
    diagnostics: {
      fetchEventFailedBatches: input.fetchEventFailedBatches,
      failedSourceCount: input.failedSourceCount,
      droppedNoUrl: input.droppedNoUrl,
      cadenceStateAvailable: input.cadenceStateAvailable,
    },
    response: {
      inserted: 0,
      actualChanges: 0,
      acceptedForInsert: 0,
      attemptedInsert: 0,
      insertFailedBatches: 0,
      insertErrors: [],
      skipped: 0,
      droppedNoUrl: input.droppedNoUrl,
      ...input.details,
      message: "No jobs scraped",
    },
  };
}

interface InsertError {
  batchStart: number;
  batchSize: number;
  error: string;
}

type AppDb = ReturnType<typeof getDb>;

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

// ─── Workers AI per-invocation subrequest budget ─────────────────────────────
//
// Cloudflare counts every `env.AI.run()` call as a subrequest, and the Workers
// Free plan caps subrequests at 50 per invocation (Paid: 10,000). One scrape
// invocation runs the whole pipeline — source fetches, robots.txt checks, AI
// triage, the unclear-backlog sweep — inside a single Pages Function request.
// With ~41 configured sources, even a light tick spends ~10-20 subrequests on
// fetching; triage then multiplies that by up to `limit` (default 50) items,
// each burning up to 4 model-ladder calls plus a skeptic call. The invocation
// blows through 50 in the first few items, every subsequent AI call fails with
// "Too many subrequests by single Worker invocation", triage fails closed
// (aiUnavailable), and no new job is inserted. Measured in production
// 2026-08-08..15: inserts collapsed 51/day -> ~0 while the heartbeat stayed
// green — exactly the silent-error class this project's audits are built to
// surface.
//
// This budget caps AI subrequests per invocation instead. When it is consumed,
// remaining items are deferred via the existing retrySourceIds mechanism and
// re-fetched on the next 15-minute tick — no data loss, just spreading work
// across ticks (96/day), which is far more capacity than the ~65 items/day the
// site actually ingests. The value is sized against the measured 50/subrequest
// ceiling with headroom for the source-fetch phase: ~20 AI calls + ~20 fetch
// subrequests stays under the cap even on a busy tick, and when a model fails
// the ladder tries a few extra calls before the budget trips the next item.
export const AI_SUBREQUEST_BUDGET_PER_RUN = 15;

export class AiBudgetExceededError extends Error {
  constructor() {
    super("Workers AI per-invocation subrequest budget exhausted");
    this.name = "AiBudgetExceededError";
  }
}

/**
 * Wraps the AI binding with a per-invocation call counter.
 *
 * Returns a replacement env whose `AI.run` throws `AiBudgetExceededError` once
 * `budget` calls have been made, plus a read-only view of the counter. The
 * counter is closure-scoped, so it resets on every request — the budget is
 * per-invocation, matching the platform limit it protects.
 */
export function withAiSubrequestBudget(
  env: any,
  budget: number,
): { env: any; calls: () => number; exhausted: () => boolean } {
  let calls = 0;
  // Charge one AI subrequest against the shared per-invocation budget. Both the
  // wrapped env.AI.run (Cloudflare) and the Gemini fallback in triageJob (a raw
  // fetch the wrapper cannot see) call this, so the combined total stays under
  // Cloudflare's 50-subrequest cap no matter which provider served the request.
  const charge = () => {
    calls += 1;
    if (calls > budget) throw new AiBudgetExceededError();
  };
  const rawRun = env?.AI?.run?.bind(env.AI);
  const base = rawRun
    ? {
        ...env,
        AI: {
          run: async (model: unknown, request: unknown) => {
            charge();
            return rawRun(model, request);
          },
        },
      }
    : { ...env };
  const budgetedEnv = { ...base, chargeAiSubrequest: charge };
  return {
    env: budgetedEnv,
    calls: () => calls,
    exhausted: () => calls >= budget,
  };
}

// Durable-triage routing gate.
//
// FREEZE GUARD (2026-08-18/19). This was `Boolean(env.INNGEST_SIGNING_KEY)`
// alone: the signing key was present on production, but the Inngest triage-drain
// cloud cron never fired, so every gate-passed listing was parked as a hidden
// `pending-triage` row and nothing published — the board froze for ~30h behind a
// green heartbeat while 55 eligible jobs piled up invisibly. Durable triage is
// now a DELIBERATE two-part opt-in: the key (Inngest needs it to verify its
// requests) AND an explicit TRIAGE_VIA_INNGEST="1". With either missing, triage
// runs inline — the proven, self-contained path — so a stray/leftover key can
// never again silently divert ingestion into a queue whose drain may be dead.
export function shouldTriageViaInngest(
  env: { INNGEST_SIGNING_KEY?: string; TRIAGE_VIA_INNGEST?: string } | null | undefined,
): boolean {
  return Boolean(env?.INNGEST_SIGNING_KEY) && String(env?.TRIAGE_VIA_INNGEST ?? "") === "1";
}

// ── Inline pending-triage drain ──────────────────────────────────────────────
//
// Recovers `pending-triage` rows (is_active=0, gate-passed but never AI-
// classified) WITHOUT depending on the external Inngest cron. Those rows only
// exist because durable triage was opted into and then left without a working
// drain — the 2026-08-18/19 freeze. This runs the SAME verdict the inline scrape
// loop uses (decideTriage) and updates each row in place: publish, reject,
// quarantine, or leave pending on AI-unavailable (fail closed, reclaimed later).
//
// It shares the caller's budgeted AI env, so its calls count against the same
// AI_SUBREQUEST_BUDGET_PER_RUN ceiling as fresh triage and the unclear sweep — a
// drain pass can therefore never push a scrape invocation past Cloudflare's
// 50-subrequest cap. Fresh-item triage runs first and has priority; the drain
// spends only leftover budget, oldest row first, and stops the moment it is gone.
export interface PendingDrainStats {
  claimed: number;
  published: number;
  rejected: number;
  quarantined: number;
  deferred: number;
}

const EMPTY_PENDING_DRAIN: PendingDrainStats = {
  claimed: 0, published: 0, rejected: 0, quarantined: 0, deferred: 0,
};

// Rows one drain pass may claim. Small on purpose: the drain trickles the finite
// backlog across ticks rather than bursting the shared ~10k-neuron/day budget.
export const PENDING_DRAIN_PER_TICK = 4;

// Cheap-first model ladder for backlog recovery — same rationale as the unclear
// sweep (see sweepEnv): the default 70B-first ladder is ~50 neurons/row and,
// multiplied across a backlog, exhausts the 10k-neuron/day account budget and
// starves new-item triage. Try the cheap 8B/7B rungs first (loose-JSON parsed),
// keep 70B as the final rung so a hard row can still resolve. New-item triage is
// deliberately left on the default 70B-first ladder: low volume, high stakes.
const DRAIN_MODEL_LADDER = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/mistral/mistral-7b-instruct-v0.1",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
].join(",");

export async function drainPendingTriageInline(
  db: AppDb,
  aiEnv: any,
  aiBudget: { exhausted: () => boolean },
  observedAt: string,
  limit: number = PENDING_DRAIN_PER_TICK,
): Promise<PendingDrainStats> {
  const stats: PendingDrainStats = { claimed: 0, published: 0, rejected: 0, quarantined: 0, deferred: 0 };
  if (aiBudget.exhausted()) return stats;
  // Same budgeted AI binding (so calls still count against the 50-subrequest
  // ceiling) but pinned to the cheap-first ladder for cost.
  const drainEnv = { ...aiEnv, AI_MODEL: DRAIN_MODEL_LADDER };

  let pending: Array<{
    id: number;
    title: string;
    description: string | null;
    company: string | null;
    tags: string[] | null;
    locationRaw: string | null;
    sourceUrl: string;
    applicationUrl: string | null;
  }>;
  try {
    pending = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        description: opportunities.description,
        company: opportunities.company,
        tags: opportunities.tags,
        locationRaw: opportunities.locationRaw,
        sourceUrl: opportunities.sourceUrl,
        applicationUrl: opportunities.applicationUrl,
      })
      .from(opportunities)
      .where(and(eq(opportunities.isActive, false), eq(opportunities.inactiveReason, "pending-triage")))
      .orderBy(asc(opportunities.scrapedAt))
      .limit(limit);
  } catch (err) {
    console.warn(`[api/cron/scrape] Pending-triage drain: claim query failed:`, errorMessage(err));
    return stats;
  }

  for (const item of pending) {
    if (aiBudget.exhausted()) break;
    stats.claimed += 1;
    const baseTags = item.tags ?? [];
    const gate = geoGate({
      title: item.title,
      description: item.description,
      locationRaw: item.locationRaw,
      tags: baseTags,
    });

    let decision: Awaited<ReturnType<typeof decideTriage>>;
    try {
      decision = await decideTriage(
        { title: item.title, description: item.description, company: item.company, tags: baseTags, locationRaw: item.locationRaw },
        { geoScope: gate.geoScope },
        drainEnv,
      );
    } catch (err) {
      // Transient (e.g. skeptic call threw) — leave pending, reclaimed next pass.
      stats.deferred += 1;
      continue;
    }

    // FAIL CLOSED: never publish a listing the AI did not actually classify.
    if (decision.kind === "error" || decision.kind === "ai-unavailable") {
      stats.deferred += 1;
      continue;
    }

    try {
      if (decision.kind === "ineligible") {
        await db.update(opportunities).set({
          inactiveReason: "policy-rejected",
          phEligibility: "ineligible",
          geoScope: gate.geoScope,
          category: "other",
          tags: Array.from(new Set([...baseTags, "triage-rejected"])),
          geoEvidence: `AI triage: ${decision.reason.slice(0, 200)}`,
          geoCheckedAt: observedAt,
          updatedAt: observedAt,
        }).where(eq(opportunities.id, item.id));
        stats.rejected += 1;
        continue;
      }

      if (decision.kind === "consensus-split") {
        await db.update(opportunities).set({
          inactiveReason: "policy-rejected",
          phEligibility: "unclear",
          geoScope: gate.geoScope,
          tags: Array.from(new Set([...baseTags, "consensus-quarantined"])),
          geoEvidence: `Consensus split — skeptic: ${decision.reason.slice(0, 200)}`,
          geoCheckedAt: observedAt,
          updatedAt: observedAt,
        }).where(eq(opportunities.id, item.id));
        stats.quarantined += 1;
        continue;
      }

      // Eligible → publish (is_active=1). Mirrors the inline scrape mapping.
      const triage = decision.triage;
      const mergedTags = Array.from(new Set([...baseTags, triage.category, ...(triage.tags || [])]))
        .filter(Boolean)
        .map((t) => (typeof t === "string" ? t.toLowerCase().trim() : t));
      await db.update(opportunities).set({
        isActive: true,
        inactiveReason: null,
        geoScope: gate.geoScope,
        phEligibility: gate.phEligibility === "unclear" ? "eligible_likely" : gate.phEligibility,
        geoEvidence: gate.geoScope === "unknown"
          ? `AI triage passed: ${(triage.reason || "eligible").slice(0, 200)}`
          : gate.evidence,
        geoCheckedAt: observedAt,
        applicationUrl: sanitizeApplyUrl(triage.applicationUrl) || sanitizeApplyUrl(item.applicationUrl) || item.sourceUrl,
        tags: mergedTags,
        payRange: triage.payRange,
        category: mapTriageCategoryToUiCategory(triage.category),
        experienceLevel: triage.experienceLevel,
        type: triage.employmentType === "contract" ? "freelance" : (triage.employmentType || "freelance"),
        updatedAt: observedAt,
      }).where(eq(opportunities.id, item.id));
      stats.published += 1;
    } catch (err) {
      // Durable-write truth: a failed write is not credited; the row stays
      // pending and is reclaimed next pass.
      stats.deferred += 1;
      console.warn(`[api/cron/scrape] Pending-triage drain: write failed for #${item.id}:`, errorMessage(err));
    }
  }

  return stats;
}

// Gate + log wrapper used at each no-new-items path and the main path. The inline
// drain is OFF by default: under the free-tier ~10k-neuron/day cap it competes
// with new-item triage (higher priority), so recovering the finite pending-triage
// backlog is opt-in via DRAIN_PENDING_TRIAGE=1 — intended once neuron capacity is
// raised (e.g. Workers Paid). It also stands down under durable-triage opt-in,
// where the Inngest worker owns the queue. `enabled` folds both conditions.
async function maybeDrainPendingTriage(
  db: AppDb,
  aiEnv: any,
  aiBudget: { exhausted: () => boolean },
  observedAt: string,
  enabled: boolean,
  where: string,
): Promise<PendingDrainStats> {
  if (!enabled) return EMPTY_PENDING_DRAIN;
  const stats = await drainPendingTriageInline(db, aiEnv, aiBudget, observedAt);
  if (stats.claimed > 0) {
    console.log(
      `[api/cron/scrape] Pending-triage drain (${where}): claimed ${stats.claimed}, published ${stats.published}, rejected ${stats.rejected}, quarantined ${stats.quarantined}, deferred ${stats.deferred}.`,
    );
  }
  return stats;
}

// Geo scopes the deterministic gate treats as open to Filipino applicants. A row
// with one of these needs no AI to establish eligibility — the AI only adds
// category/pay and a second vote.
export const GATE_ELIGIBLE_GEO_SCOPES = ["worldwide", "apac_incl_ph", "ph_only"] as const;

// Board-freshness fallback. Surface `pending-triage` rows the geo-gate already
// judged PH-eligible WITHOUT spending AI. Those rows exist only because durable
// triage was opted into and then abandoned; the 10k-neuron/day budget is far too
// scarce to AI-drain them promptly (that is why the drain is opt-in off), so
// rather than leave real eligible jobs hidden for days this publishes them now
// and lets the unclear sweep AI-re-vet/enrich them later — phEligibility stays
// "unclear", so a false positive is deactivated and a category refined on a
// later tick. No neurons, one D1 write, idempotent (a no-op once drained).
export async function recoverGateEligiblePending(
  db: AppDb,
  observedAt: string,
): Promise<number> {
  try {
    const res = await db
      .update(opportunities)
      .set({
        isActive: true,
        inactiveReason: null,
        geoEvidence: "Geo-gate eligible; auto-published pending AI re-vet",
        updatedAt: observedAt,
        lastSeenInFeedAt: observedAt,
      })
      .where(and(
        eq(opportunities.isActive, false),
        eq(opportunities.inactiveReason, "pending-triage"),
        inArray(opportunities.geoScope, [...GATE_ELIGIBLE_GEO_SCOPES]),
      ));
    return d1Changes(res);
  } catch (err) {
    console.warn(`[api/cron/scrape] Gate-eligible pending recovery failed:`, errorMessage(err));
    return 0;
  }
}

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

type RunLockResult =
  | { state: "acquired" }
  | { state: "held" }
  | { state: "unavailable"; error: string };

async function acquireRunLock(db: AppDb, observedAt: string): Promise<RunLockResult> {
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
    const result: unknown = await db.update(sourceFetchState)
      .set({ lastAttemptAt: observedAt, updatedAt: observedAt })
      .where(and(eq(sourceFetchState.sourceId, RUN_LOCK_ID), lt(sourceFetchState.lastAttemptAt, cutoff)));
    const outcome = runLockOutcome(result);
    if (outcome === "unavailable") {
      return { state: "unavailable", error: "D1 lock update returned no mutation count" };
    }
    return { state: outcome };
  } catch (error) {
    // A failed lock must be visible: running without one risks duplicate
    // source fetches and doubled AI/D1 usage.
    return { state: "unavailable", error: errorMessage(error) };
  }
}

export interface UnclearSweepStats {
  retriaged: number;
  upgraded: number;
  deactivated: number;
  /** True when the daily quota state could not be read or persisted this run. */
  quotaUnavailable?: boolean;
  /** Number of rows where the skeptic was unavailable (single-vote upgrade). */
  skepticUnavailable?: number;
}

// Unclear-backlog convergence (geo masterplan Phase 3). Upgrades a small budget
// of the oldest "unclear" rows per run via the hardened triage + skeptic
// consensus, on the cheap model rung so it cannot exhaust the daily neuron
// budget.
//
// This lives in its own function, rather than inline in the handler, because it
// is *maintenance* work that must run on every tick — including ticks where
// nothing new was scraped. The handler returns early when `allItems.length === 0`
// (all feeds 304-unchanged or cadence-skipped, which is the common case at a
// 15-min cadence), and while this was inline below that return it simply never
// executed on those runs. That was the dominant cause of the backlog not
// draining: measured ~11 rows/day against a 1,152/day design.
// Hard ceiling on rows the sweep may re-triage per UTC day, across all ticks.
// This is the real cost lever: it bounds the sweep's share of the shared daily
// neuron budget regardless of how many ticks fire or how idle they are, so
// new-item triage (higher stakes — a wrong verdict on a fresh job reaches users,
// a stale "unclear" row does not) always has the remainder.
//
// Sized against a MEASURED constraint, not an estimate. On 2026-07-26 the sweep
// recorded, via the __sweep_diag__ row:
//   "4006: you have used up your daily free allocation of 10,000 neurons"
// That allocation is account-wide, shared with ingest triage and every pulse
// workflow — which is why ALL AI stopped at 02:15 UTC after only 12 successful
// writes that day.
//
// The original sizing assumed ~25 neurons per 8B call, up to 2 calls per row
// (~50/row) — ~2,500 neurons for 50 rows/day. In practice the cheap rungs often
// miss and the 70B fallback pushes the true cost ~4x higher (~200/row; see the
// 2026-08-20 note at DAILY_SWEEP_CAP), so 50/day drained the whole account
// budget. The cap is now 15. The previous value of 400 would have been far
// worse — multiples of the entire daily allocation, draining it within an hour
// of the UTC reset and starving triage.
//
// Consequence: the ~1,435-row backlog converges in ~4 weeks, not days. The real
// fix is capacity, not tuning: on Workers Paid the entire backlog costs roughly
// 1,435 x 2 x 25 ~= 72,000 neurons, comfortably under $1 one-off. If the plan is
// upgraded, raise this first — it is the binding constraint.
// Reserved source_fetch_state row holding the sweep's last AI failure reason.
// Not a real source; read it with:
//   SELECT last_error, last_attempt_at FROM source_fetch_state
//   WHERE source_id = '__sweep_diag__';
const SWEEP_DIAG_ID = "__sweep_diag__";

// A row counts as "fresh" if it was scraped within this window. Fresh unclear
// rows are swept before legacy backfill rows — see the fresh-first note below.
const SWEEP_FRESH_WINDOW_DAYS = 10;

// Reserved row holding the sweep's rows-attempted count for the current UTC day.
// lastSuccessAt stores the YYYY-MM-DD stamp, lastCount the tally; a stale stamp
// means a new day and the tally restarts, so no cleanup job is needed.
const SWEEP_QUOTA_ID = "__sweep_quota__";

// Consecutive aiUnavailable results that mean "the allocation is gone" rather
// than "this row is unparseable". Only reachable when the effective per-tick
// budget is larger than this, i.e. on idle ticks.
const MAX_CONSECUTIVE_AI_FAILURES = 2;

// 2026-08-20: reduced 50 -> 15. Measured reality beats the ~50-neurons/row
// estimate above: the cheap rungs frequently fail to parse and fall through to
// the expensive 70B rung, so a swept row costs closer to ~200 neurons. Proof:
// on 2026-08-19 the Inngest divert had NEW-item triage off, yet Workers AI still
// 4006'd ("daily 10k neurons used up") by 06:45Z — the sweep ALONE, at 50/day,
// drained the whole account budget and starved the board once triage resumed.
// New-item triage is the user-facing priority; 15/day keeps the sweep useful
// while reserving the bulk of the daily budget for fresh jobs. Raise this again
// only with neuron capacity (Workers Paid).
export const DAILY_SWEEP_CAP = 15;
// Per-tick ceilings. Idle ticks scraped nothing, so no new-item triage is
// competing for budget in that run and the sweep may use the tick fully. Ticks
// that did ingest run triage first (it sits above the sweep in the handler), so
// the sweep takes only a small slice and yields the rest.
// Kept small so the daily cap is spent as a trickle across the day rather than
// burned in a burst right after the 00:00 UTC reset — a burst would collide
// with ingest triage and the pulse workflows competing for the same allocation.
export const SWEEP_BUDGET_IDLE_TICK = 2;
export const SWEEP_BUDGET_BUSY_TICK = 1;

export async function sweepUnclearBacklog(
  db: AppDb,
  env: any,
  observedAt: string,
  perTickBudget: number = SWEEP_BUDGET_BUSY_TICK,
): Promise<UnclearSweepStats> {
  // Spend against the daily cap before anything else.
  //
  // This deliberately uses an explicit counter rather than deriving spend from
  // the opportunities table. The obvious derivation — count rows whose
  // geoEvidence looks like sweep output and whose geoCheckedAt is today —
  // over-counts badly, because other pulses re-stamp geoCheckedAt on rows the
  // sweep resolved days earlier. Measured on 2026-07-26: that query reported 20
  // rows "swept today" when the true figure was 0. At a 50/day cap that silently
  // discards ~40% of the budget.
  //
  // The counter records ATTEMPTS, not resolutions, because a failed call
  // consumes neuron allocation just as a successful one does. Date-stamped so it
  // self-resets at 00:00 UTC with no cleanup job.
  const today = observedAt.slice(0, 10);
  let UNCLEAR_RETRIAGE_BUDGET = perTickBudget;
  let spentToday = 0;
  try {
    const quotaRow = await db
      .select({ day: sourceFetchState.lastSuccessAt, used: sourceFetchState.lastCount })
      .from(sourceFetchState)
      .where(eq(sourceFetchState.sourceId, SWEEP_QUOTA_ID))
      .limit(1);
    // A stale date means a new UTC day: start from zero.
    spentToday = quotaRow?.[0]?.day === today ? Number(quotaRow[0].used ?? 0) : 0;
    const remainingToday = DAILY_SWEEP_CAP - spentToday;
    if (remainingToday <= 0) {
      console.log(`[api/cron/scrape] Unclear backlog: daily cap reached (${spentToday}/${DAILY_SWEEP_CAP}), skipping sweep.`);
      return { retriaged: 0, upgraded: 0, deactivated: 0 };
    }
    UNCLEAR_RETRIAGE_BUDGET = Math.min(perTickBudget, remainingToday);
  } catch (err) {
    // Cap unavailable — run zero sweep work. An aggressive fail-closed is safer
    // than a guess: a conservative budget of 1 can still exhaust the shared
    // neuron allocation across 96 daily ticks, starving new-item triage. The
    // sweep will resume as soon as the read succeeds on the next tick.
    console.warn(`[api/cron/scrape] Sweep daily-cap check failed; skipping sweep:`, errorMessage(err));
    return { retriaged: 0, upgraded: 0, deactivated: 0, quotaUnavailable: true };
  }
  const stats: UnclearSweepStats = { retriaged: 0, upgraded: 0, deactivated: 0 };
  try {
    const sweepCols = {
      id: opportunities.id,
      title: opportunities.title,
      description: opportunities.description,
      tags: opportunities.tags,
      company: opportunities.company,
      locationRaw: opportunities.locationRaw,
    };

    // FRESH-FIRST. Ordering purely by oldest geoCheckedAt puts the ~1,435 legacy
    // backfill rows ahead of everything, so a job scraped today that lands
    // "unclear" joins the back of that queue and waits weeks to become visible —
    // backwards, since recent listings are the ones users act on (and the ones
    // still open). Serve recently-scraped unclear rows first, then spend any
    // leftover budget draining the legacy backlog.
    //
    // Fresh inflow is ~4-22 rows/day against a 50/day cap, so fresh rows are
    // effectively always same-day and legacy still gets the bulk of the budget.
    const freshCutoff = new Date(Date.parse(observedAt) - SWEEP_FRESH_WINDOW_DAYS * 86_400_000).toISOString();
    const freshRows = await db
      .select(sweepCols)
      .from(opportunities)
      .where(and(
        eq(opportunities.isActive, true),
        eq(opportunities.phEligibility, "unclear"),
        gte(opportunities.scrapedAt, freshCutoff),
      ))
      .orderBy(asc(opportunities.geoCheckedAt))
      .limit(UNCLEAR_RETRIAGE_BUDGET);

    const legacyBudget = UNCLEAR_RETRIAGE_BUDGET - freshRows.length;
    const legacyRows = legacyBudget > 0
      ? await db
          .select(sweepCols)
          .from(opportunities)
          .where(and(
            eq(opportunities.isActive, true),
            eq(opportunities.phEligibility, "unclear"),
            lt(opportunities.scrapedAt, freshCutoff),
          ))
          .orderBy(asc(opportunities.geoCheckedAt))
          .limit(legacyBudget)
      : [];

    if (freshRows.length > 0) {
      console.log(`[api/cron/scrape] Unclear sweep: ${freshRows.length} fresh + ${legacyRows.length} legacy.`);
    }
    const unclearRows = [...freshRows, ...legacyRows];

    // Cost control: the sweep is ~95% of AI call volume (12 rows x up to 2 calls
    // x 96 runs/day). On the 70B rung it exhausted the 10,000 neuron/day account
    // budget, which then starved BOTH the sweep and new-item triage. Pin it to
    // the cheap 8B rung via the AI_MODEL override that triage.ts /
    // skepticEligibilityCheck already honour; new-item triage keeps the 70B
    // ladder (low volume, high stakes).
    // Cheap rungs first, 70B last — not "cheap only".
    //
    // Cost control here originally pinned the sweep to one 8B model. That
    // removed every fallback AND the thing that makes parsing reliable: JSON
    // mode (`response_format`) is enabled only for llama-3.3, so cheap rungs
    // return free-form text. Production evidence: the sweep last resolved a row
    // at 02:15 on the default 70B-first ladder, then resolved nothing for hours
    // once pinned, advancing cursors only. Loose JSON parsing (parseLooseJson)
    // now recovers most free-form replies, but the cheap rungs are still
    // best-effort — so keep 70B as the final rung to guarantee the sweep can
    // always make progress.
    //
    // Cost is bounded by DAILY_SWEEP_CAP, not by forbidding the good model: a
    // capped number of 70B calls beats an uncapped number of failures that
    // resolve nothing.
    const sweepEnv = {
      ...env,
      AI_MODEL: [
        "@cf/meta/llama-3.1-8b-instruct",
        "@cf/meta/llama-3-8b-instruct",
        "@cf/mistral/mistral-7b-instruct-v0.1",
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      ].join(","),
    };
    // A row whose content makes every model fail returns aiUnavailable
    // indistinguishably from a real quota outage. A bare `break` plus a catch
    // that never advanced geoCheckedAt meant such a row stayed the
    // oldest-checked forever and re-blocked the sweep on every run. Now a
    // failure rotates the row out, and only consecutive failures stop the sweep.
    let consecutiveAiFailures = 0;
    let attempted = 0;
    for (const row of unclearRows) {
      // Counted before the call: a failed attempt consumes neuron allocation
      // just as a successful one does, so the cap must charge for both.
      attempted += 1;
      const ctx = { locationRaw: row.locationRaw, tags: row.tags, company: row.company };
      try {
        const triage = await triageJob(row.title, row.description || "", sweepEnv, ctx);
        if (triage.aiUnavailable) {
          // Record *why* AI was unavailable. triageJob folds the underlying
          // error into `reason` ("Workers AI error fallback (all models
          // failed): …") and the sweep previously discarded it, leaving no way
          // to tell a quota exhaustion from a bad model name or a missing
          // binding — the cursor just advanced silently. Park it on a reserved
          // source_fetch_state row (same trick as the run lock) so it is
          // readable with a plain D1 query and never overwrites a job's
          // geo_evidence. Only on the first failure of a run: one sample per
          // tick is enough.
          if (consecutiveAiFailures === 0) {
            try {
              await db.insert(sourceFetchState).values({
                sourceId: SWEEP_DIAG_ID,
                sourceName: "sweep diagnostics",
                sourceType: "diag",
                collectionMethod: "diag",
                complianceStatus: "diag",
                lastAttemptAt: observedAt,
                lastError: (triage.reason || "unknown").slice(0, 500),
                updatedAt: observedAt,
              }).onConflictDoUpdate({
                target: sourceFetchState.sourceId,
                set: {
                  lastAttemptAt: observedAt,
                  lastError: (triage.reason || "unknown").slice(0, 500),
                  updatedAt: observedAt,
                },
              });
            } catch { /* diagnostics must never fail the sweep */ }
          }
          // Advance the cursor so one poison row cannot wedge the queue.
          await db.update(opportunities)
            .set({ geoCheckedAt: observedAt, updatedAt: observedAt })
            .where(eq(opportunities.id, row.id));
          consecutiveAiFailures += 1;
          // Consecutive failures mean the account allocation is gone, not that
          // one row is unparseable — stop and let the next tick retry.
          //
          // Note this only bites when the effective budget exceeds the
          // threshold: on a busy tick (budget 1) the loop ends after one row and
          // the break is never reached. That is fine — the per-tick budget is
          // already the binding limit there — but it means this guard protects
          // idle ticks, not every tick.
          if (consecutiveAiFailures >= MAX_CONSECUTIVE_AI_FAILURES) break;
          continue;
        }
        consecutiveAiFailures = 0;
        if (!triage.eligibleForFilipinos) {
          await db.update(opportunities).set({
            isActive: false,
            inactiveReason: "policy-rejected",
            phEligibility: "ineligible",
            geoEvidence: `AI re-triage: ${(triage.reason || "ineligible").slice(0, 200)}`,
            geoCheckedAt: observedAt,
            updatedAt: observedAt,
          }).where(eq(opportunities.id, row.id));
          stats.retriaged += 1;
          stats.deactivated += 1;
          continue;
        }
        const skeptic = await skepticEligibilityCheck(row.title, row.description || "", sweepEnv, ctx);
        if (skeptic && !skeptic.aiUnavailable && !skeptic.eligible) {
          await db.update(opportunities).set({
            isActive: false,
            inactiveReason: "policy-rejected",
            phEligibility: "unclear",
            geoEvidence: `Re-triage consensus split — skeptic: ${(skeptic.reason || "refuted").slice(0, 200)}`,
            geoCheckedAt: observedAt,
            updatedAt: observedAt,
          }).where(eq(opportunities.id, row.id));
          stats.retriaged += 1;
          stats.deactivated += 1;
          continue;
        }
        await db.update(opportunities).set({
          phEligibility: "eligible_likely",
          geoEvidence: skeptic?.aiUnavailable
            ? `AI re-triage passed (single vote): ${(triage.reason || "eligible").slice(0, 160)}`
            : `AI re-triage + skeptic agreed: ${(triage.reason || "eligible").slice(0, 160)}`,
          geoCheckedAt: observedAt,
          updatedAt: observedAt,
        }).where(eq(opportunities.id, row.id));
        if (skeptic?.aiUnavailable) {
          stats.skepticUnavailable = (stats.skepticUnavailable ?? 0) + 1;
        }
        stats.retriaged += 1;
        stats.upgraded += 1;
      } catch (err) {
        console.warn(`[api/cron/scrape] Unclear re-triage failed for #${row.id}:`, errorMessage(err));
        // Same wedge hazard as the aiUnavailable path: without advancing the
        // cursor this row stays oldest-checked and is re-selected first every
        // run. Rotate it out; its verdict is unchanged, so it will be revisited
        // after the rest of the backlog.
        try {
          await db.update(opportunities)
            .set({ geoCheckedAt: observedAt, updatedAt: observedAt })
            .where(eq(opportunities.id, row.id));
        } catch { /* best-effort cursor advance */ }
      }
    }
    if (stats.retriaged > 0) {
      console.log(`[api/cron/scrape] Unclear backlog: re-triaged ${stats.retriaged} (upgraded ${stats.upgraded}, deactivated ${stats.deactivated}).`);
    }
    // Sweep recovery: stamp the diag row with current-ok so Sentinel can
    // distinguish a fresh outage from a historical one. Only update when the
    // sweep finished without an active failure streak.
    if (attempted > 0 && consecutiveAiFailures === 0) {
      try {
        await db.insert(sourceFetchState).values({
          sourceId: SWEEP_DIAG_ID,
          sourceName: "sweep diagnostics",
          sourceType: "diag",
          collectionMethod: "diag",
          complianceStatus: "diag",
          lastAttemptAt: observedAt,
          lastError: null,
          updatedAt: observedAt,
        }).onConflictDoUpdate({
          target: sourceFetchState.sourceId,
          set: {
            lastAttemptAt: observedAt,
            lastError: null,
            updatedAt: observedAt,
          },
        });
      } catch { /* diagnostics must never fail the sweep */ }
    }
    // Charge the day's tally. Written even when every attempt failed, so a
    // quota outage cannot be retried indefinitely within the same day.
    if (attempted > 0) {
      try {
        await db.insert(sourceFetchState).values({
          sourceId: SWEEP_QUOTA_ID,
          sourceName: "sweep daily quota",
          sourceType: "quota",
          collectionMethod: "quota",
          complianceStatus: "quota",
          lastAttemptAt: observedAt,
          lastSuccessAt: today,
          lastCount: spentToday + attempted,
          updatedAt: observedAt,
        }).onConflictDoUpdate({
          target: sourceFetchState.sourceId,
          set: {
            lastAttemptAt: observedAt,
            lastSuccessAt: today,
            lastCount: spentToday + attempted,
            updatedAt: observedAt,
          },
        });
      } catch (err) {
        // Losing the tally means the cap under-counts for this tick only; the
        // per-tick ceiling still bounds spend, so this must not fail the sweep.
        console.warn(`[api/cron/scrape] Sweep quota tally write failed:`, errorMessage(err));
        stats.quotaUnavailable = true;
      }
    }
  } catch (err) {
    // The sweep is best-effort maintenance — it must never fail the run.
    console.warn(`[api/cron/scrape] Unclear-backlog sweep skipped:`, errorMessage(err));
  }
  return stats;
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
  observedAt: string,
  shouldPersistConditionalValidators = true,
): Promise<{ ok: boolean; error?: string }> {
  const validators = conditionalValidatorsForPersistence(result, shouldPersistConditionalValidators);
  const updateValues = {
    sourceName: source.name,
    sourceType: toSourceType(source),
    collectionMethod: source.collectionMethod,
    complianceStatus: source.complianceStatus,
    lastAttemptAt: observedAt,
    lastCount: result.count,
    lastError: result.ok
      ? (shouldPersistConditionalValidators ? null : "Pending durable ingestion; conditional validators cleared for retry.")
      : result.error ?? "Unknown source fetch error",
    updatedAt: observedAt,
    // Persist conditional-request validators so the next run can send
    // If-None-Match / If-Modified-Since and skip an unchanged feed.
    etag: validators.etag,
    lastModified: validators.lastModified,
    lastBodyHash: validators.bodyHash,
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
    return { ok: true };
  } catch (error) {
    const msg = errorMessage(error);
    console.warn(`[api/cron/scrape] Failed to record source fetch state for ${source.name}:`, msg);
    return { ok: false, error: msg };
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

/**
 * Parks this run's degradation summary on the reserved `__ingest_diag__` row so
 * the daily Sentinel pulse can alert on it.
 *
 * Called on every exit path, including clean ones: the row doubles as the
 * ingestion heartbeat, and a heartbeat that only beats on failure is useless
 * for detecting a stopped clock.
 *
 * Never throws. Diagnostics are observability, so a write failure must not fail
 * a scrape that otherwise succeeded — it degrades to a console warning, which
 * is exactly the state this row exists to escape, but only for the diagnostic
 * itself rather than for the whole run.
 */
async function recordIngestDiagnostics(
  db: AppDb,
  observedAt: string,
  input: RunDiagnosticsInput,
): Promise<void> {
  const summary = summarizeRunDiagnostics(input);
  try {
    await db.insert(sourceFetchState)
      .values(buildIngestDiagRow(observedAt, summary))
      .onConflictDoUpdate({
        target: sourceFetchState.sourceId,
        set: buildIngestDiagUpdate(observedAt, summary),
      });
    if (summary.degraded) {
      console.warn(`[api/cron/scrape] Run degraded: ${summary.summary}`);
    }
  } catch (error) {
    console.warn("[api/cron/scrape] Failed to record ingest diagnostics:", errorMessage(error));
  }
}

/**
 * Consults robots.txt before a configured source is fetched (masterplan 4A).
 *
 * Runs in observe mode: the decision is computed, cached and reported, but a
 * would-block does not yet stop the fetch. Flip `ROBOTS_MODE` to "enforce"
 * once a cycle of live evidence shows which sources would be blocked and why.
 * See the staging note in packages/scraper/robotsGate.ts.
 *
 * Returns null when the gate could not run at all, which is reported but never
 * fatal — a compliance check that can crash ingestion is a worse bug than the
 * gap it closes.
 */
async function robotsCheckForSource(
  db: AppDb,
  source: Source,
): Promise<RobotsGateResult | null> {
  try {
    return await checkRobots(source.url, {
      store: createRobotsStore(db),
      mode: ROBOTS_MODE,
      userAgent: COLLECTION_USER_AGENT,
    });
  } catch (error) {
    console.warn(`[api/cron/scrape] Robots gate failed for ${source.name}:`, errorMessage(error));
    return null;
  }
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

  // Checked before the cadence-passing fetch, so the robots decision is on
  // record for every request we actually make.
  const robots = await robotsCheckForSource(db, source);
  if (robots && !robots.allowed) {
    return skippedSourceResult(source, `robots.txt disallows this fetch — ${robots.evidence}`);
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

  // Provenance: what robots.txt said, and whether honoring it would have
  // changed this fetch. This is the evidence the transparency ledger (4E) will
  // publish, and the data that decides when observe mode can flip to enforce.
  if (robots) {
    result.robotsVerdict = robots.verdict;
    result.robotsEvidence = robots.evidence;
    result.robotsCrawlDelay = robots.crawlDelay;
    result.robotsWouldBlock = robots.wouldBlock;
    if (robots.wouldBlock) {
      console.warn(
        `[api/cron/scrape] robots would block ${source.name} in enforce mode: ${robots.evidence}`,
      );
    }
  }
  return result;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const startedAt = Date.now();
  console.log("[api/cron/scrape] Starting execution...");
  
  const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
  const db = getDb(env);
  const observedAt = nowUtcIso();

  // Per-invocation Workers AI subrequest budget (see AI_SUBREQUEST_BUDGET_PER_RUN).
  // Every triage/sweep AI call below runs through this counter so the invocation
  // cannot exceed the platform's 50-subrequest cap (Free plan) and silently fail
  // closed — the exact regression that froze ingestion on 2026-08-08.
  const aiBudget = withAiSubrequestBudget(env, AI_SUBREQUEST_BUDGET_PER_RUN);
  const aiEnv = aiBudget.env;
  // Durable-triage routing gate (see shouldTriageViaInngest). Computed once here
  // so the pending-triage drain on the no-new-items paths below can gate on it
  // too, not only the main inline branch.
  const triageViaInngest = shouldTriageViaInngest(
    env as { INNGEST_SIGNING_KEY?: string; TRIAGE_VIA_INNGEST?: string },
  );
  // Pending-triage backlog recovery is opt-in and OFF by default: under the
  // free-tier ~10k-neuron/day cap it competes with higher-priority new-item
  // triage. Enable with DRAIN_PENDING_TRIAGE=1 once neuron capacity allows. It
  // also stands down under durable-triage opt-in (Inngest owns the queue then).
  const pendingDrainEnabled =
    !triageViaInngest &&
    String((env as { DRAIN_PENDING_TRIAGE?: string })?.DRAIN_PENDING_TRIAGE ?? "") === "1";

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
  if (!isAuthorized(request, proxySecret)) {
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
    const lock = await acquireRunLock(db, observedAt);
    if (lock.state === "held") {
      console.log("[api/cron/scrape] Another run holds the lock; exiting.");
      return new Response(JSON.stringify({
        skipped: true,
        reason: "run-lock-held",
        lockState: "held",
        backlogRemaining: 1,
        message: "Another scrape run is in progress.",
      }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    if (lock.state === "unavailable") {
      console.error("[api/cron/scrape] Run-lock unavailable; refusing an unlocked run:", lock.error);
      return new Response(JSON.stringify({ error: "Scrape coordination is temporarily unavailable. Retry shortly." }), {
        status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // Board-freshness fallback: publish geo-gate-eligible `pending-triage` rows
    // without AI so real eligible jobs are not hidden for days behind the scarce
    // neuron budget (see recoverGateEligiblePending). Inline mode only — under a
    // durable-triage opt-in the Inngest worker owns that queue. Idempotent.
    if (!triageViaInngest) {
      const recovered = await recoverGateEligiblePending(db, observedAt);
      if (recovered > 0) {
        console.log(`[api/cron/scrape] Board-freshness fallback: published ${recovered} gate-eligible pending-triage listing(s) without AI.`);
      }
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
    const conditionalSourceResults = [...rssResults, ...htmlResults, ...jsonResults];
    const configuredSourcesById = new Map(staticSources.map((source) => [source.id, source]));
    const sourceIdsByUrl = buildSourceIdsByUrl(conditionalSourceResults);
    const recordConditionalSourceStates = async (retrySourceIds: ReadonlySet<string>):
      Promise<{ ok: number; failed: number; errors: string[] }> => {
      let ok = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const result of conditionalSourceResults) {
        if (result.skipped || !result.sourceId) continue;
        const source = configuredSourcesById.get(result.sourceId);
        if (!source) continue;
        const outcome = await recordSourceFetchState(
          db,
          source,
          result,
          observedAt,
          !retrySourceIds.has(result.sourceId),
        );
        if (outcome.ok) { ok += 1; } else { failed += 1; errors.push(outcome.error ?? "unknown"); }
      }
      return { ok, failed, errors };
    };

    // Project only the columns AtsAgency needs and bound the result so an
    // ever-growing directory cannot load every ATS-enabled row into memory every
    // run. 200 is well above the current ~50 ATS entries; if the limit is hit
    // the warning makes the growth visible so a pagination slice can follow.
    const ATS_AGENCIES_MAX = 200;
    const atsAgencies = await db.select({
      id: vaDirectory.id,
      companyName: vaDirectory.companyName,
      atsPlatform: vaDirectory.atsPlatform,
      atsToken: vaDirectory.atsToken,
      verifiedAt: vaDirectory.verifiedAt,
    }).from(vaDirectory).where(
      and(
        isNotNull(vaDirectory.atsPlatform),
        isNotNull(vaDirectory.atsToken)
      )
    ).limit(ATS_AGENCIES_MAX);
    
    console.log(`[api/cron/scrape] Found ${atsAgencies.length} ATS-enabled agencies in the directory.`);
    if (atsAgencies.length >= ATS_AGENCIES_MAX) {
      console.warn(`[api/cron/scrape] ATS agency limit (${ATS_AGENCIES_MAX}) reached; add pagination if the directory grows past this.`);
    }

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
    
    const ATS_FETCH_CONCURRENCY = 8;
    const ATS_MIN_INTERVAL_MS = 60 * 60_000;
    const cadenceSkippedAts: SkippedAtsAgency[] = [];
    const cadencePassedAgencies: typeof uniqueAtsAgencies = [];
    for (const agency of uniqueAtsAgencies) {
      const key = atsSourceKey(agency);
      const prev = sourceFetchStates.get(key);
      if (prev?.lastAttemptAt) {
        const elapsed = Date.parse(observedAt) - Date.parse(prev.lastAttemptAt);
        if (Number.isFinite(elapsed) && elapsed < ATS_MIN_INTERVAL_MS) {
          cadenceSkippedAts.push({
            agency,
            policy: atsPlatformPolicy(agency),
            skipReason: `Cadence guard: last fetched ${prev.lastAttemptAt}; 60-min minimum.`,
          });
          continue;
        }
      }
      cadencePassedAgencies.push(agency);
    }

    const workableFetchList = cadencePassedAgencies.filter((a) => a.atsPlatform === "workable");
    const nonWorkableFetchList = cadencePassedAgencies.filter((a) => a.atsPlatform !== "workable");

    const fetchOneAts = async (agency: typeof uniqueAtsAgencies[number]): Promise<SourceFetchResult> => {
      const policy = atsPlatformPolicy(agency);
      const key = atsSourceKey(agency);
      const result = await fetchSourceWithStatus(
        agency.companyName,
        "ATS",
        "public_ats_json",
        policy.complianceStatus,
        policy.complianceNotes,
        () => fetchATSFeed(agency.atsPlatform as any, agency.atsToken as string, agency.companyName),
        key
      );
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
      try {
        await db.insert(sourceFetchState).values({
          sourceId: key, sourceName: agency.companyName, sourceType: "ATS",
          collectionMethod: "public_ats_json", complianceStatus: policy.complianceStatus,
          lastAttemptAt: observedAt, lastCount: result.count,
          lastError: result.ok ? null : result.error ?? null,
          updatedAt: observedAt, lastSuccessAt: result.ok ? observedAt : null,
          etag: null, lastModified: null, lastBodyHash: null,
        }).onConflictDoUpdate({
          target: sourceFetchState.sourceId,
          set: {
            sourceName: agency.companyName, lastAttemptAt: observedAt,
            lastCount: result.count,
            lastError: result.ok ? null : result.error ?? null,
            updatedAt: observedAt,
            ...(result.ok ? { lastSuccessAt: observedAt } : {}),
          },
        });
      } catch (e) {
        console.warn(`[api/cron/scrape] Failed to record ATS fetch state for ${agency.companyName}:`, errorMessage(e));
      }
      return result;
    };

    const atsResults: SourceFetchResult[] = [];
    for (const batch of chunkArray(nonWorkableFetchList, ATS_FETCH_CONCURRENCY)) {
      atsResults.push(...await Promise.all(batch.map(fetchOneAts)));
    }
    for (const agency of workableFetchList) {
      atsResults.push(await fetchOneAts(agency));
      await sleep(1_000);
    }
    const atsItems = atsResults.flatMap((result) => result.items);

    const skippedResults = disabledSources.map((source) => skippedSourceResult(source));
    const skippedAtsResults = [
      ...policySkippedAtsAgencies.map(skippedAtsResult),
      ...duplicateAtsAgencies.map(skippedDuplicateAtsResult),
      ...cadenceSkippedAts.map(skippedAtsResult),
    ];
    // Conditional-fetch efficiency: how many feeds were unchanged this run and
    // skipped parse+triage (the freshness/efficiency win).
    const sourcesUnchanged = [...rssResults, ...htmlResults, ...jsonResults].filter((r) => r.notModified).length;
    const sourceResults = [...rssResults, ...htmlResults, ...jsonResults, ...skippedResults, ...atsResults, ...skippedAtsResults].map(sourceStatus);
    // Masterplan 4A staging metric: how many fetches enforce mode would have
    // skipped. This is the number that decides when ROBOTS_MODE can flip.
    const robotsWouldBlock = sourceResults.filter((r) => (r as any).robotsWouldBlock).length;
    const fetchEventLog = await recordSourceFetchEvents(db, sourceResults, observedAt);
    const cadenceGuards = {
      stateAvailable: fetchStateLoad.available,
      ...(fetchStateLoad.error ? { stateError: fetchStateLoad.error } : {}),
    };
    const failedSources = sourceResults
      .filter((result) => !result.ok)
      .map((result) => `${result.sourceName} (${result.sourceType}): ${result.error}`);

    const rawItems = [...rssItems, ...htmlItems, ...jsonItems, ...atsItems];
    // This is the final untrusted-data boundary before database writes and
    // later verifier fetches. Every source implementation may evolve, so the
    // production route normalizes source URLs again rather than relying on any
    // one parser to keep the invariant.
    const { items: allItems, droppedNoUrl } = normalizeScrapedItems(rawItems);
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML, ${jsonItems.length} JSON, ${atsItems.length} ATS)`);
    if (droppedNoUrl > 0) {
      console.warn(`[api/cron/scrape] ${droppedNoUrl} scraped item(s) had no usable sourceUrl and were dropped.`);
    }

    if (allItems.length === 0) {
      const stateWrite = await recordConditionalSourceStates(new Set());
      // Nothing new to ingest — but backlog convergence is maintenance work that
      // must still happen. At a 15-min cadence most ticks land here (feeds return
      // 304, or every source is cadence-skipped), and while the sweep lived only
      // below this return it never ran on those ticks. That, not the per-row
      // failure handling, was the dominant reason the unclear backlog sat flat.
      const idleSweep = await sweepUnclearBacklog(db, aiEnv, observedAt, SWEEP_BUDGET_IDLE_TICK);
      await maybeDrainPendingTriage(db, aiEnv, aiBudget, observedAt, pendingDrainEnabled, "idle");
      const outcome = buildNoJobsScrapedOutcome({
        fetchEventFailedBatches: fetchEventLog.failedBatches,
        failedSourceCount: failedSources.length,
        droppedNoUrl,
        cadenceStateAvailable: cadenceGuards.stateAvailable,
        details: {
          unmatchedPauses,
          failedSources,
          sourceResults,
          fetchEventLog,
          cadenceGuards,
          sourcesUnchanged,
          robotsWouldBlock,
          unclearRetriaged: idleSweep.retriaged,
          unclearUpgraded: idleSweep.upgraded,
          unclearDeactivated: idleSweep.deactivated,
          unclearSkepticUnavailable: idleSweep.skepticUnavailable ?? 0,
          unclearQuotaUnavailable: idleSweep.quotaUnavailable === true,
          stateWriteOk: stateWrite.ok,
          stateWriteFailed: stateWrite.failed,
          stateWriteErrors: stateWrite.errors.length > 0 ? stateWrite.errors : undefined,
        },
      });
      await recordIngestDiagnostics(db, observedAt, outcome.diagnostics);
      return new Response(JSON.stringify(outcome.response), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 4. De-duplicate against existing database entries by source URL (batch check, not full-table scan)
    const allScrapedUrls = allItems.map(item => item.sourceUrl).filter(Boolean);
    // Invalid source URLs were removed at the final ingestion boundary above;
    // retain their count so the raw -> dedup -> triage -> insert funnel stays
    // closed-form in the response telemetry.
    const BATCH_SIZE = 50;
    const existingUrls = new Set<string>();
    const recoverableInactiveUrls = new Set<string>();
    for (let i = 0; i < allScrapedUrls.length; i += BATCH_SIZE) {
      const batch = allScrapedUrls.slice(i, i + BATCH_SIZE);
      const found = await db.select({
        sourceUrl: opportunities.sourceUrl,
        isActive: opportunities.isActive,
        inactiveReason: opportunities.inactiveReason,
      })
        .from(opportunities)
        .where(inArray(opportunities.sourceUrl, batch));
      found.forEach((row) => {
        existingUrls.add(row.sourceUrl);
        if (!row.isActive && isFeedRecoverableInactiveReason(row.inactiveReason)) {
          recoverableInactiveUrls.add(row.sourceUrl);
        }
      });
    }

    // Update lastSeenInFeedAt for jobs still in feeds (prevents false stale archiving).
    // Debounce: only touch rows where the value is null or has drifted >12h,
    // since the 30-day stale cutoff does not need minute granularity.
    if (existingUrls.size > 0) {
      const SEEN_DEBOUNCE_MS = 12 * 60 * 60_000;
      const staleThreshold = new Date(Date.parse(observedAt) - SEEN_DEBOUNCE_MS).toISOString();
      const existingUrlArray = Array.from(existingUrls);
      let updatedCount = 0;
      for (let i = 0; i < existingUrlArray.length; i += BATCH_SIZE) {
        const batch = existingUrlArray.slice(i, i + BATCH_SIZE);
        const res = await db.update(opportunities)
          .set({ lastSeenInFeedAt: observedAt, updatedAt: observedAt })
          .where(and(
            inArray(opportunities.sourceUrl, batch),
            or(isNull(opportunities.lastSeenInFeedAt), lt(opportunities.lastSeenInFeedAt, staleThreshold))
          ));
        updatedCount += d1Changes(res);
      }
      console.log(`[api/cron/scrape] Debounced lastSeenInFeedAt: ${updatedCount} of ${existingUrls.size} existing jobs updated`);
    }

    // A feed is the source of truth for availability. Revive only rows that
    // this system previously archived for staleness or link health; policy and
    // quality rejections remain inactive even when a feed repeats their URL.
    if (recoverableInactiveUrls.size > 0) {
      let reactivated = 0;
      for (const batch of chunkArray(Array.from(recoverableInactiveUrls), BATCH_SIZE)) {
        const res = await db.update(opportunities)
          .set({
            isActive: true,
            inactiveReason: null,
            failedVerificationCount: 0,
            lastSeenInFeedAt: observedAt,
            updatedAt: observedAt,
          })
          .where(and(
            inArray(opportunities.sourceUrl, batch),
            eq(opportunities.isActive, false),
            inArray(opportunities.inactiveReason, [...RECOVERABLE_INACTIVE_REASONS]),
          ));
        reactivated += d1Changes(res);
      }
      console.log(`[api/cron/scrape] Reactivated ${reactivated} feed-confirmed jobs previously archived by the system.`);
    }

    const newItems = allItems.filter((item) => item.sourceUrl && !existingUrls.has(item.sourceUrl));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after URL dedup`);

    if (newItems.length === 0) {
      const stateWrite = await recordConditionalSourceStates(new Set());
      // Same reasoning as the allItems===0 return above, and this is the path
      // that actually fires on most ticks: feeds keep returning their current
      // items (so allItems > 0), but after URL dedup none of them are new. The
      // backlog sweep is maintenance and must not be gated on fresh ingest.
      const dedupSweep = await sweepUnclearBacklog(db, aiEnv, observedAt, SWEEP_BUDGET_IDLE_TICK);
      const dedupDrain = await maybeDrainPendingTriage(db, aiEnv, aiBudget, observedAt, pendingDrainEnabled, "dedup");
      await recordIngestDiagnostics(db, observedAt, {
        fetchEventFailedBatches: fetchEventLog.failedBatches,
        failedSourceCount: failedSources.length,
        droppedNoUrl,
        cadenceStateAvailable: cadenceGuards.stateAvailable,
      });
      return new Response(JSON.stringify({
        inserted: 0,
        actualChanges: 0,
        acceptedForInsert: 0,
        attemptedInsert: 0,
        insertFailedBatches: 0,
        insertErrors: [],
        skipped: allItems.length,
        pendingDrainClaimed: dedupDrain.claimed,
        pendingDrainPublished: dedupDrain.published,
        pendingDrainRejected: dedupDrain.rejected,
        pendingDrainDeferred: dedupDrain.deferred,
        droppedNoUrl,
        unmatchedPauses,
        failedSources,
        sourceResults,
        fetchEventLog,
        cadenceGuards,
        sourcesUnchanged,
        robotsWouldBlock,
        unclearRetriaged: dedupSweep.retriaged,
        unclearUpgraded: dedupSweep.upgraded,
        unclearDeactivated: dedupSweep.deactivated,
        unclearSkepticUnavailable: dedupSweep.skepticUnavailable ?? 0,
        unclearQuotaUnavailable: dedupSweep.quotaUnavailable === true,
        stateWriteOk: stateWrite.ok,
        stateWriteFailed: stateWrite.failed,
        stateWriteErrors: stateWrite.errors.length > 0 ? stateWrite.errors : undefined,
        message: "Zero new jobs after dedup"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 5. Triage and classify new items
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") || "50");
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 100
      ? requestedLimit
      : 50;
    const itemsToProcess = newItems.slice(0, limit);
    console.log(`[api/cron/scrape] Processing ${itemsToProcess.length} out of ${newItems.length} new items (limit: ${limit})`);
    const retrySourceIds = sourceIdsForUrls(
      newItems.slice(itemsToProcess.length).map((item) => item.sourceUrl),
      sourceIdsByUrl,
    );
    const markItemsForRetry = (items: readonly { sourceUrl: string }[]) => {
      for (const sourceId of sourceIdsForUrls(items.map((item) => item.sourceUrl), sourceIdsByUrl)) {
        retrySourceIds.add(sourceId);
      }
    };

    const triagedItems: typeof opportunities.$inferInsert[] = [];
    // Ineligible jobs are persisted as INACTIVE rows so their source_url
    // enters dedup: previously they were dropped with no record, re-entered
    // newItems on every run, were re-triaged (Workers AI cost) indefinitely,
    // and a cluster of persistent ineligible listings at the head of a large
    // feed could permanently starve items behind the per-run limit.
    const rejectedItems: typeof opportunities.$inferInsert[] = [];
    // Durable-triage queue (Inngest pilot): when explicitly opted in, gate-passed
    // listings are persisted here as hidden `pending-triage` rows instead of being
    // AI-triaged inline, and the Inngest triage-drain worker classifies them
    // out-of-band — one listing per invocation, so no single Pages Function
    // request ever approaches the 50-subrequest cap that froze ingestion on
    // 2026-08-07. Enabling it requires BOTH INNGEST_SIGNING_KEY and
    // TRIAGE_VIA_INNGEST="1" (see shouldTriageViaInngest, computed as
    // `triageViaInngest` above): the signing key alone used to flip this on,
    // which froze the board for ~30h on 2026-08-18/19 when the key was present
    // but the Inngest drain was not running.
    const pendingItems: typeof opportunities.$inferInsert[] = [];
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
    // Items where the two AI votes disagreed (L2 consensus) — quarantined.
    let consensusQuarantined = 0;
    // Items deferred because the per-invocation Workers AI subrequest budget was
    // consumed. Deferred, not lost — their source validators are cleared so the
    // next tick re-fetches and retries them. This keeps the invocation under
    // Cloudflare's 50-subrequest ceiling (Free plan) instead of failing closed
    // on the last ~50 AI calls like the 2026-08-08 ingestion freeze did.
    let triageBudgetDeferred = 0;
    // Per-source geo-rejection counts (masterplan L3): a source segment that
    // keeps shipping country-locked "remote" jobs shows up here run after
    // run — the Sentinel/digest layer can then tighten its defaults.
    const geoRejectionsBySource: Record<string, number> = {};

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
        geoRejectionsBySource[item.sourcePlatform] = (geoRejectionsBySource[item.sourcePlatform] || 0) + 1;
        console.log(`[api/cron/scrape] Geo-gate rejected "${item.title}": ${gate.evidence}`);
        const cleanDesc = (item.description || "").slice(0, 1500);
        rejectedItems.push({
          ...item,
          isActive: false,
          inactiveReason: "policy-rejected",
          tags: Array.from(new Set([...(item.tags || []), "geo-gate-rejected"])),
          category: "other",
          geoScope: gate.geoScope,
          phEligibility: gate.phEligibility,
          geoEvidence: gate.evidence,
          geoCheckedAt: observedAt,
          descriptionHash: await sha256Hex(item.title + cleanDesc),
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

    // ── Durable triage path: persist, don't classify inline ──────────────────
    // With Inngest enabled, a gate-passed listing becomes a hidden
    // `pending-triage` row (is_active=0 → never rendered) and the triage-drain
    // worker sets its verdict later. No `env.AI.run` happens on this request, so
    // the whole scrape invocation stays trivially under the 50-subrequest cap.
    if (triageViaInngest) {
      for (const { item, gate } of gatePassedItems) {
        const cleanDesc = (item.description || "").slice(0, 1500);
        pendingItems.push({
          ...item,
          isActive: false,
          inactiveReason: "pending-triage",
          geoScope: gate.geoScope,
          phEligibility: "unclear",
          geoEvidence: `Queued for Inngest durable triage (gate: ${gate.geoScope})`,
          geoCheckedAt: observedAt,
          descriptionHash: await sha256Hex(item.title + cleanDesc),
          applicationUrl: sanitizeApplyUrl(item.applicationUrl) || item.sourceUrl,
          postedAt: normalizeUtcIso(item.postedAt),
          scrapedAt: observedAt,
          lastSeenInFeedAt: observedAt,
          updatedAt: observedAt,
        });
      }
    } else {
    for (let i = 0; i < gatePassedItems.length; i += concurrency) {
      // Subrequest budget (see AI_SUBREQUEST_BUDGET_PER_RUN): once consumed,
      // defer the remaining items to the next tick instead of making AI calls
      // that would fail with "Too many subrequests" and fail closed anyway.
      if (aiBudget.exhausted()) {
        const deferred = gatePassedItems.slice(i);
        markItemsForRetry(deferred.map(({ item }) => item));
        triageBudgetDeferred += deferred.length;
        console.warn(`[api/cron/scrape] AI subrequest budget exhausted; deferring ${deferred.length} item(s) to the next run.`);
        break;
      }
      const chunk = gatePassedItems.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async ({ item, gate }) => {
          console.log(`[api/cron/scrape] Triaging: "${item.title}"`);
          try {
            // L2: the model now sees the structured location, source tags,
            // and company — not just title + description.
            const triageContext = {
              locationRaw: (item as { locationRaw?: string | null }).locationRaw ?? null,
              tags: item.tags,
              company: item.company,
            };
            const triage = await triageJob(item.title, item.description || "", aiEnv, triageContext);
            // Consensus (L2): a gate-unknown item approved by one AI pass
            // needs a second, adversarial vote before publishing. Gate-
            // verified positives (worldwide/APAC/PH) skip this — the
            // structured signal already corroborates.
            let skeptic = null;
            if (gate.geoScope === "unknown" && !triage.aiUnavailable && triage.eligibleForFilipinos) {
              skeptic = await skepticEligibilityCheck(item.title, item.description || "", aiEnv, triageContext);
            }
            return { item, gate, triage, skeptic };
          } catch (err) {
            console.error(`[api/cron/scrape] Triage failed for "${item.title}":`, err);
            triageFailures += 1;
            return { item, gate, triage: null, skeptic: null };
          }
        })
      );

      for (const { item, gate, triage, skeptic } of results) {
        if (!triage) {
          markItemsForRetry([item]);
          continue;
        }

        if (triage.aiUnavailable) {
          triageAiUnavailable += 1;
          console.warn(`[api/cron/scrape] AI unavailable for "${item.title}"; deferring to next run (fail closed).`);
          markItemsForRetry([item]);
          continue;
        }

        const cleanDesc = (item.description || "").slice(0, 1500);
        const descriptionHash = await sha256Hex(item.title + cleanDesc);

        if (!triage.eligibleForFilipinos) {
          console.log(`[api/cron/scrape] Filtering out ineligible job: "${item.title}". Reason: ${triage.reason}`);
          rejectedItems.push({
            ...item,
            isActive: false,
            inactiveReason: "policy-rejected",
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

        // Consensus quarantine (L2): the skeptic refuted the first AI pass —
        // conflicting votes never publish. Persisted inactive with evidence
        // so the URL joins dedup and a human can audit the split.
        if (skeptic && !skeptic.aiUnavailable && !skeptic.eligible) {
          consensusQuarantined += 1;
          console.log(`[api/cron/scrape] Consensus split for "${item.title}" — quarantined. Skeptic: ${skeptic.reason}`);
          rejectedItems.push({
            ...item,
            isActive: false,
            inactiveReason: "policy-rejected",
            tags: Array.from(new Set([...(item.tags || []), "consensus-quarantined"])),
            category: "other",
            geoScope: gate.geoScope,
            phEligibility: "unclear",
            geoEvidence: `Consensus split — skeptic: ${(skeptic.reason || "refuted").slice(0, 200)}`,
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
    } // end inline-triage branch (else of triageViaInngest)

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
        console.log(`[api/cron/scrape] Inserting batch of ${batch.length} items (index ${i}).`);
        const res = await db.insert(opportunities).values(batch).onConflictDoNothing();
        if (res && (res as any).meta && typeof (res as any).meta.changes === "number") {
          actualChanges += d1Changes(res);
        } else {
          markItemsForRetry(batch);
          insertErrors.push({
            batchStart: i,
            batchSize: batch.length,
            error: "D1 insert metadata did not include meta.changes",
          });
        }
      } catch (err) {
        insertFailedBatches += 1;
        markItemsForRetry(batch);
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
          rejectedPersisted += d1Changes(res);
        } else {
          markItemsForRetry(batch);
          console.warn(`[api/cron/scrape] Rejected-item insert metadata missing (index ${i}); clearing conditional validators for retry.`);
        }
      } catch (err) {
        rejectedInsertFailedBatches += 1;
        markItemsForRetry(batch);
        console.warn(`[api/cron/scrape] Rejected-item batch insert failed (index ${i}):`, errorMessage(err));
      }
    }
    if (rejectedItems.length > 0) {
      console.log(`[api/cron/scrape] Persisted ${rejectedPersisted}/${rejectedItems.length} triage-rejected items as inactive rows (${rejectedInsertFailedBatches} failed batches).`);
    }

    // 6b-inngest. Persist gate-passed listings queued for durable Inngest
    // triage as hidden `pending-triage` rows (is_active=0 → never on the board
    // until the worker classifies them). Same fail-soft accounting as above;
    // empty when triageViaInngest is off, so this is a no-op on the inline path.
    let pendingPersisted = 0;
    let pendingInsertFailedBatches = 0;
    for (let i = 0; i < pendingItems.length; i += D1_INSERT_BATCH_SIZE) {
      const batch = pendingItems.slice(i, i + D1_INSERT_BATCH_SIZE);
      try {
        const res = await db.insert(opportunities).values(batch).onConflictDoNothing();
        if (res && (res as any).meta && typeof (res as any).meta.changes === "number") {
          pendingPersisted += d1Changes(res);
        } else {
          markItemsForRetry(batch);
        }
      } catch (err) {
        pendingInsertFailedBatches += 1;
        markItemsForRetry(batch);
        console.warn(`[api/cron/scrape] Pending-triage batch insert failed (index ${i}):`, errorMessage(err));
      }
    }
    if (pendingItems.length > 0) {
      console.log(`[api/cron/scrape] Queued ${pendingPersisted}/${pendingItems.length} listing(s) for Inngest durable triage (${pendingInsertFailedBatches} failed batches).`);
    }

    // 6c. Unclear-backlog convergence — see sweepUnclearBacklog(). Also invoked
    // on the no-new-items early-return path above, so it runs every tick.
    // A source's ETag/body hash becomes durable only after every listing has a
    // terminal outcome. Otherwise a later 304 would silently suppress a retry.
    const stateWrite = await recordConditionalSourceStates(retrySourceIds);

    // Guard: if inline triage exhausted the per-invocation AI subrequest budget,
    // the sweep would immediately throw AiBudgetExceededError on its first call,
    // waste two D1 cursor-write round-trips, and record a misleading
    // "__sweep_diag__" AI-unavailable entry that looks like a quota outage. Skip
    // it instead — the sweep runs on every tick, so it will catch up on the next
    // idle tick when the budget is fresh.
    let unclearSweep: UnclearSweepStats = { retriaged: 0, upgraded: 0, deactivated: 0 };
    if (aiBudget.exhausted()) {
      console.log("[api/cron/scrape] Skipping unclear sweep: AI subrequest budget exhausted by inline triage.");
    } else {
      unclearSweep = await sweepUnclearBacklog(db, aiEnv, observedAt, SWEEP_BUDGET_BUSY_TICK);
    }
    const unclearRetriaged = unclearSweep.retriaged;
    const unclearUpgraded = unclearSweep.upgraded;
    const unclearDeactivated = unclearSweep.deactivated;
    const unclearSkepticUnavailable = unclearSweep.skepticUnavailable ?? 0;
    // Recover any `pending-triage` backlog inline with leftover AI budget (no-op
    // under durable-triage opt-in, where Inngest owns the queue).
    const pendingDrain = await maybeDrainPendingTriage(db, aiEnv, aiBudget, observedAt, pendingDrainEnabled, "post-ingest");

    console.log(`[api/cron/scrape] Finished. Processed ${itemsToProcess.length}, accepted ${triagedItems.length}, attempted ${attemptedInsert}, actual DB changes: ${actualChanges}, failed batches: ${insertFailedBatches}, budget-deferred: ${triageBudgetDeferred}, aiCalls: ${aiBudget.calls()}`);
    await recordIngestDiagnostics(db, observedAt, {
      insertFailedBatches,
      insertErrorCount: insertErrors.length,
      rejectedInsertFailedBatches,
      fetchEventFailedBatches: fetchEventLog.failedBatches,
      triageFailures,
      triageAiUnavailable,
      triageBudgetDeferred,
      failedSourceCount: failedSources.length,
      droppedNoUrl,
      cadenceStateAvailable: cadenceGuards.stateAvailable,
    });
    return new Response(JSON.stringify({
      inserted: actualChanges,
      actualChanges,
      acceptedForInsert: triagedItems.length,
      attemptedInsert,
      insertFailedBatches,
      insertErrors,
      triageFailures,
      triageAiUnavailable,
      triageBudgetDeferred,
      aiSubrequestCalls: aiBudget.calls(),
      aiSubrequestBudget: AI_SUBREQUEST_BUDGET_PER_RUN,
      geoGateRejected,
      geoRejectionsBySource,
      consensusQuarantined,
      unclearRetriaged,
      unclearUpgraded,
      unclearDeactivated,
      unclearSkepticUnavailable,
      unclearQuotaUnavailable: unclearSweep.quotaUnavailable === true,
      stateWriteOk: stateWrite.ok,
      stateWriteFailed: stateWrite.failed,
      stateWriteErrors: stateWrite.errors.length > 0 ? stateWrite.errors : undefined,
      rejectedPersisted,
      rejectedInsertFailedBatches,
      pendingPersisted,
      pendingInsertFailedBatches,
      pendingDrainClaimed: pendingDrain.claimed,
      pendingDrainPublished: pendingDrain.published,
      pendingDrainRejected: pendingDrain.rejected,
      pendingDrainQuarantined: pendingDrain.quarantined,
      pendingDrainDeferred: pendingDrain.deferred,
      triageViaInngest,
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
      robotsWouldBlock,
      runDurationMs: Date.now() - startedAt,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", runDurationMs: Date.now() - startedAt }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
