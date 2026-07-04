// Shared batching helpers for D1 writes.
//
// Cloudflare D1 rejects statements that bind more than 100 SQL variables
// ("too many SQL variables"). Any multi-row insert must therefore be chunked
// so that rows-per-batch * columns-per-row stays safely under that limit.
// The opportunities insert already learned this lesson (F-01, 2026-06-11);
// this helper makes the rule reusable instead of re-discovered per call site.

export const D1_MAX_BOUND_PARAMETERS = 100;

/** Split an array into consecutive chunks of at most `size` items. */
export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`chunkArray size must be a positive integer, got ${size}`);
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Largest safe rows-per-batch for a D1 multi-row insert with the given column
 * count, always at least 1 so single-row inserts still go through.
 */
export function maxRowsPerD1Batch(columnsPerRow: number): number {
  if (!Number.isInteger(columnsPerRow) || columnsPerRow <= 0) {
    throw new Error(`columnsPerRow must be a positive integer, got ${columnsPerRow}`);
  }
  return Math.max(1, Math.floor(D1_MAX_BOUND_PARAMETERS / columnsPerRow));
}
