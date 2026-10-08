/**
 * Private native facts from the existing Greenhouse list response. No fetch or
 * publication occurs here. Collector-supplied identity/clocks and matching
 * hashes are not independent collection, origin or item-clearance proof.
 */
import { greenhousePostingDate } from "../../packages/scraper/ats";
import { sanitizeSourceUrl } from "../../packages/scraper/urls";
import { MAX_COMPLETE_RAW_PAYLOAD_BYTES, MAX_RAW_PAYLOAD_CHARS, sha256Hex } from "./lake-shared";

export const GREENHOUSE_ITEM_EVIDENCE_VERSION = "greenhouse-item-evidence-v1";
const MAX_POSTING_AGE_MS = 30 * 86_400_000; // ACCEPTED_PARAMETERS freshness.max_days_since_post
const encoder = new TextEncoder();
const HASH = /^[a-f0-9]{64}$/;
const FACT_KEYS = ["postingId", "internalJobId", "title", "absoluteUrl", "locationName", "firstPublished", "updatedAt"] as const;
const SOURCE_KEYS = ["sourceId", "tenantSlug", "endpointUrl", "httpStatus", "startedAt", "completedAt"];
const ENVELOPE_KEYS = ["version", "source", "responseSha256", "complete", "itemCount", "membershipSha256",
  "collectionAuthority", "admissionSourceIdentity", "publicationAuthorized", "items"];

export class GreenhouseItemEvidenceError extends Error {
  constructor(readonly code: "GREENHOUSE_ITEM_EVIDENCE_INVALID" | "GREENHOUSE_ITEM_EVIDENCE_OVERSIZE", reason: string) {
    super(`${code}: ${reason}`);
    this.name = "GreenhouseItemEvidenceError";
  }
}
const invalid = (reason: string): never => { throw new GreenhouseItemEvidenceError("GREENHOUSE_ITEM_EVIDENCE_INVALID", reason); };
const oversized = (): never => { throw new GreenhouseItemEvidenceError("GREENHOUSE_ITEM_EVIDENCE_OVERSIZE", "Complete evidence exceeds retained storage bounds"); };

export type NativeFact<T> = { state: "missing" | "null" }
  | { state: "invalid"; valueType: "string" | "number" | "boolean" | "array" | "object" }
  | { state: "value"; value: T };
export interface GreenhouseNativeFacts {
  postingId: NativeFact<number>;
  internalJobId: NativeFact<number>;
  title: NativeFact<string>;
  absoluteUrl: NativeFact<string>;
  locationName: NativeFact<string>;
  firstPublished: NativeFact<string>;
  updatedAt: NativeFact<string>;
}
export interface GreenhouseEvidenceInput {
  sourceId: string;
  tenantSlug: string;
  endpointUrl: string;
  httpStatus: number;
  startedAt: string;
  completedAt: string;
  responseBody: string;
}
type Source = Omit<GreenhouseEvidenceInput, "responseBody">;
type Shape = "object" | "null" | "invalid";
export interface GreenhousePrivateAssessment {
  disposition: "HELD" | "REJECTED";
  reasons: string[];
  vacancy: "PROSPECT" | "REQUISITION_REPORTED" | "UNKNOWN";
  freshness: "UNKNOWN" | "INVALID" | "FUTURE" | "STALE" | "WITHIN_WINDOW";
  postedAt: string | null;
  providerPostingIdentity: string | null;
  providerRequisitionIdentity: string | null;
  sourceUrlAttribution: "TENANT_MATCH" | "MISMATCH" | "INVALID" | "UNKNOWN";
  collectionAuthority: "UNVERIFIED";
  admissionSourceIdentity: "UNKNOWN";
  fullRemote: "UNKNOWN";
  phExclusions: "UNKNOWN";
  safety: "UNKNOWN";
  applicationLiveness: "UNKNOWN";
  canonicalIdentity: "UNKNOWN";
  taxonomy: "UNKNOWN";
  publicationAuthorized: false;
}
export interface GreenhouseItemEvidence {
  index: number;
  itemShape: Shape;
  facts: GreenhouseNativeFacts;
  materialSha256: string;
  assessment: GreenhousePrivateAssessment;
}
export interface GreenhouseItemEvidenceReceipt {
  payload: string;
  retainedSha256: string;
  responseSha256: string;
  itemCount: number;
  items: GreenhouseItemEvidence[];
  publicationAuthorized: false;
}
interface RetainedItem { index: number; itemShape: Shape; facts: GreenhouseNativeFacts }

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max && !value.includes("\0");
}
function canonicalClock(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && greenhousePostingDate(value) === value;
}
function sourceOf(value: unknown): Source {
  if (!exactKeys(value, SOURCE_KEYS)) return invalid("Collector source shape is invalid");
  const { sourceId, tenantSlug, endpointUrl, httpStatus, startedAt, completedAt } = value;
  if (typeof tenantSlug !== "string" || !/^[a-z0-9._-]+$/.test(tenantSlug)
    || tenantSlug === "." || tenantSlug === ".."
    || sourceId !== `greenhouse:${tenantSlug}`
    || endpointUrl !== `https://boards-api.greenhouse.io/v1/boards/${tenantSlug}/jobs`
    || httpStatus !== 200 || !canonicalClock(startedAt) || !canonicalClock(completedAt)
    || completedAt < startedAt) return invalid("Exact tenant, list endpoint, successful status and ordered UTC clocks are required");
  return { sourceId, tenantSlug, endpointUrl, httpStatus, startedAt, completedAt } as Source;
}
function bounds(payload: string): void {
  if (payload.length > MAX_RAW_PAYLOAD_CHARS || encoder.encode(payload).byteLength > MAX_COMPLETE_RAW_PAYLOAD_BYTES) oversized();
}
function valueType(value: unknown): Extract<NativeFact<never>, { state: "invalid" }>["valueType"] {
  return Array.isArray(value) ? "array" : typeof value as "string" | "number" | "boolean" | "object";
}
function nativeFact<T>(input: Record<string, unknown>, key: string, accepts: (value: unknown) => value is T): NativeFact<T> {
  if (!Object.hasOwn(input, key)) return { state: "missing" };
  const value = input[key];
  if (value === null) return { state: "null" };
  return accepts(value) ? { state: "value", value } : { state: "invalid", valueType: valueType(value) };
}
function projectItem(item: unknown, index: number): RetainedItem {
  const input = record(item) ? item : {};
  const locationName = !Object.hasOwn(input, "location") ? { state: "missing" } as const
    : input.location === null ? { state: "null" } as const
    : record(input.location) ? nativeFact(input.location, "name", (value): value is string => validText(value, 500))
    : { state: "invalid", valueType: valueType(input.location) } as const;
  return { index, itemShape: record(item) ? "object" : item === null ? "null" : "invalid", facts: {
    postingId: nativeFact(input, "id", positiveId),
    internalJobId: nativeFact(input, "internal_job_id", positiveId),
    title: nativeFact(input, "title", (value): value is string => validText(value, 300)),
    absoluteUrl: nativeFact(input, "absolute_url", (value): value is string => validText(value, 2048)),
    locationName,
    firstPublished: nativeFact(input, "first_published", (value): value is string => validText(value, 64)),
    updatedAt: nativeFact(input, "updated_at", (value): value is string => validText(value, 64)),
  } };
}

function assess(item: RetainedItem, source: Source, duplicate: boolean): GreenhousePrivateAssessment {
  const { facts, itemShape } = item;
  const reasons: string[] = [];
  let rejected = itemShape !== "object";
  if (rejected) reasons.push("ITEM_SHAPE_INVALID");
  const prospect = facts.internalJobId.state === "null";
  if (prospect) { reasons.push("PROSPECT_POST"); rejected = true; }
  else if (facts.internalJobId.state !== "value") reasons.push("VACANCY_IDENTITY_UNKNOWN");
  if (facts.postingId.state !== "value") reasons.push("POSTING_ID_UNKNOWN");
  if (duplicate) { reasons.push("DUPLICATE_POSTING_ID"); rejected = true; }
  if (facts.title.state !== "value" || !facts.title.value.trim()) reasons.push("TITLE_UNVERIFIED");

  let freshness: GreenhousePrivateAssessment["freshness"] = "UNKNOWN";
  let postedAt: string | null = null;
  if (facts.firstPublished.state === "missing" || facts.firstPublished.state === "null") reasons.push("POSTING_DATE_UNKNOWN");
  else {
    postedAt = facts.firstPublished.state === "value" ? greenhousePostingDate(facts.firstPublished.value) : null;
    const ageMs = postedAt === null ? null : Date.parse(source.completedAt) - Date.parse(postedAt);
    if (ageMs === null) { freshness = "INVALID"; reasons.push("POSTING_DATE_INVALID"); rejected = true; }
    else if (ageMs < 0) { freshness = "FUTURE"; reasons.push("FUTURE_POSTING_DATE"); rejected = true; }
    else if (ageMs > MAX_POSTING_AGE_MS) { freshness = "STALE"; reasons.push("STALE_POSTING"); rejected = true; }
    else freshness = "WITHIN_WINDOW";
  }

  let sourceUrlAttribution: GreenhousePrivateAssessment["sourceUrlAttribution"] = "UNKNOWN";
  if (facts.absoluteUrl.state === "value") {
    const safe = sanitizeSourceUrl(facts.absoluteUrl.value);
    if (!safe) { sourceUrlAttribution = "INVALID"; reasons.push("SOURCE_URL_INVALID"); rejected = true; }
    else {
      const url = new URL(safe);
      // Observing this tenant/path is not permission to fetch that host or page.
      if (url.hostname === "boards.greenhouse.io" || url.hostname === "job-boards.greenhouse.io") {
        const path = url.pathname.split("/").filter(Boolean);
        if (path[0] !== source.tenantSlug) {
          sourceUrlAttribution = "MISMATCH"; reasons.push("SOURCE_URL_TENANT_MISMATCH"); rejected = true;
        } else if (facts.postingId.state === "value" && path[1] === "jobs" && path[2] === String(facts.postingId.value) && path.length === 3) {
          sourceUrlAttribution = "TENANT_MATCH";
        } else { sourceUrlAttribution = "MISMATCH"; reasons.push("SOURCE_URL_POSTING_ID_MISMATCH"); rejected = true; }
      } else reasons.push("SOURCE_URL_ATTRIBUTION_UNKNOWN");
    }
  } else reasons.push("SOURCE_URL_UNKNOWN");
  reasons.push("COLLECTION_AUTHORITY_UNVERIFIED", "ADMISSION_SOURCE_IDENTITY_UNKNOWN",
    "COLLECTION_PERMISSION_UNKNOWN", "CURRENT_ADMISSION_UNKNOWN", "ROBOTS_UNVERIFIED",
    "CADENCE_UNVERIFIED", "SHARED_BUDGET_UNVERIFIED", "SOURCE_ORIGIN_UNVERIFIED", "REMOTE_PROOF_MISSING",
    "PH_EXCLUSIONS_UNCLEARED", "ITEM_SAFETY_UNVERIFIED", "APPLICATION_LIVENESS_UNKNOWN",
    "CANONICAL_CONSOLIDATION_UNRESOLVED", "TAXONOMY_UNVERIFIED");
  return {
    disposition: rejected ? "REJECTED" : "HELD", reasons,
    vacancy: prospect ? "PROSPECT" : facts.internalJobId.state === "value" && facts.postingId.state === "value" ? "REQUISITION_REPORTED" : "UNKNOWN",
    freshness, postedAt,
    providerPostingIdentity: facts.postingId.state === "value" ? `${source.sourceId}:posting:${facts.postingId.value}` : null,
    providerRequisitionIdentity: facts.internalJobId.state === "value" ? `${source.sourceId}:requisition:${facts.internalJobId.value}` : null,
    sourceUrlAttribution, collectionAuthority: "UNVERIFIED", admissionSourceIdentity: "UNKNOWN",
    fullRemote: "UNKNOWN", phExclusions: "UNKNOWN", safety: "UNKNOWN", applicationLiveness: "UNKNOWN",
    canonicalIdentity: "UNKNOWN", taxonomy: "UNKNOWN", publicationAuthorized: false,
  };
}

function receipt(source: Source, responseSha256: string, nativeItems: RetainedItem[]): GreenhouseItemEvidenceReceipt {
  const counts = new Map<number, number>();
  for (const item of nativeItems) if (item.facts.postingId.state === "value") {
    const id = item.facts.postingId.value;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const items: GreenhouseItemEvidence[] = [];
  let chars = 0, bytes = 0;
  for (const item of nativeItems) {
    const entry = { ...item, materialSha256: sha256Hex(JSON.stringify(item)),
      assessment: assess(item, source, item.facts.postingId.state === "value" && counts.get(item.facts.postingId.value)! > 1) };
    const encoded = JSON.stringify(entry);
    chars += encoded.length + 1; bytes += encoder.encode(encoded).byteLength + 1;
    if (chars > MAX_RAW_PAYLOAD_CHARS || bytes > MAX_COMPLETE_RAW_PAYLOAD_BYTES) oversized();
    items.push(entry);
  }
  const membershipSha256 = sha256Hex(JSON.stringify(items.map(({ index, materialSha256 }) => ({ index, materialSha256 }))));
  const payload = JSON.stringify({ version: GREENHOUSE_ITEM_EVIDENCE_VERSION, source, responseSha256,
    complete: true, itemCount: items.length, membershipSha256, collectionAuthority: "UNVERIFIED",
    admissionSourceIdentity: "UNKNOWN", publicationAuthorized: false, items });
  bounds(payload);
  return { payload, retainedSha256: sha256Hex(payload), responseSha256, itemCount: items.length, items, publicationAuthorized: false };
}

/** `data` is transient parsed provider data for the existing extractor, never stored. */
export function createGreenhouseItemEvidence(input: GreenhouseEvidenceInput): GreenhouseItemEvidenceReceipt & { data: Record<string, unknown> & { jobs: unknown[] } } {
  if (!exactKeys(input, [...SOURCE_KEYS, "responseBody"]) || typeof input.responseBody !== "string") return invalid("Collector input is invalid");
  const { responseBody, ...sourceInput } = input;
  const source = sourceOf(sourceInput);
  if (encoder.encode(responseBody).byteLength > MAX_COMPLETE_RAW_PAYLOAD_BYTES) oversized();
  let data: unknown;
  try { data = JSON.parse(responseBody); } catch { return invalid("Response is not JSON"); }
  if (!record(data) || !Array.isArray(data.jobs)) return invalid("Response requires a jobs array");
  // Reserve a bounded projection before constructing assessments. Tiny malformed
  // array members must not amplify a small response into unbounded working data.
  const nativeItems: RetainedItem[] = [];
  let projectedChars = 0;
  for (let index = 0; index < data.jobs.length; index++) {
    const item = projectItem(data.jobs[index], index);
    projectedChars += JSON.stringify(item).length;
    if (projectedChars > MAX_RAW_PAYLOAD_CHARS) oversized();
    nativeItems.push(item);
  }
  return { ...receipt(source, sha256Hex(responseBody), nativeItems), data: data as Record<string, unknown> & { jobs: unknown[] } };
}

function replayFact<T>(value: unknown, accepts: (value: unknown) => value is T): NativeFact<T> {
  if (!record(value)) return invalid("Native fact shape is invalid");
  if ((value.state === "missing" || value.state === "null") && exactKeys(value, ["state"])) return { state: value.state };
  if (value.state === "invalid" && exactKeys(value, ["state", "valueType"])
    && typeof value.valueType === "string" && ["string", "number", "boolean", "array", "object"].includes(value.valueType)) {
    return { state: "invalid", valueType: value.valueType as Extract<NativeFact<T>, { state: "invalid" }>["valueType"] };
  }
  if (value.state === "value" && exactKeys(value, ["state", "value"]) && accepts(value.value)) return { state: "value", value: value.value };
  return invalid("Native fact type is invalid");
}

/**
 * Verify retained integrity and recompute private assessments. Expected SHA is
 * read from internal storage; even a caller forging both bytes and SHA cannot
 * upgrade the unverified collector to collection or publication authority.
 */
export function replayGreenhouseItemEvidence(payload: string, expectedRetainedSha256: string): GreenhouseItemEvidenceReceipt {
  if (typeof payload !== "string" || typeof expectedRetainedSha256 !== "string" || !HASH.test(expectedRetainedSha256)) return invalid("Retained bytes and digest are required");
  bounds(payload);
  if (sha256Hex(payload) !== expectedRetainedSha256) return invalid("Retained byte digest does not match");
  let envelope: unknown;
  try { envelope = JSON.parse(payload); } catch { return invalid("Retained envelope is not JSON"); }
  if (!exactKeys(envelope, ENVELOPE_KEYS) || envelope.version !== GREENHOUSE_ITEM_EVIDENCE_VERSION
    || envelope.complete !== true || envelope.publicationAuthorized !== false || envelope.collectionAuthority !== "UNVERIFIED"
    || envelope.admissionSourceIdentity !== "UNKNOWN" || typeof envelope.responseSha256 !== "string" || !HASH.test(envelope.responseSha256)
    || !Array.isArray(envelope.items) || envelope.itemCount !== envelope.items.length) return invalid("Retained envelope or membership is invalid");
  const source = sourceOf(envelope.source);
  const nativeItems = envelope.items.map((item: unknown, index: number): RetainedItem => {
    if (!exactKeys(item, ["index", "itemShape", "facts", "materialSha256", "assessment"]) || item.index !== index
      || typeof item.itemShape !== "string" || !["object", "null", "invalid"].includes(item.itemShape)
      || !exactKeys(item.facts, FACT_KEYS)) return invalid("Retained item shape or order is invalid");
    const f = item.facts;
    const facts: GreenhouseNativeFacts = {
      postingId: replayFact(f.postingId, positiveId), internalJobId: replayFact(f.internalJobId, positiveId),
      title: replayFact(f.title, (v): v is string => validText(v, 300)),
      absoluteUrl: replayFact(f.absoluteUrl, (v): v is string => validText(v, 2048)),
      locationName: replayFact(f.locationName, (v): v is string => validText(v, 500)),
      firstPublished: replayFact(f.firstPublished, (v): v is string => validText(v, 64)),
      updatedAt: replayFact(f.updatedAt, (v): v is string => validText(v, 64)),
    };
    if (item.itemShape !== "object" && FACT_KEYS.some(key => facts[key].state !== "missing")) return invalid("Non-object item cannot carry native fields");
    return { index, itemShape: item.itemShape as Shape, facts };
  });
  const rebuilt = receipt(source, envelope.responseSha256, nativeItems);
  if (rebuilt.payload !== payload) return invalid("Material hashes, exact membership or private assessments do not match replay");
  return rebuilt;
}
