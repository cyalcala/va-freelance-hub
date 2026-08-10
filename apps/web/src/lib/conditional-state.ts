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
