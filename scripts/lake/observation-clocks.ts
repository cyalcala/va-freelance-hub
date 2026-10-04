/**
 * Idempotent Discovery & Publication Clock Reconciliation — scripts/lake/observation-clocks.ts
 *
 * The seam named by the merged v6.5 priority case G (`v65-priority-cases.test.ts`):
 * no pure function in the repository compares an original first-observation or
 * first-publication clock against a later rediscovery. The age clock lives inside
 * live writers, so the invariant "rediscovery does not reset age" is currently
 * unenforced in pure code and therefore untestable offline.
 *
 * MATH-09 (canonical identity and record linkage), MATH-10 (change detection and
 * cache invalidation), and the clock half of SSAE-09 (field-sensitive job delta,
 * exact bounded replay, idempotent supersession, original clocks preserved).
 *
 * Scope guards, all enforced below:
 * - Pure. No writer import, no DB client, no network, no production mutation.
 * - Every transition returns a NEW clock record; the input is never mutated.
 * - Unknown dates are retained as null and are never replaced with the processing
 *   time, the fetch time or "now" (CONSTITUTION 1.3 #2; ACCEPTED_PARAMETERS
 *   unknown_date_policy: retain-unknown-do-not-publish).
 * - `first_*` clocks are monotone: no later sighting, qualification, publication,
 *   withdrawal or replay can move an original clock forward or erase it. Replay and
 *   reactivation never create a first-publication clock and never reset freshness.
 * - Material-fact digests are computed independently of canonical identity, so an
 *   unchanged identity with changed geography/remote/link/date/safety is visible as
 *   a field-level delta rather than hidden behind a stable ID. An unchanged URL, a
 *   304 or an unchanged ID set is explicitly not proof of unchanged material facts.
 * - Nothing here grants publication authority, and no numeric publication gate is
 *   introduced. Restriction outranks any earlier positive fact and cannot be undone
 *   by replay.
 *
 * Run: bun run scripts/lake/observation-clocks.ts --help
 */

import { hashString } from "../../packages/scraper/contentHash";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Contract version; bump when field semantics change. */
export const OBSERVATION_CLOCKS_VERSION = 1;

/** Safety disposition of the material facts, not of the job's eligibility. */
export type SafetyDisposition = "clear" | "suspect" | "unsafe" | "unknown";

/** Remote disposition of the material facts. */
export type RemoteDisposition = "remote" | "onsite" | "hybrid" | "unknown";

/**
 * Material facts for one canonical job. Every field can change a public decision,
 * so every field participates in the material digest. `null` means "not known",
 * which is retained as unknown rather than defaulted.
 */
export interface JobMaterialFacts {
  title: string | null;
  location_raw: string | null;
  remote: RemoteDisposition;
  /** Digest of the description/body, not the description itself. */
  description_digest: string | null;
  apply_url: string | null;
  /** Original posting time as published by the source. Null is retained. */
  posted_at: string | null;
  safety: SafetyDisposition;
}

/** Material field names, in stable digest order. */
export const MATERIAL_FIELDS: ReadonlyArray<keyof JobMaterialFacts> = [
  "title",
  "location_raw",
  "remote",
  "description_digest",
  "apply_url",
  "posted_at",
  "safety",
];

/** Primary publication cohorts; reactivation is an event, never a cohort. */
export type PublicationCohort = "FRESH_DISCOVERY" | "REPLAY_RECOVERY" | "BACKLOG_IMPORT";

/** What a caller just did to the record. */
export type ClockTransition =
  | "INITIALIZED"
  | "SIGHTING"
  | "REDISCOVERY_UNCHANGED"
  | "MATERIAL_CHANGED"
  | "QUALIFIED"
  | "PUBLISHED"
  | "REACTIVATED"
  | "REPLAYED"
  | "RESTRICTED"
  | "RESTORED";

/** The distinct clocks one canonical job accumulates across sightings. */
export interface DiscoveryClocks {
  contract_version: number;
  /** Canonical identity hash; independent of material equality. */
  identity_hash: string;
  /** First time this identity was observed on any permitted path. Never moves forward. */
  first_observed_at: string | null;
  /** Most recent permitted sighting of this identity. */
  last_observed_at: string | null;
  /** First storage of this identity in the lake. Never moves forward. */
  first_ingested_at: string | null;
  /** First qualification decision of record. Never moves forward. */
  first_qualified_at: string | null;
  /** First governed public publication. Never moves forward; never recreated. */
  first_published_at: string | null;
  /** Most recent governed public publication, including reactivations. */
  last_published_at: string | null;
  /** Cohort of the FIRST publication. Locked once set; a later receipt cannot relabel it. */
  first_publication_cohort: PublicationCohort | null;
  /** Accepted sighting events folded in. Monotone; never decremented or deduplicated. */
  sighting_count: number;
  /** Distinct complete material states folded in. Increments only on a material change. */
  material_revision: number;
  /** Last complete material fact set retained for exact field-level deltas. */
  material_facts: JobMaterialFacts | null;
  /** Digest of the last complete material fact set. */
  material_digest: string | null;
  /** Material fields that were unknown at the last complete observation. */
  unknown_material_fields: string[];
  /** Set when the current facts are restricted; outranks any earlier positive fact. */
  restricted_at: string | null;
  restricted_reason: string | null;
  /**
   * Monotone count of restrictions ever applied. Retained after an authorised
   * restoration so a later publication of an already-published item is classified
   * as a REACTIVATION rather than silently treated as a first publication.
   */
  restricted_count: number;
  /** Last transition applied; auditable without a writer. */
  last_transition: ClockTransition;
  last_transition_at: string | null;
}

/** One permitted sighting of one canonical job. */
export interface SightingEvent {
  observed_at: string;
  /** Identity hash recomputed by the caller from the current canonical inputs. */
  identity_hash: string;
  /** Complete material facts for this sighting. */
  facts: JobMaterialFacts;
}

/** One qualification decision of record. */
export interface QualificationEvent {
  qualified_at: string;
}

/** One governed publication receipt. */
export interface PublicationEvent {
  published_at: string;
  cohort: PublicationCohort;
}

/** A restriction: withdrawal, opt-out, safety or a restrictive rule change. */
export interface RestrictionEvent {
  restricted_at: string;
  reason: string;
}

/**
 * An authorised restoration of a restricted record. Restoration is an explicit,
 * referenced decision: it is never implied by a later sighting and never restores
 * the original publication cohort or any erased clock (there are none to restore).
 */
export interface RestorationEvent {
  restored_at: string;
  /** Reference to the authority that permitted the restoration. Never empty. */
  authority_ref: string;
}

/** Result of a clock transition. */
export interface ClockResult {
  ok: boolean;
  clocks: DiscoveryClocks;
  transition: ClockTransition;
  /** Material fields that differ from the previous complete fact set. */
  changed_fields: string[];
  /**
   * True when a cached positive decision may no longer be reused. The caller must
   * re-evaluate through the governed path; this module never decides eligibility.
   */
  requires_reevaluation: boolean;
  /** Human-readable reasons, empty when ok. */
  errors: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function ms(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Earliest of two optional clocks; null is retained, never replaced. */
function earliest(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return ms(a)! <= ms(b)! ? a : b;
}

/** Latest of two optional clocks; null is retained. */
function latest(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return ms(a)! >= ms(b)! ? a : b;
}

/** Material fields that are not known in a fact set. */
export function unknownMaterialFields(facts: JobMaterialFacts): string[] {
  return MATERIAL_FIELDS.filter((field) => {
    const value = facts[field];
    return value === null || value === "unknown";
  });
}

/**
 * Length-prefixed, order-stable material digest.
 *
 * Deliberately independent of `computeFingerprint`: identity answers "is this the
 * same vacancy?", material equality answers "is every decision-relevant field the
 * same?". A length prefix per field removes separator ambiguity, so distinct fact
 * sets cannot collide by concatenation (the gap recorded as F-W2-2 for
 * `toContentHash`, which encodes no title/URL split point).
 */
export function materialDigest(facts: JobMaterialFacts): string {
  const parts = MATERIAL_FIELDS.map((field) => {
    const value = facts[field];
    const encoded = value === null ? "\u0000null" : `${value.length}:${value}`;
    return `${field.length}:${field}=${encoded}`;
  });
  return hashString(parts.join("|"));
}

/** Names of material fields whose values differ between two complete fact sets. */
export function materialDelta(
  previous: JobMaterialFacts,
  next: JobMaterialFacts,
): string[] {
  return MATERIAL_FIELDS.filter((field) => previous[field] !== next[field]);
}

// ─── Construction ─────────────────────────────────────────────────────────────

/** An empty clock record for a canonical identity. */
export function emptyClocks(identityHash: string): DiscoveryClocks {
  return {
    contract_version: OBSERVATION_CLOCKS_VERSION,
    identity_hash: identityHash,
    first_observed_at: null,
    last_observed_at: null,
    first_ingested_at: null,
    first_qualified_at: null,
    first_published_at: null,
    last_published_at: null,
    first_publication_cohort: null,
    sighting_count: 0,
    material_revision: 0,
    material_facts: null,
    material_digest: null,
    unknown_material_fields: [],
    restricted_at: null,
    restricted_reason: null,
    restricted_count: 0,
    last_transition: "INITIALIZED",
    last_transition_at: null,
  };
}

// ─── Transitions ──────────────────────────────────────────────────────────────

function fail(
  clocks: DiscoveryClocks,
  transition: ClockTransition,
  errors: string[],
): ClockResult {
  return {
    ok: false,
    clocks,
    transition,
    changed_fields: [],
    requires_reevaluation: false,
    errors,
  };
}

/**
 * Fold one permitted sighting in.
 *
 * - The first sighting establishes the baseline material facts and the original
 *   observation/storage clocks.
 * - A repeated sighting with an identical complete fact set is idempotent: only
 *   `last_observed_at` and the sighting counter advance, no original clock moves,
 *   `material_revision` does not increment, and no re-evaluation is requested. Age
 *   stays anchored at `first_observed_at`, so rediscovery cannot reset it.
 * - A sighting under a DIFFERENT identity hash is refused: an identity change is a
 *   supersession decision about the canonical record, not a sighting of it.
 * - Changed material facts advance `material_revision`, report the exact
 *   `changed_fields` and set `requires_reevaluation`, even when the identity and the
 *   apply URL are unchanged.
 * - Material facts that are unknown after a sighting are retained as unknown and
 *   reported, so the caller reacquires under FULL instead of storing a guess.
 */
export function applySighting(
  clocks: DiscoveryClocks,
  event: SightingEvent,
): ClockResult {
  if (!isIso(event.observed_at)) {
    return fail(clocks, "SIGHTING", ["observed_at must be a valid ISO8601 string"]);
  }
  if (event.identity_hash !== clocks.identity_hash) {
    return fail(clocks, "SIGHTING", [
      `identity_hash mismatch: record holds ${clocks.identity_hash}, sighting carries ${event.identity_hash}`,
    ]);
  }

  const digest = materialDigest(event.facts);
  const unknown = unknownMaterialFields(event.facts);
  const isBaseline = clocks.material_digest === null;
  const unchanged = !isBaseline && clocks.material_digest === digest;

  const base: DiscoveryClocks = {
    ...clocks,
    first_observed_at: earliest(clocks.first_observed_at, event.observed_at),
    last_observed_at: latest(clocks.last_observed_at, event.observed_at),
    first_ingested_at: earliest(clocks.first_ingested_at, event.observed_at),
    sighting_count: clocks.sighting_count + 1,
    last_transition_at: event.observed_at,
  };

  if (isBaseline) {
    // First complete observation establishes the baseline. There is no earlier
    // decision, so nothing cached needs invalidating and no field "changed".
    return {
      ok: true,
      clocks: {
        ...base,
        material_revision: 1,
        material_facts: event.facts,
        material_digest: digest,
        unknown_material_fields: unknown,
        last_transition: "SIGHTING",
      },
      transition: "SIGHTING",
      changed_fields: [],
      requires_reevaluation: false,
      errors: [],
    };
  }

  if (unchanged) {
    // Idempotent rediscovery: no original clock moves, no new material revision,
    // no re-evaluation. This is the case the merged v6.5 case G test needed.
    return {
      ok: true,
      clocks: { ...base, last_transition: "REDISCOVERY_UNCHANGED" },
      transition: "REDISCOVERY_UNCHANGED",
      changed_fields: [],
      requires_reevaluation: false,
      errors: [],
    };
  }

  // The baseline branch returned above, so a retained fact set always exists here.
  const changed_fields = materialDelta(clocks.material_facts!, event.facts);

  return {
    ok: true,
    clocks: {
      ...base,
      material_revision: clocks.material_revision + 1,
      material_facts: event.facts,
      material_digest: digest,
      unknown_material_fields: unknown,
      last_transition: "MATERIAL_CHANGED",
    },
    transition: "MATERIAL_CHANGED",
    changed_fields,
    requires_reevaluation: true,
    errors: [],
  };
}

/**
 * Record a qualification decision of record. The first qualification clock is
 * preserved; a later qualification never moves it and never clears it.
 */
export function applyQualification(
  clocks: DiscoveryClocks,
  event: QualificationEvent,
): ClockResult {
  if (!isIso(event.qualified_at)) {
    return fail(clocks, "QUALIFIED", ["qualified_at must be a valid ISO8601 string"]);
  }
  return {
    ok: true,
    clocks: {
      ...clocks,
      first_qualified_at: earliest(clocks.first_qualified_at, event.qualified_at),
      last_transition: "QUALIFIED",
      last_transition_at: event.qualified_at,
    },
    transition: "QUALIFIED",
    changed_fields: [],
    requires_reevaluation: false,
    errors: [],
  };
}

/**
 * Record a governed publication receipt.
 *
 * - The first publication clock and its cohort are set once and then locked. A later
 *   receipt for the same canonical job is REPLAYED (an unpublished item recovered by
 *   replay, or the first publication of a backlog item) or REACTIVATED (previously
 *   withdrawn, published again). Neither creates a new first-publication clock,
 *   neither relabels the original cohort and neither resets freshness.
 * - A restricted record refuses new positive publication facts here; the caller must
 *   clear the restriction through the governed path first.
 */
export function applyPublication(
  clocks: DiscoveryClocks,
  event: PublicationEvent,
): ClockResult {
  if (!isIso(event.published_at)) {
    return fail(clocks, "PUBLISHED", ["published_at must be a valid ISO8601 string"]);
  }
  if (clocks.restricted_at !== null) {
    return fail(clocks, "PUBLISHED", [
      `record is restricted since ${clocks.restricted_at}: ${clocks.restricted_reason ?? "unspecified"}`,
    ]);
  }

  if (clocks.first_published_at === null) {
    return {
      ok: true,
      clocks: {
        ...clocks,
        first_published_at: event.published_at,
        last_published_at: latest(clocks.last_published_at, event.published_at),
        first_publication_cohort: event.cohort,
        last_transition: "PUBLISHED",
        last_transition_at: event.published_at,
      },
      transition: "PUBLISHED",
      changed_fields: [],
      requires_reevaluation: false,
      errors: [],
    };
  }

  // A later receipt for an already-published identity is a reactivation when the
  // record was restricted at least once, and a replayed repeat otherwise. Neither
  // is a first publication and neither may create a first-publication clock.
  const reactivation = clocks.restricted_count > 0;
  return {
    ok: true,
    clocks: {
      ...clocks,
      // first_published_at and first_publication_cohort are deliberately untouched.
      last_published_at: latest(clocks.last_published_at, event.published_at),
      last_transition: reactivation ? "REACTIVATED" : "REPLAYED",
      last_transition_at: event.published_at,
    },
    transition: reactivation ? "REACTIVATED" : "REPLAYED",
    changed_fields: [],
    requires_reevaluation: false,
    errors: [],
  };
}

/**
 * Record a restriction (withdrawal, opt-out, safety or a restrictive rule change).
 *
 * Restriction is outranked by nothing except a later, explicitly authorised
 * restoration, which is a caller decision outside this module. First-publication
 * clocks and the original cohort are RETAINED: a withdrawal hides a job from the
 * serving surface, it does not rewrite the fact that the job was first published,
 * and replay must not restore it.
 */
export function applyRestriction(
  clocks: DiscoveryClocks,
  event: RestrictionEvent,
): ClockResult {
  if (!isIso(event.restricted_at)) {
    return fail(clocks, "RESTRICTED", ["restricted_at must be a valid ISO8601 string"]);
  }
  if (typeof event.reason !== "string" || event.reason.length === 0) {
    return fail(clocks, "RESTRICTED", ["reason must be a non-empty string"]);
  }
  if (clocks.restricted_at !== null) {
    return fail(clocks, "RESTRICTED", [
      `record is already restricted since ${clocks.restricted_at}: ${clocks.restricted_reason}`,
    ]);
  }
  return {
    ok: true,
    clocks: {
      ...clocks,
      restricted_at: event.restricted_at,
      restricted_reason: event.reason,
      restricted_count: clocks.restricted_count + 1,
      last_transition: "RESTRICTED",
      last_transition_at: event.restricted_at,
    },
    transition: "RESTRICTED",
    changed_fields: [],
    requires_reevaluation: true,
    errors: [],
  };
}

/**
 * Clear a restriction through an explicit, referenced authority.
 *
 * This is the only way a restricted record becomes publishable again, and it is not
 * reachable from a sighting or a replay. All original evidence — first observation,
 * first storage, first qualification, first publication and its cohort — is
 * RETAINED, and `restricted_count` is not decremented, so the next publication of an
 * already-published item is still classified as a reactivation.
 */
export function clearRestriction(
  clocks: DiscoveryClocks,
  event: RestorationEvent,
): ClockResult {
  if (!isIso(event.restored_at)) {
    return fail(clocks, "RESTORED", ["restored_at must be a valid ISO8601 string"]);
  }
  if (typeof event.authority_ref !== "string" || event.authority_ref.length === 0) {
    return fail(clocks, "RESTORED", ["authority_ref must be a non-empty string"]);
  }
  if (clocks.restricted_at === null) {
    return fail(clocks, "RESTORED", ["record is not restricted"]);
  }
  return {
    ok: true,
    clocks: {
      ...clocks,
      restricted_at: null,
      restricted_reason: null,
      last_transition: "RESTORED",
      last_transition_at: event.restored_at,
    },
    transition: "RESTORED",
    changed_fields: [],
    requires_reevaluation: true,
    errors: [],
  };
}

// ─── Age and coverage ─────────────────────────────────────────────────────────

/**
 * Age of the canonical job in whole days, anchored at the FIRST observation (or the
 * first publication when that is what is being aged). A rediscovery cannot move the
 * anchor, so it cannot reset age. Returns null when the anchor is unknown; there is
 * no fallback to the processing time.
 */
export function observationAgeDays(
  clocks: DiscoveryClocks,
  nowTimestamp: string,
  anchor: "first_observed" | "first_published" = "first_observed",
): number | null {
  if (!isIso(nowTimestamp)) return null;
  const anchorValue = anchor === "first_observed" ? clocks.first_observed_at : clocks.first_published_at;
  const anchorMs = ms(anchorValue);
  const nowMs = ms(nowTimestamp);
  if (anchorMs === null || nowMs === null) return null;
  return Math.floor((nowMs - anchorMs) / 86_400_000);
}

/**
 * Days since the last sighting. A source that goes quiet ages here even though the
 * original observation age is preserved, so dormancy stays visible without erasing
 * the original clock.
 */
export function stalenessDays(clocks: DiscoveryClocks, nowTimestamp: string): number | null {
  if (!isIso(nowTimestamp)) return null;
  const lastMs = ms(clocks.last_observed_at);
  const nowMs = ms(nowTimestamp);
  if (lastMs === null || nowMs === null) return null;
  return Math.floor((nowMs - lastMs) / 86_400_000);
}

/**
 * Complete-snapshot proof for one canonical job: whether the retained material facts
 * are sufficient to re-evaluate a decision without a FULL reacquisition. Missing
 * material fields require reacquisition; they are never guessed.
 */
export function checkReplayCoverage(clocks: DiscoveryClocks): {
  complete: boolean;
  missing_material_fields: string[];
  requires_full_reacquisition: boolean;
} {
  const missing = [...clocks.unknown_material_fields];
  return {
    complete: missing.length === 0,
    missing_material_fields: missing,
    requires_full_reacquisition: missing.length > 0,
  };
}

/** Current serving-surface state of this clock record. Not a publication decision. */
export function isCurrentlyPublic(clocks: DiscoveryClocks): boolean {
  return clocks.restricted_at === null;
}