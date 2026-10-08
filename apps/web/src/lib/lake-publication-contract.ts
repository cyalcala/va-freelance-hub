import { sanitizeApplyUrlForSource, sanitizeSourceUrl, sha256Hex } from "@va-hub/scraper";
import { normalizeUtcIso } from "@/lib/time";

export interface LakeStageCandidate {
  lakeCandidateId: number;
  lakeFingerprint: string;
  title: string;
  company: string | null;
  sourceUrl: string;
  applicationUrl: string | null;
  sourcePlatform: string;
  locationType: "remote" | "hybrid" | "onsite" | "unknown";
  locationRaw: string | null;
  postedAt: string | null;
  evidenceText: string | null;
}

/** Private staging membership, with no opportunity ID or publication clearance. */
export interface LakeStageCandidateDescriptor {
  lakeCandidateId: number;
  lakeFingerprint: string;
  sourceUrl: string;
  materialSha256: string;
}

export interface LakeStageRequest {
  operation: "lake-stage";
  version: 1;
  operationId: string;
  sourceId: string;
  candidates: LakeStageCandidate[];
}

export type LakeStageParseResult =
  | { ok: true; request: LakeStageRequest; manifestHash: string; candidateDescriptorsJson: string; descriptors: LakeStageCandidateDescriptor[] }
  | { ok: false; code: "INVALID_LAKE_STAGE_REQUEST"; message: string };

const REQUEST_KEYS = ["operation", "version", "operationId", "sourceId", "candidates"];
const CANDIDATE_KEYS = ["lakeCandidateId", "lakeFingerprint", "title", "company", "sourceUrl", "applicationUrl", "sourcePlatform", "locationType", "locationRaw", "postedAt", "evidenceText"];
const LOCATION_TYPES = new Set(["remote", "hybrid", "onsite", "unknown"]);
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length || !actual.every((key) => typeof key === "string" && keys.includes(key))) return null;
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max && value.trim() !== "" ? value.trim() : null;
}

/** Unknown must be explicit null; supplied factual text is not replaced or inferred. */
function nullableText(value: unknown, max: number): string | null | undefined {
  return value === null ? null : typeof value === "string" && value.length <= max ? value : undefined;
}

function parseCandidate(value: unknown): LakeStageCandidate | string {
  const input = exactRecord(value, CANDIDATE_KEYS);
  if (!input) return "candidate must contain exactly the staging fact fields";
  const lakeCandidateId = input.lakeCandidateId;
  if (typeof lakeCandidateId !== "number" || !Number.isSafeInteger(lakeCandidateId) || lakeCandidateId <= 0) return "lakeCandidateId must be a positive safe integer";
  const lakeFingerprint = input.lakeFingerprint;
  if (typeof lakeFingerprint !== "string" || lakeFingerprint.length > 128 || !lakeFingerprint.trim() || lakeFingerprint.includes("\0")) return "lakeFingerprint must be nonblank, NUL-free and at most 128 characters";
  const title = requiredText(input.title, 300);
  if (!title) return "title must be nonblank and at most 300 characters";
  const sourcePlatform = requiredText(input.sourcePlatform, 100);
  if (!sourcePlatform) return "sourcePlatform must be nonblank and at most 100 characters";
  const company = nullableText(input.company, 200);
  const locationRaw = nullableText(input.locationRaw, 500);
  const evidenceText = nullableText(input.evidenceText, 2000);
  if (company === undefined) return "company must be null or text of at most 200 characters";
  if (locationRaw === undefined) return "locationRaw must be null or text of at most 500 characters";
  if (evidenceText === undefined) return "evidenceText must be null or text of at most 2000 characters";
  const locationType = input.locationType;
  if (typeof locationType !== "string" || !LOCATION_TYPES.has(locationType)) return "locationType must be an explicit remote, hybrid, onsite or unknown value";
  const postedAt = input.postedAt;
  if (postedAt !== null && (typeof postedAt !== "string" || !UTC_INSTANT.test(postedAt) || normalizeUtcIso(postedAt) !== postedAt)) return "postedAt must be null or an exact valid canonical UTC instant";
  const sourceUrl = sanitizeSourceUrl(input.sourceUrl);
  if (!sourceUrl || sourceUrl.length > 2048) return "sourceUrl must be a safe public HTTP(S) URL of at most 2048 normalized characters";
  const applicationUrl = input.applicationUrl === null ? null : sanitizeApplyUrlForSource(input.applicationUrl, sourceUrl);
  if (input.applicationUrl !== null && (!applicationUrl || applicationUrl.length > 2048)) return "applicationUrl must be null or a safe URL attributable to sourceUrl of at most 2048 normalized characters";
  return {
    lakeCandidateId, lakeFingerprint, title, company, sourceUrl, applicationUrl, sourcePlatform,
    locationType: locationType as LakeStageCandidate["locationType"], locationRaw, postedAt, evidenceText,
  };
}

/** Hash every normalized staging fact in fixed order, including opaque fingerprint and evidence. */
export async function hashLakeStageCandidate(candidate: LakeStageCandidate): Promise<string> {
  const { lakeCandidateId, lakeFingerprint, title, company, sourceUrl, applicationUrl, sourcePlatform, locationType, locationRaw, postedAt, evidenceText } = candidate;
  return sha256Hex(JSON.stringify({ lakeCandidateId, lakeFingerprint, title, company, sourceUrl, applicationUrl, sourcePlatform, locationType, locationRaw, postedAt, evidenceText }));
}

/** Bind version/source/membership; operation identity and caller ordering are deliberately excluded. */
export async function hashLakeStageManifest(sourceId: string, descriptors: readonly LakeStageCandidateDescriptor[]): Promise<string> {
  const canonical = [...descriptors].sort((a, b) => a.lakeCandidateId - b.lakeCandidateId)
    .map(({ lakeCandidateId, lakeFingerprint, sourceUrl, materialSha256 }) => ({ lakeCandidateId, lakeFingerprint, sourceUrl, materialSha256 }));
  return sha256Hex(JSON.stringify({ version: 1, sourceId, descriptors: canonical }));
}

function invalid(message: string): LakeStageParseResult {
  return { ok: false, code: "INVALID_LAKE_STAGE_REQUEST", message };
}

/** Validate and hash private staging facts only. This performs no I/O or publication decision. */
export async function parseLakeStageRequest(value: unknown): Promise<LakeStageParseResult> {
  const input = exactRecord(value, REQUEST_KEYS);
  if (!input) return invalid("request must contain exactly operation, version, operationId, sourceId and candidates");
  if (input.operation !== "lake-stage" || input.version !== 1) return invalid("operation must be lake-stage with version 1");
  const operationId = input.operationId;
  if (typeof operationId !== "string" || operationId.length > 128 || !/^[a-zA-Z0-9:._-]+$/.test(operationId)) return invalid("operationId must be 1–128 ASCII letters, digits or :._- characters");
  const sourceId = input.sourceId;
  if (typeof sourceId !== "string" || sourceId.length > 200 || !/^[a-z0-9:._-]+$/.test(sourceId) || sourceId === "unattributed") return invalid("sourceId must be a canonical attributable lowercase identity of at most 200 characters");
  if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 200) return invalid("candidates must contain between 1 and 200 rows");
  const candidates: LakeStageCandidate[] = [];
  const ids = new Set<number>();
  const urls = new Set<string>();
  for (const [index, value] of input.candidates.entries()) {
    const candidate = parseCandidate(value);
    if (typeof candidate === "string") return invalid(`candidate ${index}: ${candidate}`);
    if (ids.has(candidate.lakeCandidateId) || urls.has(candidate.sourceUrl)) return invalid(`candidate ${index}: duplicate lakeCandidateId or sourceUrl`);
    ids.add(candidate.lakeCandidateId);
    urls.add(candidate.sourceUrl);
    candidates.push(candidate);
  }
  candidates.sort((a, b) => a.lakeCandidateId - b.lakeCandidateId);
  const descriptors = await Promise.all(candidates.map(async (candidate) => ({
    lakeCandidateId: candidate.lakeCandidateId, lakeFingerprint: candidate.lakeFingerprint,
    sourceUrl: candidate.sourceUrl, materialSha256: await hashLakeStageCandidate(candidate),
  })));
  const request: LakeStageRequest = { operation: "lake-stage", version: 1, operationId, sourceId, candidates };
  return { ok: true, request, descriptors, manifestHash: await hashLakeStageManifest(sourceId, descriptors), candidateDescriptorsJson: JSON.stringify(descriptors) };
}
