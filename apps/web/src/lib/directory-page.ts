import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, vaDirectory } from "@va-hub/db";
import type { DbEnvironment } from "@va-hub/db/client";
import { isDirectoryNiche, type DirectoryCategory } from "./directory-categories";
import { directoryVisibilityFilters } from "./directory-visibility";
import { escapeSqlLike } from "./public-query";

export const DIRECTORY_PAGE_SIZE = 48;

/**
 * Matches the 300s HTML cache the page already publishes in `Cache-Control` and
 * that `src/middleware.ts` stores in the Cloudflare edge cache, so an in-isolate
 * listing is never the stalest layer a visitor can observe.
 */
export const DIRECTORY_LISTING_CACHE_TTL_MS = 5 * 60 * 1000;

/** The public page exposes an arbitrary `?q=`, so the retained key space is capped. */
export const DIRECTORY_LISTING_CACHE_MAX_KEYS = 16;

/**
 * A curated company directory, not a feed: today 746 rows, 720 publicly visible.
 * The cap bounds retained memory per filter; a listing larger than this is served
 * correctly but never cached, so growth degrades to today's read cost instead of
 * caching a payload nobody measured.
 */
export const DIRECTORY_LISTING_CACHE_MAX_ROWS = 1000;

export type DirectoryAgency = {
  id: number;
  companyName: string;
  website: string | null;
  niche: string;
  isDayshift: boolean;
  isVerified: boolean;
  isRemote: boolean;
  isMarketplace: boolean;
};

const directoryAgencyColumns = {
  id: vaDirectory.id,
  companyName: vaDirectory.companyName,
  website: vaDirectory.website,
  niche: vaDirectory.niche,
  isDayshift: vaDirectory.isDayshift,
  isVerified: vaDirectory.isVerified,
  isRemote: vaDirectory.isRemote,
  isMarketplace: vaDirectory.isMarketplace,
};

/**
 * The public visibility predicate. Unchanged and still shared with the homepage
 * count through `directoryVisibilityFilters()`; this unit moved it, it did not
 * relax it.
 */
export function buildDirectoryFilters(
  category: DirectoryCategory | null,
  query: string,
): SQL {
  const filters: SQL[] = [directoryVisibilityFilters()];
  if (category === "dayshift") {
    filters.push(eq(vaDirectory.isDayshift, true));
  } else if (category === "marketplaces") {
    filters.push(eq(vaDirectory.isMarketplace, true));
  } else if (category && isDirectoryNiche(category)) {
    filters.push(eq(vaDirectory.niche, category));
  }
  if (query) {
    filters.push(sql`lower(${vaDirectory.companyName}) LIKE ${`%${escapeSqlLike(query.toLowerCase())}%`} ESCAPE '\\'`);
  }
  return and(...filters)!;
}

/**
 * The cache key must describe the query the SQL actually used. `buildDirectoryFilters`
 * lowercases but does not trim, so the key lowercases and does not trim: "Acme" and
 * "acme" share an entry because they select the same rows, while " acme" must not,
 * because it selects different ones.
 */
export function directoryFilterKey(
  category: DirectoryCategory | null,
  query: string,
): string {
  return `${category ?? ""}|${query.toLowerCase()}`;
}

/**
 * One ordered read of the visible listing, with no COUNT and no OFFSET.
 *
 * The predicate columns (`hires_filipinos`, `link_fail_count`) are not indexed,
 * so SQLite cannot use `company_name_idx` to satisfy either a `COUNT(*)` or an
 * `ORDER BY company_name ... OFFSET n`: both walk the whole table or the whole
 * index and then throw most of it away. Measured in production D1 on
 * 2026-10-05 (`EXPLAIN QUERY PLAN`, 746 rows): the count was `SCAN va_directory`
 * and the paged select was `SCAN va_directory USING INDEX company_name_idx`,
 * roughly 1 540 rows read to render 48. One ordered read per filter key replaces
 * both, and the in-isolate cache removes it again for every later page, category
 * and search render inside the TTL.
 *
 * There is deliberately no `LIMIT` here: the page publishes an exact total, so a
 * truncated listing would report a false count. The read is bounded by the size
 * of a curated directory table; if that ever stops being true the correct fix is
 * an index on the predicate (a migration, which this unit may not author).
 */
async function readDirectoryListing(
  env: DbEnvironment,
  category: DirectoryCategory | null,
  query: string,
): Promise<DirectoryAgency[]> {
  const db = getDb(env);
  return db
    .select(directoryAgencyColumns)
    .from(vaDirectory)
    .where(buildDirectoryFilters(category, query))
    .orderBy(asc(vaDirectory.companyName));
}

export function sliceDirectoryPage(
  rows: DirectoryAgency[],
  page: number,
  pageSize = DIRECTORY_PAGE_SIZE,
): {
  agencies: DirectoryAgency[];
  totalAgencies: number;
  totalPages: number;
  offset: number;
  pageOutOfRange: boolean;
} {
  const totalAgencies = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalAgencies / pageSize));
  const offset = (page - 1) * pageSize;
  const pageOutOfRange = page > totalPages;
  return {
    agencies: pageOutOfRange ? [] : rows.slice(offset, offset + pageSize),
    totalAgencies,
    totalPages,
    offset,
    pageOutOfRange,
  };
}

export function createDirectoryListingCache(options: {
  ttlMs: number;
  maxKeys: number;
  maxRows: number;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  const entries = new Map<string, { value: DirectoryAgency[]; expiresAt: number }>();
  const inFlight = new Map<string, Promise<DirectoryAgency[]>>();

  return {
    async load(
      key: string,
      load: () => Promise<DirectoryAgency[]>,
    ): Promise<DirectoryAgency[]> {
      const entry = entries.get(key);
      if (entry && entry.expiresAt > now()) return entry.value;
      if (entry) entries.delete(key);
      const pending = inFlight.get(key);
      if (pending) return pending;

      const promise = Promise.resolve()
        .then(load)
        .then((rows) => {
          if (rows.length <= options.maxRows) {
            entries.set(key, { value: rows, expiresAt: now() + options.ttlMs });
            while (entries.size > options.maxKeys) {
              const oldest = entries.keys().next();
              if (oldest.done) break;
              entries.delete(oldest.value);
            }
          }
          return rows;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, promise);
      return promise;
    },
  };
}

const directoryListingCache = createDirectoryListingCache({
  ttlMs: DIRECTORY_LISTING_CACHE_TTL_MS,
  maxKeys: DIRECTORY_LISTING_CACHE_MAX_KEYS,
  maxRows: DIRECTORY_LISTING_CACHE_MAX_ROWS,
});

export async function loadDirectoryPage(
  env: DbEnvironment,
  request: {
    category: DirectoryCategory | null;
    query: string;
    page: number;
    pageSize?: number;
  },
) {
  const { category, query, page, pageSize = DIRECTORY_PAGE_SIZE } = request;
  const rows = await directoryListingCache
    .load(directoryFilterKey(category, query), () => readDirectoryListing(env, category, query));
  return sliceDirectoryPage(rows, page, pageSize);
}
