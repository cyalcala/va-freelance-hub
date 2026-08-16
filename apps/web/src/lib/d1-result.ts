/**
 * D1 result helpers.
 *
 * Drizzle/D1 returns the rows-changed count under `res.meta.changes`, but several
 * call sites historically read `res.changes` (always `undefined`) and fell back to
 * `batch.length` — silently reporting 100% writes every run and hiding whether
 * the debounce WHERE actually matched anything. This centralizes the extraction
 * with one consistent fallback so the bug cannot recur at a new call site.
 */

type D1Result = { meta?: { changes?: unknown }; changes?: unknown } | null | undefined;

/**
 * Returns the number of rows a D1 INSERT/UPDATE/DELETE actually changed.
 *
 * Falls back to 0 when the response shape is unrecognized — never to the
 * requested batch size — so a missing `meta.changes` reads as "nothing
 * confirmed" rather than "everything succeeded".
 */
export function d1Changes(res: unknown): number {
  const r = res as D1Result;
  const n = r?.meta?.changes ?? r?.changes;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
