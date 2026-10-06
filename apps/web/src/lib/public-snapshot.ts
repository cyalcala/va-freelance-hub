import { Database } from "bun:sqlite";
import { getDb, opportunities, vaDirectory } from "@va-hub/db";
import type { DbEnvironment } from "@va-hub/db/client";
import type { Opportunity } from "@va-hub/db/schema";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
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
}

export interface SnapshotResult<T> {
  data: T[];
  stale: boolean;
  servedFromCache: boolean;
}

export interface SnapshotBuilder<T> {
  schema: string;
  build(env: DbEnvironment): Promise<T[]>;
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

/** Fresh window: no D1 read at all on a request; serve memory only. */
export const DEFAULT_FRESH_AFTER_MS = 60_000;
/** Stale-while-revalidate window: serve the old snapshot while rebuilding in
 * the background, so D1 cost stays near zero for ordinary page views. */
export const DEFAULT_STALE_WHILE_REVALIDATE_MS = 300_000;

// --- Core read ---

/** Result of a snapshot read-through, with staleness explicit so callers
 * (and tests) never have to guess whether the slice came from D1. */
interface BuildResult<T> {
  rows: T[];
  stale: boolean;
  servedFromCache: boolean;
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
        return { rows: cached.rows, stale: false, servedFromCache: true };
      }
      if (age < options.staleWhileRevalidateMs) {
        void rebuildSnapshot<T>(store, key, env, cached.schema, cached.rows).catch(() => {
          /* a failed background rebuild is harmless: the stale slice
           * already went out, and the next request will refresh again */
        });
        return { rows: cached.rows, stale: true, servedFromCache: true };
      }
    }

    const pending = pendingBuilds.get(key);
    if (pending) {
      // A concurrent request is already rebuilding: coalesce onto its promise.
      // The data came from the first read, so to the follower it is cache-served.
      const br = (await pending) as BuildResult<T>;
      return { rows: br.rows, stale: br.stale, servedFromCache: true };
    }

    const buildPromise = (async () => {
      try {
        const rows = await builder.build(env);
        await rebuildSnapshot(store, key, env, builder.schema, rows).catch((e) => {
          /* a failed store write does not undo a successful D1 read; the fresh
           * slice is still returned, and the next request rebuilds again */
        });
        return { rows, stale: false, servedFromCache: false };
      } catch {
        /* a D1 read error (e.g. 7500) must not surface to the page:
         * serve the last known-good envelope, marked stale, so the board
         * continues to render instead of the ServiceUnavailable page. */
        if (cached && cached.built_at) {
          return { rows: cached.rows, stale: true, servedFromCache: true };
        }
        /* no snapshot exists and the rebuild failed: return an empty slice
         * that the page layer renders with its own fallback. */
        return { rows: [], stale: true, servedFromCache: true };
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
  return { data: result.rows, stale: result.stale, servedFromCache: result.servedFromCache };
}

async function rebuildSnapshot<T>(
  store: SnapshotStore,
  key: string,
  env: DbEnvironment,
  schema: string,
  rows?: T[],
): Promise<void> {
  const envelope: SnapshotEnvelope<T> = {
    schema,
    built_at: new Date().toISOString(),
    source_rows: rows?.length ?? 0,
    rows: rows ?? [],
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
 * 100-150/day, so the visible corpus stays small; the cap is a safety net
 * that degrades to "today's read cost" only when the corpus exceeds it. */
const OPPORTUNITY_MAX_ROWS = 100_000;

export async function buildOpportunitiesSnapshot(
  env: DbEnvironment,
): Promise<PublicOpportunitySnapshotRow[]> {
  const db = getDb(env);
  const rows = await db
    .select(OPPORTUNITY_CARD_PROJECTION)
    .from(opportunities)
    .where(publicOpportunityFilters())
    .orderBy(
      desc(sql`coalesce(${opportunities.postedAt}, ${opportunities.scrapedAt})`),
      desc(opportunities.id),
    )
    .limit(OPPORTUNITY_MAX_ROWS);
  return rows as PublicOpportunitySnapshotRow[];
}

export const OPPORTUNITY_SNAPSHOT_BUILDER: SnapshotBuilder<PublicOpportunitySnapshotRow> = {
  schema: "opportunity-v1",
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

const DIRECTORY_PROJECTION = {
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
 * The public directory is a curated, bounded list; one snapshot per
 * category+query key mirrors `directoryFilterKey()` and `loadDirectoryPage()`
 * so the page can paginate and search entirely in memory.
 */
const DIRECTORY_MAX_ROWS = 1_000;

export async function buildDirectorySnapshot(
  env: DbEnvironment,
  category: DirectoryCategory | null,
  query: string,
): Promise<PublicDirectorySnapshotRow[]> {
  const db = getDb(env);
  const where = buildDirectoryFilters(category, query);
  const rows = await db
    .select(DIRECTORY_PROJECTION)
    .from(vaDirectory)
    .where(where)
    .orderBy(asc(vaDirectory.companyName))
    .limit(DIRECTORY_MAX_ROWS);
  return rows as PublicDirectorySnapshotRow[];
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
  build: (env: DbEnvironment, category: DirectoryCategory | null = null, query: string = "") =>
    buildDirectorySnapshot(env, category, query),
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
 * default fresh/stale windows. */
export async function readPublicDirectorySnapshot(
  env: DbEnvironment & KVEnv,
  category: DirectoryCategory | null,
  query: string,
  options: { freshAfterMs?: number; staleWhileRevalidateMs?: number } = {},
): Promise<SnapshotResult<PublicDirectorySnapshotRow>> {
  const builder: SnapshotBuilder<PublicDirectorySnapshotRow> = {
    schema: DIRECTORY_SNAPSHOT_BUILDER.schema,
    build: (e) => buildDirectorySnapshot(e, category, query),
  };
  return readThroughSnapshot(
    getSnapshotStoreFromEnv(env),
    builder,
    {
      freshAfterMs: options.freshAfterMs ?? DEFAULT_FRESH_AFTER_MS,
      staleWhileRevalidateMs: options.staleWhileRevalidateMs ?? DEFAULT_STALE_WHILE_REVALIDATE_MS,
    },
    env,
  );
}
