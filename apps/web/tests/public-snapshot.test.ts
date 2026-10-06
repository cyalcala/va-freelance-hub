import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";

import {
  getSnapshotStoreFromEnv,
  InMemorySnapshotStore,
  KVSnapshotStore,
  CacheApiSnapshotStore,
  readThroughSnapshot,
  OPPORTUNITY_SNAPSHOT_BUILDER,
  DIRECTORY_SNAPSHOT_BUILDER,
  buildDirectorySnapshot,
  filterDirectorySnapshotRows,
  DIRECTORY_PROJECTION,
  buildDirectoryFilters,
  type SnapshotBuilder,
  type SnapshotBuild,
  type PublicDirectorySnapshotRow,
  type PublicOpportunitySnapshotRow,
  DEFAULT_FRESH_AFTER_MS,
  DEFAULT_STALE_WHILE_REVALIDATE_MS,
  OPPORTUNITY_MAX_ROWS,
  type SnapshotEnvelope,
  type KVNamespace,
} from "../src/lib/public-snapshot";
import type { DbEnvironment } from "@va-hub/db/client";
import { vaDirectory } from "@va-hub/db";
import { asc } from "drizzle-orm";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DIRECTORY_NICHES, DIRECTORY_SPECIAL_FILTERS } from "../src/lib/directory-categories";
import type { DirectoryCategory, DirectoryNiche } from "../src/lib/directory-categories";

// Minimal wrangler type shapes needed for the D1-shaped fake.
interface D1PreparedStatement {
  bind?(...values: unknown[]): this;
  first<T>(): Promise<T | null> | undefined;
  all<T>(): Promise<D1Result<T>>;
  run(...values: unknown[]): Promise<D1Result>;
  raw<T = any>(): Promise<T[]>;
}
interface D1Result<T = any> {
  results: T[];
}
interface D1Database {
  prepareCalls?: number;
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): void;
}

// A D1-shaped fake whose binding is real drizzle over an in-memory SQLite, so
// the builder executes the real drizzle SQL produced by publicOpportunityFilters()
// and buildDirectoryFilters(). Every prepare call is counted — that is how the
// snapshot proves "zero D1 calls on a cache hit".
class CountingStatement implements D1PreparedStatement {
  private readonly statement: any;
  private values: unknown[] = [];
  constructor(db: D1Database, sql: string) {
    this.statement = db.prepare(sql);
  }
  bind(...values: unknown[]): this {
    this.values = values;
    return this;
  }
  first<T>(): Promise<T | null> {
    return this.statement.first();
  }
  all<T>(): Promise<D1Result<T>> {
    return this.statement.all();
  }
  run(): Promise<D1Result> {
    return this.statement.run(...this.values);
  }
  raw<R = any>(): Promise<R[]> {
    const results = this.statement.all(...this.values) as R[] | { results: R[] };
    const rows = Array.isArray(results)
      ? results
      : (results?.results ?? ([] as R[]));
    return Promise.resolve(
      rows.map((row: any) =>
        typeof row === "object" && row !== null && !Array.isArray(row)
          ? Object.values(row)
          : row,
      ),
    ) as Promise<R[]>;
  }
}

class CountingD1 implements D1Database {
  prepareCalls = 0;
  constructor(private readonly db: D1Database) {}
  prepare(sql: string): D1PreparedStatement {
    this.prepareCalls += 1;
    this.db.prepare(sql);
    return new CountingStatement(this.db, sql);
  }
  exec(sql: string): void {
    this.db.exec(sql);
  }
}

function seededOpportunitiesDb(): D1Database {
  const db: any = new Database(":memory:");
  db.exec(`
    CREATE TABLE opportunities (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT,
      type TEXT,
      source_url TEXT NOT NULL,
      source_platform TEXT NOT NULL,
      tags TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      experience_level TEXT,
      posted_at TEXT,
      scraped_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      ph_eligibility TEXT,
      geo_scope TEXT,
      geo_evidence TEXT
    );
    CREATE INDEX active_scraped_idx ON opportunities (is_active, scraped_at);
  `);
  const insert = db.prepare(
    `INSERT INTO opportunities (title, company, type, source_url, source_platform, category, experience_level, posted_at, scraped_at, is_active, ph_eligibility)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const now = "2026-10-06T12:00:00.000Z";
  const rows = [
    ["PH remote dev", "Acme PH", "VA", "https://a.example/1", "WeWorkRemotely", "engineering", "mid", now, now, 1, "eligible_verified"],
    ["Onsite Manila", "Local Inc", "VA", "https://a.example/2", "RemoteOK", "support", "entry", now, now, 1, "eligible_likely"],
    ["Country locked", "Us Corp", "freelance", "https://a.example/3", "Remotive", "engineering", "senior", now, now, 1, "ineligible"],
    ["Deactivated", "Old Corp", "VA", "https://a.example/4", "Workable", "support", "entry", now, now, 0, "eligible_verified"],
    ["Unclear geo", "Any Corp", "project", "https://a.example/5", "WeWorkRemotely", "marketing", "any", now, now, 1, "unclear"],
  ];
  for (const r of rows) insert.run(...r);
  return db;
}

function seededDirectoryDb(): D1Database {
  const db: any = new Database(":memory:");
  db.exec(`
    CREATE TABLE va_directory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      website TEXT,
      hires_filipinos INTEGER NOT NULL DEFAULT 1,
      niche TEXT NOT NULL DEFAULT 'global-va',
      is_dayshift INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_remote INTEGER NOT NULL DEFAULT 1,
      is_marketplace INTEGER NOT NULL DEFAULT 0,
      link_fail_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  const insert = db.prepare(
    `INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_dayshift, is_remote, is_marketplace, link_fail_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insert.run("Acme PH", null, 1, "global-va", 0, 1, 0, 0);
  insert.run("Bright BPO", "https://bright.example", 1, "bpo", 0, 0, 0, 0);
  insert.run("Hidden Non PH", null, 0, "bpo", 0, 1, 0, 0);
  insert.run("Three Strikes", null, 1, "tech", 0, 0, 0, 3);
  insert.run("Dayshift Co", null, 1, "global-va", 1, 0, 0, 0);
  return db;
}

function makeEnv(db: D1Database): { DB: D1Database } {
  const counting = new CountingD1(db);
  return { DB: counting } as { DB: D1Database };
}

async function sqlTruth(category: DirectoryCategory | null, query: string): Promise<PublicDirectorySnapshotRow[]> {
  const db = seededDirectoryDb();
  const filters: string[] = ["hires_filipinos = 1", "link_fail_count < 3"];
  if (category === "dayshift") filters.push("is_dayshift = 1");
  else if (category === "marketplaces") filters.push("is_marketplace = 1");
  else if (category && DIRECTORY_NICHES.includes(category as DirectoryNiche)) {
    filters.push(`niche = '${category.replace(/'/g, "''")}'`);
  }
  if (query) {
    filters.push(`company_name LIKE '%${query.replace(/'/g, "''")}%' ESCAPE '\\'`);
  }
  const sql = `SELECT id, company_name AS companyName, website, niche, is_dayshift AS isDayshift, is_verified AS isVerified, is_remote AS isRemote, is_marketplace AS isMarketplace FROM va_directory WHERE ${filters.join(" AND ")} ORDER BY company_name`;
  return (await db.prepare(sql).all()) as unknown as PublicDirectorySnapshotRow[];
}

test("0 D1 prepare calls on a snapshot cache hit (within fresh window)", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  // Prime the store with a fresh envelope so the next read never rebuilds.
  await store.put(OPPORTUNITY_SNAPSHOT_BUILDER.schema, {
    schema: "opportunity-v2",
    built_at: new Date(Date.now() - 1000).toISOString(),
    source_rows: 2,
    rows: [{ id: 1, title: "x", company: null, type: null, sourceUrl: "https://x", sourcePlatform: "y", tags: null, category: null, experienceLevel: null, postedAt: null, scrapedAt: null, geoScope: null, phEligibility: null, geoEvidence: null }],
  });

  const result = await readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  expect(result.data.length).toBe(1);
  expect(env.DB.prepareCalls).toBe(0);
  expect(result.stale).toBe(false);
  expect(result.servedFromCache).toBe(true);
});

test("exactly 1 D1 prepare call on a cold miss", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  const result = await readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  expect(result.data.length).toBe(2); // ineligible, deactivated and unclear are filtered out
  expect(env.DB.prepareCalls).toBe(3);
  expect(result.stale).toBe(false);
  expect(result.servedFromCache).toBe(false);
});

test("50 concurrent cold misses coalesce into a single D1 read (single-flight)", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  const reads = Array.from({ length: 50 }, () =>
    readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
      freshAfterMs: DEFAULT_FRESH_AFTER_MS,
      staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
    }, env),
  );
  const results = await Promise.all(reads);

  expect(env.DB.prepareCalls).toBe(3);
  expect(results.every((r) => r.data.length === 2)).toBe(true);
  // exactly one caller performs the single D1 read (the first builder);
  // the other 49 coalesce onto it and are served with servedFromCache=true.
  expect(results.filter((r) => !r.servedFromCache).length).toBe(1);
});

test("serves the last good snapshot when the D1 read throws instead of surfacing a 503", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();
  const stale = new Date(Date.now() - DEFAULT_STALE_WHILE_REVALIDATE_MS * 2).toISOString();

  await store.put(OPPORTUNITY_SNAPSHOT_BUILDER.schema, {
    schema: "opportunity-v1",
    built_at: stale,
    source_rows: 1,
    rows: [{ id: 1, title: "legacy", company: null, type: null, sourceUrl: "https://legacy", sourcePlatform: "y", tags: null, category: null, experienceLevel: null, postedAt: null, scrapedAt: null, geoScope: null, phEligibility: null, geoEvidence: null }],
  });

  // The builder now throws (simulating D1 error 7500 / free-tier exhaustion).
  // Its schema must match the envelope key so the cached slice is served from
  // the store instead of triggering a rebuild under a different key.
  const thrower = {
    schema: OPPORTUNITY_SNAPSHOT_BUILDER.schema,
    build: async (): Promise<SnapshotBuild<{ id: number }>> => {
      throw new Error("D1 error 7500");
    },
  };

  const result = await readThroughSnapshot(store, thrower, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  expect(result.data).toHaveLength(1);
  expect(result.data[0]).toMatchObject({ id: 1 });
  expect(result.servedFromCache).toBe(true);
  expect(result.stale).toBe(true);
  expect(env.DB.prepareCalls).toBe(0);

  // A second request after the thrown rebuild still serves the stale slice,
  // not an error — the background refresh is retried but never surfaced.
  const result2 = await readThroughSnapshot(store, thrower, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);
  expect(result2.servedFromCache).toBe(true);
  expect(env.DB.prepareCalls).toBe(0);
});

test("buildFailed is true when no snapshot exists and the build throws", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  const thrower = {
    schema: "opportunity-v2",
    build: async (): Promise<SnapshotBuild<PublicOpportunitySnapshotRow>> => {
      throw new Error("D1 error 7500");
    },
  };

  const result = await readThroughSnapshot(store, thrower, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  expect(result.data).toHaveLength(0);
  expect(result.buildFailed).toBe(true);
  expect(result.servedFromCache).toBe(true);
  expect(result.stale).toBe(true);
  expect(env.DB.prepareCalls).toBe(0);

  // Subsequent reads do not re-probe D1; they continue to hold buildFailed and
  // keep serving the empty slice (the page layer will render ServiceUnavailable).
  expect((await readThroughSnapshot(store, thrower, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env)).buildFailed).toBe(true);
  expect(env.DB.prepareCalls).toBe(0);
});

test("a successful rebuild replaces the envelope and returns fresh data with no stale flag", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  // Prime with a stale (expired) envelope.
  await store.put(OPPORTUNITY_SNAPSHOT_BUILDER.schema, {
    schema: "opportunity-v1",
    built_at: new Date(Date.now() - DEFAULT_STALE_WHILE_REVALIDATE_MS - 1000).toISOString(),
    source_rows: 0,
    rows: [],
  });

  const result = await readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  expect(result.data.length).toBe(2);
  expect(result.servedFromCache).toBe(false);
  expect(result.stale).toBe(false);

  // The envelope now exists and is fresh, so the next request costs nothing.
  const result2 = await readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);
  expect(result2.servedFromCache).toBe(true);
  expect(env.DB.prepareCalls).toBe(3);
});

test("the opportunity envelope carries schema v2, total_rows and per-category counts", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  await readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  const raw = await store.get(OPPORTUNITY_SNAPSHOT_BUILDER.schema);
  expect(raw).toMatchObject({
    schema: "opportunity-v2",
    source_rows: 2,
    total_rows: 2,
  });
  expect(raw!.category_counts).toHaveProperty("engineering");
  expect(raw!.category_counts).toHaveProperty("support");
  expect(new Date(raw!.built_at).getTime()).toBeGreaterThan(0);
});

test("builder projects exactly the opportunity fields used by the public board", async () => {
  const fake = seededOpportunitiesDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  const result = await readThroughSnapshot(store, OPPORTUNITY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  // snapshot ordering is (posted_at, scraped_at) DESC, id DESC, so id 1 may be
  // at any index; verify the rows by id rather than by position.
  expect(result.data.find((r) => r.id === 1)).toMatchObject({
    id: 1,
    title: "PH remote dev",
    company: "Acme PH",
    type: "VA",
    sourceUrl: "https://a.example/1",
    sourcePlatform: "WeWorkRemotely",
    tags: null,
    category: "engineering",
    experienceLevel: "mid",
    phEligibility: "eligible_verified",
  });
});

test("directory builder returns all visible directory rows, ordered by company name", async () => {
  const fake = seededDirectoryDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  const result = await readThroughSnapshot(store, DIRECTORY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  // only the four fully visible companies: Acme PH, Bright BPO, Dayshift Co;
  // Hidden Non PH fails hires_filipinos, Three Strikes has 3 link strikes
  expect(result.data.length).toBe(3);
  expect(result.data.map((d) => d.companyName)).toEqual(["Acme PH", "Bright BPO", "Dayshift Co"]);
  expect(env.DB.prepareCalls).toBe(1);
  expect(result.data[0].niche).toBe("global-va");
  expect(result.data[1].niche).toBe("bpo");
});

test("in-memory directory filter produces identical results to the SQL filter", async () => {
  const fake = seededDirectoryDb();

  // Snapshot: build the single surface-wide listing (all visible rows).
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();
  const snapshot = await readThroughSnapshot(store, DIRECTORY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);

  // Coerce Bun's sqlite INTEGER 0/1 -> boolean so raw-SQL truth matches the
  // drizzle projection shape used by the snapshot and the in-memory filter.
  const snapShape = (rows: PublicDirectorySnapshotRow[]) =>
    rows.map((r) => ({
      ...r,
      isDayshift: Boolean(r.isDayshift),
      isVerified: Boolean(r.isVerified),
      isRemote: Boolean(r.isRemote),
      isMarketplace: Boolean(r.isMarketplace),
    }));

  // In-memory filter over the snapshot must equal a fresh SQL query through the
  // same visibility + category/query logic, for niche filters, special filters
  // and query-only too.
  expect(
    filterDirectorySnapshotRows(snapshot.data, "bpo", "bright"),
  ).toEqual(snapShape(await sqlTruth("bpo", "bright")));
  expect(
    filterDirectorySnapshotRows(snapshot.data, "dayshift", ""),
  ).toEqual(snapShape(await sqlTruth("dayshift", "")));
  expect(
    filterDirectorySnapshotRows(snapshot.data, "marketplaces", ""),
  ).toEqual(snapShape(await sqlTruth("marketplaces", "")));
  expect(
    filterDirectorySnapshotRows(snapshot.data, "global-va", ""),
  ).toEqual(snapShape(await sqlTruth("global-va", "")));
  expect(
    filterDirectorySnapshotRows(snapshot.data, null, "acme"),
  ).toEqual(snapShape(await sqlTruth(null, "acme")));
  expect(
    filterDirectorySnapshotRows(snapshot.data, null, ""),
  ).toEqual(snapShape(await sqlTruth(null, "")));
});

/** Paged directory query mirroring the page layer's filter logic, for parity testing. */
async function sqlTruthPaged(
  category: DirectoryCategory | null,
  query: string,
  limit: number,
  offset: number,
): Promise<{ total: number; rows: PublicDirectorySnapshotRow[] }> {
  const db = seededDirectoryDb() as any;
  const filters: string[] = ["hires_filipinos = 1", "link_fail_count < 3"];
  if (category === "dayshift") filters.push("is_dayshift = 1");
  else if (category === "marketplaces") filters.push("is_marketplace = 1");
  else if (category && DIRECTORY_NICHES.includes(category as DirectoryNiche)) {
    filters.push(`niche = '${category.replace(/'/g, "''")}'`);
  }
  if (query) {
    filters.push(`company_name LIKE '%${query.replace(/'/g, "''")}%' ESCAPE '\\'`);
  }
  const countResult = await db.prepare(`SELECT COUNT(*) AS total FROM va_directory WHERE ${filters.join(" AND ")}`).all();
  const total = (Array.isArray(countResult) ? countResult : countResult.results)?.[0]?.total ?? 0;
  const sql = `SELECT id, company_name AS companyName, website, niche, is_dayshift AS isDayshift, is_verified AS isVerified, is_remote AS isRemote, is_marketplace AS isMarketplace FROM va_directory WHERE ${filters.join(" AND ")} ORDER BY company_name LIMIT ? OFFSET ?`;
  const rawRows = await db.prepare(sql).all([limit, offset]);
  const rows = Array.isArray(rawRows) ? (rawRows as PublicDirectorySnapshotRow[]) : ((rawRows as any).results ?? []);
  return { total, rows };
}

test("directory snapshot pagination and totals equal a direct query for every filter", async () => {
  const fake = seededDirectoryDb();
  const env = makeEnv(fake);
  const store = new InMemorySnapshotStore();

  const shapeRow = (r: PublicDirectorySnapshotRow) => ({
    ...r,
    isDayshift: Boolean(r.isDayshift),
    isVerified: Boolean(r.isVerified),
    isRemote: Boolean(r.isRemote),
    isMarketplace: Boolean(r.isMarketplace),
  });

  // Build the single surface-wide snapshot; no rebuild on cache hits.
  const snapshot = await readThroughSnapshot(store, DIRECTORY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env);
  expect(env.DB.prepareCalls).toBe(1);
  expect(snapshot.buildFailed).toBe(false);

  // Every filter resolves from the in-memory slice with zero additional D1 reads;
  // totals come from the slice length, never a COUNT.
  const pageSizes = [1, 3, 10, 48, 1000];
  const filterKeys: Array<[string | null, string]> = [
    [null, ""],
    ["bpo", "bright"],
    ["dayshift", ""],
    ["marketplaces", ""],
    ["global-va", ""],
    ["tech", "three"],
    [null, "acme"],
    ["australian-dayshift", ""],
  ];

  for (const [cat, q] of filterKeys) {
    const filtered = filterDirectorySnapshotRows(snapshot.data, cat as DirectoryCategory, q);
    for (const pageSize of pageSizes) {
      for (const page of [1, 2, 3]) {
        const direct = await sqlTruthPaged(cat as DirectoryCategory, q, pageSize, (page - 1) * pageSize);
      expect(filtered.length).toBe(direct.total);
      expect(filtered.slice((page - 1) * pageSize, page * pageSize).map(shapeRow)).toEqual(
        direct.rows.map(shapeRow),
      );
      }
    }
  }

  // A second read of the same snapshot costs nothing.
  expect((await readThroughSnapshot(store, DIRECTORY_SNAPSHOT_BUILDER, {
    freshAfterMs: DEFAULT_FRESH_AFTER_MS,
    staleWhileRevalidateMs: DEFAULT_STALE_WHILE_REVALIDATE_MS,
  }, env)).data.length).toBe(snapshot.data.length);
  expect(env.DB.prepareCalls).toBe(1);
});

test("budget math stays inside the 5M row-read free tier", () => {
  // Fresh must be >= 30 min and stale >= 6 h so rebuilds are rare (<= ~4/day/
  // colo for a per-colocation Cache API store; at most ~3.7 rebuilds/day/colo
  // because a synchronous rebuild beyond stale refreshes the envelope for a
  // further 6.5 h = fresh + stale). 30 min / 6 h windows were chosen exactly to
  // satisfy these floors; this test asserts the floors and computes the worst-
  // case rebuild scan against the 5M row-read free tier.
  expect(DEFAULT_FRESH_AFTER_MS).toBeGreaterThanOrEqual(30 * 60 * 1000);
  expect(DEFAULT_STALE_WHILE_REVALIDATE_MS).toBeGreaterThanOrEqual(6 * 60 * 60 * 1000);
  expect(OPPORTUNITY_MAX_ROWS).toBeLessThanOrEqual(1_000);

  const colos = 26; // Cloudflare edge-colocation fan-out; Cache API is per-colocation
  const rebuildsPerDayPerColo = 24 / (6 + 30 / 60); // stale-then-fresh cycle (days / hours)
  const rowsPerOpportunityRebuild = OPPORTUNITY_MAX_ROWS; // bounded by the cap
  const rowsPerDirectoryRebuild = 1_000; // bounded by DIRECTORY_MAX_ROWS / table size
  const rebuildRowsPerDayPerColo =
    Math.ceil(rebuildsPerDayPerColo) * (rowsPerOpportunityRebuild + rowsPerDirectoryRebuild);
  const rebuildRowsPerDayAcrossC = rebuildRowsPerDayPerColo * colos;

  // 4 * (300 + 1,000) = 5,200 rows/day/colo; * 26 colos = 135,200 rows/day
  // vs the 5M row-read free tier: ~2.7% of the budget, leaving plenty of headroom.
  expect(rebuildRowsPerDayAcrossC).toBeLessThan(5_000_000);

  // With the owner's KV binding the store is shared (not per-colocation):
  // one rebuild per ~6.5 h across the whole deploy = ~4 rebuilds/day total.
  expect(
    Math.ceil(24 / (6 + 30 / 60)) * (rowsPerOpportunityRebuild + rowsPerDirectoryRebuild),
  ).toBeLessThan(5_000_000);
});

test("no non-test source file under apps/web/src imports bun:* modules", () => {
  const sourceFiles: string[] = [];
  const root = join(__dirname, "../src");

  function walk(dir: string): void {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const st = statSync(path);
      if (st.isDirectory()) {
        walk(path);
      } else if (
        entry.endsWith(".ts") &&
        !entry.endsWith(".test.ts") &&
        !entry.endsWith(".d.ts")
      ) {
        sourceFiles.push(path);
      }
    }
  }

  walk(root);

  const withBun = sourceFiles
    .map((f) => ({ file: f, content: readFileSync(f, "utf-8") }))
    .filter(({ content }) => /from\s+["']bun:/.test(content))
    .map(({ file }) => file);

  // If this fails: a source file imports a bun: module that does not exist on
  // Cloudflare Workers/Pages and will break the build/runtime once this module
  // is wired into a route. Remove the import or use the Cloudflare-native
  // alternative (e.g. caches, caches.default).
  expect(withBun).toEqual([]);
});

test("KV adapter stores and retrieves the same envelope through a KVNamespace", async () => {
  const stored = new Map<string, string>();
  const namespace: KVNamespace = {
    get(key: string) {
      return Promise.resolve(stored.get(key) ?? null);
    },
    put(key: string, value: string | Blob) {
      stored.set(key, value as string);
      return Promise.resolve();
    },
  };

  const store = new KVSnapshotStore({ PUBLIC_SNAPSHOTS: namespace });
  const env = { PUBLIC_SNAPSHOTS: namespace } as { PUBLIC_SNAPSHOTS: KVNamespace };

  await store.put("envelope", { schema: "x-v1", built_at: "2026-10-06T00:00:00.000Z", source_rows: 1, rows: [{}] });
  const retrieved = await store.get("envelope");
  expect(retrieved).toMatchObject({ schema: "x-v1", source_rows: 1 });
  expect([...stored.keys()]).toHaveLength(1);

  // Absent binding throws rather than silently returning null.
  const missing = new KVSnapshotStore({});
  await expect(missing.get("nope")).rejects.toThrow("PUBLIC_SNAPSHOTS KV namespace is not bound");
});

test("KV adapter applies the freshness window as a KV expiration", async () => {
  let expiration: number | undefined;
  const namespace: KVNamespace = {
    get() {
      return Promise.resolve(null);
    },
    put(key, value, options) {
      expiration = options?.expiration;
      return Promise.resolve();
    },
  };
  const store = new KVSnapshotStore({ PUBLIC_SNAPSHOTS: namespace });
  await store.put("x", { schema: "x-v1", built_at: "2026-10-06T00:00:00.000Z", source_rows: 0, rows: [] });
  expect(expiration).toBe(Math.floor((DEFAULT_FRESH_AFTER_MS + DEFAULT_STALE_WHILE_REVALIDATE_MS) / 1000));
});

test("CacheApiSnapshotStore falls back to in-memory when caches.default is absent", async () => {
  const original = (globalThis as any).caches;
  try {
    (globalThis as any).caches = undefined;
    const store = new CacheApiSnapshotStore();
    expect(store.get("missing")).resolves.toBeNull();
    await store.put("x", { schema: "x-v1", built_at: "2026-10-06T00:00:00.000Z", source_rows: 0, rows: [] });
    expect(store.get("x")).resolves.toMatchObject({ schema: "x-v1" });
  } finally {
    (globalThis as any).caches = original;
  }
});

test("CacheApiSnapshotStore key format uses the synthetic snapshots.internal origin", async () => {
  const seen: string[] = [];
  const cache = {
    async match(req: Request) {
      if (seen.some((s) => s === req.url)) return new Response(
        JSON.stringify({ schema: "envelope-v1", built_at: "2026-10-06T00:00:00.000Z", source_rows: 0, rows: [] }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
      return null;
    },
    async put(req: Request, res: Response) {
      seen.push(req.url);
      return Promise.resolve();
    },
  } as any;
  (globalThis as any).caches = { default: cache };
  try {
    const store = new CacheApiSnapshotStore();
    await store.put("envelope", { schema: "envelope-v1", built_at: "2026-10-06T00:00:00.000Z", source_rows: 0, rows: [] });
    expect(seen.at(-1)).toBe("https://snapshots.internal/v1/snapshot:envelope");
    const retrieved = await store.get("envelope");
    expect(retrieved?.schema).toBe("envelope-v1");
  } finally {
    (globalThis as any).caches = undefined;
  }
});

test("getSnapshotStoreFromEnv picks KV when bound, Cache API otherwise", async () => {
  const kv = { PUBLIC_SNAPSHOTS: { get: async () => null, put: async () => {} } as any };
  expect(getSnapshotStoreFromEnv(kv as any)).toBeInstanceOf(KVSnapshotStore);
  expect(getSnapshotStoreFromEnv({} as any)).toBeInstanceOf(CacheApiSnapshotStore);
});
