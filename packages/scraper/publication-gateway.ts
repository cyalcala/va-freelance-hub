/**
 * SP-23C — single public-exposure gateway.
 *
 * Every public writer must go through this module: scrape accepted inserts,
 * hidden-to-public activations, direct ingest, and triage drain. Exact-six /
 * registry-active sources stay uncapped. Canary exposure is reserved per
 * server-owned tick and persisted in the 0041 ledger. Hidden pending/rejected
 * rows are not exposure and must not call this module.
 */
import { applyTypedTransition, type TransitionGatewayDatabase } from "./transition-gateway";
import { decideCanaryPublication } from "./transition-plane";
import type { RegistryComplianceState, RegistryOperationalState } from "./policy-resolver";
import { isAdmissionInstant } from "./admission-evidence";
import { D1_MAX_BOUND_PARAMETERS } from "./batch";
import { PUBLIC_PH_ELIGIBILITIES } from "./publication-eligibility";
import { assessPostingFreshness } from "./publication-freshness";
import { resolvePublicationOutboundUrl } from "./publication-outbound";
import { hasExplicitNonRemoteLocationType } from "./publication-remote";
import { MAX_URL_INPUT_LENGTH } from "./urls";

export interface PublicationStatement {
  bind(...values: unknown[]): PublicationStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: { changes?: number; last_row_id?: number } }>;
}
export interface PublicationDatabase extends TransitionGatewayDatabase {
  prepare(query: string): PublicationStatement;
}

export function wrapD1Binding(d1: { prepare: (sql: string) => { bind: (...values: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<{ success: boolean }> } } }): PublicationDatabase {
  return {
    prepare(query: string): PublicationStatement {
      return {
        bind(...values: unknown[]) {
          const bound = d1.prepare(query).bind(...values);
          return {
            bind() { return this; },
            first: () => bound.first(),
            run: () => bound.run(),
          };
        },
        first() { return d1.prepare(query).bind().first(); },
        run() { return d1.prepare(query).bind().run(); },
      };
    },
  };
}

export interface PublicationPolicySnapshot {
  sourceId: string;
  compliance: RegistryComplianceState;
  operational: RegistryOperationalState;
  optOut: boolean;
  policyExpiry: string | null;
  canaryMaxNewItemsPerTick: number | null;
  /** Server-derived provenance; a missing registry lease never implies legacy authority. */
  authorityOrigin?: "registry" | "legacy-fallback" | "unregistered";
}

export interface PublishPublicExposureRequest {
  sourceId: string;
  now: string;
  tickKey: string;
  retryKey: string;
  proposedCount: number;
  persist: (allowedCount: number) => Promise<{ publishedCount: number; ids: number[] }>;
}

export type PublishPublicExposureResult =
  | { ok: true; mode: "unlimited" | "capped"; publishedCount: number; ids: number[]; replayed: boolean }
  | { ok: true; mode: "blocked" | "rolled_back"; publishedCount: 0; ids: []; replayed: boolean; reason: string }
  | { ok: false; code: "POST_PERSISTENCE_FAILURE"; persistenceAttempted: true; exposure: "UNKNOWN"; reason: string }
  | { ok: false; reason: string };

const LOAD_POLICY_SQL = `SELECT source_id AS sourceId, compliance_state AS compliance,
  operational_state AS operational, opt_out AS optOut, policy_expiry AS policyExpiry,
  canary_max_new_items_per_tick AS canaryMaxNewItemsPerTick
  FROM source_registry WHERE source_id = ?`;
const LOAD_OPT_OUT_SQL = `SELECT source_id FROM source_opt_outs WHERE source_id = ? LIMIT 1`;
const LOAD_RETRY_SQL = `SELECT source_id AS sourceId, tick_key AS tickKey, proposed_count AS proposedCount,
  mode, published_count AS publishedCount, published_ids_json AS publishedIdsJson
  FROM source_publication_ledger WHERE retry_key = ?`;
const LOAD_TICK_SUM_SQL = `SELECT IFNULL(SUM(published_count), 0) AS published FROM source_publication_ledger
  WHERE source_id = ? AND tick_key = ?`;
const INSERT_LEDGER_SQL = `INSERT INTO source_publication_ledger (
  source_id, tick_key, retry_key, mode, proposed_count, published_count, published_ids_json, decided_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

function isCanonicalSourceId(value: string): boolean {
  return /^[a-z0-9:._-]+$/.test(value);
}

export function publicationTickKey(channel: string, now: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(channel) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now)) {
    throw new Error("publication tick key requires a canonical channel and UTC instant");
  }
  return `${channel}:${now}`;
}

export const LEGACY_EXACT_SIX_SOURCE_IDS = new Set<string>([
  "we-work-remotely",
  "remotive",
  "real-work-from-anywhere",
  "remote-ok",
  "jobicy-admin-support-apac",
  "jobicy-supporting-apac",
]);

export async function loadPublicationPolicy(
  db: PublicationDatabase,
  sourceId: string,
): Promise<PublicationPolicySnapshot> {
  const optOutRow = await db.prepare(LOAD_OPT_OUT_SQL).bind(sourceId).first<{ source_id: string }>();
  const isOptedOut = Boolean(optOutRow);

  const row = await db.prepare(LOAD_POLICY_SQL).bind(sourceId).first<PublicationPolicySnapshot>();
  if (!row) {
    // MATH-06A / F4 repair: only canonical exact-six sources receive the unregistered active fallback.
    // All other unregistered sources are rejected from public exposure.
    if (LEGACY_EXACT_SIX_SOURCE_IDS.has(sourceId)) {
      return {
        sourceId,
        compliance: isOptedOut ? "blocked" : "allowed",
        operational: isOptedOut ? "retired" : "active",
        optOut: isOptedOut,
        policyExpiry: null,
        canaryMaxNewItemsPerTick: null,
        authorityOrigin: "legacy-fallback",
      };
    }
    return {
      sourceId,
      compliance: isOptedOut ? "blocked" : "needs_review",
      operational: isOptedOut ? "retired" : "candidate",
      optOut: isOptedOut,
      policyExpiry: null,
      canaryMaxNewItemsPerTick: null,
      authorityOrigin: "unregistered",
    };
  }
  const effectiveOptOut = Boolean(row.optOut) || isOptedOut;
  return {
    ...row,
    optOut: effectiveOptOut,
    compliance: effectiveOptOut ? "blocked" : row.compliance,
    operational: effectiveOptOut ? "retired" : row.operational,
    authorityOrigin: "registry",
  };
}

interface PublicationReplayRow {
  sourceId: unknown; tickKey: unknown; proposedCount: unknown;
  mode: unknown; publishedCount: unknown; publishedIdsJson: unknown;
}

function replayedResult(row: PublicationReplayRow, request: PublishPublicExposureRequest): PublishPublicExposureResult {
  const invalid: PublishPublicExposureResult = { ok: false, reason: "stored publication retry is invalid or does not match the request" };
  if (row.sourceId !== request.sourceId || row.tickKey !== request.tickKey || row.proposedCount !== request.proposedCount
    || (row.mode !== "unlimited" && row.mode !== "capped" && row.mode !== "blocked" && row.mode !== "rolled_back")
    || typeof row.proposedCount !== "number" || !Number.isSafeInteger(row.proposedCount) || row.proposedCount < 0
    || typeof row.publishedCount !== "number" || !Number.isSafeInteger(row.publishedCount) || row.publishedCount < 0
    || row.publishedCount > row.proposedCount || typeof row.publishedIdsJson !== "string") return invalid;
  let ids: unknown;
  try { ids = JSON.parse(row.publishedIdsJson); } catch { return invalid; }
  if (!Array.isArray(ids) || ids.length !== row.publishedCount
    || !ids.every((id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)
    || new Set(ids).size !== ids.length) return invalid;
  if (row.mode === "blocked" || row.mode === "rolled_back") {
    if (row.publishedCount !== 0) return invalid;
    return { ok: true, mode: row.mode, publishedCount: 0, ids: [], replayed: true, reason: "idempotent retry of a non-publishing decision" };
  }
  // This is an immutable historical receipt, not a new qualification or publication decision.
  return { ok: true, mode: row.mode, publishedCount: row.publishedCount, ids, replayed: true };
}

export async function publishPublicExposure(
  db: PublicationDatabase,
  request: PublishPublicExposureRequest,
): Promise<PublishPublicExposureResult> {
  // Keep the authorized identity and ledger keys detached from caller memory
  // across policy reads, persistence and the ownership observation below.
  const { sourceId, now, tickKey, retryKey, proposedCount, persist } = request;
  request = { sourceId, now, tickKey, retryKey, proposedCount, persist };
  if (!isCanonicalSourceId(request.sourceId)) return { ok: false, reason: "source identity is required for public exposure" };
  if (!Number.isSafeInteger(request.proposedCount) || request.proposedCount < 0) {
    return { ok: false, reason: "proposed publication count must be a non-negative integer" };
  }
  if (!request.tickKey || !request.retryKey || request.retryKey.includes("\0") || request.tickKey.includes("\0")) {
    return { ok: false, reason: "publication tick and retry keys are required" };
  }

  const prior = await db.prepare(LOAD_RETRY_SQL).bind(request.retryKey).first<PublicationReplayRow>();
  if (prior) return replayedResult(prior, request);

  const policy = await loadPublicationPolicy(db, request.sourceId);
  const already = await db.prepare(LOAD_TICK_SUM_SQL).bind(request.sourceId, request.tickKey).first<{ published: number }>();
  const alreadyPublished = Number(already?.published ?? 0);

  if (policy.operational === "canary") {
    const decision = decideCanaryPublication({
      sourceId: request.sourceId,
      compliance: policy.compliance,
      operational: "canary",
      optOut: policy.optOut,
      policyExpiry: policy.policyExpiry,
      canaryMaxNewItemsPerTick: policy.canaryMaxNewItemsPerTick,
      proposedNewItems: request.proposedCount,
      now: request.now,
    });
    if (decision.action === "rollback_to_shadow") {
      await applyTypedTransition(db, {
        sourceId: request.sourceId,
        to: { compliance: policy.compliance, operational: "shadow" },
        cause: decision.transition.cause,
        now: request.now,
        evidenceHash: decision.transition.event.evidenceHash,
        proposedNewItems: request.proposedCount,
      });
      await insertLedger(db, request, "rolled_back", 0, []);
      return { ok: true, mode: "rolled_back", publishedCount: 0, ids: [], replayed: false, reason: decision.transition.reason };
    }
    if (decision.action !== "allow" || decision.publicationMode !== "capped") {
      await insertLedger(db, request, "blocked", 0, []);
      return { ok: true, mode: "blocked", publishedCount: 0, ids: [], replayed: false, reason: "reason" in decision ? decision.reason : "canary is not publication-eligible" };
    }
    const cap = policy.canaryMaxNewItemsPerTick ?? 0;
    if (alreadyPublished + request.proposedCount > cap) {
      await insertLedger(db, request, "blocked", 0, []);
      return { ok: true, mode: "blocked", publishedCount: 0, ids: [], replayed: false, reason: "canary tick cap is already exhausted" };
    }
    return persistAndRecord(db, request, "capped");
  }

  const expiry = policy.policyExpiry;
  const canonicalLease = isAdmissionInstant(expiry) && isAdmissionInstant(request.now);
  const isExpired = canonicalLease && request.now >= expiry;
  const hasCurrentLease = policy.authorityOrigin === "legacy-fallback"
    || (canonicalLease && request.now < expiry);

  if (
    policy.optOut ||
    !hasCurrentLease ||
    (policy.compliance !== "allowed" && policy.compliance !== "conditional") ||
    policy.operational !== "active"
  ) {
    await insertLedger(db, request, "blocked", 0, []);
    return {
      ok: true,
      mode: "blocked",
      publishedCount: 0,
      ids: [],
      replayed: false,
      reason: isExpired ? "source policy has expired" : policy.authorityOrigin === "registry" && !hasCurrentLease
        ? "source requires a current canonical policy lease" : "source is not publication-eligible",
    };
  }

  return persistAndRecord(db, request, "unlimited");
}

function postPersistenceFailure(reason: string): PublishPublicExposureResult {
  return { ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN", reason };
}

function snapshotAcknowledgement(value: unknown, allowedCount: number): { publishedCount: number; ids: number[] } | null {
  if (value === null || typeof value !== "object") return null;
  const { publishedCount, ids: rawIds } = value as { publishedCount: unknown; ids: unknown };
  if (typeof publishedCount !== "number" || !Number.isSafeInteger(publishedCount)
    || publishedCount < 0 || publishedCount > allowedCount || !Array.isArray(rawIds)) return null;
  if (rawIds.length !== publishedCount) return null;
  // Read actual indexed entries, including holes, rather than a replaceable iterator.
  // The copy detaches callback memory before awaiting the ledger.
  const ids: number[] = [];
  for (let index = 0; index < publishedCount; index++) {
    if (!Object.hasOwn(rawIds, index)) return null;
    const id: unknown = rawIds[index];
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
    ids.push(id);
  }
  if (new Set(ids).size !== ids.length) return null;
  return { publishedCount, ids };
}

async function hasCurrentOwnership(db: PublicationDatabase, sourceId: string, ids: readonly number[], now: string): Promise<boolean> {
  // Bindings stay within 100. Two bounded URL fields and the date can each
  // expand up to six JSON bytes per SQLite character; the canonical workplace
  // enum adds at most six characters. Keep the aggregate below
  // D1's 2,000,000-byte single-string/row ceiling. This leaves 80 IDs per read,
  // without changing any publication/source cap or proving atomic ownership.
  const maxJsonBytes = 2_000_000;
  const maxRowJsonBytes = 2 * MAX_URL_INPUT_LENGTH * 6 + 35 * 6 + 6 * 6 + 128;
  const chunkSize = Math.min(D1_MAX_BOUND_PARAMETERS - 1 - PUBLIC_PH_ELIGIBILITIES.length,
    Math.floor((maxJsonBytes - 2) / maxRowJsonBytes));
  // NULL/unsupported workplace metadata stays opaque: this read detects explicit
  // contradictions, not independent remote proof or the default-remote gap.
  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunk = ids.slice(offset, offset + chunkSize);
    const row = await db.prepare(`SELECT COUNT(*) AS ownedCount,
      json_group_array(json_object('id', id, 'postedAt',
        CASE WHEN length(posted_at) <= 35 THEN posted_at ELSE NULL END,
        'sourceUrl', CASE WHEN typeof(source_url) = 'text' AND length(source_url) <= ${MAX_URL_INPUT_LENGTH}
          THEN source_url ELSE NULL END,
        'applicationUrl', CASE WHEN typeof(application_url) = 'text' AND length(application_url) <= ${MAX_URL_INPUT_LENGTH}
          THEN application_url ELSE NULL END,
        'locationType', CASE WHEN location_type IN ('remote', 'onsite', 'hybrid')
          THEN location_type ELSE NULL END)) AS postingRows
      FROM opportunities
      WHERE source_id = ? AND is_active = 1
      AND ph_eligibility IN (${PUBLIC_PH_ELIGIBILITIES.map(() => "?").join(", ")})
      AND id IN (${chunk.map(() => "?").join(", ")})`)
      .bind(sourceId, ...PUBLIC_PH_ELIGIBILITIES, ...chunk).first<{ ownedCount: unknown; postingRows: unknown }>();
    const count = row?.ownedCount;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count !== chunk.length) return false;
    // Bound and validate every exact ID/date pair. A count or SQL lexical date
    // comparison alone cannot prove strict calendar validity for all rows.
    const json = row?.postingRows;
    if (typeof json !== "string" || json.length > chunk.length * maxRowJsonBytes + 2
      || new TextEncoder().encode(json).byteLength > chunk.length * maxRowJsonBytes + 2) return false;
    let rows: unknown;
    try { rows = JSON.parse(json); } catch { return false; }
    if (!Array.isArray(rows) || rows.length !== chunk.length) return false;
    const remaining = new Set(chunk);
    for (const value of rows) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const keys = Object.keys(value);
      const { id, postedAt, sourceUrl, applicationUrl, locationType } = value as {
        id: unknown; postedAt: unknown; sourceUrl: unknown; applicationUrl: unknown; locationType: unknown;
      };
      if (keys.length !== 5 || !Object.hasOwn(value, "id") || !Object.hasOwn(value, "postedAt")
        || !Object.hasOwn(value, "sourceUrl") || !Object.hasOwn(value, "applicationUrl")
        || !Object.hasOwn(value, "locationType")
        || typeof id !== "number" || !remaining.delete(id)
        || assessPostingFreshness(postedAt, now).state !== "WITHIN_WINDOW"
        || (applicationUrl !== null && typeof applicationUrl !== "string")
        || (typeof applicationUrl === "string" && [...applicationUrl].length > MAX_URL_INPUT_LENGTH)
        || !resolvePublicationOutboundUrl(sourceUrl, applicationUrl)
        || (locationType !== null && locationType !== "remote" && !hasExplicitNonRemoteLocationType(locationType))
        || hasExplicitNonRemoteLocationType(locationType)) return false;
    }
    if (remaining.size !== 0) return false;
  }
  return true;
}

async function persistAndRecord(
  db: PublicationDatabase,
  request: PublishPublicExposureRequest,
  mode: "unlimited" | "capped",
): Promise<PublishPublicExposureResult> {
  if (request.proposedCount === 0) {
    // No persistence was attempted; keep the existing empty-decision behavior.
    await insertLedger(db, request, mode, 0, []);
    return { ok: true, mode, publishedCount: 0, ids: [], replayed: false };
  }
  let persisted: unknown;
  try { persisted = await request.persist(request.proposedCount); }
  catch { return postPersistenceFailure("publication persistence did not complete with a valid acknowledgement"); }

  let acknowledgement: { publishedCount: number; ids: number[] } | null;
  try { acknowledgement = snapshotAcknowledgement(persisted, request.proposedCount); }
  catch { acknowledgement = null; }
  if (!acknowledgement) return postPersistenceFailure("publication persistence returned an invalid acknowledgement");

  try {
    if (!await hasCurrentOwnership(db, request.sourceId, acknowledgement.ids, request.now)) {
      return postPersistenceFailure("publication IDs did not match current active PH-eligible fresh source ownership, outbound URL and remote metadata");
    }
  } catch {
    return postPersistenceFailure("publication source ownership could not be verified");
  }

  try { await insertLedger(db, request, mode, acknowledgement.publishedCount, acknowledgement.ids); }
  catch {
    // Either write may already have committed. This is not a rollback or a zero-exposure receipt.
    return postPersistenceFailure("publication acknowledgement ledger write did not complete");
  }
  return { ok: true, mode, ...acknowledgement, replayed: false };
}

async function insertLedger(
  db: PublicationDatabase,
  request: PublishPublicExposureRequest,
  mode: "unlimited" | "capped" | "blocked" | "rolled_back",
  publishedCount: number,
  ids: number[],
): Promise<void> {
  const write = await db.prepare(INSERT_LEDGER_SQL).bind(
    request.sourceId,
    request.tickKey,
    request.retryKey,
    mode,
    request.proposedCount,
    publishedCount,
    JSON.stringify(ids),
    request.now,
  ).run();
  if (!write.success) throw new Error("publication ledger write was unsuccessful");
}

/**
 * Historical count utility retained for API compatibility. D1 `meta.changes`
 * can include trigger writes; it is not publication evidence. The live gateway
 * requires exact actual IDs and count and never uses this lossy utility.
 */
export function clampLedgerPublishedCount(proposedCount: number, rawPublished: unknown): number {
  const proposed = Number.isSafeInteger(proposedCount) && proposedCount >= 0 ? proposedCount : 0;
  const raw = typeof rawPublished === "number" && Number.isFinite(rawPublished) ? Math.floor(rawPublished) : 0;
  if (raw <= 0) return 0;
  if (raw > proposed) return proposed;
  return raw;
}
