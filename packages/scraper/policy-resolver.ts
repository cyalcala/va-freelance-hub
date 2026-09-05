/**
 * SP-04 — Behavior-preserving policy resolver (ADR-006).
 *
 * One typed interface that resolves a source's compliance + operational state
 * either from the additive `source_registry` / `provider_profiles` rows or, when
 * no registry row exists (current production: empty), from the hard-coded
 * static + ATS policies that remain the explicit rollback adapter.
 *
 * Invariants preserved:
 * - Unknown providers/tokens never publish (candidate + needs_review, not enabled).
 * - Only compliance `allowed` or `conditional` may enter shadow/canary/active
 *   (CHECK enforced in migration 0036 and re-asserted here).
 * - Exact-six robots enforcement literal lives in `scrape.ts`; this module only
 *   mirrors its selector for policy parity tests.
 * - Hard-coded fallbacks stay byte-identical to `sources.ts` + scrape.ts
 *   `ATS_PLATFORM_POLICIES` / `ATS_TOKEN_POLICIES` until registry rollout is
 *   accepted; rollback is to ignore registry rows (Map empty) or revert the
 *   single import in `scrape.ts`.
 */

import { sources as staticSources } from "./sources";
import { isAutoPaused, autoPauseNote } from "./pause";
import type { ComplianceStatus, Source } from "./sources";

// ─── Registry state vocabulary (ADR-006 §2, SP-03 CHECKs) ────────────────────

export type RegistryComplianceState =
  | "needs_review"
  | "allowed"
  | "conditional"
  | "awaiting_permission"
  | "blocked"
  | "deprecated";

export type RegistryOperationalState =
  | "candidate"
  | "shadow"
  | "canary"
  | "active"
  | "review_due"
  | "degraded"
  | "quarantined"
  | "paused"
  | "retired";

export interface RegistryPolicyRow {
  sourceId: string;
  providerId: string;
  complianceState: RegistryComplianceState;
  operationalState: RegistryOperationalState;
  optOut: boolean | number;
  /** SP-23: required positive ceiling whenever operationalState is canary. */
  canaryMaxNewItemsPerTick?: number | null;
  endpointUrl?: string;
  displayName?: string;
  companyToken?: string | null;
}

// ─── Resolved view (what the scraper loop consumes) ─────────────────────────

export interface ResolvedPolicy {
  sourceId: string;
  /** Canonical compliance state (registry vocab; legacy "paused" maps to "blocked"). */
  complianceState: RegistryComplianceState;
  operationalState: RegistryOperationalState;
  /** Whether the source should be fetched (cadence/robots still apply). */
  enabled: boolean;
  /** Whether fetched items may be published (insert path). */
  publishable: boolean;
  /** Human-auditable reason (mirrors complianceNotes). */
  complianceNotes: string;
  optOut: boolean;
  /** "static" | "ats" | "unknown" — for diagnostics, never for allow. */
  kind: "static" | "ats" | "unknown";
  /** Source name for event attribution. */
  sourceName: string;
  /** Robots mode derived from the exact-six literal. */
  robotsMode: "enforce" | "observe";
}

// ─── Exact-six robots literal (mirrored, not authoritative) ─────────────────
// The authoritative literal lives in `apps/web/src/pages/api/cron/scrape.ts`
// and is guardrailed by `check-production-guardrails.ts`. This mirror is used
// only for parity tests and policy diagnostics; production still calls
// `robotsModeForSourceId` in scrape.ts. Keep in sync.

export const ROBOTS_ENFORCE_SOURCE_IDS = new Set<string>([
  "we-work-remotely",
  "remotive",
  "real-work-from-anywhere",
  "remote-ok",
  "jobicy-admin-support-apac",
  "jobicy-supporting-apac",
]);

export function robotsModeForSourceIdMirror(sourceId: string): "enforce" | "observe" {
  return ROBOTS_ENFORCE_SOURCE_IDS.has(sourceId) ? "enforce" : "observe";
}

// ─── Hard-coded fallback (rollback adapter) — byte-identical to current code ─

// Static sources are imported from ./sources; no duplication needed beyond the
// map built below.

type AtsPlatform = "lever" | "greenhouse" | "workable" | "breezy" | "ashby";

interface AtsPlatformPolicy {
  enabled: boolean;
  complianceStatus: ComplianceStatus;
  complianceNotes: string;
}

// Exact copy of `ATS_PLATFORM_POLICIES` in `scrape.ts` (2026-08-29).
export const ATS_PLATFORM_POLICIES: Record<AtsPlatform, AtsPlatformPolicy> = {
  ashby: {
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

const ASHBY_PARTNER_ACCESS_PAUSE_NOTE =
  "Paused 2026-08-28: Ashby's public posting API is documented for an organization's own careers page; Ashby documents a Dedicated Partner Job Feed for partner ingestion with customer opt-in. No partner feed or permission is recorded, and robots HTTP 401 remains unknown. Keep paused; do not treat robots HTTP 401 as allow.";

const GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE =
  "Paused 2026-08-28: Greenhouse explicitly makes Job Board GET data public without authentication and frames it for an organization's own career site, but its docs do not expressly address recurring third-party aggregation or republishing. Under project fail-closed policy, keep paused pending explicit provider terms, clarification, customer permission, or an approved integration. Public readability is not aggregation authority.";

const BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE =
  "Paused 2026-08-28: Breezy's documented v3 API requires authorization, while the career-site /json route used here is absent from the current official API index. Its integration authority is undocumented and no explicit permission is recorded. Under project fail-closed policy, keep paused pending provider terms, clarification, customer permission, or an approved integration. Public readability is not aggregation authority.";

// Exact copy of `ATS_TOKEN_POLICIES` in `scrape.ts`.
export const ATS_TOKEN_POLICIES: Record<string, AtsPlatformPolicy> = {
  "ashby:supabase": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: ASHBY_PARTNER_ACCESS_PAUSE_NOTE,
  },
  "ashby:camunda": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: ASHBY_PARTNER_ACCESS_PAUSE_NOTE,
  },
  "ashby:tremendous": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: ASHBY_PARTNER_ACCESS_PAUSE_NOTE,
  },
  "ashby:amplify": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: ASHBY_PARTNER_ACCESS_PAUSE_NOTE,
  },
  "ashby:ashby": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: ASHBY_PARTNER_ACCESS_PAUSE_NOTE,
  },
  "greenhouse:grafanalabs": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "greenhouse:nearform": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "greenhouse:gitlab": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "greenhouse:ghost": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "greenhouse:remotecom": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: GREENHOUSE_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "breezy:20four7va": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "breezy:sourcefit": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "breezy:vaaphilippines-recruitment": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
  "breezy:time-etc": {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: BREEZY_INTEGRATION_AUTHORITY_PAUSE_NOTE,
  },
};

// Static source index for fallback (includes auto-pause overlay).
const staticSourceById = new Map<string, Source>(staticSources.map((s) => [s.id, s]));

// Sentinel auto-pauses overlay (mirrors sources.ts effectiveSources).
function staticFallbackForId(sourceId: string): { source: Source | undefined; isAutoPaused: boolean; note: string | null } {
  const source = staticSourceById.get(sourceId);
  if (!source) return { source: undefined, isAutoPaused: false, note: null };
  const paused = isAutoPaused(sourceId);
  if (paused) {
    const note = autoPauseNote(sourceId);
    return { source, isAutoPaused: true, note };
  }
  return { source, isAutoPaused: false, note: null };
}

function toRegistryCompliance(status: ComplianceStatus): RegistryComplianceState {
  switch (status) {
    case "allowed":
      return "allowed";
    case "needs_review":
      return "needs_review";
    case "paused":
      return "blocked";
    case "deprecated":
      return "deprecated";
    default:
      return "needs_review";
  }
}

function atsFallbackPolicy(sourceKey: string): AtsPlatformPolicy | null {
  if (sourceKey in ATS_TOKEN_POLICIES) return ATS_TOKEN_POLICIES[sourceKey];
  const platform = sourceKey.split(":")[0] as AtsPlatform;
  if (platform && platform in ATS_PLATFORM_POLICIES) return ATS_PLATFORM_POLICIES[platform];
  return null;
}

// ─── Publishability (CHECK mirror) ──────────────────────────────────────────

export function isShadowCanaryActive(op: RegistryOperationalState): boolean {
  return op === "shadow" || op === "canary" || op === "active";
}

export function isComplianceAllowsPublish(compliance: RegistryComplianceState): boolean {
  return compliance === "allowed" || compliance === "conditional";
}

export function isPublishable(compliance: RegistryComplianceState, operational: RegistryOperationalState, optOut: boolean): boolean {
  if (optOut) return false;
  if (!isComplianceAllowsPublish(compliance)) return false;
  // Shadow is bounded fetch without publish (ADR-006 §6). Canary/active publish.
  if (operational === "shadow") return false;
  if (operational === "canary" || operational === "active") return true;
  return false;
}

/**
 * A publication decision expressed with enough information for a cap-aware
 * writer. This is deliberately separate from ResolvedPolicy so the exact-six
 * fallback object remains byte-identical while the registry overlay gains a
 * non-active-equivalent canary contract.
 *
 * `mode: capped` is not permission for the legacy boolean scrape loop to
 * write. That loop has no atomic per-tick reservation, so `isEnabledForFetch`
 * refuses canaries until the dedicated SP-23 gateway consumes this envelope
 * together with decideCanaryPublication().
 */
export type PublicationEnvelope =
  | {
      mode: "unlimited";
      maxNewItemsPerTick: null;
      reason: null;
    }
  | {
      mode: "capped";
      maxNewItemsPerTick: number;
      reason: null;
    }
  | {
      mode: "blocked";
      maxNewItemsPerTick: 0;
      reason: "policy is not publishable" | "canary requires a positive per-tick publication cap";
    };

function isPositiveInteger(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Resolve the distinct public exposure envelope for a resolved registry policy.
 * Active sources remain uncapped; every canary must carry an explicit positive
 * cap. Missing, zero, fractional, negative, or non-safe caps all fail closed.
 */
export function resolvePublicationEnvelope(
  policy: Pick<ResolvedPolicy, "publishable" | "operationalState">,
  registryRow?: Pick<RegistryPolicyRow, "canaryMaxNewItemsPerTick"> | null,
): PublicationEnvelope {
  if (!policy.publishable) {
    return { mode: "blocked", maxNewItemsPerTick: 0, reason: "policy is not publishable" };
  }
  if (policy.operationalState === "active") {
    return { mode: "unlimited", maxNewItemsPerTick: null, reason: null };
  }
  if (policy.operationalState === "canary") {
    const cap = registryRow?.canaryMaxNewItemsPerTick;
    if (!isPositiveInteger(cap)) {
      return {
        mode: "blocked",
        maxNewItemsPerTick: 0,
        reason: "canary requires a positive per-tick publication cap",
      };
    }
    return { mode: "capped", maxNewItemsPerTick: cap, reason: null };
  }
  return { mode: "blocked", maxNewItemsPerTick: 0, reason: "policy is not publishable" };
}

export function isEnabledForFetch(compliance: RegistryComplianceState, operational: RegistryOperationalState, optOut: boolean): boolean {
  // The legacy hot path has only a boolean and cannot reserve/enforce a
  // per-tick canary cap. It may continue to fetch active sources, but a canary
  // is fail-closed until the future single publication gateway consumes the
  // SP-23 envelope and transition decision. This protects against a registry
  // row being inserted before that gateway is live.
  return operational === "active" && isPublishable(compliance, operational, optOut);
}

// ─── Fallback resolver (hard-coded, rollback adapter) ───────────────────────

export function fallbackPolicy(sourceId: string): ResolvedPolicy {
  // 1. Static RSS/HTML/JSON source?
  const { source: staticSource, isAutoPaused: autoPaused, note: autoNote } = staticFallbackForId(sourceId);
  if (staticSource) {
    if (autoPaused) {
      return {
        sourceId,
        complianceState: "blocked",
        operationalState: "paused",
        enabled: false,
        publishable: false,
        complianceNotes: autoNote ?? `Auto-paused by sentinel-bot.`,
        optOut: false,
        kind: "static",
        sourceName: staticSource.name,
        robotsMode: robotsModeForSourceIdMirror(sourceId),
      };
    }
    const compliance = toRegistryCompliance(staticSource.complianceStatus);
    const isAllowed = staticSource.complianceStatus === "allowed";
    return {
      sourceId,
      complianceState: compliance,
      operationalState: isAllowed ? "active" : compliance === "needs_review" ? "candidate" : "paused",
      enabled: isAllowed,
      publishable: isAllowed,
      complianceNotes: staticSource.complianceNotes,
      optOut: false,
      kind: "static",
      sourceName: staticSource.name,
      robotsMode: robotsModeForSourceIdMirror(sourceId),
    };
  }

  // 2. ATS platform:token ?
  if (sourceId.includes(":")) {
    // Auto-pause first (mirrors scrape.ts atsPlatformPolicy).
    if (isAutoPaused(sourceId)) {
      const note = autoPauseNote(sourceId);
      return {
        sourceId,
        complianceState: "blocked",
        operationalState: "paused",
        enabled: false,
        publishable: false,
        complianceNotes: note ?? `Auto-paused by sentinel-bot.`,
        optOut: false,
        kind: "ats",
        sourceName: sourceId,
        robotsMode: robotsModeForSourceIdMirror(sourceId),
      };
    }
    const policy = atsFallbackPolicy(sourceId);
    if (policy) {
      const compliance = toRegistryCompliance(policy.complianceStatus);
      // All current ATS policies are enabled=false -> blocked/paused, not fetchable.
      const enabled = policy.enabled;
      return {
        sourceId,
        complianceState: compliance,
        operationalState: enabled ? "active" : "paused",
        enabled,
        publishable: false,
        complianceNotes: policy.complianceNotes,
        optOut: false,
        kind: "ats",
        sourceName: sourceId,
        robotsMode: robotsModeForSourceIdMirror(sourceId),
      };
    }
    // Unknown ATS token on known platform is still paused (platform default).
    const platform = sourceId.split(":")[0] as AtsPlatform;
    if (platform in ATS_PLATFORM_POLICIES) {
      const p = ATS_PLATFORM_POLICIES[platform];
      return {
        sourceId,
        complianceState: toRegistryCompliance(p.complianceStatus),
        operationalState: "paused",
        enabled: false,
        publishable: false,
        complianceNotes: p.complianceNotes,
        optOut: false,
        kind: "ats",
        sourceName: sourceId,
        robotsMode: robotsModeForSourceIdMirror(sourceId),
      };
    }
    // Unknown ATS platform (contains ":" but not a known platform) — mirrors
    // scrape.ts final branch: paused with unknown-platform note.
    return {
      sourceId,
      complianceState: "blocked",
      operationalState: "paused",
      enabled: false,
      publishable: false,
      complianceNotes: `Paused 2026-06-09: unknown ATS platform "${platform}" is not configured for safe collection.`,
      optOut: false,
      kind: "ats",
      sourceName: sourceId,
      robotsMode: robotsModeForSourceIdMirror(sourceId),
    };
  }

  // 3. Completely unknown identity (no ":") -> candidate, not publishable.
  return {
    sourceId,
    complianceState: "needs_review",
    operationalState: "candidate",
    enabled: false,
    publishable: false,
    complianceNotes: `Unknown source "${sourceId}" — candidate only, no recurring fetch authorized.`,
    optOut: false,
    kind: "unknown",
    sourceName: sourceId,
    robotsMode: robotsModeForSourceIdMirror(sourceId),
  };
}

// ─── Registry-backed resolver (SP-04) ───────────────────────────────────────

/**
 * Resolve a source's policy. When a registry row exists, its independent
 * compliance + operational states are authoritative (subject to the
 * allow/conditional guard and optOut). Otherwise the hard-coded fallback is
 * used byte-for-byte. Unknown rows violating the CHECK are coerced to
 * non-publishable.
 */
export function resolvePolicy(
  sourceId: string,
  registryRow?: RegistryPolicyRow | null,
): ResolvedPolicy {
  if (!registryRow) return fallbackPolicy(sourceId);

  if (registryRow.sourceId !== sourceId) {
    return {
      sourceId,
      complianceState: "needs_review",
      operationalState: "paused",
      enabled: false,
      publishable: false,
      complianceNotes: `Registry identity mismatch: requested ${sourceId}, received ${registryRow.sourceId} — coerced to non-publishable.`,
      optOut: false,
      kind: sourceId.includes(":") ? "ats" : "static",
      sourceName: sourceId,
      robotsMode: robotsModeForSourceIdMirror(sourceId),
    };
  }

  const compliance = registryRow.complianceState;
  const operational = registryRow.operationalState;
  const optOut = Boolean(registryRow.optOut);

  // Guard: shadow/canary/active require allowed|conditional (migration CHECK).
  const violatesPublishGuard = isShadowCanaryActive(operational) && !isComplianceAllowsPublish(compliance);
  if (violatesPublishGuard) {
    return {
      sourceId,
      complianceState: compliance,
      operationalState: operational,
      enabled: false,
      publishable: false,
      complianceNotes: `CHECK violation: ${operational} requires allowed|conditional but got ${compliance} — coerced to non-publishable.`,
      optOut,
      kind: registryRow.sourceId.includes(":") ? "ats" : "static",
      sourceName: registryRow.displayName ?? sourceId,
      robotsMode: robotsModeForSourceIdMirror(sourceId),
    };
  }

  // Opt-out is durable — even an allowed source cannot publish.
  if (optOut) {
    return {
      sourceId,
      complianceState: compliance,
      operationalState: operational,
      enabled: false,
      publishable: false,
      complianceNotes: `Opt-out: ${registryRow.displayName ?? sourceId} is do-not-reingest.`,
      optOut: true,
      kind: registryRow.sourceId.includes(":") ? "ats" : "static",
      sourceName: registryRow.displayName ?? sourceId,
      robotsMode: robotsModeForSourceIdMirror(sourceId),
    };
  }

  return {
    sourceId,
    complianceState: compliance,
    operationalState: operational,
    enabled: isEnabledForFetch(compliance, operational, false),
    publishable: isPublishable(compliance, operational, false),
    complianceNotes: `Registry: ${compliance}/${operational}`,
    optOut: false,
    kind: registryRow.sourceId.includes(":") ? "ats" : "static",
    sourceName: registryRow.displayName ?? sourceId,
    robotsMode: robotsModeForSourceIdMirror(sourceId),
  };
}

// ─── Known universe (parity audit) ──────────────────────────────────────────

export const KNOWN_STATIC_IDS = staticSources.map((s) => s.id);
export const KNOWN_ATS_IDS = Object.keys(ATS_TOKEN_POLICIES);
export const KNOWN_SOURCE_IDS = [...KNOWN_STATIC_IDS, ...KNOWN_ATS_IDS];

// ─── D1 loader (graceful when table missing) ────────────────────────────────

/**
 * A durable opt-out must continue to block a source after its registry row is
 * removed. Represent ledger-only IDs as an opt-out overlay rather than falling
 * through to the exact-six static adapter.
 */
function durableOptOutOverlay(sourceId: string): RegistryPolicyRow {
  return {
    sourceId,
    providerId: "durable-opt-out",
    complianceState: "needs_review",
    operationalState: "paused",
    optOut: true,
    displayName: sourceId,
  };
}

/**
 * Load all source_registry rows into a Map keyed by source_id, with durable
 * source_opt_outs overlaid on the registry cache bit.
 *
 * A successful empty result is the explicit pre-cutover fallback adapter. A
 * read failure is deliberately distinct and rejects: silently turning an
 * unavailable governance ledger into the static exact-six fallback could
 * re-enable a paused or opted-out source.
 */
export async function loadRegistryPolicies(db: any): Promise<Map<string, RegistryPolicyRow>> {
  let rows: RegistryPolicyRow[];

  try {
    if (!db || typeof db.select !== "function") {
      throw new Error("typed registry reader is unavailable");
    }
    const { sourceRegistry, sourceOptOuts } = await import("@va-hub/db");
    if (!sourceRegistry || !sourceOptOuts) throw new Error("typed registry tables are unavailable");

    const result = await db.select().from(sourceRegistry);
    const optOutRows = await db
      .select({ sourceId: sourceOptOuts.sourceId })
      .from(sourceOptOuts);
    if (!Array.isArray(result) || !Array.isArray(optOutRows)) {
      throw new Error("typed registry reader returned an unverifiable result");
    }

    const durableOptOutIds = new Set(
      (optOutRows as Array<{ sourceId: string }>).map((row) => row.sourceId),
    );
    rows = (result as RegistryPolicyRow[]).map((row) => ({
      ...row,
      optOut: Boolean(row.optOut) || durableOptOutIds.has(row.sourceId),
    }));
    const registryIds = new Set(rows.map((row) => row.sourceId));
    for (const sourceId of durableOptOutIds) {
      if (!registryIds.has(sourceId)) rows.push(durableOptOutOverlay(sourceId));
    }
  } catch (typedError) {
    // Prefer a raw D1 query when the typed import/adapter is not wired, but
    // require an independently verifiable result from it as well.
    try {
      if (!db || typeof db.execute !== "function") {
        throw new Error("raw registry reader is unavailable");
      }
      const raw = await db.execute(`
        SELECT source_id, provider_id, compliance_state, operational_state,
               opt_out, display_name, endpoint_url, company_token,
               canary_max_new_items_per_tick,
               CASE WHEN opt_out <> 0 OR EXISTS (
                 SELECT 1 FROM source_opt_outs
                 WHERE source_opt_outs.source_id = source_registry.source_id
               ) THEN 1 ELSE 0 END AS effective_opt_out
        FROM source_registry
        UNION ALL
        SELECT source_opt_outs.source_id, 'durable-opt-out' AS provider_id,
               'needs_review' AS compliance_state, 'paused' AS operational_state,
               1 AS opt_out, source_opt_outs.source_id AS display_name,
               NULL AS endpoint_url, NULL AS company_token,
               NULL AS canary_max_new_items_per_tick, 1 AS effective_opt_out
        FROM source_opt_outs
        WHERE NOT EXISTS (
          SELECT 1 FROM source_registry
          WHERE source_registry.source_id = source_opt_outs.source_id
        )
      `);
      const list = (raw as any)?.results ?? (raw as any)?.rows ?? raw;
      if (!Array.isArray(list)) throw new Error("raw registry reader returned an unverifiable result");
      rows = list.map((r: any) => ({
        sourceId: r.source_id ?? r.sourceId,
        providerId: r.provider_id ?? r.providerId,
        complianceState: r.compliance_state ?? r.complianceState,
        operationalState: r.operational_state ?? r.operationalState,
        optOut: Boolean(r.effective_opt_out ?? r.effectiveOptOut ?? r.opt_out ?? r.optOut),
        displayName: r.display_name ?? r.displayName,
        endpointUrl: r.endpoint_url ?? r.endpointUrl,
        companyToken: r.company_token ?? r.companyToken,
        canaryMaxNewItemsPerTick: r.canary_max_new_items_per_tick ?? r.canaryMaxNewItemsPerTick ?? null,
      }));
    } catch (rawError) {
      const typedMessage = typedError instanceof Error ? typedError.message : String(typedError);
      const rawMessage = rawError instanceof Error ? rawError.message : String(rawError);
      throw new Error(`registry policy snapshot unavailable: typed=${typedMessage}; raw=${rawMessage}`);
    }
  }

  const map = new Map<string, RegistryPolicyRow>();
  for (const row of rows) {
    if (row?.sourceId) map.set(row.sourceId, row);
  }
  return map;
}
