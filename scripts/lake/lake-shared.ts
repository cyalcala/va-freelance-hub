/**
 * Shared Turso lake helpers — scripts/lake/lake-shared.ts
 *
 * Centralizes logic previously duplicated across ingest-to-lake.ts,
 * remotive-full.ts, himalayas-sweep.ts, and domain-ats-discovery.ts:
 * fingerprinting, raw-observation storage, and sighting bookkeeping.
 *
 * All helpers are pure or take an explicit client so they stay unit-testable
 * without a live Turso connection.
 */
import { createHash } from "crypto";
import { getLakeClient } from "./client";
import { SHADOW_MAX_BYTES } from "../../packages/scraper/candidate-shadow";

type LakeClient = ReturnType<typeof getLakeClient>;

/** Legacy raw payload character bound (Turso storage hygiene). */
export const MAX_RAW_PAYLOAD_CHARS = 1_000_000;
/** Complete evidence also honors the existing one-MiB UTF-8 evidence bound. */
export const MAX_COMPLETE_RAW_PAYLOAD_BYTES = SHADOW_MAX_BYTES;

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function truncatePayload(raw: string, maxChars = MAX_RAW_PAYLOAD_CHARS): string {
  if (raw.length <= maxChars) return raw;
  return raw.slice(0, maxChars);
}

/**
 * Deterministic candidate fingerprint: normalized company + title + apply domain.
 * 32 hex chars (128-bit truncation of SHA-256) — stable across re-ingests.
 */
export function computeFingerprint(company: string, title: string, applyUrl: string): string {
  const normCompany = (company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normTitle = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let domain = "";
  try {
    domain = new URL(applyUrl).hostname.replace(/^www\./, "");
  } catch {
    domain = (applyUrl || "").slice(0, 30);
  }
  return sha256Hex(`${normCompany}:${normTitle}:${domain}`).slice(0, 32);
}

/** Stores one raw fetch observation and returns its row id. */
export async function storeRawObservation(
  client: LakeClient,
  args: {
    sourceId: string;
    sourcePlatform: string;
    fetchUrl: string;
    httpStatus?: number;
    rawPayload: string;
    /** Overrides the default SHA-256 of rawPayload (e.g. feed body hash). */
    contentHash?: string;
    /** Opt-in complete evidence: no truncation or different-byte hash override. */
    requireCompletePayload?: true;
  }
): Promise<number> {
  const strict = args.requireCompletePayload === true;
  if (strict) {
    if (args.httpStatus !== 200) throw new Error("storeRawObservation: complete evidence requires explicit HTTP 200");
    if (typeof args.sourceId !== "string" || !/^[a-z0-9:._-]+$/.test(args.sourceId)) {
      throw new Error("storeRawObservation: complete evidence requires a canonical source ID");
    }
    let validEndpoint = false;
    if (typeof args.fetchUrl === "string" && args.fetchUrl === args.fetchUrl.trim() && !args.fetchUrl.includes("\0")) {
      try {
        const endpoint = new URL(args.fetchUrl);
        validEndpoint = (endpoint.protocol === "https:" || endpoint.protocol === "http:")
          && !endpoint.username && !endpoint.password && !endpoint.hash;
      } catch { /* Invalid representation, not a source permission decision. */ }
    }
    if (!validEndpoint) throw new Error("storeRawObservation: complete evidence requires an absolute HTTP(S) endpoint without credentials or fragment");
    if (typeof args.rawPayload !== "string" || args.rawPayload.length > MAX_RAW_PAYLOAD_CHARS
      || new TextEncoder().encode(args.rawPayload).byteLength > MAX_COMPLETE_RAW_PAYLOAD_BYTES) {
      throw new Error("storeRawObservation: complete evidence exceeds the retained character or UTF-8 byte bound");
    }
  }
  const payload = strict ? args.rawPayload : truncatePayload(args.rawPayload);
  const contentHash = strict ? sha256Hex(payload) : args.contentHash ?? sha256Hex(args.rawPayload);
  if (strict && args.contentHash !== undefined && args.contentHash !== contentHash) {
    throw new Error("storeRawObservation: complete evidence hash does not match exact retained payload bytes");
  }
  const res = await client.execute({
    sql: `
      INSERT INTO lake_raw_observations (source_id, source_platform, fetch_url, http_status, raw_payload, content_hash)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id;
    `,
    args: [
      args.sourceId,
      args.sourcePlatform,
      args.fetchUrl,
      args.httpStatus ?? 200,
      payload,
      contentHash,
    ],
  });
  const id = res.rows[0]?.id as number;
  if (strict && (res.rows.length !== 1 || !Number.isSafeInteger(id) || id <= 0)) {
    // The INSERT may already be durable. A malformed acknowledgement grants no
    // candidate mapping or publication claim and must stop downstream refinement.
    throw new Error("storeRawObservation: complete evidence acknowledgement lacks exactly one positive safe integer ID");
  }
  if (!Number.isFinite(id)) throw new Error("storeRawObservation: no id returned");
  return id;
}

/** Marks a raw observation as processed (idempotent). */
export async function markRawProcessed(client: LakeClient, rawObsId: number): Promise<void> {
  await client.execute({
    sql: `UPDATE lake_raw_observations SET processed = 1 WHERE id = ?;`,
    args: [rawObsId],
  });
}

/** Records a duplicate sighting and bumps the candidate's sighting counters. */
export async function recordSighting(
  client: LakeClient,
  args: {
    candidateId: number;
    rawObservationId: number;
    sourceId: string;
    sourcePlatform: string;
    sourceUrl: string;
    currentCount: number;
  }
): Promise<void> {
  await client.execute({
    sql: `
      INSERT INTO lake_sightings (candidate_id, raw_observation_id, source_id, source_platform, source_url)
      VALUES (?, ?, ?, ?, ?);
    `,
    args: [
      args.candidateId,
      args.rawObservationId,
      args.sourceId,
      args.sourcePlatform,
      args.sourceUrl,
    ],
  });
  await client.execute({
    sql: `
      UPDATE lake_candidate_jobs
      SET sighting_count = ?, last_observed_at = datetime('now')
      WHERE id = ?;
    `,
    args: [args.currentCount + 1, args.candidateId],
  });
}

/** Returns true when a candidate draft has the minimum fields to be storable. */
export function isStorableCandidate(draft: { title?: string; sourceUrl?: string }): boolean {
  return Boolean(draft.title?.trim()) && Boolean(draft.sourceUrl?.trim());
}
