import { isAdmissionInstant, loadCurrentAdmissionEvidence, sha256Hex, type AdmissionDatabase } from "@va-hub/scraper";
import type { AdmissionStatement } from "../../../../packages/scraper/admission-evidence";

export interface LakeAuthorityDatabase extends AdmissionDatabase {
  /** Native D1 batch: statement failure rolls back every statement. */
  batch(statements: AdmissionStatement[]): Promise<{ success: boolean }[]>;
}

export interface LakePublicationSourceIdentity {
  version: "lake-source-identity-v1";
  sourceId: string;
  providerId: string;
  providerFamily: string;
  mechanism: string;
  endpointUrl: string;
  companyToken: string | null;
}

export interface LakePublicationAuthorityCas {
  sourceGovernanceRevision: number;
  providerGovernanceRevision: number;
  complianceState: "allowed" | "conditional";
  operationalState: "active" | "canary";
  lastTransitionHash: string | null;
  policyExpiry: string;
  canaryMaxNewItemsPerTick: number | null;
  providerEvidenceCapturedAt: string;
  providerEvidenceLeaseDays: number;
  admissionEvidenceId: number;
  admissionPacketSha256: string;
  admissionPolicyVersion: string;
  admissionCapturedAt: string;
  admissionExpiresAt: string;
}

export interface LakePublicationAuthoritySnapshot {
  readonly sourceIdentity: Readonly<LakePublicationSourceIdentity>;
  readonly sourceIdentityHash: string;
  readonly cas: Readonly<LakePublicationAuthorityCas>;
}

export type LakePublicationAuthorityCaptureResult =
  | { ok: true; snapshot: LakePublicationAuthoritySnapshot; publicationAuthorized: false;
      itemProofRequired: true; aggregateProofRequired: true }
  | { ok: false; code: "LAKE_AUTHORITY_BINDING_UNAVAILABLE" | "LAKE_AUTHORITY_REJECTED";
      reason: string; publicationAuthorized: false };

// A serialized snapshot is evidence for review, never a caller-supplied proof.
// Only this module can issue the frozen objects accepted by the guard builder.
const issuedSnapshots = new WeakSet<LakePublicationAuthoritySnapshot>();

/** Runtime issuance only: this is neither a freshness check nor publication clearance. */
export function isIssuedLakePublicationAuthoritySnapshot(value: unknown): value is LakePublicationAuthoritySnapshot {
  return value !== null && typeof value === "object"
    && issuedSnapshots.has(value as LakePublicationAuthoritySnapshot);
}
const positiveInteger = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const identityText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && !value.includes("\0");
const hash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function hasNativeBatch(db: LakeAuthorityDatabase | null | undefined): db is LakeAuthorityDatabase {
  return !!db && typeof db.prepare === "function" && typeof db.batch === "function";
}
function rejected(reason: string): LakePublicationAuthorityCaptureResult {
  return { ok: false, code: "LAKE_AUTHORITY_REJECTED", reason, publicationAuthorized: false };
}

/** Read-only registry dependency. This does not authorize collection or publication. */
export async function captureLakePublicationAuthority(
  db: LakeAuthorityDatabase | null | undefined,
  sourceId: string,
  now: string,
): Promise<LakePublicationAuthorityCaptureResult> {
  if (!hasNativeBatch(db)) return { ok: false, code: "LAKE_AUTHORITY_BINDING_UNAVAILABLE",
    reason: "A native atomic D1 batch binding is required", publicationAuthorized: false };
  if (typeof sourceId !== "string" || sourceId === "unattributed" || !/^[a-z0-9:._-]+$/.test(sourceId)
    || !isAdmissionInstant(now)) return rejected("Source identity or evaluation time is invalid");

  const current = await loadCurrentAdmissionEvidence(db, sourceId, now);
  if (!current.ok) return rejected(current.reason);
  const { source, provider, evidence, packet } = current;
  if ((source.complianceState !== "allowed" && source.complianceState !== "conditional")
    || (source.operationalState !== "active" && source.operationalState !== "canary") || source.optOut
    || !packet.authorityActions.includes("public_minimal_metadata_canary")) {
    return rejected("Current registry state and explicit public-action admission evidence are required");
  }
  if (!positiveInteger(source.governanceRevision) || !positiveInteger(provider.governanceRevision)
    || !positiveInteger(evidence.id) || !hash(evidence.packetSha256)
    || !identityText(provider.id) || !identityText(provider.providerFamily) || !identityText(provider.mechanism)
    || !identityText(source.endpointUrl) || !(source.companyToken === null || identityText(source.companyToken))
    || !(source.lastTransitionHash === null || identityText(source.lastTransitionHash))) {
    return rejected("Current registry identity or revision is invalid");
  }
  if (!isAdmissionInstant(source.policyExpiry) || source.policyExpiry <= now
    || !isAdmissionInstant(provider.evidenceCapturedAt) || provider.evidenceCapturedAt > now
    || !positiveInteger(provider.evidenceLeaseDays)
    || !Number.isFinite(Date.parse(provider.evidenceCapturedAt) + provider.evidenceLeaseDays * 86_400_000)
    || Date.parse(provider.evidenceCapturedAt) + provider.evidenceLeaseDays * 86_400_000 <= Date.parse(now)
    || !isAdmissionInstant(evidence.capturedAt) || evidence.capturedAt > now
    || !isAdmissionInstant(evidence.expiresAt) || evidence.expiresAt <= now) {
    return rejected("Current source, provider and admission evidence leases are required");
  }
  if ((source.canaryMaxNewItemsPerTick !== null && !positiveInteger(source.canaryMaxNewItemsPerTick))
    || (source.operationalState === "canary" && !positiveInteger(source.canaryMaxNewItemsPerTick))) {
    return rejected("Canary authority requires a positive safe-integer cap");
  }

  // Fixed field order binds identity only. Evidence renewal and lease/revision
  // changes affect CAS, leaving the same source/provider/tenant identity stable.
  const sourceIdentity = Object.freeze<LakePublicationSourceIdentity>({
    version: "lake-source-identity-v1", sourceId: source.sourceId, providerId: provider.id,
    providerFamily: provider.providerFamily, mechanism: provider.mechanism,
    endpointUrl: source.endpointUrl, companyToken: source.companyToken,
  });
  const cas = Object.freeze<LakePublicationAuthorityCas>({
    sourceGovernanceRevision: source.governanceRevision, providerGovernanceRevision: provider.governanceRevision,
    complianceState: source.complianceState, operationalState: source.operationalState,
    lastTransitionHash: source.lastTransitionHash, policyExpiry: source.policyExpiry,
    canaryMaxNewItemsPerTick: source.canaryMaxNewItemsPerTick,
    providerEvidenceCapturedAt: provider.evidenceCapturedAt, providerEvidenceLeaseDays: provider.evidenceLeaseDays,
    admissionEvidenceId: evidence.id, admissionPacketSha256: evidence.packetSha256,
    admissionPolicyVersion: evidence.policyVersion, admissionCapturedAt: evidence.capturedAt, admissionExpiresAt: evidence.expiresAt,
  });
  const snapshot = Object.freeze<LakePublicationAuthoritySnapshot>({
    sourceIdentity, sourceIdentityHash: await sha256Hex(JSON.stringify(sourceIdentity)), cas,
  });
  issuedSnapshots.add(snapshot);
  return { ok: true, snapshot, publicationAuthorized: false, itemProofRequired: true, aggregateProofRequired: true };
}

// D1's LIKE/GLOB patterns have a 50-byte limit. A normalized date round-trip
// validates the complete instant without a long pattern or SQLite's day rollover.
const canonicalInstantSql = (column: string) => `typeof(${column})='text' AND length(${column})=24
 AND instr(${column},char(0))=0 AND substr(${column},12,2) BETWEEN '00' AND '23'
 AND strftime('%Y-%m-%dT%H:%M:%fZ',${column},'+0 seconds') IS ${column}
 AND julianday(${column}) IS NOT NULL`;

const CURRENT_AUTHORITY_GUARD_SQL = `SELECT (CASE WHEN EXISTS (
 SELECT 1 FROM source_registry s JOIN provider_profiles p ON p.id=s.provider_id
 JOIN source_admission_evidence e ON e.id=(
   SELECT MAX(latest.id) FROM source_admission_evidence latest WHERE latest.source_id=s.source_id
 )
 WHERE s.source_id=? AND s.provider_id=? AND p.provider_family=? AND p.mechanism=?
 AND s.endpoint_url=? AND s.company_token IS ?
 AND s.governance_revision=? AND p.governance_revision=?
 AND s.compliance_state=? AND s.operational_state=? AND s.last_transition_hash IS ?
 AND s.policy_expiry=? AND s.canary_max_new_items_per_tick IS ?
 AND p.evidence_captured_at=? AND p.evidence_lease_days=?
 AND e.id=? AND e.packet_sha256=? AND e.policy_version=? AND e.captured_at=? AND e.expires_at=?
 AND e.source_id=s.source_id AND e.provider_id=p.id AND e.endpoint_url=s.endpoint_url
 AND e.source_governance_revision=s.governance_revision AND e.provider_governance_revision=p.governance_revision
 AND s.compliance_state IN ('allowed','conditional') AND s.operational_state IN ('active','canary')
 AND s.opt_out=0 AND NOT EXISTS (SELECT 1 FROM source_opt_outs o WHERE o.source_id=s.source_id)
 AND (s.operational_state<>'canary' OR (typeof(s.canary_max_new_items_per_tick)='integer'
   AND s.canary_max_new_items_per_tick BETWEEN 1 AND 9007199254740991))
 AND p.auth_class='none' AND p.content_scope IN ('minimal','metadata_only')
 AND p.visibility_filter IN ('published','listed','public','indexable')
 AND EXISTS (SELECT 1 FROM json_each(e.packet_json,'$.authorityActions')
   WHERE type='text' AND value='public_minimal_metadata_canary')
 AND ${canonicalInstantSql("s.policy_expiry")} AND julianday(s.policy_expiry)>julianday('now')
 AND ${canonicalInstantSql("p.evidence_captured_at")} AND julianday(p.evidence_captured_at)<=julianday('now')
 AND typeof(p.evidence_lease_days)='integer' AND p.evidence_lease_days BETWEEN 1 AND 9007199254740991
 AND julianday(p.evidence_captured_at)+p.evidence_lease_days>julianday('now')
 AND ${canonicalInstantSql("e.captured_at")} AND julianday(e.captured_at)<=julianday('now')
 AND ${canonicalInstantSql("e.expires_at")} AND julianday(e.expires_at)>julianday('now')
 AND julianday(e.expires_at)>julianday(e.captured_at)
 AND julianday(e.expires_at)<=julianday(s.policy_expiry)
 AND julianday(e.expires_at)<=julianday(p.evidence_captured_at)+p.evidence_lease_days
 ) THEN 1 ELSE json('LAKE_AUTHORITY_STALE') END) AS lake_authority_guard`;

/** Caller must put this throwing guard in the same native batch as its writes.
 * It supplies registry CAS only; item, aggregate-budget and publication proofs
 * remain required by the future governed commit service.
 */
export function prepareLakePublicationAuthorityGuard(
  db: LakeAuthorityDatabase,
  snapshot: LakePublicationAuthoritySnapshot,
): AdmissionStatement {
  if (!hasNativeBatch(db)) throw new Error("LAKE_AUTHORITY_BINDING_UNAVAILABLE: native atomic D1 batch is required");
  if (!issuedSnapshots.has(snapshot)) throw new Error("LAKE_AUTHORITY_REJECTED: snapshot was not issued by authority capture");
  const { sourceIdentity: identity, cas } = snapshot;
  return db.prepare(CURRENT_AUTHORITY_GUARD_SQL).bind(
    identity.sourceId, identity.providerId, identity.providerFamily, identity.mechanism, identity.endpointUrl, identity.companyToken,
    cas.sourceGovernanceRevision, cas.providerGovernanceRevision, cas.complianceState, cas.operationalState, cas.lastTransitionHash,
    cas.policyExpiry, cas.canaryMaxNewItemsPerTick, cas.providerEvidenceCapturedAt, cas.providerEvidenceLeaseDays,
    cas.admissionEvidenceId, cas.admissionPacketSha256, cas.admissionPolicyVersion, cas.admissionCapturedAt, cas.admissionExpiresAt,
  );
}
