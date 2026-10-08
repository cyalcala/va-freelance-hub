import { createClient, type InStatement, type ResultSet } from "@libsql/client/http";

export interface LakeEvidenceCandidateRow {
  id: number; raw_observation_id: number; source_id: string; source_platform: string;
  source_url: string; title: string; company: string | null; location_type: string | null;
  location_raw: string | null; description: string | null; application_url: string | null;
  posted_at: string | null; fingerprint_hash: string;
}
export interface LakeEvidenceRawObservationRow {
  id: number; source_id: string; source_platform: string; fetch_url: string;
  http_status: number; raw_payload: string; content_hash: string; fetched_at: string;
}
export interface LakeEvidenceSightingMetadata {
  candidate_id: number; sighting_count: number; distinct_raw_observation_count: number;
  distinct_source_count: number; distinct_source_url_count: number;
  mismatched_sighting_count: number; latest_observed_at: string | null; complete: true;
}
export interface LakeEvidenceSnapshot {
  sourceId: string;
  candidates: LakeEvidenceCandidateRow[];
  rawObservations: LakeEvidenceRawObservationRow[];
  sightingMetadata: LakeEvidenceSightingMetadata[];
  publicationAuthorized: false; qualificationAuthorized: false;
}
export type LakeEvidenceReadCode = "LAKE_EVIDENCE_REQUEST_INVALID" | "LAKE_READONLY_BINDING_UNAVAILABLE"
  | "LAKE_EVIDENCE_TOO_LARGE" | "LAKE_EVIDENCE_INVALID" | "LAKE_EVIDENCE_READ_FAILED";
export type LakeEvidenceReadResult = { ok: true; snapshot: LakeEvidenceSnapshot }
  | { ok: false; status: 400 | 413 | 503; code: LakeEvidenceReadCode;
    publicationAuthorized: false; qualificationAuthorized: false };
export interface LakeEvidenceReaderEnvironment {
  TURSO_DATABASE_URL?: string;
  TURSO_READONLY_AUTH_TOKEN?: string;
}
export interface LakeEvidenceReadInput {
  sourceId: string; candidateIds: number[]; env: LakeEvidenceReaderEnvironment;
  fetch?: typeof fetch;
}

// The existing complete-evidence ceiling applies to the sum of distinct raw
// payloads, not once per candidate. Material has its own finite UTF-8 budget.
export const LAKE_EVIDENCE_MAX_RAW_BYTES = 1024 * 1024;
export const LAKE_EVIDENCE_MAX_MATERIAL_BYTES = 2 * 1024 * 1024;
// A separate finite transport ceiling accommodates protocol/string escaping;
// an unusually expanded response is refused, never returned as a partial read.
export const LAKE_EVIDENCE_MAX_HTTP_BYTES = 8 * 1024 * 1024;
export const LAKE_EVIDENCE_TIMEOUT_MS = 15_000;
// One native batch currently uses one POST. Allow bounded protocol cleanup,
// but never retry or negotiate another host after a failed snapshot attempt.
export const LAKE_EVIDENCE_MAX_HTTP_REQUESTS = 3;

const encoder = new TextEncoder();
const CANDIDATE_TEXT_LIMITS = { source_platform: 200, source_url: 2048, title: 300,
  company: 200, location_type: 32, location_raw: 500, description: 2000,
  application_url: 2048, posted_at: 64, fingerprint_hash: 128 } as const;
const CANDIDATE_COLUMNS = ["id", "raw_observation_id", "source_id", ...Object.keys(CANDIDATE_TEXT_LIMITS),
  "material_over_budget", "material_bytes_total"];
const RAW_COLUMNS = ["id", "source_id", "source_platform", "fetch_url", "http_status", "raw_payload",
  "content_hash", "fetched_at", "raw_payload_bytes", "raw_bytes_total", "raw_over_budget"];
const SIGHTING_COLUMNS = ["candidate_id", "sighting_count", "distinct_raw_observation_count",
  "distinct_source_count", "distinct_source_url_count", "mismatched_sighting_count", "latest_observed_at", "invalid_sighting_count"];

class ReadFailure extends Error {
  constructor(readonly code: LakeEvidenceReadCode, readonly status: 400 | 413 | 503 = 503) { super(code); }
}
function fail(code: LakeEvidenceReadCode, status?: 400 | 413 | 503): never { throw new ReadFailure(code, status); }
function failure(code: LakeEvidenceReadCode, status: 400 | 413 | 503 = 503): LakeEvidenceReadResult {
  return { ok: false, status, code, publicationAuthorized: false, qualificationAuthorized: false };
}
const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function text(value: unknown, max: number, nullable = false): value is string | null {
  return nullable && value === null || typeof value === "string" && value.length <= max && !value.includes("\0");
}
function clock(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ? value
    : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}.000Z` : null;
  if (!iso) return false;
  const parsed = new Date(iso);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === iso;
}
function configuredOrigin(env: LakeEvidenceReaderEnvironment): string | null {
  const value = env?.TURSO_DATABASE_URL;
  const token = env?.TURSO_READONLY_AUTH_TOKEN;
  if (typeof value !== "string" || value !== value.trim() || typeof token !== "string"
    || !token.trim() || token !== token.trim() || /[\x00-\x20\x7f]/.test(token)) return null;
  try {
    const parsed = new URL(value);
    if (!["libsql:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password
      || parsed.port || parsed.search || parsed.hash || parsed.pathname && parsed.pathname !== "/"
      || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.turso\.io$/.test(parsed.hostname)) return null;
    // Reject URL-normalization tricks; accept only the canonical root spelling.
    const expected = `${parsed.protocol}//${parsed.hostname}`;
    if (value !== expected && value !== `${expected}/`) return null;
    return `https://${parsed.hostname}`;
  } catch { return null; }
}

/** The three SELECT templates are server-owned. Variable placeholders depend
 * only on validated ID count; no caller URL, SQL or projection is accepted. */
function statements(sourceId: string, ids: number[]): InStatement[] {
  const placeholders = ids.map(() => "?").join(",");
  const selection = `source_id=? AND id IN (${placeholders})`;
  const measures = Object.keys(CANDIDATE_TEXT_LIMITS).map(key => `COALESCE(length(CAST(c.${key} AS BLOB)),0)`).join("+");
  const limits = Object.entries(CANDIDATE_TEXT_LIMITS).map(([key, limit]) => `COALESCE(length(c.${key}),0)<=${limit}`).join(" AND ");
  const bounded = `${limits} AND b.material_bytes_total<=${LAKE_EVIDENCE_MAX_MATERIAL_BYTES}`;
  const projection = Object.keys(CANDIDATE_TEXT_LIMITS).map(key => `CASE WHEN ${bounded} THEN c.${key} ELSE NULL END AS ${key}`).join(",\n");
  const candidates = `WITH selected AS (SELECT * FROM lake_candidate_jobs WHERE ${selection}),
    budget AS (SELECT COALESCE(SUM(${measures}),0) AS material_bytes_total FROM selected c)
    SELECT c.id,c.raw_observation_id,c.source_id,${projection},
      CASE WHEN ${bounded} THEN 0 ELSE 1 END AS material_over_budget,b.material_bytes_total
    FROM selected c CROSS JOIN budget b ORDER BY c.id`;
  const rawBound = `r.raw_payload_bytes<=${LAKE_EVIDENCE_MAX_RAW_BYTES} AND length(r.raw_payload)<=1000000
    AND b.raw_bytes_total<=${LAKE_EVIDENCE_MAX_RAW_BYTES} AND COALESCE(length(r.source_platform),0)<=200
    AND COALESCE(length(r.fetch_url),0)<=2048 AND COALESCE(length(r.content_hash),0)<=64 AND COALESCE(length(r.fetched_at),0)<=64`;
  const raw = `WITH pointers AS (SELECT DISTINCT raw_observation_id AS id FROM lake_candidate_jobs WHERE ${selection}),
    measured AS (SELECT r.*,length(CAST(r.raw_payload AS BLOB)) AS raw_payload_bytes
      FROM lake_raw_observations r JOIN pointers p ON p.id=r.id WHERE r.source_id=?),
    budget AS (SELECT COALESCE(SUM(raw_payload_bytes),0) AS raw_bytes_total FROM measured)
    SELECT r.id,r.source_id,
      CASE WHEN ${rawBound} THEN r.source_platform ELSE NULL END AS source_platform,
      CASE WHEN ${rawBound} THEN r.fetch_url ELSE NULL END AS fetch_url,r.http_status,
      CASE WHEN ${rawBound} THEN r.raw_payload ELSE NULL END AS raw_payload,
      CASE WHEN ${rawBound} THEN r.content_hash ELSE NULL END AS content_hash,
      CASE WHEN ${rawBound} THEN r.fetched_at ELSE NULL END AS fetched_at,
      r.raw_payload_bytes,b.raw_bytes_total,CASE WHEN ${rawBound} THEN 0 ELSE 1 END AS raw_over_budget
    FROM measured r CROSS JOIN budget b ORDER BY r.id`;
  const sightings = `SELECT c.id AS candidate_id,COUNT(s.id) AS sighting_count,
      COUNT(DISTINCT s.raw_observation_id) AS distinct_raw_observation_count,
      COUNT(DISTINCT s.source_id) AS distinct_source_count,
      COUNT(DISTINCT s.source_url) AS distinct_source_url_count,
      SUM(CASE WHEN s.id IS NOT NULL AND (s.source_id IS NOT c.source_id OR s.source_url IS NOT c.source_url
        OR s.raw_observation_id IS NOT c.raw_observation_id) THEN 1 ELSE 0 END) AS mismatched_sighting_count,
      strftime('%Y-%m-%dT%H:%M:%fZ',MAX(julianday(s.observed_at))) AS latest_observed_at,
      SUM(CASE WHEN s.id IS NOT NULL AND (typeof(s.id)!='integer' OR s.id<=0 OR s.id>9007199254740991
        OR typeof(s.raw_observation_id)!='integer' OR s.raw_observation_id<=0 OR s.raw_observation_id>9007199254740991
        OR typeof(s.source_id)!='text' OR length(s.source_id)<1 OR length(s.source_id)>200 OR instr(s.source_id,char(0))>0
        OR typeof(s.source_url)!='text' OR length(s.source_url)<1 OR length(s.source_url)>2048 OR instr(s.source_url,char(0))>0
        OR typeof(s.observed_at)!='text' OR length(s.observed_at)>64 OR julianday(s.observed_at) IS NULL
        OR NOT ((length(s.observed_at)=19 AND strftime('%Y-%m-%d %H:%M:%S',julianday(s.observed_at))=s.observed_at)
          OR (length(s.observed_at)=24 AND strftime('%Y-%m-%dT%H:%M:%fZ',julianday(s.observed_at))=s.observed_at)))
        THEN 1 ELSE 0 END) AS invalid_sighting_count
    FROM lake_candidate_jobs c LEFT JOIN lake_sightings s ON s.candidate_id=c.id
    WHERE c.source_id=? AND c.id IN (${placeholders}) GROUP BY c.id ORDER BY c.id`;
  return [{ sql: candidates, args: [sourceId, ...ids] }, { sql: raw, args: [sourceId, ...ids, sourceId] },
    { sql: sightings, args: [sourceId, ...ids] }];
}

function rows(result: ResultSet | undefined, columns: string[], max: number): Record<string, unknown>[] {
  if (!result || !Array.isArray(result.columns) || result.columns.length !== columns.length
    || result.columns.some((name, index) => name !== columns[index]) || !Array.isArray(result.rows)
    || result.rows.length > max || result.rowsAffected !== 0 || result.lastInsertRowid !== undefined) fail("LAKE_EVIDENCE_INVALID");
  return result.rows as unknown as Record<string, unknown>[];
}
function snapshot(sourceId: string, ids: number[], results: ResultSet[]): LakeEvidenceSnapshot {
  if (!Array.isArray(results) || results.length !== 3) fail("LAKE_EVIDENCE_INVALID");
  const candidateRows = rows(results[0], CANDIDATE_COLUMNS, ids.length);
  if (candidateRows.length !== ids.length) fail("LAKE_EVIDENCE_INVALID");
  const candidates = candidateRows.map((row, index): LakeEvidenceCandidateRow => {
    if (!count(row.material_over_budget) || !count(row.material_bytes_total)) fail("LAKE_EVIDENCE_INVALID");
    if (row.material_over_budget !== 0 || row.material_bytes_total > LAKE_EVIDENCE_MAX_MATERIAL_BYTES) fail("LAKE_EVIDENCE_TOO_LARGE", 413);
    if (row.id !== ids[index] || !positiveId(row.raw_observation_id) || row.source_id !== sourceId) fail("LAKE_EVIDENCE_INVALID");
    const nullable = new Set(["company", "location_type", "location_raw", "description", "application_url", "posted_at"]);
    for (const [key, limit] of Object.entries(CANDIDATE_TEXT_LIMITS)) if (!text(row[key], limit, nullable.has(key))) fail("LAKE_EVIDENCE_INVALID");
    if (!(row.title as string).trim() || !(row.source_platform as string).trim() || !(row.source_url as string).trim()
      || !(row.fingerprint_hash as string).trim() || row.posted_at !== null && !clock(row.posted_at)) fail("LAKE_EVIDENCE_INVALID");
    return Object.fromEntries(CANDIDATE_COLUMNS.slice(0, -2).map(key => [key, row[key]])) as unknown as LakeEvidenceCandidateRow;
  });
  const materialBytes = candidates.reduce((total, row) => total + Object.keys(CANDIDATE_TEXT_LIMITS)
    .reduce((sum, key) => sum + encoder.encode((row as unknown as Record<string, string | null>)[key] ?? "").byteLength, 0), 0);
  if (materialBytes > LAKE_EVIDENCE_MAX_MATERIAL_BYTES) fail("LAKE_EVIDENCE_TOO_LARGE", 413);
  if (candidateRows.some(row => row.material_bytes_total !== materialBytes)) fail("LAKE_EVIDENCE_INVALID");
  const rawRows = rows(results[1], RAW_COLUMNS, ids.length);
  const wantedRawIds = [...new Set(candidates.map(row => row.raw_observation_id))].sort((a, b) => a - b);
  if (rawRows.length !== wantedRawIds.length) fail("LAKE_EVIDENCE_INVALID");
  let rawBytes = 0;
  const rawObservations = rawRows.map((row, index): LakeEvidenceRawObservationRow => {
    if (!count(row.raw_over_budget) || !count(row.raw_payload_bytes) || !count(row.raw_bytes_total)) fail("LAKE_EVIDENCE_INVALID");
    if (row.raw_over_budget !== 0 || row.raw_bytes_total > LAKE_EVIDENCE_MAX_RAW_BYTES || row.raw_payload_bytes > LAKE_EVIDENCE_MAX_RAW_BYTES) fail("LAKE_EVIDENCE_TOO_LARGE", 413);
    if (row.id !== wantedRawIds[index] || row.source_id !== sourceId || !text(row.source_platform, 200)
      || !text(row.fetch_url, 2048) || !text(row.raw_payload, 1000000) || typeof row.content_hash !== "string"
      || !/^[a-f0-9]{64}$/.test(row.content_hash) || !clock(row.fetched_at) || !count(row.http_status)
      || row.http_status > 599 || !(row.source_platform as string).trim() || !(row.fetch_url as string).trim()) fail("LAKE_EVIDENCE_INVALID");
    const bytes = encoder.encode(row.raw_payload as string).byteLength;
    if (bytes !== row.raw_payload_bytes) fail("LAKE_EVIDENCE_INVALID");
    rawBytes += bytes;
    return Object.fromEntries(RAW_COLUMNS.slice(0, -3).map(key => [key, row[key]])) as unknown as LakeEvidenceRawObservationRow;
  });
  if (rawBytes > LAKE_EVIDENCE_MAX_RAW_BYTES || rawRows.some(row => row.raw_bytes_total !== rawBytes)) fail("LAKE_EVIDENCE_INVALID");
  const metadataRows = rows(results[2], SIGHTING_COLUMNS, ids.length);
  if (metadataRows.length !== ids.length) fail("LAKE_EVIDENCE_INVALID");
  const sightingMetadata = metadataRows.map((row, index): LakeEvidenceSightingMetadata => {
    if (row.candidate_id !== ids[index] || row.invalid_sighting_count !== 0
      || !count(row.sighting_count) || !count(row.distinct_raw_observation_count) || !count(row.distinct_source_count)
      || !count(row.distinct_source_url_count) || !count(row.mismatched_sighting_count) || row.mismatched_sighting_count > row.sighting_count
      || row.distinct_raw_observation_count > row.sighting_count
      || row.distinct_source_count > row.sighting_count || row.distinct_source_url_count > row.sighting_count
      || (row.sighting_count === 0 ? row.latest_observed_at !== null || row.distinct_raw_observation_count !== 0
        || row.distinct_source_count !== 0 || row.distinct_source_url_count !== 0
        : !clock(row.latest_observed_at) || row.distinct_raw_observation_count === 0
          || row.distinct_source_count === 0 || row.distinct_source_url_count === 0)) fail("LAKE_EVIDENCE_INVALID");
    return { ...Object.fromEntries(SIGHTING_COLUMNS.slice(0, -1).map(key => [key, row[key]])), complete: true } as unknown as LakeEvidenceSightingMetadata;
  });
  for (const array of [candidates, rawObservations, sightingMetadata]) { array.forEach(Object.freeze); Object.freeze(array); }
  return Object.freeze({ sourceId, candidates, rawObservations, sightingMetadata, publicationAuthorized: false, qualificationAuthorized: false });
}

function pinnedFetch(origin: string, fetchImpl: typeof fetch, signal: AbortSignal): typeof fetch {
  let requests = 0, received = 0;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash
      || request.method !== "POST" || url.pathname !== "/v2/pipeline" || ++requests > LAKE_EVIDENCE_MAX_HTTP_REQUESTS) fail("LAKE_EVIDENCE_READ_FAILED");
    const response = await fetchImpl(new Request(request, { redirect: "manual", signal }));
    if (response.status !== 200 || response.redirected || response.url && new URL(response.url).origin !== origin) fail("LAKE_EVIDENCE_READ_FAILED");
    const reader = response.body?.getReader();
    if (!reader) fail("LAKE_EVIDENCE_READ_FAILED");
    const chunks: Uint8Array[] = [];
    let responseBytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        received += chunk.value.byteLength; responseBytes += chunk.value.byteLength;
        if (received > LAKE_EVIDENCE_MAX_HTTP_BYTES) fail("LAKE_EVIDENCE_TOO_LARGE", 413);
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); reader.releaseLock(); }
    const bytes = new Uint8Array(responseBytes);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const body = JSON.parse(decoded) as { base_url?: unknown };
    if (body.base_url !== undefined && body.base_url !== null) {
      if (typeof body.base_url !== "string") fail("LAKE_EVIDENCE_READ_FAILED");
      const base = new URL(body.base_url);
      if (base.origin !== origin || base.username || base.password || base.search || base.hash
        || base.pathname !== "/") fail("LAKE_EVIDENCE_READ_FAILED");
    }
    return new Response(bytes, { status: response.status, headers: response.headers });
  }) as typeof fetch;
}

/** Private inspection only. A successful read never grants item clearance. */
export async function readLakeEvidenceSnapshot(input: LakeEvidenceReadInput): Promise<LakeEvidenceReadResult> {
  if (typeof input?.sourceId !== "string" || input.sourceId.length > 200 || !/^[a-z0-9:._-]+$/.test(input.sourceId)
    || input.sourceId === "unattributed" || !Array.isArray(input.candidateIds) || input.candidateIds.length < 1
    || input.candidateIds.length > 200 || !Array.from(input.candidateIds).every(positiveId)
    || new Set(input.candidateIds).size !== input.candidateIds.length) return failure("LAKE_EVIDENCE_REQUEST_INVALID", 400);
  const origin = configuredOrigin(input.env);
  if (!origin) return failure("LAKE_READONLY_BINDING_UNAVAILABLE");
  const ids = [...input.candidateIds].sort((a, b) => a - b);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new ReadFailure("LAKE_EVIDENCE_READ_FAILED")); }, LAKE_EVIDENCE_TIMEOUT_MS);
  });
  let client: ReturnType<typeof createClient> | undefined;
  try {
    client = createClient({ url: origin, authToken: input.env.TURSO_READONLY_AUTH_TOKEN, intMode: "number", concurrency: 1,
      fetch: pinnedFetch(origin, input.fetch ?? fetch, controller.signal) });
    // The existing HTTP dependency emits BEGIN TRANSACTION READONLY and three
    // fixed SELECTs in one snapshot batch. It has no write/fallback path here.
    const results = await Promise.race([client.batch(statements(input.sourceId, ids), "read"), deadline]);
    return { ok: true, snapshot: snapshot(input.sourceId, ids, results) };
  } catch (error) {
    // libSQL wraps custom-fetch exceptions; preserve only our bounded code.
    const direct = error instanceof ReadFailure ? error : error instanceof Error && error.cause instanceof ReadFailure ? error.cause : null;
    return direct ? failure(direct.code, direct.status) : failure("LAKE_EVIDENCE_READ_FAILED");
  } finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); client?.close(); }
}
