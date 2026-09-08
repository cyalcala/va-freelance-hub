/** SP-23B bootstrap evidence boundary. No network, compliance changes, or publication. */
import { buildEvidencePacket } from "./evidence-packet";
import { decidePromotionToShadow } from "./source-promotion";
import { sha256Hex } from "./contentHash";
import { SHADOW_VERSION, type CandidateShadowResult } from "./candidate-shadow";
import type { ComplianceState, OperationalState } from "./source-lifecycle";

export const ADMISSION_EVIDENCE_VERSION = "sp23-evidence-v1";
export const OBSERVATION_POLICY_VERSION = "sp23-shadow-7d-v1";
export const ADMISSION_POLICY = Object.freeze({
  version: OBSERVATION_POLICY_VERSION,
  minimumDays: 8,
  minimumSpanMs: 7 * 86_400_000,
  lookbackMs: 14 * 86_400_000,
  maximumLatestAgeMs: 48 * 60 * 60_000,
});
const MAX_PACKET_BYTES = 128 * 1024;

export interface AdmissionSourceSnapshot {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: string | null;
  discoveryProvenance: string | null;
  complianceState: ComplianceState;
  operationalState: OperationalState;
  reviewDeadline: string | null;
  policyExpiry: string | null;
  canaryMaxNewItemsPerTick: number | null;
  optOut: boolean;
  governanceRevision: number;
  lastTransitionHash: string | null;
}

export interface AdmissionProviderSnapshot {
  id: string;
  providerFamily: string;
  mechanism: string;
  authClass: string;
  endpointPattern: string | null;
  allowedHosts: string | null;
  evidenceUrl: string | null;
  evidenceHash: string | null;
  evidenceCapturedAt: string | null;
  visibilityFilter: string | null;
  contentScope: string | null;
  cadenceMinMinutes: number | null;
  cadenceMaxMinutes: number | null;
  rateGuidance: string | null;
  robotsHandling: string | null;
  removalSemantics: string | null;
  evidenceLeaseDays: number;
  governanceRevision: number;
}

export interface PrimaryAdmissionEvidence {
  url: string;
  contentSha256: string;
  capturedAt: string;
}
export type AdmissionAuthorityAction = "recurrent_private_shadow" | "public_minimal_metadata_canary";

function sourceProjection(source: AdmissionSourceSnapshot) {
  return {
    sourceId: source.sourceId,
    providerId: source.providerId,
    endpointUrl: source.endpointUrl,
    companyToken: source.companyToken,
    complianceState: source.complianceState,
    policyExpiry: source.policyExpiry,
    canaryMaxNewItemsPerTick: source.canaryMaxNewItemsPerTick,
    optOut: source.optOut,
    governanceRevision: source.governanceRevision,
  };
}

function providerProjection(provider: AdmissionProviderSnapshot) {
  return {
    id: provider.id,
    providerFamily: provider.providerFamily,
    mechanism: provider.mechanism,
    authClass: provider.authClass,
    endpointPattern: provider.endpointPattern,
    allowedHosts: provider.allowedHosts,
    evidenceUrl: provider.evidenceUrl,
    evidenceHash: provider.evidenceHash,
    evidenceCapturedAt: provider.evidenceCapturedAt,
    visibilityFilter: provider.visibilityFilter,
    contentScope: provider.contentScope,
    cadenceMinMinutes: provider.cadenceMinMinutes,
    cadenceMaxMinutes: provider.cadenceMaxMinutes,
    rateGuidance: provider.rateGuidance,
    robotsHandling: provider.robotsHandling,
    removalSemantics: provider.removalSemantics,
    evidenceLeaseDays: provider.evidenceLeaseDays,
    governanceRevision: provider.governanceRevision,
  };
}

export interface AdmissionEvidencePacket {
  version: typeof ADMISSION_EVIDENCE_VERSION;
  source: ReturnType<typeof sourceProjection>;
  provider: ReturnType<typeof providerProjection>;
  primaryEvidence: PrimaryAdmissionEvidence[];
  authorityActions: AdmissionAuthorityAction[];
  probe: CandidateShadowResult;
  adjudicationRef: string;
  capturedAt: string;
  expiresAt: string;
  policyVersion: typeof OBSERVATION_POLICY_VERSION;
}

export interface AdmissionEvidenceRecord {
  id: number;
  sourceId: string;
  providerId: string;
  sourceGovernanceRevision: number;
  providerGovernanceRevision: number;
  endpointUrl: string;
  policyVersion: string;
  capturedAt: string;
  expiresAt: string;
  adjudicationRef: string;
  packetJson: string;
  packetSha256: string;
}

export interface AdmissionStatement {
  bind(...values: unknown[]): AdmissionStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: { last_row_id?: number } }>;
}
export interface AdmissionDatabase { prepare(query: string): AdmissionStatement }
type ValidationResult = { ok: true } | { ok: false; reason: string };
export type CurrentAdmissionEvidenceResult =
  | { ok: true; source: AdmissionSourceSnapshot; provider: AdmissionProviderSnapshot; evidence: AdmissionEvidenceRecord; packet: AdmissionEvidencePacket }
  | { ok: false; reason: string };

export function isAdmissionInstant(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
const positiveInteger = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const nonnegativeInteger = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const sha256 = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
function safeHttps(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  } catch { return false; }
}
function exactAllowedHost(endpoint: string, allowedHosts: string | null): boolean {
  try {
    const host = new URL(endpoint).hostname.toLowerCase().replace(/\.$/, "");
    const allowed = (allowedHosts ?? "").split(",").map((entry) => entry.trim().toLowerCase().replace(/\.$/, ""));
    return allowed.some((entry) => /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(entry)
      && (host === entry || host.endsWith(`.${entry}`)));
  } catch { return false; }
}

/** Check raw probe facts against independently loaded configuration, never its derived eligibility flags. */
export function validateAdmissionProbe(
  value: unknown,
  source: AdmissionSourceSnapshot,
  provider: AdmissionProviderSnapshot,
  latestAllowedAt: string,
): ValidationResult {
  try {
    const probe = value as CandidateShadowResult;
    if (!probe || probe.version !== SHADOW_VERSION || !isAdmissionInstant(probe.timestamp)
      || !isAdmissionInstant(latestAllowedAt) || probe.timestamp > latestAllowedAt) {
      return { ok: false, reason: "probe version or capture timestamp is invalid" };
    }
    if (probe.sourceId !== source.sourceId || probe.providerId !== source.providerId
      || provider.id !== source.providerId || probe.endpoint.url !== source.endpointUrl
      || probe.endpoint.allowedHosts !== provider.allowedHosts
      || probe.auth.class !== provider.authClass || probe.visibility.filter !== provider.visibilityFilter
      || probe.provenance.providerFamily !== provider.providerFamily || probe.provenance.mechanism !== provider.mechanism
      || probe.provenance.evidenceUrl !== provider.evidenceUrl
      || probe.cadence.minMinutes !== provider.cadenceMinMinutes || probe.cadence.maxMinutes !== provider.cadenceMaxMinutes
      || probe.cadence.rateGuidance !== provider.rateGuidance) {
      return { ok: false, reason: "probe identity, endpoint, or provider projection does not match current configuration" };
    }
    if (probe.robots.checked !== true || probe.robots.verdict !== "allowed" || probe.robots.wouldBlock !== false
      || probe.fetch.attempted !== true || !positiveInteger(probe.fetch.status) || probe.fetch.status < 200 || probe.fetch.status >= 300
      || probe.parse.attempted !== true || !["ok", "empty"].includes(probe.parse.schemaHealth)
      || !["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(probe.diagnostic.outcome)
      || probe.stopReason || probe.diagnostic.mutations !== 0 || probe.diagnostic.shadowMode !== true) {
      return { ok: false, reason: "probe does not prove a healthy, robots-allowed non-publishing fetch" };
    }
    const count = probe.parse.itemCount;
    if (!nonnegativeInteger(count) || count > 200 || !nonnegativeInteger(probe.sampleFunnel.plausibleItems)
      || probe.sampleFunnel.plausibleItems > count || probe.sampleFunnel.parsedItems !== count
      || !positiveInteger(probe.diagnostic.requestCount) || probe.diagnostic.requestCount > 2
      || !nonnegativeInteger(probe.diagnostic.bytesReceived) || probe.diagnostic.bytesReceived > 512 * 1024
      || probe.fetch.bytesReceived !== probe.diagnostic.bytesReceived
      || probe.sampleFunnel.bytesReceived !== probe.diagnostic.bytesReceived
      || probe.sampleFunnel.budgetExceeded !== false || !nonnegativeInteger(probe.diagnostic.durationMs)
      || (probe.diagnostic.outcome === "HEALTHY_EMPTY") !== (probe.sampleFunnel.plausibleItems === 0)
      || (probe.parse.schemaHealth === "empty") !== (count === 0)) {
      return { ok: false, reason: "probe counts, schema, or request/byte budgets are inconsistent" };
    }
    return { ok: true };
  } catch { return { ok: false, reason: "probe shape is incomplete" }; }
}

/** Recompute completeness and lifecycle checks; a serialized status/missingEvidence boolean never authorizes collection. */
export function validateAdmissionPacket(
  packet: AdmissionEvidencePacket,
  source: AdmissionSourceSnapshot,
  provider: AdmissionProviderSnapshot,
  now: string,
): ValidationResult {
  try {
    if (!isAdmissionInstant(now) || packet.version !== ADMISSION_EVIDENCE_VERSION || packet.policyVersion !== OBSERVATION_POLICY_VERSION
      || !isAdmissionInstant(packet.capturedAt) || !isAdmissionInstant(packet.expiresAt)
      || packet.capturedAt > now || packet.expiresAt <= now || packet.expiresAt <= packet.capturedAt) {
      return { ok: false, reason: "admission packet policy/version or current evidence lease is invalid" };
    }
    if (!/^[a-z0-9:._-]+$/.test(source.sourceId) || !/^[a-z0-9:._-]+$/.test(provider.id)
      || JSON.stringify(packet.source) !== JSON.stringify(sourceProjection(source))
      || JSON.stringify(packet.provider) !== JSON.stringify(providerProjection(provider))
      || provider.id !== source.providerId || !positiveInteger(source.governanceRevision) || !positiveInteger(provider.governanceRevision)) {
      return { ok: false, reason: "admission packet does not match current source/provider governance revisions and projections" };
    }
    if (source.optOut || !["allowed", "conditional"].includes(source.complianceState)) {
      return { ok: false, reason: "current source compliance or opt-out blocks admission" };
    }
    if (!isAdmissionInstant(source.policyExpiry) || packet.expiresAt > source.policyExpiry
      || !isAdmissionInstant(provider.evidenceCapturedAt) || provider.evidenceCapturedAt > packet.capturedAt
      || !positiveInteger(provider.evidenceLeaseDays)
      || Date.parse(packet.expiresAt) > Date.parse(provider.evidenceCapturedAt) + provider.evidenceLeaseDays * 86_400_000) {
      return { ok: false, reason: "packet exceeds the current source or provider evidence lease" };
    }
    if (!safeHttps(source.endpointUrl) || !exactAllowedHost(source.endpointUrl, provider.allowedHosts)
      || !safeHttps(provider.evidenceUrl) || !sha256(provider.evidenceHash)
      || !["syndication_feed", "public_api", "customer_auth", "partner_feed", "rss_feed", "public_html", "public_json_api", "ats_api"].includes(provider.mechanism)
      || !["published", "listed", "public", "indexable"].includes(provider.visibilityFilter ?? "")
      || provider.authClass !== "none" || !["minimal", "metadata_only"].includes(provider.contentScope ?? "")
      || !positiveInteger(provider.cadenceMinMinutes) || !positiveInteger(provider.cadenceMaxMinutes)
      || provider.cadenceMaxMinutes < provider.cadenceMinMinutes
      || !nonempty(provider.removalSemantics) || !nonempty(provider.robotsHandling)) {
      return { ok: false, reason: "current provider lacks a supported endpoint/auth/content/cadence/removal contract" };
    }
    if (!Array.isArray(packet.primaryEvidence) || packet.primaryEvidence.length < 1 || packet.primaryEvidence.length > 16
      || new Set(packet.primaryEvidence.map((entry) => entry.url)).size !== packet.primaryEvidence.length
      || !packet.primaryEvidence.every((entry) => safeHttps(entry.url) && sha256(entry.contentSha256)
        && isAdmissionInstant(entry.capturedAt) && entry.capturedAt <= packet.capturedAt
        && Date.parse(packet.expiresAt) <= Date.parse(entry.capturedAt) + provider.evidenceLeaseDays * 86_400_000)
      || !packet.primaryEvidence.some((entry) => entry.url === provider.evidenceUrl
        && entry.contentSha256 === provider.evidenceHash && entry.capturedAt === provider.evidenceCapturedAt)) {
      return { ok: false, reason: "primary evidence references are missing, duplicated, stale, or do not bind current provider evidence" };
    }
    if (!Array.isArray(packet.authorityActions) || !packet.authorityActions.includes("recurrent_private_shadow")
      || new Set(packet.authorityActions).size !== packet.authorityActions.length
      || packet.authorityActions.some((action) => !["recurrent_private_shadow", "public_minimal_metadata_canary"].includes(action))
      || !nonempty(packet.adjudicationRef) || packet.adjudicationRef.length > 1024) {
      return { ok: false, reason: "a recorded scoped adjudication is required for recurring collection" };
    }
    const probe = validateAdmissionProbe(packet.probe, source, provider, packet.capturedAt);
    if (!probe.ok) return probe;
    if (Date.parse(packet.capturedAt) - Date.parse(packet.probe.timestamp) > ADMISSION_POLICY.maximumLatestAgeMs) {
      return { ok: false, reason: "admission probe was stale when evidence was captured" };
    }
    const recomputed = buildEvidencePacket({
      ...source,
      provider,
      shadow: packet.probe,
      nowIso: packet.capturedAt,
    });
    // Entry topology is checked by the transition plane. Re-check the same
    // underlying authority while already in shadow without pretending to re-enter it.
    const promotion = decidePromotionToShadow({ compliance: source.complianceState, operational: "candidate", optOut: source.optOut }, recomputed, packet.probe);
    return promotion.ok ? { ok: true } : { ok: false, reason: promotion.reason };
  } catch { return { ok: false, reason: "admission packet shape is incomplete" }; }
}

export interface BuildAdmissionEvidenceInput {
  source: AdmissionSourceSnapshot;
  provider: AdmissionProviderSnapshot;
  primaryEvidence: PrimaryAdmissionEvidence[];
  authorityActions: AdmissionAuthorityAction[];
  probe: CandidateShadowResult;
  adjudicationRef: string;
  capturedAt: string;
  expiresAt: string;
}

/** Privileged bootstrap preparation. References must come from the separately recorded adjudication, not a model's authority claim. */
export async function buildAdmissionEvidence(input: BuildAdmissionEvidenceInput): Promise<
  | { ok: true; packet: AdmissionEvidencePacket; packetJson: string; packetSha256: string }
  | { ok: false; reason: string }
> {
  const packet: AdmissionEvidencePacket = {
    version: ADMISSION_EVIDENCE_VERSION,
    source: sourceProjection(input.source),
    provider: providerProjection(input.provider),
    primaryEvidence: input.primaryEvidence.map(({ url, contentSha256, capturedAt }) => ({ url, contentSha256, capturedAt })),
    authorityActions: [...input.authorityActions],
    probe: input.probe,
    adjudicationRef: input.adjudicationRef,
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
    policyVersion: OBSERVATION_POLICY_VERSION,
  };
  const validation = validateAdmissionPacket(packet, input.source, input.provider, input.capturedAt);
  if (!validation.ok) return validation;
  const packetJson = JSON.stringify(packet);
  if (new TextEncoder().encode(packetJson).byteLength > MAX_PACKET_BYTES) return { ok: false, reason: "admission packet exceeds bounded storage" };
  return { ok: true, packet, packetJson, packetSha256: await sha256Hex(packetJson) };
}

// One statement gives a coherent current snapshot and leaves D1 query headroom
// for bounded renewal groups. No snapshot is cached across requests/phases.
const LOAD_CURRENT_SQL = `SELECT
 json_object('sourceId',s.source_id,'providerId',s.provider_id,'displayName',s.display_name,
 'endpointUrl',s.endpoint_url,'companyToken',s.company_token,'discoveryProvenance',s.discovery_provenance,
 'complianceState',s.compliance_state,'operationalState',s.operational_state,'reviewDeadline',s.review_deadline,
 'policyExpiry',s.policy_expiry,'canaryMaxNewItemsPerTick',s.canary_max_new_items_per_tick,
 'optOut',s.opt_out,'governanceRevision',s.governance_revision,'lastTransitionHash',s.last_transition_hash) AS sourceJson,
 CASE WHEN p.id IS NULL THEN NULL ELSE json_object('id',p.id,'providerFamily',p.provider_family,
 'mechanism',p.mechanism,'authClass',p.auth_class,'endpointPattern',p.endpoint_pattern,'allowedHosts',p.allowed_hosts,
 'evidenceUrl',p.evidence_url,'evidenceHash',p.evidence_hash,'evidenceCapturedAt',p.evidence_captured_at,
 'visibilityFilter',p.visibility_filter,'contentScope',p.content_scope,'cadenceMinMinutes',p.cadence_min_minutes,
 'cadenceMaxMinutes',p.cadence_max_minutes,'rateGuidance',p.rate_guidance,'robotsHandling',p.robots_handling,
 'removalSemantics',p.removal_semantics,'evidenceLeaseDays',p.evidence_lease_days,'governanceRevision',p.governance_revision) END AS providerJson,
 CASE WHEN e.id IS NULL THEN NULL ELSE json_object('id',e.id,'sourceId',e.source_id,'providerId',e.provider_id,
 'sourceGovernanceRevision',e.source_governance_revision,'providerGovernanceRevision',e.provider_governance_revision,
 'endpointUrl',e.endpoint_url,'policyVersion',e.policy_version,'capturedAt',e.captured_at,'expiresAt',e.expires_at,
 'adjudicationRef',e.adjudication_ref,'packetJson',e.packet_json,'packetSha256',e.packet_sha256) END AS evidenceJson,
 EXISTS(SELECT 1 FROM source_opt_outs o WHERE o.source_id=s.source_id) AS durableOptOut
 FROM source_registry s LEFT JOIN provider_profiles p ON p.id=s.provider_id
 LEFT JOIN source_admission_evidence e ON e.id=(SELECT MAX(latest.id) FROM source_admission_evidence latest WHERE latest.source_id=s.source_id)
 WHERE s.source_id=?`;
const INSERT_EVIDENCE_SQL = `INSERT INTO source_admission_evidence (
 source_id, provider_id, source_governance_revision, provider_governance_revision,
 endpoint_url, policy_version, captured_at, expires_at, adjudication_ref, packet_json, packet_sha256
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/** Prepare a prevalidated packet for an atomic provider renewal batch. */
export function prepareAdmissionEvidenceInsert(
  db: AdmissionDatabase,
  source: AdmissionSourceSnapshot,
  provider: AdmissionProviderSnapshot,
  built: { packet: AdmissionEvidencePacket; packetJson: string; packetSha256: string },
): AdmissionStatement {
  return db.prepare(INSERT_EVIDENCE_SQL).bind(
    source.sourceId, source.providerId, source.governanceRevision, provider.governanceRevision,
    source.endpointUrl, built.packet.policyVersion, built.packet.capturedAt, built.packet.expiresAt,
    built.packet.adjudicationRef, built.packetJson, built.packetSha256,
  );
}

/** Privileged bootstrap write. SQL rechecks identity, leases, and packet bindings. */
export async function persistAdmissionEvidence(
  db: AdmissionDatabase,
  source: AdmissionSourceSnapshot,
  provider: AdmissionProviderSnapshot,
  built: { packet: AdmissionEvidencePacket; packetJson: string; packetSha256: string },
  now: string,
): Promise<CurrentAdmissionEvidenceResult> {
  const validation = validateAdmissionPacket(built.packet, source, provider, now);
  if (!validation.ok) return validation;
  if (await sha256Hex(built.packetJson) !== built.packetSha256) {
    return { ok: false, reason: "admission packet digest is invalid" };
  }
  try {
    const write = await prepareAdmissionEvidenceInsert(db, source, provider, built).run();
    if (!write.success) return { ok: false, reason: "admission evidence persistence returned an unsuccessful write" };
  } catch {
    return { ok: false, reason: "admission evidence was rejected by current identity or lease guards" };
  }
  return loadCurrentAdmissionEvidence(db, source.sourceId, now);
}

export async function loadCurrentAdmissionEvidence(db: AdmissionDatabase, sourceId: string, now: string): Promise<CurrentAdmissionEvidenceResult> {
  try {
    const snapshot = await db.prepare(LOAD_CURRENT_SQL).bind(sourceId).first<{
      sourceJson: string; providerJson: string | null; evidenceJson: string | null; durableOptOut: number;
    }>();
    const source = snapshot ? JSON.parse(snapshot.sourceJson) as AdmissionSourceSnapshot : null;
    if (!source || source.sourceId !== sourceId) return { ok: false, reason: "current source identity is unavailable" };
    source.optOut = Boolean(source.optOut) || Boolean(snapshot!.durableOptOut);
    if (source.optOut) return { ok: false, reason: "current durable opt-out blocks admission" };
    const provider = snapshot!.providerJson ? JSON.parse(snapshot!.providerJson) as AdmissionProviderSnapshot : null;
    if (!provider || provider.id !== source.providerId) return { ok: false, reason: "current provider identity is unavailable" };
    const evidence = snapshot!.evidenceJson ? JSON.parse(snapshot!.evidenceJson) as AdmissionEvidenceRecord : null;
    if (!evidence || !positiveInteger(evidence.id) || !sha256(evidence.packetSha256)
      || typeof evidence.packetJson !== "string" || new TextEncoder().encode(evidence.packetJson).byteLength > MAX_PACKET_BYTES
      || await sha256Hex(evidence.packetJson) !== evidence.packetSha256) {
      return { ok: false, reason: "current immutable admission evidence is unavailable or its digest is invalid" };
    }
    const packet = JSON.parse(evidence.packetJson) as AdmissionEvidencePacket;
    if (evidence.sourceId !== sourceId || evidence.providerId !== provider.id || evidence.endpointUrl !== source.endpointUrl
      || evidence.sourceGovernanceRevision !== source.governanceRevision || evidence.providerGovernanceRevision !== provider.governanceRevision
      || evidence.policyVersion !== packet.policyVersion || evidence.capturedAt !== packet.capturedAt
      || evidence.expiresAt !== packet.expiresAt || evidence.adjudicationRef !== packet.adjudicationRef) {
      return { ok: false, reason: "immutable evidence metadata does not match the packet and current identity" };
    }
    const validation = validateAdmissionPacket(packet, source, provider, now);
    return validation.ok ? { ok: true, source, provider, evidence, packet } : validation;
  } catch { return { ok: false, reason: "current admission evidence could not be read or validated" }; }
}
