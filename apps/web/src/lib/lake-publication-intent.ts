import { isAdmissionInstant } from "@va-hub/scraper";

export interface LakeIntentStatement {
  bind(...values: unknown[]): LakeIntentStatement;
  first<T>(): Promise<T | null>;
}
export interface LakeIntentDatabase {
  prepare(sql: string): LakeIntentStatement;
  batch(statements: LakeIntentStatement[]): Promise<{ success: boolean; results?: unknown[] }[]>;
}
export interface LakeIntentInput {
  operationId: string;
  sourceId: string;
  manifestHash: string;
  candidateDescriptorsJson: string;
}
interface StoredIntent {
  operationId: string; sourceId: string; manifestHash: string; candidateDescriptorsJson: string;
  stagedAt: string; revision: number; sourceIdentityHash: string | null; publicationTickKey: string | null;
  committedReceiptKey: string | null; committedOutcomesJson: string | null;
}
export type LakeIntentResult =
  | { ok: true; state: "STAGED"; operationId: string; manifestHash: string; stagedAt: string; revision: 0;
      publishedCount: 0; syncedCount: 0; publicationAuthorized: false; recoveredAcknowledgement: boolean }
  | { ok: false; status: 409 | 413 | 503; code: "MANIFEST_CONFLICT" | "OPERATION_STATE_CONFLICT" |
      "STAGING_MANIFEST_TOO_LARGE" | "STAGING_BINDING_UNAVAILABLE" | "STAGING_COMMIT_UNKNOWN" };

const SELECT_INTENT = `SELECT operation_key AS operationId,source_id AS sourceId,manifest_hash AS manifestHash,
 candidate_descriptors_json AS candidateDescriptorsJson,staged_at AS stagedAt,revision,
 source_identity_hash AS sourceIdentityHash,publication_tick_key AS publicationTickKey,
 committed_receipt_key AS committedReceiptKey,committed_outcomes_json AS committedOutcomesJson
 FROM lake_publication_operations WHERE operation_key=?`;

const hex = (value: unknown) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const text = (value: unknown, max: number) => typeof value === "string" && value.length >= 1 && value.length <= max && !value.includes("\0");
function arrayJson(value: unknown, descriptors: boolean): boolean {
  if (typeof value !== "string" || new TextEncoder().encode(value).byteLength > 262144) return false;
  try {
    const rows = JSON.parse(value);
    if (!Array.isArray(rows)) return false;
    if (!descriptors) return true;
    return rows.length >= 1 && rows.length <= 200 && rows.every(row => row !== null && typeof row === "object"
      && !Array.isArray(row) && Object.keys(row).length === 4
      && Object.keys(row).every(key => ["lakeCandidateId", "lakeFingerprint", "sourceUrl", "materialSha256"].includes(key))
      && Number.isSafeInteger(row.lakeCandidateId) && row.lakeCandidateId > 0
      && text(row.lakeFingerprint, 128) && text(row.sourceUrl, 2048) && hex(row.materialSha256));
  } catch { return false; }
}

function validStored(row: StoredIntent | null): row is StoredIntent {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  return text(row.operationId, 128) && text(row.sourceId, 200) && hex(row.manifestHash)
    && arrayJson(row.candidateDescriptorsJson, true) && typeof row.stagedAt === "string" && isAdmissionInstant(row.stagedAt)
    && Number.isSafeInteger(row.revision) && row.revision >= 0
    && (row.sourceIdentityHash === null || hex(row.sourceIdentityHash))
    && (row.publicationTickKey === null || text(row.publicationTickKey, 256))
    && (row.committedReceiptKey === null || text(row.committedReceiptKey, 512))
    && (row.committedOutcomesJson === null || arrayJson(row.committedOutcomesJson, false))
    && (row.committedReceiptKey === null) === (row.committedOutcomesJson === null)
    && (row.committedReceiptKey === null || (row.sourceIdentityHash !== null && row.publicationTickKey !== null));
}

function inspect(row: StoredIntent | null, input: LakeIntentInput, recoveredAcknowledgement: boolean): LakeIntentResult {
  if (!validStored(row) || row.operationId !== input.operationId) return { ok: false, status: 503, code: "STAGING_COMMIT_UNKNOWN" };
  if (row.sourceId !== input.sourceId
    || row.manifestHash !== input.manifestHash || row.candidateDescriptorsJson !== input.candidateDescriptorsJson) {
    return { ok: false, status: 409, code: "MANIFEST_CONFLICT" };
  }
  if (!isAdmissionInstant(row.stagedAt) || row.revision !== 0 || row.sourceIdentityHash !== null
    || row.publicationTickKey !== null || row.committedReceiptKey !== null || row.committedOutcomesJson !== null) {
    return { ok: false, status: 409, code: "OPERATION_STATE_CONFLICT" };
  }
  return { ok: true, state: "STAGED", operationId: row.operationId, manifestHash: row.manifestHash,
    stagedAt: row.stagedAt, revision: 0, publishedCount: 0, syncedCount: 0,
    publicationAuthorized: false, recoveredAcknowledgement };
}

/** Private intent only. This function never queries or mutates opportunities or publication policy. */
export async function stageLakePublicationIntent(db: LakeIntentDatabase | null | undefined, input: LakeIntentInput): Promise<LakeIntentResult> {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    return { ok: false, status: 503, code: "STAGING_BINDING_UNAVAILABLE" };
  }
  if (new TextEncoder().encode(input.candidateDescriptorsJson).byteLength > 262144) {
    return { ok: false, status: 413, code: "STAGING_MANIFEST_TOO_LARGE" };
  }
  try {
    const results = await db.batch([
      db.prepare(`INSERT INTO lake_publication_operations(operation_key,source_id,manifest_hash,candidate_descriptors_json)
        VALUES(?,?,?,?) ON CONFLICT(operation_key) DO NOTHING`)
        .bind(input.operationId, input.sourceId, input.manifestHash, input.candidateDescriptorsJson),
      // A mismatch throws and aborts the native batch; a zero-row update is not a guard.
      db.prepare(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM lake_publication_operations
        WHERE operation_key=? AND source_id=? AND manifest_hash=? AND candidate_descriptors_json=?)
        THEN 1 ELSE json('lake manifest conflict') END) AS intent_guard`)
        .bind(input.operationId, input.sourceId, input.manifestHash, input.candidateDescriptorsJson),
      db.prepare(SELECT_INTENT).bind(input.operationId),
    ]);
    if (results.length === 3 && results.every(result => result?.success === true)
      && Array.isArray(results[2].results) && results[2].results.length === 1) {
      const inspected = inspect(results[2].results[0] as StoredIntent, input, false);
      if (inspected.ok) return inspected;
      // A malformed selected row is also an ambiguous acknowledgement. Confirm
      // conflicts/advanced state from durable readback before classifying them.
    }
  } catch {
    // The acknowledgement can fail after the commit. Read exact durable state;
    // never regenerate a key, claim publication, or replay a raw writer.
  }
  try {
    return inspect(await db.prepare(SELECT_INTENT).bind(input.operationId).first<StoredIntent>(), input, true);
  } catch { return { ok: false, status: 503, code: "STAGING_COMMIT_UNKNOWN" }; }
}
