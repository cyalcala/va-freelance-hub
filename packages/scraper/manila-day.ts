const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function manilaCalendarDate(instant: string): string | null {
  if (!CANONICAL_INSTANT.test(instant)) return null;
  const parsed = Date.parse(instant);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

export type FirstPublishReceipt = { idsJson: string; decidedAt: string };

// Distinct positive ids whose earliest positive receipt falls on manilaDate.
// An empty id list does not count. A later receipt of the same id does not count.
export function manilaFirstPublishIds(receipts: readonly FirstPublishReceipt[], manilaDate: string): number[] {
  const firstAt = new Map<number, string>();
  for (const receipt of receipts) {
    if (!CANONICAL_INSTANT.test(receipt.decidedAt)) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(receipt.idsJson); } catch { continue; }
    if (!Array.isArray(parsed)) continue;
    for (const id of parsed) {
      if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) continue;
      const prior = firstAt.get(id);
      if (prior === undefined || receipt.decidedAt < prior) firstAt.set(id, receipt.decidedAt);
    }
  }
  const ids: number[] = [];
  for (const [id, decidedAt] of firstAt) {
    if (manilaCalendarDate(decidedAt) === manilaDate) ids.push(id);
  }
  ids.sort((left, right) => left - right);
  return ids;
}

export function manilaFirstPublishCount(receipts: readonly FirstPublishReceipt[], manilaDate: string): number {
  return manilaFirstPublishIds(receipts, manilaDate).length;
}

export type ManilaOpenSnapshot = {
  id: number;
  manilaDate: string;
  recordedAt: string;
  dayState: string;
  firstPublishCount: number;
  stillPublicCount: number;
};

// One Manila date keeps the newest OPEN row. Rows are not summed, and a later
// row for another date does not replace this date. Equal instants use the higher id.
export function latestManilaOpenSnapshot(rows: readonly ManilaOpenSnapshot[], manilaDate: string): ManilaOpenSnapshot | null {
  let latest: ManilaOpenSnapshot | null = null;
  for (const row of rows) {
    if (row.manilaDate !== manilaDate || row.dayState !== "OPEN") continue;
    if (!CANONICAL_INSTANT.test(row.recordedAt)) continue;
    if (!Number.isSafeInteger(row.id) || row.id <= 0) continue;
    if (!Number.isSafeInteger(row.firstPublishCount) || row.firstPublishCount < 0) continue;
    if (!Number.isSafeInteger(row.stillPublicCount) || row.stillPublicCount < 0) continue;
    if (row.stillPublicCount > row.firstPublishCount) continue;
    if (latest === null || row.recordedAt > latest.recordedAt || (row.recordedAt === latest.recordedAt && row.id > latest.id)) {
      latest = row;
    }
  }
  return latest;
}
