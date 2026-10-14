import { sanitizeSourceUrl } from "@va-hub/scraper";

type SourceItem = { sourceUrl?: string | null };
type SourceResult = { sourceId?: string; items: readonly SourceItem[] };
type ConditionalValidators = {
  etag?: string | null;
  lastModified?: string | null;
  bodyHash?: string | null;
};

/** Map normalized item URLs back to the source(s) that fetched them. */
export function buildSourceIdsByUrl(results: readonly SourceResult[]): Map<string, Set<string>> {
  const sourceIdsByUrl = new Map<string, Set<string>>();
  for (const result of results) {
    if (!result.sourceId) continue;
    for (const item of result.items) {
      const sourceUrl = sanitizeSourceUrl(item.sourceUrl);
      if (!sourceUrl) continue;
      const sourceIds = sourceIdsByUrl.get(sourceUrl) ?? new Set<string>();
      sourceIds.add(result.sourceId);
      sourceIdsByUrl.set(sourceUrl, sourceIds);
    }
  }
  return sourceIdsByUrl;
}

/**
 * SP-01: stamp the exact configured source identity onto every item a source
 * produced. `source_platform` is a display label (e.g. "Workable", "Jobicy")
 * and cannot distinguish two sources that share it — two Workable tenants, or
 * the two Jobicy APAC feeds. Source economics must key on the exact runtime
 * identity instead, so identity is attached to the raw item here and rides the
 * object through normalization, dedup, triage, and insert (each stage spreads
 * `{ ...item }`). A result with no configured id yields `null`, never a guess.
 */
export function attachSourceIdentity<T extends { sourceUrl?: string | null }>(
  results: readonly { sourceId?: string; items: readonly T[] }[],
): (T & { sourceId: string | null })[] {
  return results.flatMap((result) =>
    result.items.map((item) => ({ ...item, sourceId: result.sourceId ?? null })),
  );
}

/**
 * Copy ATS (or any later) URL ownership into the map built from RSS/HTML/JSON.
 * Overflow retry can then name the source that still has an unpublished item.
 */
export function mergeSourceIdsByUrl(
  target: Map<string, Set<string>>,
  extra: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, Set<string>> {
  for (const [sourceUrl, sourceIds] of extra) {
    const merged = target.get(sourceUrl) ?? new Set<string>();
    for (const sourceId of sourceIds) merged.add(sourceId);
    target.set(sourceUrl, merged);
  }
  return target;
}

/**
 * Take at most `limit` new items, one source per turn.
 * A large feed ahead of the array must not fill the cap and permanently
 * starve another source's unseen URLs. Dedup, geography, and freshness stay
 * outside this function.
 */
export function selectIntakeBatch<T extends { sourceId?: string | null }>(
  items: readonly T[],
  limit: number,
): { selected: T[]; deferred: T[] } {
  const cap = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, items.length) : 0;
  if (cap === 0) return { selected: [], deferred: [...items] };
  if (cap === items.length) return { selected: [...items], deferred: [] };
  const buckets: T[][] = [];
  const indexBySource = new Map<string, number>();
  for (const item of items) {
    const key = typeof item.sourceId === "string" && item.sourceId.trim() ? item.sourceId : "";
    let index = indexBySource.get(key);
    if (index === undefined) {
      index = buckets.length;
      indexBySource.set(key, index);
      buckets.push([]);
    }
    buckets[index].push(item);
  }
  const selected: T[] = [];
  const chosen = new Set<T>();
  for (let cursor = 0; selected.length < cap; cursor += 1) {
    let progressed = false;
    for (const bucket of buckets) {
      if (selected.length >= cap) break;
      const item = bucket[cursor];
      if (item === undefined) continue;
      selected.push(item);
      chosen.add(item);
      progressed = true;
    }
    if (!progressed) break;
  }
  return { selected, deferred: items.filter((item) => !chosen.has(item)) };
}

/** Return each feed that must be fetched again because one of its items is unresolved. */
export function sourceIdsForUrls(urls: readonly string[], sourceIdsByUrl: ReadonlyMap<string, ReadonlySet<string>>): Set<string> {
  const sourceIds = new Set<string>();
  for (const rawUrl of urls) {
    const sourceUrl = sanitizeSourceUrl(rawUrl);
    if (!sourceUrl) continue;
    for (const sourceId of sourceIdsByUrl.get(sourceUrl) ?? []) {
      sourceIds.add(sourceId);
    }
  }
  return sourceIds;
}

/**
 * A changed feed becomes conditionally fetchable only after every item has a
 * durable terminal outcome. Clearing validators is conservative: the next
 * run re-fetches and re-deduplicates instead of losing an unresolved item to a
 * later 304 response.
 */
export function conditionalValidatorsForPersistence(
  validators: ConditionalValidators,
  shouldPersist: boolean,
): Required<ConditionalValidators> {
  if (!shouldPersist) {
    return { etag: null, lastModified: null, bodyHash: null };
  }
  return {
    etag: validators.etag ?? null,
    lastModified: validators.lastModified ?? null,
    bodyHash: validators.bodyHash ?? null,
  };
}
