import { PUBLIC_PH_ELIGIBILITIES } from "./publication-eligibility";

export const PUBLICATION_UNRECEIPTED_INACTIVE_REASON = "publication-unreceipted";
const UNCERTAINTY_REASON = "ledger-acknowledgement-unconfirmed";
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

interface UncertaintyStatement {
  bind(...values: unknown[]): UncertaintyStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface UncertaintyDatabase {
  prepare(query: string): UncertaintyStatement;
}

const INSERT_UNCERTAINTY_SQL = `INSERT INTO publication_outcome_uncertainty (
  source_id, tick_key, retry_key, opportunity_ids_json, reason, recorded_at
) VALUES (?, ?, ?, ?, '${UNCERTAINTY_REASON}', ?)`;

/**
 * Records the ids whose persistence was acknowledged to the gateway but whose
 * ledger write did not complete for the caller. Failure to record still leaves
 * the caller on UNKNOWN. This does not roll back the row.
 */
export async function recordLostAcknowledgement(
  db: UncertaintyDatabase,
  request: { sourceId: string; tickKey: string; retryKey: string; now: string },
  ids: readonly number[],
): Promise<void> {
  if (ids.length === 0 || !CANONICAL_INSTANT.test(request.now)) return;
  try {
    const write = await db.prepare(INSERT_UNCERTAINTY_SQL).bind(
      request.sourceId,
      request.tickKey,
      request.retryKey,
      JSON.stringify(ids),
      request.now,
    ).run();
    if (!write.success) return;
  } catch {
    // A duplicate marker is already durable. Any other failure stays UNKNOWN.
  }
}

type UncertaintyMarker = { id: number; sourceId: string; idsJson: string };
type ActiveRow = { active: number | boolean; reason: string | null };

/**
 * Deactivates only ids named by an uncertainty marker that still have no
 * successful publication receipt. Ledger-less history without a marker stays.
 */
export async function withdrawUnreceiptedAcknowledgements(
  db: UncertaintyDatabase,
  observedAt: string,
): Promise<{ withdrawnIds: number[] }> {
  const withdrawnIds: number[] = [];
  let after = 0;
  let marker: UncertaintyMarker | null;
  try {
    marker = await db.prepare(`SELECT id, source_id AS sourceId, opportunity_ids_json AS idsJson
      FROM publication_outcome_uncertainty WHERE id > ? ORDER BY id LIMIT 1`).bind(after).first<UncertaintyMarker>();
  } catch {
    return { withdrawnIds };
  }
  while (marker) {
    after = marker.id;
    let parsed: unknown;
    try { parsed = JSON.parse(marker.idsJson); } catch { parsed = null; }
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) continue;
        const receipt = await db.prepare(`SELECT id FROM source_publication_ledger
          WHERE source_id = ? AND mode IN ('unlimited', 'capped') AND published_count > 0
          AND EXISTS (SELECT 1 FROM json_each(published_ids_json) WHERE value = ?)
          LIMIT 1`).bind(marker.sourceId, id).first<{ id: number }>();
        if (receipt) continue;
        const before = await db.prepare(`SELECT is_active AS active FROM opportunities
          WHERE id = ? AND source_id = ? AND is_active = 1
          AND ph_eligibility IN (${PUBLIC_PH_ELIGIBILITIES.map(() => "?").join(", ")})`).bind(
          id, marker.sourceId, ...PUBLIC_PH_ELIGIBILITIES,
        ).first<{ active: number | boolean }>();
        if (!before || before.active === 0 || before.active === false) continue;
        await db.prepare(`UPDATE opportunities
          SET is_active = 0, inactive_reason = ?, updated_at = ?
          WHERE id = ? AND source_id = ? AND is_active = 1
          AND ph_eligibility IN (${PUBLIC_PH_ELIGIBILITIES.map(() => "?").join(", ")})`).bind(
          PUBLICATION_UNRECEIPTED_INACTIVE_REASON, observedAt, id, marker.sourceId, ...PUBLIC_PH_ELIGIBILITIES,
        ).run();
        const afterRow = await db.prepare(`SELECT is_active AS active, inactive_reason AS reason
          FROM opportunities WHERE id = ?`).bind(id).first<ActiveRow>();
        if (afterRow && (afterRow.active === 0 || afterRow.active === false)
          && afterRow.reason === PUBLICATION_UNRECEIPTED_INACTIVE_REASON) {
          withdrawnIds.push(id);
        }
      }
    }
    marker = await db.prepare(`SELECT id, source_id AS sourceId, opportunity_ids_json AS idsJson
      FROM publication_outcome_uncertainty WHERE id > ? ORDER BY id LIMIT 1`).bind(after).first<UncertaintyMarker>();
  }
  return { withdrawnIds };
}
