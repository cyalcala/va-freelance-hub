/**
 * EX-02 — admit a reviewed candidate to non-publishing shadow through current evidence.
 * Does not insert opportunities and does not enable canary fetch.
 */
import {
  buildAdmissionEvidence,
  persistAdmissionEvidence,
  validateAdmissionProbe,
  type AdmissionDatabase,
  type AdmissionProviderSnapshot,
  type AdmissionSourceSnapshot,
  type PrimaryAdmissionEvidence,
} from "./admission-evidence";
import { applyTypedTransition, type TransitionGatewayDatabase } from "./transition-gateway";
import type { CandidateShadowResult } from "./candidate-shadow";

export interface AdmitReviewedSourceInput {
  now: string;
  source: AdmissionSourceSnapshot;
  provider: AdmissionProviderSnapshot;
  probe: CandidateShadowResult;
  primaryEvidence: PrimaryAdmissionEvidence[];
  adjudicationRef: string;
}

export type AdmitReviewedSourceResult =
  | { ok: true; sourceId: string }
  | { ok: false; reason: string };

const INSERT_PROVIDER_SQL = `INSERT INTO provider_profiles (
  id, display_name, provider_family, mechanism, auth_class, endpoint_pattern, allowed_hosts,
  evidence_url, evidence_hash, evidence_captured_at, visibility_filter, content_scope,
  cadence_min_minutes, cadence_max_minutes, rate_guidance, robots_handling, removal_semantics,
  evidence_lease_days, default_compliance_state, default_operational_state, notes
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review', 'candidate', ?)
ON CONFLICT(id) DO NOTHING`;

const INSERT_CANDIDATE_SQL = `INSERT INTO source_registry (
  source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance,
  compliance_state, operational_state, review_deadline, policy_expiry, canary_max_new_items_per_tick, owner
) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?)`;

export async function admitReviewedSourceToShadow(
  db: TransitionGatewayDatabase & AdmissionDatabase,
  input: AdmitReviewedSourceInput,
): Promise<AdmitReviewedSourceResult> {
  if (input.source.operationalState !== "candidate") {
    return { ok: false, reason: "admission starts from candidate, not a live operational state" };
  }
  const probe = validateAdmissionProbe(input.probe, input.source, input.provider, input.now);
  if (!probe.ok) return probe;

  const providerWrite = await db.prepare(INSERT_PROVIDER_SQL).bind(
    input.provider.id,
    input.provider.id,
    input.provider.providerFamily,
    input.provider.mechanism,
    input.provider.authClass,
    input.provider.endpointPattern,
    input.provider.allowedHosts,
    input.provider.evidenceUrl,
    input.provider.evidenceHash,
    input.provider.evidenceCapturedAt,
    input.provider.visibilityFilter,
    input.provider.contentScope,
    input.provider.cadenceMinMinutes,
    input.provider.cadenceMaxMinutes,
    input.provider.rateGuidance,
    input.provider.robotsHandling,
    input.provider.removalSemantics,
    input.provider.evidenceLeaseDays,
    "EX-02 reviewed public board admission",
  ).run();
  if (!providerWrite.success) return { ok: false, reason: "provider profile write was unsuccessful" };

  const candidateWrite = await db.prepare(INSERT_CANDIDATE_SQL).bind(
    input.source.sourceId,
    input.source.providerId,
    input.source.displayName,
    input.source.endpointUrl,
    input.source.companyToken,
    input.source.discoveryProvenance,
    input.source.complianceState,
    input.source.reviewDeadline,
    input.source.policyExpiry,
    input.source.canaryMaxNewItemsPerTick,
    "ex-02",
  ).run();
  if (!candidateWrite.success) return { ok: false, reason: "source registry candidate write was unsuccessful" };

  const built = await buildAdmissionEvidence({
    source: input.source,
    provider: input.provider,
    probe: input.probe,
    primaryEvidence: input.primaryEvidence,
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
    adjudicationRef: input.adjudicationRef,
    capturedAt: input.probe.timestamp,
    expiresAt: input.source.policyExpiry!,
  });
  if (!built.ok) return built;

  const persisted = await persistAdmissionEvidence(db, input.source, input.provider, built, input.now);
  if (!persisted.ok) return persisted;

  const shadow = await applyTypedTransition(db, {
    sourceId: input.source.sourceId,
    to: { compliance: input.source.complianceState, operational: "shadow" },
    cause: "requested_shadow_entry",
    now: input.now,
  });
  if (!shadow.persisted) {
    return { ok: false, reason: "reason" in shadow.decision ? shadow.decision.reason : "typed shadow transition was not persisted" };
  }
  return { ok: true, sourceId: input.source.sourceId };
}
