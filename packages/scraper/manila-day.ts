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
export function manilaFirstPublishCount(receipts: readonly FirstPublishReceipt[], manilaDate: string): number {
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
  let count = 0;
  for (const decidedAt of firstAt.values()) {
    if (manilaCalendarDate(decidedAt) === manilaDate) count += 1;
  }
  return count;
}
