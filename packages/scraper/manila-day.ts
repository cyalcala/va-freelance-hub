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

export type ManilaSnapshotIdRow = {
  id: number;
  manilaDate: string;
  recordedAt: string;
  firstPublishIds: readonly number[];
  stillPublicIds: readonly number[];
};

function positiveIds(ids: readonly number[]): boolean {
  return ids.every((id) => Number.isSafeInteger(id) && id > 0);
}

// One Manila date keeps the newest valid id row. Rows are not unioned, and a
// later row for another date does not replace this date. Equal instants use the higher id.
export function latestManilaSnapshotIds(rows: readonly ManilaSnapshotIdRow[], manilaDate: string): ManilaSnapshotIdRow | null {
  let latest: ManilaSnapshotIdRow | null = null;
  for (const row of rows) {
    if (row.manilaDate !== manilaDate) continue;
    if (!CANONICAL_INSTANT.test(row.recordedAt)) continue;
    if (!Number.isSafeInteger(row.id) || row.id <= 0) continue;
    if (!positiveIds(row.firstPublishIds) || !positiveIds(row.stillPublicIds)) continue;
    if (row.stillPublicIds.length > row.firstPublishIds.length) continue;
    const first = new Set(row.firstPublishIds);
    if (!row.stillPublicIds.every((id) => first.has(id))) continue;
    if (latest === null || row.recordedAt > latest.recordedAt || (row.recordedAt === latest.recordedAt && row.id > latest.id)) {
      latest = row;
    }
  }
  return latest;
}

export type ManilaSnapshotPairCount = ManilaOpenSnapshot & { retryKey: string };
export type ManilaSnapshotPairIds = ManilaSnapshotIdRow & { retryKey: string };
export type ManilaSnapshotPair = {
  retryKey: string;
  idsKnown: boolean;
  firstPublishIds: number[];
  stillPublicIds: number[];
};

// The day's ids belong to the latest count snapshot. A missing id row stays
// unknown and does not fall back to an older publish.
export function latestManilaSnapshotPair(
  counts: readonly ManilaSnapshotPairCount[],
  ids: readonly ManilaSnapshotPairIds[],
  manilaDate: string,
): ManilaSnapshotPair | null {
  const latest = latestManilaOpenSnapshot(counts, manilaDate);
  if (!latest) return null;
  const count = counts.find((row) => row.id === latest.id && row.recordedAt === latest.recordedAt && row.manilaDate === latest.manilaDate);
  if (!count || count.retryKey.length === 0) return null;
  const matches = ids.filter((row) => row.retryKey === count.retryKey);
  const checked = matches.length === 1 ? latestManilaSnapshotIds(matches, manilaDate) : null;
  if (!checked) {
    return { retryKey: count.retryKey, idsKnown: false, firstPublishIds: [], stillPublicIds: [] };
  }
  return {
    retryKey: count.retryKey,
    idsKnown: true,
    firstPublishIds: [...checked.firstPublishIds],
    stillPublicIds: [...checked.stillPublicIds],
  };
}

// Empty arrays on an unknown pair are not a measured zero. A known pair
// reports its first-publish id count. This is not a closed-day flow.
export function reportableManilaSnapshotIdCount(pair: ManilaSnapshotPair | null): number | null {
  if (!pair || pair.idsKnown !== true) return null;
  if (pair.stillPublicIds.length > pair.firstPublishIds.length) return null;
  return pair.firstPublishIds.length;
}

// An open count is not a completed Manila-day flow. This reader has no
// closed-day evidence, so a caller-supplied CLOSED state does not create one.
export function completedManilaDayFlowCount(dayState: string, reportableCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (reportableCount !== null && !Number.isSafeInteger(reportableCount)) return null;
  return null;
}

// The snapshot count and the known id length are reportable only when they
// are the same safe integer. Disagreement stays absent. An unknown pair stays
// absent. This reader does not prefer either number and is not a closed-day flow.
export function agreedManilaSnapshotIdCount(firstPublishCount: number, pair: ManilaSnapshotPair | null): number | null {
  if (!Number.isSafeInteger(firstPublishCount) || firstPublishCount < 0) return null;
  const reported = reportableManilaSnapshotIdCount(pair);
  if (reported === null || reported !== firstPublishCount) return null;
  return reported;
}

// A repeated id is not a distinct job. Raw length can match the snapshot count
// and still stay absent. This reader does not prefer either number and is not
// a closed-day flow.
export function distinctAgreedManilaSnapshotIdCount(firstPublishCount: number, pair: ManilaSnapshotPair | null): number | null {
  const agreed = agreedManilaSnapshotIdCount(firstPublishCount, pair);
  if (agreed === null || !pair) return null;
  if (new Set(pair.firstPublishIds).size !== pair.firstPublishIds.length) return null;
  return agreed;
}

function samePositiveIds(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  if (!left.every((id) => Number.isSafeInteger(id) && id > 0)) return false;
  if (!right.every((id) => Number.isSafeInteger(id) && id > 0)) return false;
  if (new Set(left).size !== left.length || new Set(right).size !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

// Distinct agreement is absent when the known ids are not the ledger's
// first-publish ids. This reader does not prefer either length and is not a
// closed-day flow.
export function ledgerMatchedManilaSnapshotIdCount(
  firstPublishCount: number,
  pair: ManilaSnapshotPair | null,
  ledgerIds: readonly number[],
): number | null {
  const agreed = distinctAgreedManilaSnapshotIdCount(firstPublishCount, pair);
  if (agreed === null || !pair) return null;
  if (!samePositiveIds(pair.firstPublishIds, ledgerIds)) return null;
  return agreed;
}
