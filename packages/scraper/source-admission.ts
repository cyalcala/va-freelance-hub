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
import { errorMessage } from "./contentHash";

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
ON CONFLICT(id) DO UPDATE SET
  display_name=excluded.display_name,
  provider_family=excluded.provider_family,
  mechanism=excluded.mechanism,
  auth_class=excluded.auth_class,
  endpoint_pattern=excluded.endpoint_pattern,
  allowed_hosts=excluded.allowed_hosts,
  evidence_url=excluded.evidence_url,
  evidence_hash=excluded.evidence_hash,
  evidence_captured_at=excluded.evidence_captured_at,
  visibility_filter=excluded.visibility_filter,
  content_scope=excluded.content_scope,
  cadence_min_minutes=excluded.cadence_min_minutes,
  cadence_max_minutes=excluded.cadence_max_minutes,
  rate_guidance=excluded.rate_guidance,
  robots_handling=excluded.robots_handling,
  removal_semantics=excluded.removal_semantics,
  evidence_lease_days=excluded.evidence_lease_days,
  notes=excluded.notes
WHERE NOT EXISTS(SELECT 1 FROM source_admission_evidence WHERE provider_id=excluded.id)`;

const INSERT_CANDIDATE_SQL = `INSERT INTO source_registry (
  source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance,
  compliance_state, operational_state, review_deadline, policy_expiry, canary_max_new_items_per_tick, owner
) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?)
ON CONFLICT(source_id) DO UPDATE SET
  provider_id=excluded.provider_id,
  display_name=excluded.display_name,
  endpoint_url=excluded.endpoint_url,
  company_token=excluded.company_token,
  discovery_provenance=excluded.discovery_provenance,
  compliance_state=excluded.compliance_state,
  review_deadline=excluded.review_deadline,
  policy_expiry=excluded.policy_expiry,
  canary_max_new_items_per_tick=excluded.canary_max_new_items_per_tick,
  owner=excluded.owner
WHERE source_registry.operational_state = 'candidate'
  AND NOT EXISTS(SELECT 1 FROM source_admission_evidence WHERE source_id=excluded.source_id)`;

export async function admitReviewedSourceToShadow(
  db: TransitionGatewayDatabase & AdmissionDatabase,
  input: AdmitReviewedSourceInput,
): Promise<AdmitReviewedSourceResult> {
  if (input.source.operationalState !== "candidate") {
    return { ok: false, reason: "admission starts from candidate, not a live operational state" };
  }
  const probe = validateAdmissionProbe(input.probe, input.source, input.provider, input.now);
  if (!probe.ok) return probe;

  try {
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
  const storedProvider = await db.prepare(
    `SELECT id, provider_family AS providerFamily, mechanism, auth_class AS authClass,
      endpoint_pattern AS endpointPattern, allowed_hosts AS allowedHosts, evidence_url AS evidenceUrl,
      evidence_hash AS evidenceHash, evidence_captured_at AS evidenceCapturedAt,
      visibility_filter AS visibilityFilter, content_scope AS contentScope,
      cadence_min_minutes AS cadenceMinMinutes, cadence_max_minutes AS cadenceMaxMinutes,
      rate_guidance AS rateGuidance, robots_handling AS robotsHandling,
      removal_semantics AS removalSemantics, evidence_lease_days AS evidenceLeaseDays,
      governance_revision AS governanceRevision FROM provider_profiles WHERE id=?`,
  ).bind(input.provider.id).first<AdmissionProviderSnapshot>();
  if (!storedProvider) return { ok: false, reason: "provider profile write was unsuccessful" };
  // Once a provider has immutable evidence, admission cannot renew its shared
  // policy snapshot. Detect a different proposal before creating an orphan
  // candidate or attempting evidence that SQL will reject against that snapshot.
  const mismatchedFields = (Object.keys(storedProvider) as (keyof AdmissionProviderSnapshot)[])
    .filter(key => key !== "governanceRevision" && key !== "evidenceCapturedAt" && storedProvider[key] !== input.provider[key]);
  if (mismatchedFields.length > 0) {
    return {
      ok: false,
      reason: `Shared provider evidence renewal required for ${input.provider.id}: proposed ${mismatchedFields.join(", ")} differ from the persisted snapshot; renew through the reviewed evidence workflow before retrying admission`,
    };
  }
  const provider = storedProvider;
  // An identical content hash and policy contract may reuse the immutable
  // provider capture. A later fetch must not renew all existing source windows.
  const providerExpiresAt = new Date(Date.parse(provider.evidenceCapturedAt!) + provider.evidenceLeaseDays * 86_400_000).toISOString();
  const source = { ...input.source, policyExpiry: input.source.policyExpiry! < providerExpiresAt ? input.source.policyExpiry : providerExpiresAt };
  const primaryEvidence = input.primaryEvidence.map(entry => entry.url === provider.evidenceUrl
    && entry.contentSha256 === provider.evidenceHash ? { ...entry, capturedAt: provider.evidenceCapturedAt! } : entry);
  if (!source.policyExpiry || source.policyExpiry <= input.now) return { ok: false, reason: "Shared provider evidence lease has expired" };

  const candidateWrite = await db.prepare(INSERT_CANDIDATE_SQL).bind(
    input.source.sourceId,
    input.source.providerId,
    input.source.displayName,
    input.source.endpointUrl,
    input.source.companyToken,
    input.source.discoveryProvenance,
    input.source.complianceState,
    input.source.reviewDeadline,
    source.policyExpiry,
    input.source.canaryMaxNewItemsPerTick,
    "ex-02",
  ).run();
  if (!candidateWrite.success) return { ok: false, reason: "source registry candidate write was unsuccessful" };

  const storedSource = await db.prepare(
    `SELECT source_id AS sourceId, provider_id AS providerId, display_name AS displayName,
      endpoint_url AS endpointUrl, company_token AS companyToken, discovery_provenance AS discoveryProvenance,
      compliance_state AS complianceState, operational_state AS operationalState,
      review_deadline AS reviewDeadline, policy_expiry AS policyExpiry,
      canary_max_new_items_per_tick AS canaryMaxNewItemsPerTick,
      opt_out AS optOut, governance_revision AS governanceRevision,
      last_transition_hash AS lastTransitionHash FROM source_registry WHERE source_id=?`,
  ).bind(input.source.sourceId).first<AdmissionSourceSnapshot>();
  if (!storedSource) return { ok: false, reason: "source registry candidate write was unsuccessful" };
  storedSource.optOut = Boolean(storedSource.optOut);
  if (storedSource.operationalState !== "candidate") {
    return { ok: false, reason: `source is already in operational state ${storedSource.operationalState}` };
  }
  if (storedSource.optOut) {
    return { ok: false, reason: "current durable opt-out blocks admission" };
  }
  if (storedSource.complianceState !== "allowed" && storedSource.complianceState !== "conditional") {
    return { ok: false, reason: "source compliance state must be allowed or conditional for admission" };
  }

  const built = await buildAdmissionEvidence({
    source: storedSource,
    provider,
    probe: input.probe,
    primaryEvidence,
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
    adjudicationRef: input.adjudicationRef,
    capturedAt: input.probe.timestamp,
    expiresAt: storedSource.policyExpiry!,
  });
  if (!built.ok) return built;

  const persisted = await persistAdmissionEvidence(db, storedSource, provider, built, input.now);
  if (!persisted.ok) return persisted;

  const shadow = await applyTypedTransition(db, {
    sourceId: input.source.sourceId,
    to: { compliance: storedSource.complianceState, operational: "shadow" },
    cause: "requested_shadow_entry",
    now: input.now,
  });
  if (!shadow.persisted) {
    return { ok: false, reason: "reason" in shadow.decision ? shadow.decision.reason : "typed shadow transition was not persisted" };
  }
  return { ok: true, sourceId: input.source.sourceId };
  } catch (err) {
    return { ok: false, reason: errorMessage(err) };
  }
}
