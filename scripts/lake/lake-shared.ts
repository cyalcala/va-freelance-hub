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

type LakeClient = ReturnType<typeof getLakeClient>;

/** Max raw payload bytes stored per observation (Turso storage hygiene). */
export const MAX_RAW_PAYLOAD_CHARS = 1_000_000;

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
  }
): Promise<number> {
  const payload = truncatePayload(args.rawPayload);
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
      args.contentHash ?? sha256Hex(args.rawPayload),
    ],
  });
  const id = res.rows[0]?.id as number;
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
