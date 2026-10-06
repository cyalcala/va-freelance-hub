import { getDb, opportunities, vaDirectory } from "@va-hub/db";
import type { DbEnvironment } from "@va-hub/db/client";
import type { Opportunity } from "@va-hub/db/schema";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { publicOpportunityFilters } from "./public-opportunities";
import { directoryVisibilityFilters } from "./directory-visibility";
import { isDirectoryNiche, type DirectoryCategory } from "./directory-categories";
import { escapeSqlLike } from "./public-query";

// --- Types ---

export interface SnapshotStore {
  get(name: string): Promise<SnapshotEnvelope<unknown> | null>;
  put(name: string, envelope: SnapshotEnvelope<unknown>): Promise<void>;
}

export interface SnapshotEnvelope<T = unknown> {
  schema: string;
  built_at: string;
  source_rows: number;
  rows: T[];
  /** Exact visible-row count across the full corpus (used for stats). */
  total_rows?: number;
  /** Per-category visible-row counts (used for the homepage "Browse by category"
   * totals) — exact even when the snapshot's rendered window is capped. */
  category_counts?: Record<string, number>;
}

export interface SnapshotResult<T> {
  data: T[];
  stale: boolean;
  servedFromCache: boolean;
  /** true when the rebuild threw and no usable envelope existed; the page layer
   * must treat this as "no snapshot at all and D1 failed" and render
   * ServiceUnavailable. */
  buildFailed: boolean;
}

/** Result of a snapshot build: the rendered rows plus optional exact totals. */
export interface SnapshotBuild<T> {
  rows: T[];
  total_rows?: number;
  category_counts?: Record<string, number>;
}

export interface SnapshotBuilder<T> {
  schema: string;
  build(env: DbEnvironment): Promise<SnapshotBuild<T>>;
}

/** Thrown by KVSnapshotStore when PUBLIC_SNAPSHOTS is absent. The store
 * returned by getSnapshotStoreFromEnv never throws: it falls back to the
 * Cache API adapter. */
export class NoSnapshotBindingError extends Error {
  constructor() {
    super("PUBLIC_SNAPSHOTS KV namespace is not bound");
    this.name = "NoSnapshotBindingError";
  }
}

// --- Default windows ---

/** Fresh window: no D1 read at all on a request; serve memory only.
 *
 * Must be >= 30 minutes. With a per-colocation Cache API store a rebuild only
 * happens once per cache expiry, so a 60s window meant ~1,440 rebuilds/day/
 * colo; at 30 min that drops to ~48/day/colo, and the 6h stale window means
 * the background rebuild refreshes the envelope at most once every ~6.5h
 * (~4/day/colo). At <=300 rows per rebuild that is ~1,200 rows scanned/day/
 * colo even before the serving-colo cache is considered — a few % of the 5M
 * row-read free tier. See the test `budget math stays inside the 5M row-read
 * free tier` for the full arithmetic. */
export const DEFAULT_FRESH_AFTER_MS = 30 * 60 * 1000;
/** Stale-while-revalidate window: serve the old snapshot while rebuilding in
 * the background, so D1 cost stays near zero for ordinary page views.
 *
 * Must be >= 6 hours: that bounds rebuilds to ~4/day/colo and means the
 * synchronous "beyond stale" rebuild on the request path is the rare escape
 * hatch, never the norm. */
export const DEFAULT_STALE_WHILE_REVALIDATE_MS = 6 * 60 * 60 * 1000;

// --- Core read ---

/** Result of a snapshot read-through, with staleness explicit so callers
 * (and tests) never have to guess whether the slice came from D1. */
interface BuildResult<T> {
  rows: T[];
  stale: boolean;
  servedFromCache: boolean;
  buildFailed: boolean;
}

const pendingBuilds = new Map<string, Promise<BuildResult<unknown>>>();

export async function readThroughSnapshot<T>(
  store: SnapshotStore,
  builder: SnapshotBuilder<T>,
  options: { freshAfterMs: number; staleWhileRevalidateMs: number },
  env: DbEnvironment,
): Promise<SnapshotResult<T>> {
  const key = builder.schema;

  const runBuild = async (): Promise<BuildResult<T>> => {
    const now = Date.now();
    let cached: SnapshotEnvelope<T> | null = null;

    try {
      cached = await store.get(key) as SnapshotEnvelope<T> | null;
    } catch {
      /* a broken store degrades to a rebuild; the data is not lost */
    }

    if (cached && cached.built_at) {
      const age = now - new Date(cached.built_at).getTime();
      if (age < options.freshAfterMs) {
        return { rows: cached.rows, stale: false, servedFromCache: true, buildFailed: false };
      }
      if (age < options.staleWhileRevalidateMs) {
        void rebuildSnapshot<T>(store, key, env, cached.schema, {
          rows: cached.rows,
          total_rows: cached.total_rows,
          category_counts: cached.category_counts,
        }).catch(() => {
          /* a failed background rebuild is harmless: the stale slice
           * already went out, and the next request rebuilds again */
        });
        return { rows: cached.rows, stale: true, servedFromCache: true, buildFailed: false };
      }
    }

    const pending = pendingBuilds.get(key);
    if (pending) {
      // A concurrent request is already rebuilding: coalesce onto its promise.
      // The data came from the first read, so to the follower it is cache-served.
      const br = (await pending) as BuildResult<T>;
      return { rows: br.rows, stale: br.stale, servedFromCache: true, buildFailed: br.buildFailed };
    }

    const buildPromise = (async () => {
      try {
        const buildResult = await builder.build(env);
        const rows = buildResult.rows;
        await rebuildSnapshot(store, key, env, builder.schema, buildResult).catch((e) => {
          /* a failed store write does not undo a successful D1 read; the fresh
           * slice is still returned, and the next request rebuilds again */
        });
        return { rows, stale: false, servedFromCache: false, buildFailed: false };
      } catch {
        /* a D1 read error (e.g. 7500) must not surface to the page:
         * serve the last known-good envelope, marked stale, so the board
         * continues to render instead of the ServiceUnavailable page. */
        if (cached && cached.built_at) {
          return { rows: cached.rows, stale: true, servedFromCache: true, buildFailed: false };
        }
        /* no snapshot exists and the rebuild failed: return an empty slice and
         * mark buildFailed so the page layer renders ServiceUnavailable. */
        return { rows: [], stale: true, servedFromCache: true, buildFailed: true };
      }
    })();

    pendingBuilds.set(key, buildPromise);
    try {
      return await buildPromise;
    } finally {
      pendingBuilds.delete(key);
    }
  };

  const result = await runBuild();
  return { data: result.rows, stale: result.stale, servedFromCache: result.servedFromCache, buildFailed: result.buildFailed };
}

async function rebuildSnapshot<T>(
  store: SnapshotStore,
  key: string,
  env: DbEnvironment,
  schema: string,
  buildResult: SnapshotBuild<T>,
): Promise<void> {
  const envelope: SnapshotEnvelope<T> = {
    schema,
    built_at: new Date().toISOString(),
    source_rows: buildResult.rows.length,
    rows: buildResult.rows,
    total_rows: buildResult.total_rows,
    category_counts: buildResult.category_counts,
  };
  await store.put(key, envelope);
}

// --- Adapters ---

interface KVEnv {
  PUBLIC_SNAPSHOTS?: KVNamespace;
}

export interface KVNamespace {
  get(key: string, options?: { type: "text" }): Promise<string | null>;
  put(key: string, value: string | Blob, options?: { expiration?: number }): Promise<void>;
}

export class KVSnapshotStore implements SnapshotStore {
  private namespace?: KVNamespace;

  constructor(env: KVEnv) {
    if (env.PUBLIC_SNAPSHOTS) {
      this.namespace = env.PUBLIC_SNAPSHOTS;
    }
  }

  async get(name: string): Promise<SnapshotEnvelope<unknown> | null> {
    if (!this.namespace) {
      return Promise.reject(new NoSnapshotBindingError());
    }
    const raw = await this.namespace.get(name, { type: "text" });
    return raw ? JSON.parse(raw) : null;
  }

  async put(name: string, envelope: SnapshotEnvelope<unknown>): Promise<void> {
    if (!this.namespace) {
      throw new NoSnapshotBindingError();
    }
    await this.namespace.put(name, JSON.stringify(envelope), {
      expiration: Math.floor((DEFAULT_FRESH_AFTER_MS + DEFAULT_STALE_WHILE_REVALIDATE_MS) / 1000),
    });
  }
}

export class CacheApiSnapshotStore implements SnapshotStore {
  private cache: Cache | null = null;
  private memory = new Map<string, SnapshotEnvelope<unknown>>();

  constructor() {
    if (typeof caches !== "undefined") {
      this.cache = (caches as any).default ?? null;
    }
  }

  async get(name: string): Promise<SnapshotEnvelope<unknown> | null> {
    if (this.cache) {
      const url = `https://snapshots.internal/v1/snapshot:${name}`;
      const response = await this.cache.match(new Request(url));
      if (!response) {
        return null;
      }
      return response.json();
    }
    return this.memory.get(`snapshot:${name}`) ?? null;
  }

  async put(name: string, envelope: SnapshotEnvelope<unknown>): Promise<void> {
    if (this.cache) {
      const url = `https://snapshots.internal/v1/snapshot:${name}`;
      await this.cache.put(
        new Request(url),
        new Response(JSON.stringify(envelope), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      return;
    }
    this.memory.set(`snapshot:${name}`, envelope);
  }
}

export class InMemorySnapshotStore implements SnapshotStore {
  private entries = new Map<string, SnapshotEnvelope<unknown>>();

  async get(name: string): Promise<SnapshotEnvelope<unknown> | null> {
    return this.entries.get(name) ?? null;
  }

  async put(name: string, envelope: SnapshotEnvelope<unknown>): Promise<void> {
    this.entries.set(name, envelope);
  }
}

export function getSnapshotStoreFromEnv(env: DbEnvironment & KVEnv): SnapshotStore {
  if (env.PUBLIC_SNAPSHOTS) {
    return new KVSnapshotStore(env);
  }
  return new CacheApiSnapshotStore();
}

// --- Builders ---

export type PublicOpportunitySnapshotRow = Pick<
  Opportunity,
  | "id"
  | "title"
  | "company"
  | "type"
  | "sourceUrl"
  | "sourcePlatform"
  | "sourceId"
  | "tags"
  | "category"
  | "experienceLevel"
  | "postedAt"
  | "scrapedAt"
  | "geoScope"
  | "phEligibility"
  | "geoEvidence"
>;

const OPPORTUNITY_CARD_PROJECTION = {
  id: opportunities.id,
  title: opportunities.title,
  company: opportunities.company,
  type: opportunities.type,
  sourceUrl: opportunities.sourceUrl,
  sourcePlatform: opportunities.sourcePlatform,
  sourceId: opportunities.sourceId,
  tags: opportunities.tags,
  category: opportunities.category,
  experienceLevel: opportunities.experienceLevel,
  postedAt: opportunities.postedAt,
  scrapedAt: opportunities.scrapedAt,
  geoScope: opportunities.geoScope,
  phEligibility: opportunities.phEligibility,
  geoEvidence: opportunities.geoEvidence,
};

/** Maximum rows kept in the snapshot envelope. The acceptance goal is
 * 100-150/day, the homepage renders <= ~60 cards (category previews +
 * featured), and /opportunities /categories render PAGE_SIZE = 30 per page;
 * 300 covers ~10 pages — the active rendering window — while capping the worst-
 * case rebuild scan to a few hundred rows. This is a safety net: if the public
 * corpus ever outgrows it the envelope degrades to "today's read cost" only
 * when a rebuild actually happens, and a failed rebuild still serves the last
 * good snapshot. Never loosen it to 100k: the free tier is 5M row reads/day and
 * rebuilds at 100k rows/day/colo would exhaust it. */
export const OPPORTUNITY_MAX_ROWS = 300;

export async function buildOpportunitiesSnapshot(
  env: DbEnvironment,
): Promise<SnapshotBuild<PublicOpportunitySnapshotRow>> {
  const db = getDb(env);
  const [countRows, categoryRows] = await Promise.all([
    db.select({ total: count() }).from(opportunities).where(publicOpportunityFilters()),
    db.select({ category: opportunities.category, n: count() })
      .from(opportunities)
      .where(publicOpportunityFilters())
      .groupBy(opportunities.category),
  ]);
  const rows = await db
    .select(OPPORTUNITY_CARD_PROJECTION)
    .from(opportunities)
    .where(publicOpportunityFilters())
    .orderBy(
      desc(sql`coalesce(${opportunities.postedAt}, ${opportunities.scrapedAt})`),
      desc(opportunities.id),
    )
    .limit(OPPORTUNITY_MAX_ROWS);
  const total = countRows[0]?.total ?? 0;
  const categoryCounts = Object.fromEntries(categoryRows.map((r) => [r.category, r.n]));
  return { rows: rows as PublicOpportunitySnapshotRow[], total_rows: total, category_counts: categoryCounts };
}

export const OPPORTUNITY_SNAPSHOT_BUILDER: SnapshotBuilder<PublicOpportunitySnapshotRow> = {
  schema: "opportunity-v2",
  build: buildOpportunitiesSnapshot,
};

export type PublicDirectorySnapshotRow = {
  id: number;
  companyName: string;
  website: string | null;
  niche: string | null;
  isDayshift: boolean;
  isVerified: boolean;
  isRemote: boolean;
  isMarketplace: boolean;
};

export const DIRECTORY_PROJECTION = {
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
 * Build the public directory snapshot for ONE surface. It reads every visible
 * row once (bounded by the curated va_directory table; DIRECTORY_MAX_ROWS is a
 * safety net on a table that is already small) and returns the ordered listing
 * for in-memory slicing. Category and query are NOT part of the build key:
 * there is exactly one snapshot per surface, and the page layer filters/paginates
 * over the envelope in memory, so a free-text `?q=` can never trigger a rebuild.
 */
const DIRECTORY_MAX_ROWS = 1_000;

export async function buildDirectorySnapshot(
  env: DbEnvironment,
): Promise<PublicDirectorySnapshotRow[]> {
  const db = getDb(env);
  const rows = await db
    .select(DIRECTORY_PROJECTION)
    .from(vaDirectory)
    .where(directoryVisibilityFilters())
    .orderBy(asc(vaDirectory.companyName))
    .limit(DIRECTORY_MAX_ROWS);
  return rows as PublicDirectorySnapshotRow[];
}

/**
 * Pure in-memory filter that replicates the directory category/query logic
 * (`buildDirectoryFilters` in `directory-page.ts`) exactly, so the page layer
 * can slice the single surface-wide snapshot without another D1 round trip.
 * Order matches the build ordering (company name ascending), so pagination over
 * the filtered rows preserves the same sort the page expects.
 */
export function filterDirectorySnapshotRows(
  rows: PublicDirectorySnapshotRow[],
  category: DirectoryCategory | null,
  query: string,
): PublicDirectorySnapshotRow[] {
  const filtered = rows.filter((row) => {
    if (category === "dayshift") {
      if (!row.isDayshift) return false;
    } else if (category === "marketplaces") {
      if (!row.isMarketplace) return false;
    } else if (category && isDirectoryNiche(category)) {
      if (row.niche !== category) return false;
    }
    if (query) {
      if (!row.companyName?.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
  return filtered;
}

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
    filters.push(
      sql`lower(${vaDirectory.companyName}) LIKE ${`%${escapeSqlLike(query.toLowerCase())}%`} ESCAPE '\\'`,
    );
  }
  return and(...filters)!;
}

export const DIRECTORY_SNAPSHOT_BUILDER: SnapshotBuilder<PublicDirectorySnapshotRow> = {
  schema: "directory-v1",
  build: (env: DbEnvironment) => buildDirectorySnapshot(env).then((rows) => ({ rows })),
};

// --- Convenience ---

/** Read the public opportunity board from the snapshot pipeline with the
 * default fresh/stale windows. */
export async function readPublicOpportunitiesSnapshot(
  env: DbEnvironment & KVEnv,
  options: { freshAfterMs?: number; staleWhileRevalidateMs?: number } = {},
): Promise<SnapshotResult<PublicOpportunitySnapshotRow>> {
  return readThroughSnapshot(
    getSnapshotStoreFromEnv(env),
    OPPORTUNITY_SNAPSHOT_BUILDER,
    {
      freshAfterMs: options.freshAfterMs ?? DEFAULT_FRESH_AFTER_MS,
      staleWhileRevalidateMs: options.staleWhileRevalidateMs ?? DEFAULT_STALE_WHILE_REVALIDATE_MS,
    },
    env,
  );
}

/** Read a public directory listing from the snapshot pipeline with the
 * default fresh/stale windows. The snapshot holds ONE surface-wide listing of
 * all visible directory rows; category and query are applied in memory after the
 * snapshot is served, so a free-text `?q=` can never trigger a rebuild — the
 * single-flight rebuild (at most ~4/day/colo under the defaults) is the same
 * full-visible listing for every category and search. */
export async function readPublicDirectorySnapshot(
  env: DbEnvironment & KVEnv,
  category: DirectoryCategory | null,
  query: string,
  options: { freshAfterMs?: number; staleWhileRevalidateMs?: number } = {},
): Promise<SnapshotResult<PublicDirectorySnapshotRow>> {
  const result = await readThroughSnapshot(
    getSnapshotStoreFromEnv(env),
    DIRECTORY_SNAPSHOT_BUILDER,
    {
      freshAfterMs: options.freshAfterMs ?? DEFAULT_FRESH_AFTER_MS,
      staleWhileRevalidateMs: options.staleWhileRevalidateMs ?? DEFAULT_STALE_WHILE_REVALIDATE_MS,
    },
    env,
  ) as SnapshotResult<PublicDirectorySnapshotRow>;
  return {
    data: filterDirectorySnapshotRows(result.data, category, query),
    stale: result.stale,
    servedFromCache: result.servedFromCache,
    buildFailed: result.buildFailed,
  };
}
