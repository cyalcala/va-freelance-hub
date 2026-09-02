// SP-22 — durable shadow dispatcher and observation store.
//
// The 2026-08-31 audit named this gap explicitly: "a registry `shadow` label
// is not dispatched by the current policy resolver; several adapters are not
// in live cron enumeration." SP-07's `runCandidateShadowProbe` (candidate-
// shadow.ts) is a proven, zero-write, bounded probe -- but every observation
// of it so far has been one manual run, evidenced only in a session's own
// prose. This module is the recurring dispatcher: it enumerates every
// registry row genuinely eligible for shadow observation (never a hard-coded
// adapter list), runs SP-07's probe against each, and persists every
// observation so "recurrent shadow" is provable from D1 history.
//
// Non-publishing invariant (matches SP-07's own): this module never sets
// `is_active`, never inserts into `opportunities`, and never writes to
// `source_registry`, `provider_profiles`, or `source_decisions`. Its only
// write path is the new `source_shadow_observations` table (migration 0038).
//
// All I/O is dependency-injected (see `ShadowDispatchDeps`) so the dispatch
// decision itself is fully unit-testable without a live D1 binding or network
// access -- the orchestrator is the one place D1/fetch reach in, and it is a
// thin, mechanical loop over the pure functions below.

import {
  runCandidateShadowProbe,
  type CandidateShadowInput,
  type CandidateShadowResult,
} from "./candidate-shadow";
import { sha256Hex } from "./contentHash";
import type { DoctorOutcome } from "./source-doctor";

export const DISPATCHER_VERSION = "1.0.0";

// Registry rows have no per-source cadence unless their provider specifies
// one (provider_profiles.cadence_min_minutes). A shadow probe's purpose is
// evidence accumulation, not freshness, so once a day is a safe, generous
// default floor -- far looser than the exact-six freshness loop's 10-minute
// cadence, deliberately isolating this dispatcher's request budget from it.
export const DEFAULT_MIN_REDISPATCH_MINUTES = 24 * 60;

// Small, cadence-safe ceiling on how many sources one dispatch run probes.
// The registry is empty in production as of this unit (2026-09-02); this cap
// exists so a future large registry can never turn one dispatch run into an
// unbounded fan-out of third-party requests.
export const MAX_DISPATCHES_PER_RUN = 20;

// ─── Input shapes (deliberately minimal subsets of the real Drizzle rows, so
// this module has no compile-time dependency on @va-hub/db) ──────────────────

export interface DispatchProviderProfile {
  id: string;
  providerFamily: string;
  mechanism: string;
  authClass: string;
  endpointPattern?: string | null;
  allowedHosts?: string | null;
  evidenceUrl?: string | null;
  evidenceLeaseDays?: number | null;
  visibilityFilter?: string | null;
  contentScope?: string | null;
  cadenceMinMinutes?: number | null;
  cadenceMaxMinutes?: number | null;
  rateGuidance?: string | null;
  robotsHandling?: string | null;
}

export interface DispatchRegistryRow {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken?: string | null;
  discoveryProvenance?: string | null;
  complianceState: string;
  operationalState: string;
  optOut: boolean;
  reviewDeadline?: string | null;
  policyExpiry?: string | null;
}

// ─── Eligibility (pure) ──────────────────────────────────────────────────────

export interface EligibilityDecision {
  sourceId: string;
  eligible: boolean;
  reason: string;
}

// Compliance states that may legally sit in operational=shadow. Mirrors the
// source_registry CHECK constraint (migration 0036) so a malformed fixture
// or a future relaxed reader can never dispatch a compliance-hold source
// even though the live DB constraint would already have refused the row.
const SHADOW_ELIGIBLE_COMPLIANCE_STATES = new Set(["allowed", "conditional"]);

/**
 * Decide which registry rows a dispatch run should probe right now. Pure:
 * no I/O, no mutation. Never throws on malformed input; an unrecognized or
 * inconsistent row is simply ineligible with a named reason.
 */
export function selectEligibleForDispatch(
  registryRows: DispatchRegistryRow[],
  providerById: Map<string, DispatchProviderProfile>,
  lastObservedAtBySourceId: Map<string, string>,
  now: Date,
): EligibilityDecision[] {
  return registryRows.map((row): EligibilityDecision => {
    if (row.operationalState !== "shadow") {
      return { sourceId: row.sourceId, eligible: false, reason: `operationalState is "${row.operationalState}", not "shadow"` };
    }
    if (!SHADOW_ELIGIBLE_COMPLIANCE_STATES.has(row.complianceState)) {
      return { sourceId: row.sourceId, eligible: false, reason: `complianceState "${row.complianceState}" may not enter shadow (defense-in-depth; the DB CHECK constraint should already prevent this row existing)` };
    }
    if (row.optOut) {
      return { sourceId: row.sourceId, eligible: false, reason: "source is opted out" };
    }
    const provider = providerById.get(row.providerId);
    if (!provider) {
      return { sourceId: row.sourceId, eligible: false, reason: `no provider profile found for providerId "${row.providerId}"` };
    }
    const lastObservedAt = lastObservedAtBySourceId.get(row.sourceId);
    if (lastObservedAt) {
      const lastObservedTime = new Date(lastObservedAt).getTime();
      if (Number.isFinite(lastObservedTime)) {
        const minutesSince = (now.getTime() - lastObservedTime) / 60_000;
        const minInterval = provider.cadenceMinMinutes ?? DEFAULT_MIN_REDISPATCH_MINUTES;
        if (minutesSince < minInterval) {
          return {
            sourceId: row.sourceId,
            eligible: false,
            reason: `last observed ${minutesSince.toFixed(0)}min ago, before the ${minInterval}min cadence floor`,
          };
        }
      }
    }
    return { sourceId: row.sourceId, eligible: true, reason: "operational=shadow, compliance-valid, not opted out, cadence floor satisfied" };
  });
}

// ─── Provider-profile validation (pure) ──────────────────────────────────────
// Mirrors the exact provider_profiles CHECK constraint values from migration
// 0036, byte-for-byte. The 2026-08-31 audit found lever-canary.ts's
// `contentScope: "minimal_with_truncated_summary"` would fail this CHECK if
// ever inserted; this validation exists specifically so a mismatch like that
// is rejected here, in a testable pure function, before a dispatch is even
// attempted -- never silently coerced to a nearby valid value.

const VALID_MECHANISMS = new Set(["syndication_feed", "public_api", "customer_auth", "partner_feed", "rss_feed", "public_html", "public_json_api", "ats_api"]);
const VALID_AUTH_CLASSES = new Set(["none", "api_key", "oauth", "partner_token", "customer_auth"]);
const VALID_VISIBILITY_FILTERS = new Set(["published", "listed", "public", "indexable", "private"]);
const VALID_CONTENT_SCOPES = new Set(["minimal", "full", "metadata_only"]);

export interface ProviderValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateProviderProfileForDispatch(provider: DispatchProviderProfile): ProviderValidationResult {
  const errors: string[] = [];
  if (!VALID_MECHANISMS.has(provider.mechanism)) {
    errors.push(`mechanism "${provider.mechanism}" is not a valid provider_profiles.mechanism CHECK value`);
  }
  if (!VALID_AUTH_CLASSES.has(provider.authClass)) {
    errors.push(`authClass "${provider.authClass}" is not a valid provider_profiles.auth_class CHECK value`);
  }
  if (provider.visibilityFilter != null && !VALID_VISIBILITY_FILTERS.has(provider.visibilityFilter)) {
    errors.push(`visibilityFilter "${provider.visibilityFilter}" is not a valid provider_profiles.visibility_filter CHECK value`);
  }
  if (provider.contentScope != null && !VALID_CONTENT_SCOPES.has(provider.contentScope)) {
    errors.push(`contentScope "${provider.contentScope}" is not a valid provider_profiles.content_scope CHECK value (minimal | full | metadata_only)`);
  }
  return { ok: errors.length === 0, errors };
}

// ─── Observation record (pure aside from the async hash) ───────────────────

export interface ShadowObservationRecord {
  sourceId: string;
  providerId: string;
  observedAt: string;
  dispatcherVersion: string;
  outcome: DoctorOutcome;
  requestCount: number;
  bytesReceived: number;
  itemCount: number;
  plausibleItems: number;
  durationMs: number;
  stopReason: string | null;
  evidenceHash: string;
  resultJson: string;
}

export async function buildObservationRecord(
  sourceId: string,
  providerId: string,
  result: CandidateShadowResult,
  observedAt: string,
): Promise<ShadowObservationRecord> {
  const resultJson = JSON.stringify(result);
  const evidenceHash = await sha256Hex(resultJson);
  return {
    sourceId,
    providerId,
    observedAt,
    dispatcherVersion: DISPATCHER_VERSION,
    outcome: result.diagnostic.outcome,
    requestCount: result.diagnostic.requestCount,
    bytesReceived: result.diagnostic.bytesReceived,
    itemCount: result.parse.itemCount,
    plausibleItems: result.sampleFunnel.plausibleItems,
    durationMs: result.diagnostic.durationMs,
    stopReason: result.stopReason ?? null,
    evidenceHash,
    resultJson,
  };
}

// ─── Orchestrator (I/O via injected deps only) ──────────────────────────────

export interface ShadowDispatchDeps {
  loadRegistryRows: () => Promise<DispatchRegistryRow[]>;
  loadProviderProfiles: () => Promise<Map<string, DispatchProviderProfile>>;
  loadLastObservedAt: () => Promise<Map<string, string>>;
  runProbe: (input: CandidateShadowInput) => Promise<CandidateShadowResult>;
  persistObservation: (record: ShadowObservationRecord) => Promise<void>;
  now?: () => Date;
  maxDispatchesPerRun?: number;
}

export interface ShadowDispatchSummary {
  totalRegistryRows: number;
  eligible: number;
  dispatched: number;
  skippedIneligible: number;
  skippedInvalidProvider: number;
  skippedRunCap: number;
  invalidProviderErrors: Array<{ sourceId: string; errors: string[] }>;
  outcomes: Record<string, number>;
}

/**
 * Enumerate registry-eligible sources, validate each provider profile, run
 * SP-07's bounded shadow probe, and persist every observation. Never writes
 * outside `source_shadow_observations` (via `persistObservation`); never
 * calls AI; never publishes. `deps.runProbe` defaults to
 * `runCandidateShadowProbe` when omitted, so a caller supplying only the D1
 * readers/writer still gets the real probe behavior.
 */
export async function dispatchShadowObservations(deps: ShadowDispatchDeps): Promise<ShadowDispatchSummary> {
  const now = deps.now?.() ?? new Date();
  const maxDispatches = deps.maxDispatchesPerRun ?? MAX_DISPATCHES_PER_RUN;

  const [registryRows, providerById, lastObservedAtBySourceId] = await Promise.all([
    deps.loadRegistryRows(),
    deps.loadProviderProfiles(),
    deps.loadLastObservedAt(),
  ]);

  const eligibility = selectEligibleForDispatch(registryRows, providerById, lastObservedAtBySourceId, now);
  const rowsBySourceId = new Map(registryRows.map((r) => [r.sourceId, r]));

  const summary: ShadowDispatchSummary = {
    totalRegistryRows: registryRows.length,
    eligible: 0,
    dispatched: 0,
    skippedIneligible: 0,
    skippedInvalidProvider: 0,
    skippedRunCap: 0,
    invalidProviderErrors: [],
    outcomes: {},
  };

  for (const decision of eligibility) {
    if (!decision.eligible) {
      summary.skippedIneligible += 1;
      continue;
    }
    summary.eligible += 1;

    if (summary.dispatched >= maxDispatches) {
      summary.skippedRunCap += 1;
      continue;
    }

    const row = rowsBySourceId.get(decision.sourceId);
    const provider = row ? providerById.get(row.providerId) : undefined;
    if (!row || !provider) continue; // unreachable given eligibility already checked both

    const validation = validateProviderProfileForDispatch(provider);
    if (!validation.ok) {
      summary.skippedInvalidProvider += 1;
      summary.invalidProviderErrors.push({ sourceId: row.sourceId, errors: validation.errors });
      continue;
    }

    const input: CandidateShadowInput = {
      sourceId: row.sourceId,
      providerId: row.providerId,
      displayName: row.displayName,
      endpointUrl: row.endpointUrl,
      companyToken: row.companyToken ?? null,
      discoveryProvenance: row.discoveryProvenance ?? null,
      complianceState: row.complianceState as CandidateShadowInput["complianceState"],
      operationalState: row.operationalState as CandidateShadowInput["operationalState"],
      reviewDeadline: row.reviewDeadline ?? null,
      policyExpiry: row.policyExpiry ?? null,
      provider: {
        id: provider.id,
        providerFamily: provider.providerFamily,
        mechanism: provider.mechanism,
        authClass: provider.authClass,
        endpointPattern: provider.endpointPattern ?? null,
        allowedHosts: provider.allowedHosts ?? null,
        evidenceUrl: provider.evidenceUrl ?? null,
        evidenceLeaseDays: provider.evidenceLeaseDays ?? null,
        visibilityFilter: provider.visibilityFilter ?? null,
        contentScope: provider.contentScope ?? null,
        cadenceMinMinutes: provider.cadenceMinMinutes ?? null,
        cadenceMaxMinutes: provider.cadenceMaxMinutes ?? null,
        rateGuidance: provider.rateGuidance ?? null,
        robotsHandling: provider.robotsHandling ?? null,
      },
    };

    const result = await deps.runProbe(input);
    const record = await buildObservationRecord(row.sourceId, row.providerId, result, now.toISOString());
    await deps.persistObservation(record);

    summary.dispatched += 1;
    summary.outcomes[result.diagnostic.outcome] = (summary.outcomes[result.diagnostic.outcome] ?? 0) + 1;
  }

  return summary;
}

// Default real-probe binding for callers that only want to supply I/O.
export const defaultRunProbe = runCandidateShadowProbe;
