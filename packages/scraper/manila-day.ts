import { canonicalizeSourceUrl } from "./contentHash";
import {
  concentrationReport,
  familyShares,
  TOP_PROVIDER_FAMILY_SHARE_MAX,
  TOP_SOURCE_SHARE_MAX,
} from "./portfolio-concentration";

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

// The still-public count and the known still-public id length are reportable
// only when they are the same safe integer. Disagreement stays absent. This
// reader does not prefer either number and is not a closed-day flow.
export function agreedManilaStillPublicCount(stillPublicCount: number, pair: ManilaSnapshotPair | null): number | null {
  if (!Number.isSafeInteger(stillPublicCount) || stillPublicCount < 0) return null;
  if (!pair || pair.idsKnown !== true) return null;
  if (new Set(pair.stillPublicIds).size !== pair.stillPublicIds.length) return null;
  const first = new Set(pair.firstPublishIds);
  if (!pair.stillPublicIds.every((id) => first.has(id))) return null;
  if (pair.stillPublicIds.length !== stillPublicCount) return null;
  return stillPublicCount;
}

// A ledger-matched count is not a completed Manila-day flow. This reader has
// no closed-day evidence, so a caller-supplied CLOSED state does not create
// one. The 100 floor is not a flow either.
export function ledgerMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// Internal still-public agreement is absent when those ids are not the serving
// rows that remain public. This reader does not prefer either length and is
// not a closed-day flow.
export function servingMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  servingIds: readonly number[],
): number | null {
  const agreed = agreedManilaStillPublicCount(stillPublicCount, pair);
  if (agreed === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, servingIds)) return null;
  return agreed;
}

// A serving-matched still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function servingMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// A serving match stays absent when those ids are no longer remote. This
// reader does not prefer the active PH length and is not a closed-day flow.
export function remoteMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  servingIds: readonly number[],
  remoteIds: readonly number[],
): number | null {
  const matched = servingMatchedManilaStillPublicCount(stillPublicCount, pair, servingIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, remoteIds)) return null;
  return matched;
}

// A remote-matched still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function remoteMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// A remote-matched count is not a portfolio pass. One source above the
// constitution ceiling is a breach. An empty book stays UNKNOWN. A row total
// that disagrees with the matched count stays absent. This does not block a
// writer and is not a closed-day flow.
export function remoteMatchedManilaPortfolioStatus(
  matchedCount: number | null,
  rows: readonly { sourceId: string; count: number }[],
): "UNKNOWN" | "OK" | "BREACH" | null {
  if (matchedCount !== null && (!Number.isSafeInteger(matchedCount) || matchedCount < 0)) return null;
  const usable = rows.filter((row) => row.count > 0 && row.sourceId.trim().length > 0);
  const total = usable.reduce((sum, row) => sum + row.count, 0);
  if (matchedCount === null || matchedCount === 0) {
    if (total !== 0) return null;
    return concentrationReport([], TOP_SOURCE_SHARE_MAX).status;
  }
  if (total !== matchedCount) return null;
  return concentrationReport(
    usable.map((row) => ({ id: row.sourceId, count: row.count })),
    TOP_SOURCE_SHARE_MAX,
  ).status;
}

// A source-share OK book can still breach the provider-family ceiling.
// Colon-prefixed ids fold. Unprefixed Jobicy feeds do not. An empty book
// stays UNKNOWN. This does not block a writer and is not a closed-day flow.
export function remoteMatchedManilaFamilyStatus(
  matchedCount: number | null,
  rows: readonly { sourceId: string; count: number }[],
): "UNKNOWN" | "OK" | "BREACH" | null {
  if (matchedCount !== null && (!Number.isSafeInteger(matchedCount) || matchedCount < 0)) return null;
  const usable = rows.filter((row) => row.count > 0 && row.sourceId.trim().length > 0);
  const total = usable.reduce((sum, row) => sum + row.count, 0);
  if (matchedCount === null || matchedCount === 0) {
    if (total !== 0) return null;
    return concentrationReport([], TOP_PROVIDER_FAMILY_SHARE_MAX).status;
  }
  if (total !== matchedCount) return null;
  return concentrationReport(familyShares([...usable]), TOP_PROVIDER_FAMILY_SHARE_MAX).status;
}

// A family breach on an OPEN snapshot is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. Caller-supplied 100 and 150 stay absent. This does
// not block a writer and does not claim MATH-08.
export function remoteMatchedManilaFamilyDayFlowCount(
  dayState: string,
  familyStatus: "UNKNOWN" | "OK" | "BREACH" | null,
  matchedCount: number | null,
): number | null {
  if (dayState.length === 0) return null;
  if (familyStatus !== "BREACH" && familyStatus !== "OK" && familyStatus !== "UNKNOWN" && familyStatus !== null) {
    return null;
  }
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

function usableSourceTotals(rows: readonly { sourceId: string; count: number }[]): Array<[string, number]> {
  const sums = new Map<string, number>();
  for (const row of rows) {
    if (!(row.count > 0) || row.sourceId.trim().length === 0) continue;
    sums.set(row.sourceId, (sums.get(row.sourceId) ?? 0) + row.count);
  }
  return [...sums.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

function samePublishedSourceBook(
  publishedRows: readonly { sourceId: string; count: number }[],
  suppliedRows: readonly { sourceId: string; count: number }[],
): boolean {
  const published = usableSourceTotals(publishedRows);
  const supplied = usableSourceTotals(suppliedRows);
  if (published.length !== supplied.length) return false;
  return published.every((row, index) => {
    const other = supplied[index];
    return other !== undefined && row[0] === other[0] && row[1] === other[1];
  });
}

// A caller-supplied source book is not the day's family status unless it is
// the published still-public source counts. A foreign breach stays absent.
// This does not block a writer and is not a closed-day flow.
export function publishedManilaFamilyStatus(
  matchedCount: number | null,
  publishedRows: readonly { sourceId: string; count: number }[],
  suppliedRows: readonly { sourceId: string; count: number }[],
): "UNKNOWN" | "OK" | "BREACH" | null {
  if (!samePublishedSourceBook(publishedRows, suppliedRows)) return null;
  return remoteMatchedManilaFamilyStatus(matchedCount, publishedRows);
}

// A self-matching caller-supplied book is not the day's family status unless
// its source counts are the snapshot's still-public opportunity sources. A
// different id stays absent. This does not block a writer and is not a
// closed-day flow.
export function snapshotSourcedManilaFamilyStatus(
  matchedCount: number | null,
  stillPublicIds: readonly number[],
  idSources: readonly { id: number; sourceId: string }[],
  suppliedRows: readonly { sourceId: string; count: number }[],
): "UNKNOWN" | "OK" | "BREACH" | null {
  if (!samePositiveIds(stillPublicIds, idSources.map((row) => row.id))) return null;
  if (idSources.some((row) => row.sourceId.trim().length === 0)) return null;
  const counts = new Map<string, number>();
  for (const row of idSources) counts.set(row.sourceId, (counts.get(row.sourceId) ?? 0) + 1);
  const published = [...counts.entries()].map(([sourceId, count]) => ({ sourceId, count }));
  return publishedManilaFamilyStatus(matchedCount, published, suppliedRows);
}

// A still-public id whose current source is no longer the publishing source
// is not the published family status. A self-matching replacement book stays
// absent. This does not block a writer and is not a closed-day flow.
export function publishingSourceManilaFamilyStatus(
  matchedCount: number | null,
  publishingSourceId: string,
  stillPublicIds: readonly number[],
  idSources: readonly { id: number; sourceId: string }[],
  suppliedRows: readonly { sourceId: string; count: number }[],
): "UNKNOWN" | "OK" | "BREACH" | null {
  if (publishingSourceId.trim().length === 0) return null;
  if (idSources.some((row) => row.sourceId !== publishingSourceId)) return null;
  return snapshotSourcedManilaFamilyStatus(matchedCount, stillPublicIds, idSources, suppliedRows);
}

// A remote serving match stays absent when the original posting is outside the
// inclusive 30-day window or unknown. This reader does not prefer the remote
// length and is not a closed-day flow.
export function freshMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  remoteIds: readonly number[],
  freshIds: readonly number[],
): number | null {
  const matched = remoteMatchedManilaStillPublicCount(stillPublicCount, pair, remoteIds, remoteIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, freshIds)) return null;
  return matched;
}

// A fresh-matched still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function freshMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// A fresh remote match stays absent when the outbound apply URL does not
// resolve. This reader does not prefer the fresh length and is not a
// closed-day flow.
export function applyMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  freshIds: readonly number[],
  applyIds: readonly number[],
): number | null {
  const matched = freshMatchedManilaStillPublicCount(stillPublicCount, pair, freshIds, freshIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, applyIds)) return null;
  return matched;
}

// An apply-matched still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function applyMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// An apply match stays absent when the id leaves the accepted PH pair. This
// reader does not prefer the apply-matched length and is not a closed-day flow.
export function phMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  applyIds: readonly number[],
  phIds: readonly number[],
): number | null {
  const matched = applyMatchedManilaStillPublicCount(stillPublicCount, pair, applyIds, applyIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, phIds)) return null;
  return matched;
}

// A PH-matched still-public count is not a completed Manila-day flow. This
// reader has no closed-day evidence, so a caller-supplied CLOSED state does
// not create one. The 100 floor is not a flow either.
export function phMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// A PH match stays absent when two still-public ids share one canonical
// source URL. This reader does not prefer the raw id length, does not
// collapse the pair to one survivor, and is not a closed-day flow.
export function canonicalUrlMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  phIds: readonly number[],
  rows: readonly { id: number; sourceUrl: string }[],
): number | null {
  const matched = phMatchedManilaStillPublicCount(stillPublicCount, pair, phIds, phIds);
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, rows.map((row) => row.id))) return null;
  const canonical = rows.map((row) => canonicalizeSourceUrl(row.sourceUrl));
  if (new Set(canonical).size !== canonical.length) return null;
  return matched;
}

// A canonical-URL still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function canonicalUrlMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// A canonical-URL match stays absent when the id no longer belongs to the
// publishing source. This reader does not prefer the canonical-URL length
// and is not a closed-day flow.
export function sourceMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  rows: readonly { id: number; sourceUrl: string }[],
  ownedRows: readonly { id: number; sourceId: string }[],
  publishingSourceId: string,
): number | null {
  const matched = canonicalUrlMatchedManilaStillPublicCount(
    stillPublicCount,
    pair,
    rows.map((row) => row.id),
    rows,
  );
  if (matched === null || !pair) return null;
  if (publishingSourceId.length === 0) return null;
  if (!samePositiveIds(pair.stillPublicIds, ownedRows.map((row) => row.id))) return null;
  if (!ownedRows.every((row) => row.sourceId === publishingSourceId)) return null;
  return matched;
}

// A source-matched still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function sourceMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}

// A source match stays absent when the id is no longer active. This reader
// does not prefer the source-matched length and is not a closed-day flow.
export function activeMatchedManilaStillPublicCount(
  stillPublicCount: number,
  pair: ManilaSnapshotPair | null,
  rows: readonly { id: number; sourceUrl: string }[],
  ownedRows: readonly { id: number; sourceId: string }[],
  publishingSourceId: string,
  activeIds: readonly number[],
): number | null {
  const matched = sourceMatchedManilaStillPublicCount(
    stillPublicCount,
    pair,
    rows,
    ownedRows,
    publishingSourceId,
  );
  if (matched === null || !pair) return null;
  if (!samePositiveIds(pair.stillPublicIds, activeIds)) return null;
  return matched;
}

// An active-matched still-public count is not a completed Manila-day flow.
// This reader has no closed-day evidence, so a caller-supplied CLOSED state
// does not create one. The 100 floor is not a flow either.
export function activeMatchedManilaDayFlowCount(dayState: string, matchedCount: number | null): number | null {
  if (dayState.length === 0) return null;
  if (matchedCount !== null && !Number.isSafeInteger(matchedCount)) return null;
  return null;
}
