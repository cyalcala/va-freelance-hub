import { MAX_GREENHOUSE_EVIDENCE_BYTES, replayGreenhouseItemEvidence, type GreenhouseItemEvidenceReceipt } from "../../../../packages/scraper/greenhouse-item-evidence";
import { greenhousePostingDate } from "../../../../packages/scraper/ats";
import { sanitizeSourceUrl } from "../../../../packages/scraper/urls";
import { sha256Hex } from "../../../../packages/scraper/contentHash";
import { hashLakeStageCandidate, hashLakeStageManifest, type LakeStageCandidateDescriptor } from "./lake-publication-contract";
import { isIssuedLakePublicationAuthoritySnapshot, type LakePublicationAuthoritySnapshot } from "./lake-publication-authority";
import type { LakeInspectIntent } from "./lake-publication-intent";
import type { LakeEvidenceSnapshot, LakeEvidenceCandidateRow } from "./lake-evidence-reader";
import { inspectLakeItemGeo, type LakeItemGeoInspection } from "./lake-item-geo-inspection";

export type LakeItemBindingState = "HELD" | "REJECTED" | "UNKNOWN";
export type LakeItemFreshness = "UNKNOWN" | "INVALID" | "FUTURE" | "STALE" | "WITHIN_WINDOW";
export interface LakeNativeItemBinding {
  sourceId: string; candidateId: number; rawObservationId: number; retainedSha256: string;
  index: number; itemMaterialSha256: string; postingId: number; requisitionId: number; stageMaterialSha256: string;
}
export interface LakeItemBindingOutcome {
  lakeCandidateId: number; state: LakeItemBindingState; reasons: string[];
  freshness: LakeItemFreshness; binding?: LakeNativeItemBinding;
  nativeGeoInspection?: LakeItemGeoInspection;
}
export interface LakeItemBindingInspection {
  version: "lake-item-binding-v1"; mappingProfile: "greenhouse-private-native-v1";
  operationId: string; sourceId: string; state: LakeItemBindingState; reasons: string[];
  outcomes: LakeItemBindingOutcome[]; publicationAuthorized: false; qualificationAuthorized: false;
  publishedCount: 0; syncedCount: 0;
}
export interface LakeItemBindingInput {
  intent: LakeInspectIntent; snapshot: LakeEvidenceSnapshot;
  currentAuthority: LakePublicationAuthoritySnapshot; now: string;
}

const positiveId = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max && !v.includes("\0");
const nullableText = (v: unknown, max: number) => v === null || text(v, max);
const canonicalClock = (v: unknown): v is string => typeof v === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && greenhousePostingDate(v) === v;
const operation = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && /^[a-zA-Z0-9:._-]+$/.test(v);
const source = (v: unknown): v is string => typeof v === "string" && v.length <= 200 && /^greenhouse:[a-z0-9._-]+$/.test(v);
const encoder = new TextEncoder();
const BASE_HOLDS = ["LEGACY_COLLECTION_UNVERIFIED", "COLLECTION_PERMISSION_UNKNOWN", "COMPANY_NOT_OBSERVED",
  "OBSERVATION_ADMISSION_IDENTITY_UNKNOWN", "OBSERVATION_ORIGIN_UNVERIFIED", "OBSERVATION_ROBOTS_UNVERIFIED",
  "OBSERVATION_CADENCE_UNVERIFIED", "OBSERVATION_SHARED_BUDGET_UNVERIFIED",
  "ITEM_REMOTE_PROOF_UNKNOWN", "PH_EXCLUSIONS_UNKNOWN", "ITEM_SAFETY_UNKNOWN", "APPLICATION_LIVENESS_UNKNOWN",
  "CANONICAL_IDENTITY_UNKNOWN", "TAXONOMY_UNKNOWN"];

function descriptorValid(v: LakeStageCandidateDescriptor): boolean {
  return !!v && Object.keys(v).length === 4 && ["lakeCandidateId", "lakeFingerprint", "sourceUrl", "materialSha256"].every(k => Object.hasOwn(v, k))
    && positiveId(v.lakeCandidateId) && text(v.lakeFingerprint, 128) && !!v.lakeFingerprint.trim()
    && text(v.sourceUrl, 2048) && sanitizeSourceUrl(v.sourceUrl) === v.sourceUrl && hash(v.materialSha256);
}
function candidateValid(row: LakeEvidenceCandidateRow): boolean {
  return !!row && positiveId(row.id) && positiveId(row.raw_observation_id) && text(row.source_id, 200)
    && text(row.source_platform, 100) && !!row.source_platform.trim() && text(row.source_url, 2048)
    && text(row.title, 300) && !!row.title.trim() && nullableText(row.company, 200)
    && nullableText(row.location_type, 20) && nullableText(row.location_raw, 500)
    && nullableText(row.description, 2000) && nullableText(row.application_url, 2048)
    && nullableText(row.posted_at, 64) && text(row.fingerprint_hash, 128) && !!row.fingerprint_hash.trim();
}
function outcome(id: number, state: LakeItemBindingState, reason: string, freshness: LakeItemFreshness = "UNKNOWN"): LakeItemBindingOutcome {
  return { lakeCandidateId: id, state, reasons: [reason], freshness };
}
function freshnessAt(postedAt: string | null, invalid: boolean, now: string): LakeItemFreshness {
  if (invalid) return "INVALID";
  if (postedAt === null) return "UNKNOWN";
  const age = Date.parse(now) - Date.parse(postedAt);
  return age < 0 ? "FUTURE" : age > 30 * 86_400_000 ? "STALE" : "WITHIN_WINDOW";
}

/** Read-only private correspondence. This issues no collection, qualification or public authority. */
export async function inspectLakeItemBindings(input: LakeItemBindingInput): Promise<LakeItemBindingInspection> {
  const intent = input?.intent;
  const result: LakeItemBindingInspection = {
    version: "lake-item-binding-v1", mappingProfile: "greenhouse-private-native-v1",
    operationId: operation(intent?.operationKey) ? intent.operationKey : "",
    sourceId: source(intent?.sourceId) ? intent.sourceId : "", state: "UNKNOWN", reasons: [], outcomes: [],
    publicationAuthorized: false, qualificationAuthorized: false, publishedCount: 0, syncedCount: 0,
  };
  const stop = (reason: string, state: LakeItemBindingState = "UNKNOWN") => ({ ...result, state, reasons: [reason] });
  if (!input || !intent || !operation(intent.operationKey) || !source(intent.sourceId) || intent.revision !== 0
    || !canonicalClock(intent.stagedAt) || !canonicalClock(input.now) || intent.stagedAt > input.now || !hash(intent.manifestHash)
    || !Array.isArray(intent.descriptors) || intent.descriptors.length < 1 || intent.descriptors.length > 200
    || !intent.descriptors.every(descriptorValid)) return stop("INVALID_INSPECTION_INPUT");
  const descriptors = intent.descriptors;
  if (new Set(descriptors.map(d => d.lakeCandidateId)).size !== descriptors.length
    || new Set(descriptors.map(d => d.sourceUrl)).size !== descriptors.length
    || descriptors.some((d, i) => i > 0 && d.lakeCandidateId <= descriptors[i - 1]!.lakeCandidateId)
    || await hashLakeStageManifest(intent.sourceId, descriptors) !== intent.manifestHash) return stop("STAGED_MANIFEST_INVALID", "REJECTED");
  const authority = input.currentAuthority;
  if (!isIssuedLakePublicationAuthoritySnapshot(authority)) return stop("AUTHORITY_CONTEXT_NOT_ISSUED");
  const identity = authority.sourceIdentity;
  const tenant = intent.sourceId.slice("greenhouse:".length);
  const endpoint = `https://boards-api.greenhouse.io/v1/boards/${tenant}/jobs`;
  if (identity.sourceId !== intent.sourceId || identity.providerFamily !== "greenhouse" || identity.mechanism !== "ats_api"
    || identity.companyToken !== tenant || identity.endpointUrl !== endpoint
    || authority.sourceIdentityHash !== await sha256Hex(JSON.stringify(identity))) return stop("AUTHORITY_SOURCE_CONTEXT_MISMATCH", "REJECTED");
  const cas = authority.cas;
  if (!canonicalClock(cas.policyExpiry) || cas.policyExpiry <= input.now
    || !canonicalClock(cas.providerEvidenceCapturedAt) || cas.providerEvidenceCapturedAt > input.now
    || !positiveId(cas.providerEvidenceLeaseDays)
    || Date.parse(cas.providerEvidenceCapturedAt) + cas.providerEvidenceLeaseDays * 86_400_000 <= Date.parse(input.now)
    || !canonicalClock(cas.admissionCapturedAt) || cas.admissionCapturedAt > input.now
    || !canonicalClock(cas.admissionExpiresAt) || cas.admissionExpiresAt <= input.now) return stop("AUTHORITY_CONTEXT_EXPIRED");
  const snapshot = input.snapshot;
  if (!snapshot || snapshot.sourceId !== intent.sourceId || snapshot.publicationAuthorized !== false || snapshot.qualificationAuthorized !== false
    || !Array.isArray(snapshot.candidates) || !Array.isArray(snapshot.rawObservations) || !Array.isArray(snapshot.sightingMetadata)
    || snapshot.candidates.length > 200 || snapshot.rawObservations.length > 200 || snapshot.sightingMetadata.length > 200) return stop("READ_SNAPSHOT_INVALID");
  if (snapshot.candidates.some(c => !positiveId(c?.id)) || new Set(snapshot.candidates.map(c => c.id)).size !== snapshot.candidates.length
    || snapshot.rawObservations.some(r => !positiveId(r?.id)) || new Set(snapshot.rawObservations.map(r => r.id)).size !== snapshot.rawObservations.length
    || snapshot.sightingMetadata.some(m => !positiveId(m?.candidate_id))
    || new Set(snapshot.sightingMetadata.map(m => m.candidate_id)).size !== snapshot.sightingMetadata.length) return stop("READ_SNAPSHOT_IDS_INVALID");
  let bytes = 0;
  for (const raw of snapshot.rawObservations) {
    if (typeof raw.raw_payload !== "string") return stop("RAW_SNAPSHOT_INVALID");
    bytes += encoder.encode(raw.raw_payload).byteLength;
    if (bytes > MAX_GREENHOUSE_EVIDENCE_BYTES) return stop("RAW_SNAPSHOT_OVER_BUDGET");
  }
  const candidates = new Map(snapshot.candidates.map(c => [c.id, c]));
  const raws = new Map(snapshot.rawObservations.map(r => [r.id, r]));
  const metadatas = new Map(snapshot.sightingMetadata.map(m => [m.candidate_id, m]));
  const replayed = new Map<number, { evidence: GreenhouseItemEvidenceReceipt; sourceMatches: boolean } | null>();
  result.state = "HELD";
  for (const descriptor of descriptors) {
    const id = descriptor.lakeCandidateId;
    const row = candidates.get(id);
    if (!row) { result.outcomes.push(outcome(id, "UNKNOWN", "CANDIDATE_NOT_FOUND")); continue; }
    if (!candidateValid(row)) { result.outcomes.push(outcome(id, "UNKNOWN", "CANDIDATE_MATERIAL_INVALID")); continue; }
    const raw = raws.get(row.raw_observation_id);
    if (!raw) { result.outcomes.push(outcome(id, "UNKNOWN", "RAW_OBSERVATION_NOT_FOUND")); continue; }
    if (row.source_id !== intent.sourceId || raw.source_id !== intent.sourceId || raw.fetch_url !== endpoint
      || raw.http_status !== 200 || raw.source_platform !== row.source_platform) {
      result.outcomes.push(outcome(id, "REJECTED", "RAW_SOURCE_BINDING_MISMATCH")); continue;
    }
    if (!replayed.has(raw.id)) {
      try {
        const evidence = replayGreenhouseItemEvidence(raw.raw_payload, raw.content_hash);
        const envelope = JSON.parse(evidence.payload);
        // Source context is fixed for this inspection; validate it once per raw.
        const sourceMatches = envelope.source.sourceId === intent.sourceId && envelope.source.endpointUrl === endpoint
          && envelope.source.httpStatus === raw.http_status && envelope.source.completedAt <= input.now;
        replayed.set(raw.id, { evidence, sourceMatches });
      }
      catch { replayed.set(raw.id, null); }
    }
    const replay = replayed.get(raw.id);
    if (!replay) { result.outcomes.push(outcome(id, "REJECTED", "NATIVE_REPLAY_INVALID")); continue; }
    if (!replay.sourceMatches) {
      result.outcomes.push(outcome(id, "REJECTED", "NATIVE_SOURCE_BINDING_MISMATCH")); continue;
    }
    const evidence = replay.evidence;
    const sourceUrl = sanitizeSourceUrl(row.source_url);
    if (!sourceUrl || sourceUrl.length > 2048) { result.outcomes.push(outcome(id, "REJECTED", "CANDIDATE_SOURCE_URL_INVALID")); continue; }
    const matches = evidence.items.filter(item => item.facts.absoluteUrl.state === "value"
      && sanitizeSourceUrl(item.facts.absoluteUrl.value) === sourceUrl);
    if (matches.length !== 1) { result.outcomes.push(outcome(id, "HELD", matches.length ? "NATIVE_ITEM_AMBIGUOUS" : "NATIVE_ITEM_NOT_FOUND")); continue; }
    const item = matches[0]!;
    const facts = item.facts;
    if (item.assessment.reasons.includes("DUPLICATE_POSTING_ID")) {
      result.outcomes.push(outcome(id, "REJECTED", "NATIVE_POSTING_ID_AMBIGUOUS")); continue;
    }
    if (item.assessment.sourceUrlAttribution !== "TENANT_MATCH") { result.outcomes.push(outcome(id, "REJECTED", "NATIVE_POSTING_URL_MISMATCH")); continue; }
    if (facts.internalJobId.state === "null") { result.outcomes.push(outcome(id, "REJECTED", "NATIVE_PROSPECT")); continue; }
    if (item.itemShape !== "object" || facts.postingId.state !== "value" || facts.internalJobId.state !== "value"
      || facts.title.state !== "value" || !facts.title.value.trim()) { result.outcomes.push(outcome(id, "UNKNOWN", "NATIVE_IDENTITY_UNKNOWN")); continue; }
    const postedAt = facts.firstPublished.state === "value" ? greenhousePostingDate(facts.firstPublished.value) : null;
    const invalidDate = facts.firstPublished.state === "invalid" || facts.firstPublished.state === "value" && postedAt === null;
    const freshness = freshnessAt(postedAt, invalidDate, input.now);
    const locationRaw = facts.locationName.state === "value" ? facts.locationName.value : null;
    const locationText = locationRaw?.replace(/<[^>]*>/g, "").trim();
    const evidenceText = locationText ? `Location: ${locationText}` : null;
    // This profile exposes absent company/remoteness honestly. It never rewrites
    // a staged hash or treats a legacy schema default as native evidence.
    const material = { lakeCandidateId: id, lakeFingerprint: row.fingerprint_hash, title: facts.title.value.trim(),
      company: null, sourceUrl, applicationUrl: sourceUrl, sourcePlatform: row.source_platform.trim(),
      locationType: "unknown" as const, locationRaw, postedAt, evidenceText };
    if (row.title !== facts.title.value || (row.location_raw ?? "") !== (locationRaw ?? "")
      || (row.description ?? "") !== (evidenceText ?? "") || row.posted_at !== postedAt
      || sanitizeSourceUrl(row.application_url) !== sourceUrl
      || !(row.company === null || row.company === "" || row.company === "Unknown")
      || !(row.location_type === null || row.location_type === "remote" || row.location_type === "unknown")) {
      result.outcomes.push(outcome(id, "HELD", "CANDIDATE_NATIVE_MATERIAL_MISMATCH", freshness)); continue;
    }
    const stageMaterialSha256 = await hashLakeStageCandidate(material);
    if (descriptor.sourceUrl !== sourceUrl || descriptor.lakeFingerprint !== row.fingerprint_hash
      || descriptor.materialSha256 !== stageMaterialSha256) {
      result.outcomes.push(outcome(id, "HELD", "STAGED_MATERIAL_MISMATCH", freshness)); continue;
    }
    const metadata = metadatas.get(id);
    if (!metadata || metadata.complete !== true || !count(metadata.sighting_count)
      || !count(metadata.distinct_raw_observation_count) || !count(metadata.distinct_source_count)
      || !count(metadata.distinct_source_url_count) || !count(metadata.mismatched_sighting_count)
      || metadata.mismatched_sighting_count > metadata.sighting_count) {
      result.outcomes.push(outcome(id, "HELD", "LINEAGE_METADATA_INCOMPLETE", freshness)); continue;
    }
    if (metadata.sighting_count !== 0 || metadata.distinct_raw_observation_count !== 0 || metadata.distinct_source_count !== 0
      || metadata.distinct_source_url_count !== 0 || metadata.mismatched_sighting_count !== 0 || metadata.latest_observed_at !== null) {
      result.outcomes.push(outcome(id, "HELD", "LINEAGE_SIGHTINGS_UNRECONCILED", freshness)); continue;
    }
    // Retained title/location are interpretable only after exact correspondence,
    // complete lineage and current freshness. They never prove omitted fields.
    const nativeGeoInspection = freshness === "WITHIN_WINDOW" && item.assessment.disposition !== "REJECTED"
      ? inspectLakeItemGeo(facts) : undefined;
    const state: LakeItemBindingState = freshness === "INVALID" || freshness === "FUTURE" || freshness === "STALE"
      || item.assessment.disposition === "REJECTED" || nativeGeoInspection?.state === "REJECTED" ? "REJECTED" : "HELD";
    result.outcomes.push({ lakeCandidateId: id, state, freshness,
      reasons: [...BASE_HOLDS, ...(freshness === "UNKNOWN" ? ["ORIGINAL_DATE_UNKNOWN"] : freshness !== "WITHIN_WINDOW" ? [`ORIGINAL_DATE_${freshness}`] : []),
        ...(item.assessment.disposition === "REJECTED" ? ["NATIVE_CAPTURE_REJECTED"] : []),
        ...(nativeGeoInspection?.reasons ?? [])],
      ...(nativeGeoInspection ? { nativeGeoInspection } : {}),
      binding: { sourceId: intent.sourceId, candidateId: id, rawObservationId: raw.id, retainedSha256: evidence.retainedSha256,
        index: item.index, itemMaterialSha256: item.materialSha256, postingId: facts.postingId.value,
        requisitionId: facts.internalJobId.value, stageMaterialSha256 } });
  }
  return result;
}
