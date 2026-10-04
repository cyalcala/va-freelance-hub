/**
 * Autonomous ATS Tenant Discovery & Admission Engine — scripts/lake/domain-ats-discovery.ts
 *
 * Extracts employer domains from lake_candidate_jobs, probes each domain's known
 * ATS tenant endpoints (Breezy HR, Greenhouse, Workable, Lever), then autonomously
 * evaluates each discovered tenant using geoGate + Jev 1.13 to make an admission
 * decision — no human gate required.
 *
 * Admission pipeline for each discovered tenant:
 *   1. Probe public JSON endpoint → extract all available job listings
 *   2. Run every job through geoGate (deterministic PH eligibility)
 *   3. Compute PH signal metrics (QUALIFIED_READY rate, total count, category mix)
 *   4. Invoke Jev 1.13 for a calibrated ADMIT / SHADOW / REJECT decision
 *   5. Persist decision to lake_ats_discovery:
 *      - ADMIT  → review_status = 'auto_approved'; ingest jobs into lake_candidate_jobs
 *      - SHADOW → review_status = 'shadow_monitor'; store discovery only, no ingestion
 *      - REJECT → review_status = 'auto_rejected'; record evidence; skip ingestion
 *
 * Auto-approved tenants are published by lake:sync with no human flag.
 * The Wilson lower bound must clear the admit floor, or Jev must return a
 * confident verdict in the ambiguous band. `--hold-auto-approved` stops it.
 *
 * Compliance:
 * - Only probes public, unauthenticated JSON endpoints.
 * - Follows all repository compliance rules (minimal metadata, linkback, no auth bypass).
 * - Admission threshold documented per decision; all Jev calls logged in lake.
 *
 * Run: bun run scripts/lake/domain-ats-discovery.ts [--dry-run] [--limit=N]
 */

import { getLakeClient } from "./client";
import { processAndRefineCandidate } from "./ingest-to-lake";
import { markRawProcessed, storeRawObservation } from "./lake-shared";
import { geoGate } from "../../packages/scraper/geoGate";
import { collectionHeaders } from "../../packages/scraper/userAgent";
import { judgeViaJev } from "../../packages/scraper/jev-client";
import {
  JEV_RECEIPT_RETENTION_CLAUSE,
  classifyJevAttempt,
  renderAttemptReceipt,
} from "./jev-verdict-receipt";
import { JEV_MIN_CONFIDENCE, wilsonLowerBound, PUBLISH_PH_RATE_FLOOR } from "./auto-publish-policy";
import { planJevReAdjudication } from "./jev-readjudication-plan";
import { extractAtsToken } from "../../packages/scraper/prospector";
import { deriveCandidateSlugs, KNOWN_ATS_TOKENS } from "./process-intake";

// ── Admission thresholds (exported for unit tests) ───────────────────────────
// Minimum number of live jobs a tenant must have to be considered
export const MIN_JOBS_TO_EVALUATE = 3;
// Minimum fraction of jobs that must pass geoGate as QUALIFIED_READY for auto-approval
export const AUTO_APPROVE_PH_RATE = 0.20; // 20%
// Below this rate, auto-reject (tenant has negligible PH signal)
export const AUTO_REJECT_PH_RATE = 0.05; // <5% → rejected
// Between REJECT and APPROVE thresholds → shadow monitoring

/** Canonical lake source id for a discovered tenant: `<family-lower>:<slug>`. */
export function buildDiscoverySourceId(atsFamily: string, tenantSlug: string): string {
  return `${atsFamily.toLowerCase()}:${tenantSlug}`;
}

// ── Runner version & pacing (mirrors shadow-dispatcher skip-on-429) ──────────
/** Bumped when discovery fetch/pacing behavior changes in a way operators care about. */
export const DISCOVERY_VERSION = "2.1.0";
/** Mandatory inter-probe delay (ms) — polite pacing against public ATS JSON hosts. */
export const INTER_PROBE_DELAY_MS_DEFAULT = 1500;
export const INTER_PROBE_DELAY_MS_MIN = 1000;
export const INTER_PROBE_DELAY_MS_MAX = 2000;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function clampProbeDelay(ms: number): number {
  if (!Number.isFinite(ms)) return INTER_PROBE_DELAY_MS_DEFAULT;
  return Math.min(INTER_PROBE_DELAY_MS_MAX, Math.max(INTER_PROBE_DELAY_MS_MIN, Math.floor(ms)));
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.slice(0, 80).toLowerCase();
  }
}

// ── ATS probe templates ───────────────────────────────────────────────────────
export interface AtsProbeTemplate {
  family: string;
  buildUrl: (tenant: string) => string;
  extractJobs: (data: unknown) => Array<{
    title: string;
    company: string;
    url: string;
    locationRaw: string;
    description: string;
    tags: string[];
    postedAt: string | null;
  }>;
}

export const ATS_PROBE_TEMPLATES: Array<AtsProbeTemplate> = [
  {
    family: "Breezy",
    buildUrl: (t) => `https://${t}.breezy.hr/json`,
    extractJobs: (data) => {
      if (!Array.isArray(data)) return [];
      return (data as any[])
        .filter((j: any) => j?.name && j?.url)
        .map((j: any) => ({
          title: String(j.name || ""),
          company: j.company?.name || j.company || "",
          url: String(j.url || ""),
          locationRaw: j.location?.name || j.location?.country?.name || (j.location?.is_remote ? "Remote" : ""),
          description: String(j.description || ""),
          tags: [] as string[],
          postedAt: j.updated_at || j.created_at
            ? new Date(j.updated_at || j.created_at).toISOString()
            : null,
        }));
    },
  },
  {
    family: "Greenhouse",
    buildUrl: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`,
    extractJobs: (data: any) => {
      const jobs = data?.jobs ?? [];
      if (!Array.isArray(jobs)) return [];
      return jobs
        .filter((j: any) => j?.title && j?.absolute_url)
        .map((j: any) => ({
          title: j.title || "",
          company: data?.company?.name || "",
          url: j.absolute_url || "",
          locationRaw: j.location?.name || "Remote",
          description: j.content || "",
          tags: Array.isArray(j.departments) ? j.departments.map((d: any) => d.name) : [],
          postedAt: j.updated_at ? new Date(j.updated_at).toISOString() : null,
        }));
    },
  },
  {
    family: "Workable",
    buildUrl: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}`,
    extractJobs: (data: any) => {
      const jobs = data?.jobs ?? data?.results ?? [];
      if (!Array.isArray(jobs)) return [];
      const companyName = data?.name || "";
      return jobs
        .filter((j: any) => j?.title && (j?.url || j?.shortcode))
        .map((j: any) => {
          const locParts = [j.city, j.state, j.country].filter(Boolean);
          const locationRaw = locParts.join(", ") || (j.telecommuting ? "Remote" : "");
          return {
            title: j.title || "",
            company: companyName,
            url: j.url || `https://apply.workable.com/j/${j.shortcode}`,
            locationRaw: j.telecommuting === false ? `${locationRaw} (onsite)`.trim() : locationRaw,
            description: [locationRaw, j.telecommuting ? "Remote: yes." : ""].filter(Boolean).join(" "),
            tags: [j.department, j.industry].filter(Boolean),
            postedAt: j.published_on || j.created_at ? new Date(j.published_on || j.created_at).toISOString() : null,
          };
        });
    },
  },
  {
    family: "Lever",
    buildUrl: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    extractJobs: (data: any) => {
      if (!Array.isArray(data)) return [];
      return data
        .filter((j: any) => j?.text && j?.hostedUrl)
        .map((j: any) => ({
          title: j.text || "",
          company: j.company || "",
          url: j.hostedUrl || "",
          locationRaw: j.categories?.location || j.workplaceType || "Remote",
          description: j.descriptionPlain || j.description || "",
          tags: Array.isArray(j.categories?.team) ? [j.categories.team] : [],
          postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        }));
    },
  },
  {
    family: "Ashby",
    buildUrl: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    extractJobs: (data: any) => {
      const jobs = data?.jobs ?? [];
      if (!Array.isArray(jobs)) return [];
      return jobs
        .filter((j: any) => j && j.isListed !== false && j.title && j.jobUrl)
        .map((j: any) => {
          const loc = typeof j.location === "string" ? j.location : j.location?.name || "";
          return {
            title: j.title || "",
            company: j.companyName || j.organizationName || "",
            url: j.jobUrl || "",
            locationRaw: [loc, j.isRemote === false ? "(onsite)" : ""].filter(Boolean).join(" ") || "Remote",
            description: [loc, j.isRemote === true ? "Remote: yes." : j.isRemote === false ? "Remote: no." : ""]
              .filter(Boolean).join(" "),
            tags: Array.isArray(j.departments) ? j.departments.map((d: any) => d.name || d).filter(Boolean) : [],
            postedAt: j.publishedAt ? new Date(j.publishedAt).toISOString() : null,
          };
        });
    },
  },
];

export function probeTemplateForFamily(family: string): AtsProbeTemplate | undefined {
  return ATS_PROBE_TEMPLATES.find((t) => t.family.toLowerCase() === family.toLowerCase());
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TenantMetrics {
  totalJobs: number;
  qualifiedReady: number;
  excluded: number;
  ambiguous: number;
  phRate: number;
  topCategories: string[];
}

interface AdmissionDecision {
  verdict: "ADMIT" | "SHADOW" | "REJECT";
  confidence: number;
  reason: string;
  jevRaw?: string;
}

// ── Admission decision ────────────────────────────────────────────────────────
/**
 * Pure deterministic threshold decision (no network). Exported for unit tests.
 * Used as the Jev-offline fallback so admission never blocks on model availability.
 */
/**
 * Jev chooses only when the Wilson bound has not cleared the admit floor.
 * A cleared bound admits. A hard reject stays rejected. Neither waits for a person.
 */
export function mergeAdmissionDecision(
  metrics: TenantMetrics,
  jev: { choice: "ADMIT" | "SHADOW" | "REJECT"; confidence: number } | null,
): AdmissionDecision {
  const deterministic = decideAdmissionDeterministic(metrics);
  if (deterministic.verdict === "REJECT") return deterministic;
  const wilson = wilsonLowerBound(metrics.qualifiedReady, metrics.totalJobs);
  if (wilson !== null && wilson >= PUBLISH_PH_RATE_FLOOR && deterministic.verdict === "ADMIT") {
    return {
      verdict: "ADMIT",
      confidence: Math.max(deterministic.confidence, jev?.confidence ?? 0),
      reason: `Wilson lower bound ${(wilson * 100).toFixed(1)}% clears ${PUBLISH_PH_RATE_FLOOR * 100}%. Jev cannot hold this cohort for a person.`,
      jevRaw: jev ? `jev:${jev.choice}@${jev.confidence}` : undefined,
    };
  }
  if (jev && jev.confidence >= JEV_MIN_CONFIDENCE) {
    return {
      verdict: jev.choice,
      confidence: jev.confidence,
      reason: `Jev ${jev.choice} at ${jev.confidence} executes the ambiguous band with no human gate.`,
      jevRaw: `jev:${jev.choice}@${jev.confidence}`,
    };
  }
  if (jev) {
    return {
      verdict: "SHADOW",
      confidence: jev.confidence,
      reason: `Jev confidence ${jev.confidence} is below ${JEV_MIN_CONFIDENCE} in the ambiguous band. Shadow, no human queue.`,
      jevRaw: `jev:${jev.choice}@${jev.confidence}`,
    };
  }
  return deterministic;
}

export function decideAdmissionDeterministic(metrics: TenantMetrics): AdmissionDecision {
  if (metrics.phRate >= AUTO_APPROVE_PH_RATE && metrics.totalJobs >= MIN_JOBS_TO_EVALUATE) {
    return {
      verdict: "ADMIT",
      confidence: 0.75,
      reason: `Deterministic threshold: ph_rate=${(metrics.phRate * 100).toFixed(1)}% >= ${AUTO_APPROVE_PH_RATE * 100}% threshold`,
    };
  } else if (metrics.phRate < AUTO_REJECT_PH_RATE || metrics.totalJobs < MIN_JOBS_TO_EVALUATE) {
    return {
      verdict: "REJECT",
      confidence: 0.85,
      reason: `Deterministic threshold: ph_rate=${(metrics.phRate * 100).toFixed(1)}% < ${AUTO_REJECT_PH_RATE * 100}% or insufficient jobs (${metrics.totalJobs})`,
    };
  }
  return {
    verdict: "SHADOW",
    confidence: 0.65,
    reason: `Borderline ph_rate=${(metrics.phRate * 100).toFixed(1)}% — shadow monitoring`,
  };
}

/**
 * Jev-assisted admission via the repository-portable Jev 1.13 client
 * (OpenRouter System One; advisory only). Falls back to the deterministic
 * threshold when the key is missing, the provider fails, or the answer is
 * invalid — admission never blocks on model availability.
 */
export async function decideAdmission(
  tenantSlug: string,
  family: string,
  metrics: TenantMetrics,
  judge: typeof judgeViaJev = judgeViaJev,
): Promise<AdmissionDecision> {
  // INCIDENT-0410(i): a hard reject is already decided. `mergeAdmissionDecision`
  // returns the deterministic decision verbatim for that cohort, so asking the
  // judge spent a rate-limited paid call only to discard the answer — and then
  // wrote a `jevRaw` the decision never rested on. Decide first, consult only
  // where a verdict can still change the outcome. No threshold moves here.
  const settled = decideAdmissionDeterministic(metrics);
  if (settled.verdict === "REJECT") return settled;

  const stateStr = `tenant=${family}/${tenantSlug} total=${metrics.totalJobs} qualified=${metrics.qualifiedReady} excluded=${metrics.excluded} ambiguous=${metrics.ambiguous} ph_rate=${metrics.phRate.toFixed(3)} categories=${metrics.topCategories.join(",")}`;

  const result = await judge(process.env.OPENROUTER_API_KEY, {
    task: "Admit ATS tenant as autonomous VA lake source",
    state: stateStr,
    context: `ATS tenant admission for VA Freelance Hub lake. PH eligibility rate: ${(metrics.phRate * 100).toFixed(1)}%. Min auto-approve threshold: ${AUTO_APPROVE_PH_RATE * 100}%. Min shadow threshold: ${AUTO_REJECT_PH_RATE * 100}%. Advisory only — deterministic thresholds enforce.`,
    questions: {
      admission: {
        instructions: `Choose ADMIT (publish the qualified jobs on the next automatic sync, no human approval), SHADOW (do not publish yet), or REJECT for ${family}/${tenantSlug} with PH rate ${(metrics.phRate * 100).toFixed(1)}% QUALIFIED_READY (${metrics.qualifiedReady}/${metrics.totalJobs}). A Wilson lower bound already above the admit floor will publish even if you say SHADOW.`,
        criteria: {
          ADMIT: `Publish qualified ${family}/${tenantSlug} jobs automatically.`,
          SHADOW: `Keep ${family}/${tenantSlug} unpublished until the evidence is clearer.`,
          REJECT: `Reject ${family}/${tenantSlug} — insufficient PH eligibility signal for VA-focused board.`,
        },
      },
    },
    timeoutMs: 8_000,
  });

  const answer = result.ok ? result.answers?.admission : undefined;
  const jev = answer && (answer.choice === "ADMIT" || answer.choice === "SHADOW" || answer.choice === "REJECT")
    ? { choice: answer.choice, confidence: answer.confidence }
    : null;
  const decision = mergeAdmissionDecision(metrics, jev);
  if (jev && result.model) {
    decision.jevRaw = `${result.model}:${jev.choice}@${jev.confidence}`.slice(0, 500);
  } else {
    // INCIDENT-0410: an attempt that produced no validated verdict is still a
    // fact. `jev_raw` used to stay NULL, so "never consulted", "no API key",
    // "timed out" and "invalid answer" were indistinguishable in the lake.
    // The receipt is content-free and provably inert for the publication gate.
    decision.jevRaw = renderAttemptReceipt(classifyJevAttempt(result), new Date().toISOString());
  }
  return decision;
}

// ── INCIDENT-0410(u): bounded re-adjudication of the held-supply cohort ────────
//
// Why this exists, and why it is selection and nothing else. `runDomainAtsDiscovery`
// builds its tenant set from `extractDiscoveryCandidates`, whose SQL ranks
// companies by `MAX(lake_candidate_jobs.sighting_count)` — a discovery ranking that
// knows nothing about held supply. A tenant is therefore re-probed only when an
// unrelated company row happens to outrank it, and no amount of waiting changes that
// order. Measured consequence on the live lake (VERIFIED_QUERY, 2026-10-04): 38
// `auto_approved` tenants, 27 with `jev_raw` NULL, and 17 of those holding 60
// `QUALIFIED_READY` rows the publisher cannot use, because `decideAutoPublish`
// returns the ambiguous band's HOLD for every one of them. The verdict those cohorts
// need is never requested.
//
// What this adds is a *selector* over tenants the lake already knows, plus a
// read-only query and a second pass through the existing `evaluateTenant` path. The
// probe, the metrics, the Jev call, the Wilson floor, the ambiguous band, the receipt
// and the persistence are all the production code that already runs for every other
// tenant. Nothing here decides, publishes or authorizes anything on its own.
//
// Authority and safety, stated before the code:
//   * No threshold moves. `AUTO_APPROVE_PH_RATE`, `AUTO_REJECT_PH_RATE`,
//     `MIN_JOBS_TO_EVALUATE`, `PUBLISH_PH_RATE_FLOOR`, `JEV_MIN_CONFIDENCE` and
//     `WILSON_Z` are imported from production and never restated here.
//   * Gate consistency is delegated, not reimplemented: the selector asks the real
//     `decideAutoPublish` (through the already-reviewed `planJevReAdjudication`) and
//     plans no call for a cohort the gate already clears, already rejects, or cannot
//     judge at the current sample size.
//   * The cohort is restricted to tenants that are ALREADY `auto_approved`, so this
//     pass can only confirm or narrow. It can never admit a new source.
//   * Ordering is oldest-evaluation-first, so a per-run cap cannot starve a small
//     tenant behind a large one. That is deliberately NOT the supply-first order the
//     unwired plan module uses; a cap plus supply-first order starves small tenants
//     indefinitely, which CONSTITUTION §7.3 (`QUALITY DRIFT`) and the bootloader's
//     "no permanent starvation" both forbid.
//   * The re-adjudication seed deliberately omits `family`, which is what makes
//     `evaluateTenant` persist an `auto_rejected` row for a dead or thin board. A
//     transient 3-job board must not demote a tenant that is holding supply today, so
//     the pass can only ever write a verdict, never a demotion it did not earn.
//   * Every planned call is L1_ADVISE (CONSTITUTION §2.2, §7.1).
//
// The cap is an AI-call budget bound, not a quality gate. `ACCEPTED_PARAMETERS.yaml`
// sets `budgets.ai_calls_per_day_max: 500`; `gha-lake-miner.yml` runs `23 */3 * * *`,
// i.e. 8 runs per UTC day, so 20 per run is 160 calls/day worst case against that
// accepted 500. It is overridable per run and can be set to 0 to disable the pass
// entirely, which is also the rollback lever.

/** Per-run ceiling on re-adjudicated tenants. AI-call budget bound, not a gate. */
export const HELD_READJUDICATION_CAP_PER_RUN = 20;

/** One `lake_ats_discovery` row joined with its real pending `QUALIFIED_READY` supply. */
export interface HeldTenantCandidateRow {
  sourceId: string;
  reviewStatus: string;
  atsFamily: string;
  tenantSlug: string;
  domain: string;
  /** Stored hint, falling back to the tenant slug so a label is never empty. */
  companyHint: string;
  jobCount: number;
  qualifiedReady: number;
  phRate: number;
  /** `last_evaluated_at`, in either spelling the lake stores. NULL = never judged. */
  lastEvaluatedAt: string | null;
  /** Real `lake_candidate_jobs` rows with `status = 'QUALIFIED_READY'`. */
  pendingQualified: number;
  jevRaw: string | null;
}

/** A selected tenant, with the label `evaluateTenant` needs, ready to re-probe. */
export type HeldTenantSeed = HeldTenantCandidateRow & { company: string };

export interface HeldTenantSelection {
  /** Re-probe now, oldest evaluation first. */
  selected: HeldTenantSeed[];
  /** Eligible but beyond the cap: still reported, never silently dropped. */
  candidates: HeldTenantSeed[];
  examined: number;
  /** Cohorts the production gate has already decided, or that cannot use a verdict. */
  gateExcluded: number;
  deferred: number;
  cap: number;
  pendingRowsBehindSelection: number;
  pendingRowsSelected: number;
  pendingRowsDeferred: number;
}

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Maps the read-only lake result onto the selector's own row shape. */
export function toHeldTenantRows(rows: Array<Record<string, any>>): HeldTenantCandidateRow[] {
  return rows.map((raw) => {
    const atsFamily = String(raw.ats_family ?? "");
    const tenantSlug = String(raw.tenant_slug ?? "");
    const sourceId = String(raw.source_id ?? "") || buildDiscoverySourceId(atsFamily, tenantSlug);
    return {
      sourceId,
      reviewStatus: String(raw.review_status ?? ""),
      atsFamily,
      tenantSlug,
      domain: String(raw.domain ?? ""),
      companyHint: String(raw.company_hint ?? "") || tenantSlug,
      jobCount: toCount(raw.job_count),
      qualifiedReady: toCount(raw.qualified_ready),
      phRate: Number.isFinite(Number(raw.ph_rate)) ? Number(raw.ph_rate) : 0,
      lastEvaluatedAt: raw.last_evaluated_at == null ? null : String(raw.last_evaluated_at),
      pendingQualified: toCount(raw.pending_qualified),
      jevRaw: raw.jev_raw == null ? null : String(raw.jev_raw),
    };
  });
}

/**
 * Comparable key for `last_evaluated_at`. NULL sorts first (never judged, therefore
 * oldest evidence) and both stored spellings — SQLite `datetime('now')` and ISO-8601 —
 * normalise to the same ordering, so a cap cannot be defeated by format.
 */
function evaluationAgeKey(value: string | null): number {
  if (value == null) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareOldestFirst(a: HeldTenantCandidateRow, b: HeldTenantCandidateRow): number {
  const ageA = evaluationAgeKey(a.lastEvaluatedAt);
  const ageB = evaluationAgeKey(b.lastEvaluatedAt);
  // `-Infinity` is the never-evaluated key, so it must be compared as a value and
  // not filtered out by a finiteness check on the difference.
  if (ageA !== ageB) return ageA < ageB ? -1 : 1;
  if (a.pendingQualified !== b.pendingQualified) return b.pendingQualified - a.pendingQualified;
  return a.sourceId.localeCompare(b.sourceId);
}

/**
 * Plans the bounded re-adjudication pass. Pure: no client, no database, no gateway,
 * no network, no clock.
 *
 * Gate consistency is delegated to `planJevReAdjudication`, which already asks the
 * real `decideAutoPublish` with no Jev fields and reports its own reason verbatim.
 * It is called with an unbounded budget so that the only bound applied here is this
 * function's own documented cap and ordering — the plan module's supply-first order
 * would starve small tenants under a cap, which is why the ordering is reapplied.
 */
export function selectHeldTenantsForReAdjudication(
  rows: HeldTenantCandidateRow[],
  cap: number,
): HeldTenantSelection {
  if (!Number.isInteger(cap) || cap < 0) {
    throw new RangeError(`cap must be a non-negative integer, received ${String(cap)}`);
  }

  // Idempotency predicate, kept identical to the `jev_raw IS NULL` filter in
  // `fetchHeldTenantCandidates`. It excludes both a parsed verdict and an
  // `attempt:` receipt, so the query and this function can never disagree about
  // which tenants still need a verdict. A cohort consulted while the Jev key was
  // unavailable therefore needs an owner to clear the column; that is fail-closed
  // and it is recorded, not silently retried every three hours.
  const unconsulted = rows.filter((row) => row.jevRaw == null);
  const alreadyConsulted = rows.length - unconsulted.length;

  const plan = planJevReAdjudication(
    unconsulted.map((row) => ({
      sourceId: row.sourceId,
      reviewStatus: row.reviewStatus,
      jobCount: row.jobCount,
      qualifiedReady: row.qualifiedReady,
      jevRaw: row.jevRaw,
      pendingQualified: row.pendingQualified,
    })),
    { maxPerRun: unconsulted.length, remainingDailyCalls: unconsulted.length },
  );

  const byId = new Map(unconsulted.map((row) => [row.sourceId, row]));
  const gateExcluded = alreadyConsulted + plan.candidates.filter((c) => c.disposition !== "PLANNED").length;
  const eligible = plan.candidates
    .filter((c) => c.disposition === "PLANNED")
    .map((c) => byId.get(c.sourceId))
    .filter((row): row is HeldTenantCandidateRow => row !== undefined)
    .sort(compareOldestFirst);

  const withLabel = (row: HeldTenantCandidateRow): HeldTenantSeed => ({
    ...row,
    company: row.companyHint || row.tenantSlug,
  });
  const selected = eligible.slice(0, cap).map(withLabel);
  const candidates = eligible.slice(cap).map(withLabel);
  const pendingRowsBehindSelection = eligible.reduce((sum, row) => sum + row.pendingQualified, 0);
  const pendingRowsSelected = selected.reduce((sum, row) => sum + row.pendingQualified, 0);

  return {
    selected,
    candidates,
    examined: rows.length,
    gateExcluded,
    deferred: candidates.length,
    cap,
    pendingRowsBehindSelection,
    pendingRowsSelected,
    pendingRowsDeferred: pendingRowsBehindSelection - pendingRowsSelected,
  };
}

/**
 * Read-only: the held-supply cohort, straight from the lake.
 *
 * No `LIMIT`. The query is served by `idx_lake_review` and returns tens of rows for a
 * 10k-row table; capping in memory instead is what guarantees a cohort the production
 * gate has already decided cannot occupy the whole page and starve the tenants behind
 * it. Verified against the live lake before it was written.
 */
export async function fetchHeldTenantCandidates(
  client: ReturnType<typeof getLakeClient>,
): Promise<HeldTenantCandidateRow[]> {
  const res = await client.execute({
    sql: `
      SELECT d.source_id, d.review_status, d.ats_family, d.tenant_slug, d.domain,
             d.company_hint, d.job_count, d.qualified_ready, d.ph_rate,
             d.last_evaluated_at, d.jev_raw,
             (SELECT COUNT(*) FROM lake_candidate_jobs c
               WHERE c.source_id = d.source_id
                 AND c.status = 'QUALIFIED_READY'
                 AND c.ph_eligibility IN ('eligible_verified', 'eligible_likely')
             ) AS pending_qualified
      FROM lake_ats_discovery d
      WHERE d.review_status = 'auto_approved' AND d.jev_raw IS NULL AND d.source_id <> '';
    `,
    args: [],
  });
  return toHeldTenantRows(res.rows as unknown as Array<Record<string, any>>);
}

/** Read-only observability only; a failed count must never block the miner. */
export async function countPendingQualifiedRows(client: ReturnType<typeof getLakeClient>): Promise<number> {
  const res = await client.execute({
    sql: `
      SELECT COUNT(*) AS cnt FROM lake_candidate_jobs
      WHERE status = 'QUALIFIED_READY'
        AND ph_eligibility IN ('eligible_verified', 'eligible_likely');
    `,
    args: [],
  });
  return toCount(res.rows[0]?.cnt);
}

// ── Table setup (portable: source_id is a plain column computed in code) ─────
export async function ensureDiscoveryTable(client: ReturnType<typeof getLakeClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lake_ats_discovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      company_hint TEXT,
      ats_family TEXT NOT NULL COLLATE NOCASE,
      tenant_slug TEXT NOT NULL,
      probe_url TEXT NOT NULL,
      job_count INTEGER NOT NULL DEFAULT 0,
      qualified_ready INTEGER NOT NULL DEFAULT 0,
      ph_rate REAL NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'shadow_monitor',
      admission_reason TEXT,
      jev_raw TEXT,
      source_id TEXT NOT NULL DEFAULT '',
      discovery_origin TEXT,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_evaluated_at TEXT,
      UNIQUE(ats_family, tenant_slug)
    );
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_lake_ats_review
    ON lake_ats_discovery(review_status);
  `);
}

// ── Domain & Candidate extraction ─────────────────────────────────────────────
export interface DiscoveryCandidate {
  domain: string;
  company: string;
  slug: string;
  family?: string;
}

export const AGGREGATOR_DOMAINS = new Set([
  "remotive.com", "weworkremotely.com", "remoteok.com", "realworkfromanywhere.com",
  "himalayas.app", "jobicy.com", "linkedin.com", "indeed.com", "glassdoor.com",
]);

/**
 * Pure extraction helper: maps raw (application_url, company) pairs into
 * deduped ATS candidates, prioritizing verified ATS tokens, known employer tokens,
 * and derived employer slugs from aggregator postings.
 */
export function extractDiscoveryCandidatesFromRows(
  rows: Array<{ application_url: string; company: string }>,
  limit: number
): DiscoveryCandidate[] {
  const candidates: DiscoveryCandidate[] = [];
  const seenFamilies = new Set<string>(); // "family:slug"
  const seenSlugs = new Set<string>(); // "slug"

  for (const row of rows) {
    if (!row.application_url || !row.company) continue;
    const url = row.application_url.trim();
    const company = row.company.trim();
    const normCompany = company.toLowerCase().trim();

    // 1. Known verified high-signal ATS tokens (e.g. GitLab, Camunda, Supabase, Hunt St)
    if (KNOWN_ATS_TOKENS[normCompany]) {
      const known = KNOWN_ATS_TOKENS[normCompany];
      const family = known.family.toLowerCase();
      const slug = known.token.toLowerCase();
      const key = `${family}:${slug}`;
      if (!seenFamilies.has(key)) {
        seenFamilies.add(key);
        seenSlugs.add(slug);
        candidates.push({
          domain: `${slug}.${family}`,
          company,
          slug,
          family,
        });
      }
      continue;
    }

    // 2. Direct ATS application links (e.g. jobs.lever.co/loadsmart or 20four7va.breezy.hr)
    const atsRef = extractAtsToken(url);
    if (atsRef) {
      const family = atsRef.platform.toLowerCase();
      const slug = atsRef.token.toLowerCase();
      const key = `${family}:${slug}`;
      if (!seenFamilies.has(key)) {
        seenFamilies.add(key);
        seenSlugs.add(slug);
        candidates.push({
          domain: hostOf(url),
          company,
          slug,
          family,
        });
      }
      continue;
    }

    // 3. Parse host
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      continue;
    }

    // 4. Candidate slugs from company name and domain
    const domainArg = AGGREGATOR_DOMAINS.has(host) ? null : host;
    const derivedSlugs = deriveCandidateSlugs(company, domainArg);

    for (const slug of derivedSlugs) {
      const normSlug = slug.toLowerCase();
      if (normSlug.length < 2) continue;
      // If this slug is already covered by a known/direct family, don't guess blindly
      if (seenSlugs.has(normSlug)) continue;
      const key = `*:${normSlug}`;
      if (!seenFamilies.has(key)) {
        seenFamilies.add(key);
        candidates.push({
          domain: domainArg || normSlug,
          company,
          slug: normSlug,
        });
      }
    }
  }

  return candidates.slice(0, limit);
}

export async function extractDiscoveryCandidates(
  client: ReturnType<typeof getLakeClient>,
  limit: number
): Promise<DiscoveryCandidate[]> {
  const res = await client.execute({
    sql: `
      SELECT application_url, company, MAX(sighting_count) as sc
      FROM lake_candidate_jobs
      WHERE application_url IS NOT NULL AND application_url != ''
        AND status IN ('QUALIFIED_READY', 'SYNCED_TO_D1')
      GROUP BY company
      ORDER BY MAX(sighting_count) DESC
      LIMIT ?;
    `,
    args: [limit * 4],
  });

  return extractDiscoveryCandidatesFromRows(
    res.rows as Array<{ application_url: string; company: string }>,
    limit
  );
}

export const extractDomains = extractDiscoveryCandidates;

// ── Shared paced probe + admission ────────────────────────────────────────────
export interface DiscoveryStats {
  domainsScanned: number;
  tenantsFound: number;
  admitted: number;
  shadowed: number;
  rejected: number;
  jobsIngested: number;
  skippedRateLimitedHost: number;
  /** INCIDENT-0410(u): held-supply tenants re-adjudicated this run. */
  heldTenantsReadjudicated?: number;
}

export function emptyDiscoveryStats(): DiscoveryStats {
  return { domainsScanned: 0, tenantsFound: 0, admitted: 0, shadowed: 0, rejected: 0, jobsIngested: 0, skippedRateLimitedHost: 0 };
}

export interface BulkSeed {
  companyName: string;
  atsFamily: string;
  tenantSlug: string;
  website?: string;
}

/** Probe one tenant URL with skip-on-429 host shielding. Returns null when skipped/failed. */
async function probeTenantJobs(
  template: AtsProbeTemplate,
  tenantSlug: string,
  rateLimitedHosts: Set<string>,
): Promise<{ jobs: ReturnType<AtsProbeTemplate["extractJobs"]>; probeUrl: string; rateLimited: boolean; status: number } | null> {
  const probeUrl = template.buildUrl(tenantSlug);
  const host = hostOf(probeUrl);
  if (rateLimitedHosts.has(host)) return null;
  try {
    const res = await fetch(probeUrl, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 429) {
      rateLimitedHosts.add(host);
      return { jobs: [], probeUrl, rateLimited: true, status: 429 };
    }
    if (!res.ok) return { jobs: [], probeUrl, rateLimited: false, status: res.status };
    const data = await res.json();
    return { jobs: template.extractJobs(data), probeUrl, rateLimited: false, status: res.status };
  } catch {
    return { jobs: [], probeUrl, rateLimited: false, status: 0 };
  }
}

function computeTenantMetrics(rawJobs: Array<{ title: string; description: string; locationRaw: string; tags: string[] }>): TenantMetrics {
  let qualifiedReady = 0, excluded = 0, ambiguous = 0;
  const categoryCount: Record<string, number> = {};
  for (const job of rawJobs) {
    const verdict = geoGate({ title: job.title, description: job.description, locationRaw: job.locationRaw, tags: job.tags });
    if (verdict.phEligibility === "eligible_verified" || verdict.phEligibility === "eligible_likely") qualifiedReady++;
    else if (verdict.phEligibility === "ineligible") excluded++;
    else ambiguous++;
    for (const tag of job.tags) categoryCount[tag] = (categoryCount[tag] || 0) + 1;
  }
  const phRate = rawJobs.length > 0 ? qualifiedReady / rawJobs.length : 0;
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  return { totalJobs: rawJobs.length, qualifiedReady, excluded, ambiguous, phRate, topCategories };
}

/** Evaluate + optionally ingest a single (family, slug) tenant. Shared by domain + bulk paths. */
async function evaluateTenant(
  client: ReturnType<typeof getLakeClient>,
  seed: { domain: string; company: string; slug: string; family?: string },
  template: AtsProbeTemplate,
  opts: { dryRun: boolean; rateLimitedHosts: Set<string>; probeDelayMs: number },
  stats: DiscoveryStats,
): Promise<void> {
  const probe = await probeTenantJobs(template, seed.slug, opts.rateLimitedHosts);
  await sleep(opts.probeDelayMs);
  if (!probe) return;
  if (probe.rateLimited) {
    stats.skippedRateLimitedHost++;
    console.log(`  ⏭ ${template.family}/${seed.slug}: host 429 — shielding remaining probes to ${hostOf(probe.probeUrl)} this run.`);
    return;
  }

  const familyLower = template.family.toLowerCase();
  const sourceId = buildDiscoverySourceId(familyLower, seed.slug);

  // Failure containment / dead board handling:
  // If the probe returned non-200 or fewer than MIN_JOBS_TO_EVALUATE:
  if (probe.status !== 200 || probe.jobs.length < MIN_JOBS_TO_EVALUATE) {
    // Only persist auto_rejected for explicit family seeds (bulk / reconciliation mode),
    // not blind ungrounded domain guesses in domain mode.
    if (seed.family) {
      const reason = probe.status !== 200
        ? `Dead or unresponsive board (HTTP ${probe.status})`
        : `Deterministic threshold: insufficient jobs (${probe.jobs.length} < ${MIN_JOBS_TO_EVALUATE})`;
      stats.rejected++;
      console.log(`  ✗ ${template.family}/${seed.slug}: ${reason}`);
      if (!opts.dryRun) {
        await client.execute({
          sql: `
            INSERT INTO lake_ats_discovery
              (domain, company_hint, ats_family, tenant_slug, probe_url, job_count,
               qualified_ready, ph_rate, review_status, admission_reason, source_id, last_evaluated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'auto_rejected', ?, ?, datetime('now'))
            ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET
              job_count = ?,
              qualified_ready = 0,
              ph_rate = 0,
              review_status = 'auto_rejected',
              admission_reason = ?,
              source_id = ?,
              last_evaluated_at = datetime('now');
          `,
          args: [
            seed.domain, seed.company, familyLower, seed.slug, probe.probeUrl,
            probe.jobs.length, reason, sourceId,
            probe.jobs.length, reason, sourceId,
          ],
        });
      }
    }
    return;
  }

  const rawJobs = probe.jobs;
  stats.tenantsFound++;
  console.log(`\n✓ Found: ${template.family}/${seed.slug} (${rawJobs.length} jobs) | company: ${seed.company}`);

  const metrics = computeTenantMetrics(rawJobs);
  console.log(`  geoGate: ${metrics.qualifiedReady}✓ ${metrics.excluded}✗ ${metrics.ambiguous}? | ph_rate=${(metrics.phRate * 100).toFixed(1)}%`);

  const decision = await decideAdmission(seed.slug, template.family, metrics);
  console.log(`  Jev decision: ${decision.verdict} (confidence=${decision.confidence}) | ${decision.reason}`);

  if (opts.dryRun) {
    console.log(`  [DryRun] Would set review_status='${toReviewStatus(decision.verdict)}' for ${sourceId}`);
    if (decision.verdict === "ADMIT") stats.admitted++;
    else if (decision.verdict === "SHADOW") stats.shadowed++;
    else stats.rejected++;
    return;
  }

  const reviewStatus = toReviewStatus(decision.verdict);
  await client.execute({
    sql: `
      INSERT INTO lake_ats_discovery
        (domain, company_hint, ats_family, tenant_slug, probe_url, job_count,
         qualified_ready, ph_rate, review_status, admission_reason, jev_raw, source_id, last_evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET
        job_count = ?,
        qualified_ready = ?,
        ph_rate = ?,
        review_status = ?,
        admission_reason = ?,
        jev_raw = ${JEV_RECEIPT_RETENTION_CLAUSE},
        source_id = ?,
        last_evaluated_at = datetime('now');
    `,
    args: [
      seed.domain, seed.company, familyLower, seed.slug, probe.probeUrl,
      rawJobs.length, metrics.qualifiedReady, metrics.phRate,
      reviewStatus, decision.reason, decision.jevRaw ?? null, sourceId,
      rawJobs.length, metrics.qualifiedReady, metrics.phRate,
      reviewStatus, decision.reason, sourceId,
    ],
  });

  if (decision.verdict === "ADMIT") {
    stats.admitted++;
    console.log(`  → ADMITTED. Ingesting ${rawJobs.length} jobs into lake_candidate_jobs...`);
    const rawPayload = JSON.stringify(rawJobs.slice(0, 20));
    const rawObsId = await storeRawObservation(client, {
      sourceId,
      sourcePlatform: `${template.family}/${seed.slug}`,
      fetchUrl: probe.probeUrl,
      httpStatus: 200,
      rawPayload,
    });
    const ingestStats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
    for (let i = 0; i < rawJobs.length; i++) {
      const job = rawJobs[i];
      try {
        await processAndRefineCandidate(
          client, rawObsId,
          {
            sourceId,
            sourcePlatform: `${template.family}/${seed.slug}`,
            sourceUrl: job.url,
            title: job.title,
            company: job.company || seed.company,
            category: job.tags[0] || "other",
            locationRaw: job.locationRaw || "Remote",
            description: job.description,
            applicationUrl: job.url,
            postedAt: job.postedAt,
            tags: job.tags,
          },
          ingestStats
        );
      } catch (err: any) {
        console.warn(`  ⚠️ Failed to ingest job "${job.title}":`, err?.message || String(err));
      }
      if (i > 0 && i % 25 === 0) {
        await sleep(40);
      }
    }
    await markRawProcessed(client, rawObsId);
    stats.jobsIngested += ingestStats.qualifiedReady;
    console.log(`  → Ingested: ${ingestStats.qualifiedReady} QUALIFIED_READY, ${ingestStats.excluded} excluded, ${ingestStats.duplicates} duplicates`);
  } else if (decision.verdict === "SHADOW") {
    stats.shadowed++;
    console.log(`  → SHADOW: stored in lake_ats_discovery, not yet synced to D1.`);
  } else {
    stats.rejected++;
    console.log(`  → REJECTED: ${decision.reason}`);
  }
}

function printDiscoverySummary(stats: DiscoveryStats): void {
  console.log("\n=======================================================");
  console.log("   AUTONOMOUS ATS DISCOVERY & ADMISSION SUMMARY        ");
  console.log("=======================================================");
  console.log(`Domains Scanned:               ${stats.domainsScanned}`);
  console.log(`Tenants Found (>= min jobs):   ${stats.tenantsFound}`);
  console.log(`AUTO-ADMITTED (ingested):      ${stats.admitted}`);
  console.log(`Shadow Monitored:              ${stats.shadowed}`);
  console.log(`Auto-Rejected:                 ${stats.rejected}`);
  console.log(`Jobs Ingested (QUALIFIED):     ${stats.jobsIngested}`);
  console.log(`Skipped (rate-limited host):   ${stats.skippedRateLimitedHost}`);
  console.log(`Held tenants re-adjudicated:   ${stats.heldTenantsReadjudicated ?? 0}`);
  console.log("-------------------------------------------------------");
  console.log("Auto-approved tenants publish on the next lake:sync when the Wilson bound clears.");
  console.log("No separate human approval. --hold-auto-approved is the kill switch.");
  console.log("=======================================================\n");
}

// ── Core admission engine ─────────────────────────────────────────────────────
/**
 * INCIDENT-0410(u): the second pass, over tenants that already hold supply.
 *
 * It re-probes each selected tenant through the *existing* `evaluateTenant` path, so
 * the probe, `geoGate`, `decideAdmission`, `mergeAdmissionDecision`, the Wilson floor,
 * the ambiguous band and the JEV_RECEIPT_RETENTION_CLAUSE persistence are all the
 * production code that already runs for every other tenant. The only thing this
 * function contributes is which tenants to re-probe.
 *
 * Three deliberate constraints:
 *   * `family` is omitted from the seed. That is what makes `evaluateTenant` persist
 *     an `auto_rejected` row for a dead or thin board, and a transient 3-job board
 *     must not demote a tenant that is holding 60 rows of supply today. With `family`
 *     omitted the pass can write a verdict and never a demotion it did not earn.
 *   * A tenant already probed by the discovery loop this run is skipped, so the pass
 *     never doubles a probe, a Jev call or an ingest for the same tenant.
 *   * A failure of one tenant is contained and the pass continues; the whole pass is
 *     also wrapped, because a re-adjudication failure must not lose the discovery run
 *     that already succeeded above it.
 */
export async function readjudicateHeldTenants(
  client: ReturnType<typeof getLakeClient>,
  options: {
    cap: number;
    dryRun: boolean;
    probeDelayMs: number;
    rateLimitedHosts: Set<string>;
    stats: DiscoveryStats;
    alreadyProbed?: ReadonlySet<string>;
    rows?: HeldTenantCandidateRow[];
  },
): Promise<HeldTenantSelection | null> {
  const { cap, dryRun, probeDelayMs, rateLimitedHosts, stats } = options;
  if (cap <= 0) return null;

  const rows = options.rows ?? await fetchHeldTenantCandidates(client);
  const selection = selectHeldTenantsForReAdjudication(rows, cap);
  const alreadyProbed = options.alreadyProbed ?? new Set<string>();

  const eligible = selection.selected.filter((tenant) => !alreadyProbed.has(tenant.sourceId));
  const skippedAlreadyProbed = selection.selected.length - eligible.length;
  stats.heldTenantsReadjudicated = eligible.length;

  const pendingQualified = await countPendingQualifiedRows(client).catch(() => null);
  console.log(
    `\n--- Held-supply re-adjudication (INCIDENT-0410(u)) ---\n` +
      `Auto-approved tenants with no recorded verdict: ${selection.examined - selection.gateExcluded}` +
      ` (of ${selection.examined} rows examined, ${selection.gateExcluded} already decided by the gate or holding nothing)\n` +
      `QUALIFIED_READY rows pending across the lake: ${pendingQualified ?? "UNKNOWN"}` +
      ` | behind the eligible cohort: ${selection.pendingRowsBehindSelection}\n` +
      `Selected this run: ${eligible.length} (cap ${cap}) holding ${selection.pendingRowsSelected} row(s);` +
      ` deferred: ${selection.deferred} holding ${selection.pendingRowsDeferred} row(s)` +
      `${skippedAlreadyProbed > 0 ? `; ${skippedAlreadyProbed} already probed by the discovery loop` : ""}\n` +
      `Verdicts travel only through the existing ambiguous band; no threshold, source list or gate is touched.`,
  );

  for (const tenant of eligible) {
    const template = probeTemplateForFamily(tenant.atsFamily);
    if (!template) {
      console.warn(`  ⏭ ${tenant.sourceId}: no probe template for family "${tenant.atsFamily}" — skipping.`);
      stats.heldTenantsReadjudicated = (stats.heldTenantsReadjudicated ?? 1) - 1;
      continue;
    }
    if (rateLimitedHosts.has(hostOf(template.buildUrl(tenant.tenantSlug)))) {
      stats.skippedRateLimitedHost++;
      stats.heldTenantsReadjudicated = (stats.heldTenantsReadjudicated ?? 1) - 1;
      console.log(`  ⏭ ${tenant.sourceId}: host ${hostOf(template.buildUrl(tenant.tenantSlug))} already rate-limited this run.`);
      continue;
    }
    console.log(`  ♻️ Re-adjudicating ${tenant.sourceId} (${tenant.pendingQualified} pending QUALIFIED_READY row(s), last judged ${tenant.lastEvaluatedAt ?? "never"}).`);
      try {
        await evaluateTenant(
          client,
          // `family` intentionally omitted — see the doc comment above.
          { domain: tenant.domain, company: tenant.company, slug: tenant.tenantSlug },
          template,
          { dryRun, rateLimitedHosts, probeDelayMs },
          stats,
        );
      } catch (err: any) {
      console.error(`  ❌ Error re-adjudicating ${tenant.sourceId}:`, err?.message || String(err));
    }
  }

  return selection;
}

export async function runDomainAtsDiscovery(options: {
  domainLimit?: number;
  dryRun?: boolean;
  probeDelayMs?: number;
  /** INCIDENT-0410(u): per-run cap; 0 disables the held-supply pass. */
  readjudicationLimit?: number;
} = {}) {
  const {
    domainLimit = 100,
    dryRun = false,
    probeDelayMs = INTER_PROBE_DELAY_MS_DEFAULT,
    readjudicationLimit = HELD_READJUDICATION_CAP_PER_RUN,
  } = options;
  const delay = clampProbeDelay(probeDelayMs);

  console.log("=== Autonomous ATS Tenant Discovery & Admission Engine ===");
  console.log(`Runner: v${DISCOVERY_VERSION} | DomainLimit: ${domainLimit} | DryRun: ${dryRun} | ProbeDelay: ${delay}ms | ReAdjudicationCap: ${readjudicationLimit}`);
  console.log(`Thresholds: ADMIT >= ${AUTO_APPROVE_PH_RATE * 100}% PH | REJECT < ${AUTO_REJECT_PH_RATE * 100}% PH\n`);

  const client = getLakeClient();
  if (!dryRun) await ensureDiscoveryTable(client);

  const stats = emptyDiscoveryStats();
  const rateLimitedHosts = new Set<string>();
  const candidates = await extractDiscoveryCandidates(client, domainLimit);
  console.log(`Extracted ${candidates.length} candidate ATS targets to probe.\n`);

  const alreadyProbed = new Set<string>();
  for (const candidate of candidates) {
    stats.domainsScanned++;
    const templates = candidate.family
      ? [probeTemplateForFamily(candidate.family)].filter((t): t is AtsProbeTemplate => t != null)
      : ATS_PROBE_TEMPLATES;

    for (const template of templates) {
      if (rateLimitedHosts.has(hostOf(template.buildUrl(candidate.slug)))) {
        stats.skippedRateLimitedHost++;
        continue;
      }
      alreadyProbed.add(buildDiscoverySourceId(template.family, candidate.slug));
      try {
        await evaluateTenant(
          client,
          { domain: candidate.domain, company: candidate.company, slug: candidate.slug, family: candidate.family },
          template,
          { dryRun, rateLimitedHosts, probeDelayMs: delay },
          stats
        );
      } catch (err: any) {
        console.error(`  ❌ Error evaluating ${template.family}/${candidate.slug}:`, err?.message || String(err));
      }
    }
  }

  try {
    await readjudicateHeldTenants(client, {
      cap: readjudicationLimit,
      dryRun,
      probeDelayMs: delay,
      rateLimitedHosts,
      stats,
      alreadyProbed,
    });
  } catch (err: any) {
    // Never lose a successful discovery run to a re-adjudication failure.
    console.error("  ❌ Held-supply re-adjudication pass failed; discovery results are unaffected:", err?.message || String(err));
  }

  printDiscoverySummary(stats);
  return stats;
}

/** Bulk path: probe an explicit seed list (family-pinned; no 4x fan-out). Used by bulk-ats-seed.ts. */
export async function runBulkAtsDiscovery(
  seeds: BulkSeed[],
  options: { dryRun?: boolean; probeDelayMs?: number; limit?: number } = {},
): Promise<DiscoveryStats> {
  const { dryRun = false, probeDelayMs = INTER_PROBE_DELAY_MS_DEFAULT, limit = seeds.length } = options;
  const delay = clampProbeDelay(probeDelayMs);
  const cohort = seeds.slice(0, Math.max(0, limit));

  console.log("=== Bulk ATS Seed Discovery (explicit cohort) ===");
  console.log(`Runner: v${DISCOVERY_VERSION} | Seeds: ${cohort.length} | DryRun: ${dryRun} | ProbeDelay: ${delay}ms\n`);

  const client = getLakeClient();
  if (!dryRun) await ensureDiscoveryTable(client);

  const stats = emptyDiscoveryStats();
  const rateLimitedHosts = new Set<string>();

  for (const seed of cohort) {
    const template = probeTemplateForFamily(seed.atsFamily);
    if (!template) {
      console.warn(`  ⚠ Unknown ATS family "${seed.atsFamily}" for ${seed.companyName} — skipping.`);
      continue;
    }
    stats.domainsScanned++;
    const domain = seed.website ?? `${seed.tenantSlug}.${template.family.toLowerCase()}`;
    try {
      await evaluateTenant(
        client,
        { domain, company: seed.companyName, slug: seed.tenantSlug, family: seed.atsFamily },
        template,
        { dryRun, rateLimitedHosts, probeDelayMs: delay },
        stats,
      );
    } catch (err: any) {
      console.error(`  ❌ Error evaluating ${seed.companyName} (${template.family}/${seed.tenantSlug}):`, err?.message || String(err));
    }
  }

  printDiscoverySummary(stats);
  return stats;
}

function toReviewStatus(verdict: "ADMIT" | "SHADOW" | "REJECT"): string {
  switch (verdict) {
    case "ADMIT": return "auto_approved";
    case "SHADOW": return "shadow_monitor";
    case "REJECT": return "auto_rejected";
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const domainLimit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 100;
  const delayArg = args.find((a) => a.startsWith("--delay-ms="));
  const probeDelayMs = delayArg ? parseInt(delayArg.split("=")[1], 10) : INTER_PROBE_DELAY_MS_DEFAULT;
  // `--readjudication-limit=0` disables the held-supply pass without a code change.
  const readjudicationArg = args.find((a) => a.startsWith("--readjudication-limit="));
  const readjudicationLimit = readjudicationArg
    ? parseInt(readjudicationArg.split("=")[1], 10)
    : HELD_READJUDICATION_CAP_PER_RUN;
  const seedsArg = args.find((a) => a.startsWith("--seeds="));

  (async () => {
    if (seedsArg) {
      const seedsPath = seedsArg.split("=").slice(1).join("=");
      const raw = await Bun.file(seedsPath).text();
      const seeds = JSON.parse(raw) as BulkSeed[];
      await runBulkAtsDiscovery(seeds, { dryRun, probeDelayMs, limit: domainLimit });
    } else {
      await runDomainAtsDiscovery({ domainLimit, dryRun, probeDelayMs, readjudicationLimit });
    }
  })().catch((err) => {
    console.error("ATS discovery failed:", err);
    process.exit(1);
  });
}
