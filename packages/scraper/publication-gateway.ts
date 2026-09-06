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
  | { ok: false; reason: string };

const LOAD_POLICY_SQL = `SELECT source_id AS sourceId, compliance_state AS compliance,
  operational_state AS operational, opt_out AS optOut, policy_expiry AS policyExpiry,
  canary_max_new_items_per_tick AS canaryMaxNewItemsPerTick
  FROM source_registry WHERE source_id = ?`;
const LOAD_OPT_OUT_SQL = `SELECT source_id FROM source_opt_outs WHERE source_id = ? LIMIT 1`;
const LOAD_RETRY_SQL = `SELECT mode, published_count AS publishedCount, published_ids_json AS publishedIdsJson
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

export async function loadPublicationPolicy(
  db: PublicationDatabase,
  sourceId: string,
): Promise<PublicationPolicySnapshot> {
  const row = await db.prepare(LOAD_POLICY_SQL).bind(sourceId).first<PublicationPolicySnapshot>();
  if (!row) {
    return {
      sourceId,
      compliance: "allowed",
      operational: "active",
      optOut: false,
      policyExpiry: null,
      canaryMaxNewItemsPerTick: null,
    };
  }
  const optOut = await db.prepare(LOAD_OPT_OUT_SQL).bind(sourceId).first<{ source_id: string }>();
  return { ...row, optOut: Boolean(row.optOut) || Boolean(optOut) };
}

function replayedResult(row: { mode: string; publishedCount: number; publishedIdsJson: string }): PublishPublicExposureResult {
  const ids = JSON.parse(row.publishedIdsJson) as number[];
  if (row.mode === "blocked" || row.mode === "rolled_back") {
    return { ok: true, mode: row.mode, publishedCount: 0, ids: [], replayed: true, reason: "idempotent retry of a non-publishing decision" };
  }
  return { ok: true, mode: row.mode as "unlimited" | "capped", publishedCount: row.publishedCount, ids, replayed: true };
}

export async function publishPublicExposure(
  db: PublicationDatabase,
  request: PublishPublicExposureRequest,
): Promise<PublishPublicExposureResult> {
  if (!isCanonicalSourceId(request.sourceId)) return { ok: false, reason: "source identity is required for public exposure" };
  if (!Number.isSafeInteger(request.proposedCount) || request.proposedCount < 0) {
    return { ok: false, reason: "proposed publication count must be a non-negative integer" };
  }
  if (!request.tickKey || !request.retryKey || request.retryKey.includes("\0") || request.tickKey.includes("\0")) {
    return { ok: false, reason: "publication tick and retry keys are required" };
  }

  const prior = await db.prepare(LOAD_RETRY_SQL).bind(request.retryKey).first<{
    mode: string; publishedCount: number; publishedIdsJson: string;
  }>();
  if (prior) return replayedResult(prior);

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
    const persisted = request.proposedCount === 0 ? { publishedCount: 0, ids: [] as number[] } : await request.persist(request.proposedCount);
    await insertLedger(db, request, "capped", persisted.publishedCount, persisted.ids);
    return { ok: true, mode: "capped", publishedCount: persisted.publishedCount, ids: persisted.ids, replayed: false };
  }

  if (policy.optOut || (policy.compliance !== "allowed" && policy.compliance !== "conditional") || policy.operational !== "active") {
    await insertLedger(db, request, "blocked", 0, []);
    return { ok: true, mode: "blocked", publishedCount: 0, ids: [], replayed: false, reason: "source is not publication-eligible" };
  }

  const persisted = request.proposedCount === 0 ? { publishedCount: 0, ids: [] as number[] } : await request.persist(request.proposedCount);
  await insertLedger(db, request, "unlimited", persisted.publishedCount, persisted.ids);
  return { ok: true, mode: "unlimited", publishedCount: persisted.publishedCount, ids: persisted.ids, replayed: false };
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
