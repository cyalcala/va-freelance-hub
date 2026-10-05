import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { vaDirectory } from "@va-hub/db";
import {
  DIRECTORY_PAGE_SIZE,
  buildDirectoryFilters,
  createDirectoryListingCache,
  directoryFilterKey,
  loadDirectoryPage,
  sliceDirectoryPage,
  type DirectoryAgency,
} from "../src/lib/directory-page";
import { directoryVisibilityFilters } from "../src/lib/directory-visibility";
import type { DirectoryCategory } from "../src/lib/directory-categories";

function agency(id: number): DirectoryAgency {
  return {
    id,
    companyName: `Company ${id}`,
    website: null,
    niche: "global-va",
    isDayshift: false,
    isVerified: false,
    isRemote: true,
    isMarketplace: false,
  };
}

const agencyColumns = {
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
 * The predicates directory.astro built inline before the read was consolidated.
 * Kept here as the independent "before" reference for the parity assertions.
 */
function legacyFilters(category: DirectoryCategory | null, query: string): SQL {
  const filters: SQL[] = [directoryVisibilityFilters()];
  if (category === "dayshift") filters.push(eq(vaDirectory.isDayshift, true));
  else if (category === "marketplaces") filters.push(eq(vaDirectory.isMarketplace, true));
  else if (category) filters.push(eq(vaDirectory.niche, category));
  if (query) {
    filters.push(sql`lower(${vaDirectory.companyName}) LIKE ${`%${query.toLowerCase()}%`} ESCAPE '\\'`);
  }
  return and(...filters)!;
}

function seededDirectory() {
  const client = new Database(":memory:");
  client.exec(`
    CREATE TABLE va_directory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      website TEXT,
      hires_filipinos INTEGER NOT NULL DEFAULT 1,
      niche TEXT NOT NULL DEFAULT 'global-va',
      hiring_page_url TEXT,
      verified_at TEXT,
      notes TEXT,
      rating INTEGER,
      is_dayshift INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_remote INTEGER NOT NULL DEFAULT 1,
      is_marketplace INTEGER NOT NULL DEFAULT 0,
      ats_platform TEXT,
      ats_token TEXT,
      link_status TEXT,
      link_checked_at TEXT,
      link_evidence TEXT,
      link_fail_count INTEGER NOT NULL DEFAULT 0,
      website_source TEXT,
      website_evidence TEXT,
      website_set_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX company_name_idx ON va_directory (company_name);
  `);
  const insert = client.prepare(
    `INSERT INTO va_directory
       (company_name, website, hires_filipinos, niche, is_dayshift, is_marketplace, link_fail_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const rows: Array<[string, string | null, number, string, number, number, number]> = [
    ["Acme Support PH", "https://acme.example", 1, "bpo", 0, 0, 0],
    ["Acme Support PH", null, 1, "bpo", 0, 0, 0],
    ["Bright BPO Manila", null, 1, "bpo", 0, 0, 2],
    ["Cebu Dev Shop", "https://cebu.example", 1, "tech", 0, 0, 0],
    ["Daily Shift Co", null, 1, "australian-dayshift", 1, 0, 0],
    ["Ecom Helpers", null, 1, "ecommerce", 0, 0, 0],
    ["Freelance Vault", null, 1, "global-va", 0, 0, 0],
    ["Global VA Collective", "https://globalva.example", 1, "global-va", 0, 0, 1],
    ["Hybrid Talent PH", null, 1, "tech", 0, 0, 0],
    ["Island Staffing", null, 1, "australian-dayshift", 0, 0, 0],
    ["Job Board Junction", "https://jobs.example", 1, "job-boards", 0, 1, 0],
    ["100% Acme Rides", null, 1, "global-va", 0, 0, 0],
    ["Ünicode Labs", null, 1, "tech", 0, 0, 0],
    // Not publicly visible: not PH, three strikes, and over the strike limit.
    ["Hidden Non PH Co", null, 0, "bpo", 0, 0, 0],
    ["Hidden Three Strikes", null, 1, "bpo", 0, 0, 3],
    ["Hidden Four Strikes", null, 1, "tech", 0, 0, 4],
    ["Hidden Dayshift Market", null, 0, "job-boards", 1, 1, 0],
  ];
  for (const row of rows) insert.run(...row);
  return client;
}

const parityCases: Array<{
  label: string;
  category: DirectoryCategory | null;
  query: string;
  page: number;
}> = [
  { label: "first page, no filter", category: null, query: "", page: 1 },
  { label: "second page, no filter", category: null, query: "", page: 2 },
  { label: "last page, no filter", category: null, query: "", page: 3 },
  { label: "page past the end", category: null, query: "", page: 9 },
  { label: "dayshift category", category: "dayshift", query: "", page: 1 },
  { label: "marketplaces category", category: "marketplaces", query: "", page: 1 },
  { label: "niche category", category: "tech", query: "", page: 1 },
  { label: "search hits one", category: null, query: "Bright", page: 1 },
  { label: "search hits several", category: null, query: "a", page: 2 },
  { label: "search inside a category", category: "bpo", query: "acme", page: 1 },
  { label: "search misses everything", category: null, query: "zzz-no-match", page: 1 },
  { label: "empty result set", category: "ecommerce", query: "acme", page: 4 },
];

test("a consolidated read returns exactly the rows, ordering and total the paginated query returned", async () => {
  const client = seededDirectory();
  try {
    const db = drizzle({ client, schema: { vaDirectory } });
    for (const testCase of parityCases) {
      const legacyWhere = legacyFilters(testCase.category, testCase.query);
      const legacyTotal = (
        await db.select({ total: count() }).from(vaDirectory).where(legacyWhere)
      )[0]?.total ?? 0;
      const legacyOffset = (testCase.page - 1) * DIRECTORY_PAGE_SIZE;
      const legacyRows = await db
        .select(agencyColumns)
        .from(vaDirectory)
        .where(legacyWhere)
        .orderBy(asc(vaDirectory.companyName))
        .limit(DIRECTORY_PAGE_SIZE)
        .offset(legacyOffset);

      const listing = await db
        .select(agencyColumns)
        .from(vaDirectory)
        .where(buildDirectoryFilters(testCase.category, testCase.query))
        .orderBy(asc(vaDirectory.companyName));
      const page = sliceDirectoryPage(listing, testCase.page);

      expect(page.agencies, `rows for ${testCase.label}`).toEqual(legacyRows);
      expect(page.totalAgencies, `total for ${testCase.label}`).toBe(legacyTotal);
      expect(page.totalPages, `page count for ${testCase.label}`).toBe(
        Math.max(1, Math.ceil(legacyTotal / DIRECTORY_PAGE_SIZE)),
      );
      expect(page.pageOutOfRange, `out of range for ${testCase.label}`).toBe(
        testCase.page > Math.max(1, Math.ceil(legacyTotal / DIRECTORY_PAGE_SIZE)),
      );
      expect(page.offset, `offset for ${testCase.label}`).toBe(legacyOffset);
    }
  } finally {
    client.close();
  }
});

test("the consolidated predicate is the same SQL the inline predicates produced", () => {
  const dialect = new SQLiteSyncDialect();
  for (const testCase of parityCases) {
    const consolidated = dialect.sqlToQuery(buildDirectoryFilters(testCase.category, testCase.query));
    const legacy = dialect.sqlToQuery(legacyFilters(testCase.category, testCase.query));
    expect(consolidated.sql, `predicate SQL for ${testCase.label}`).toBe(legacy.sql);
    expect(consolidated.params).toEqual(legacy.params);
  }
});

test("the search predicate keeps the legacy LIKE escaping so wildcards stay literal", async () => {
  const dialect = new SQLiteSyncDialect();
  const escaped = dialect.sqlToQuery(buildDirectoryFilters(null, "50%_off"));
  expect(escaped.params.at(-1)).toBe("%50\\%\\_off%");
  const client = seededDirectory();
  try {
    const db = drizzle({ client, schema: { vaDirectory } });
    // "%" must not behave as a wildcard: only rows literally containing "50%_off" would match.
    expect(
      await db
        .select({ companyName: vaDirectory.companyName })
        .from(vaDirectory)
        .where(buildDirectoryFilters(null, "50%_off")),
    ).toEqual([]);
  } finally {
    client.close();
  }
});

test("pagination arithmetic reproduces the page bounds for empty, single and multi page listings", () => {
  expect(sliceDirectoryPage([], 1)).toEqual({
    agencies: [],
    totalAgencies: 0,
    totalPages: 1,
    offset: 0,
    pageOutOfRange: false,
  });
  const one: DirectoryAgency[] = [agency(1)];
  expect(sliceDirectoryPage(one, 1)).toEqual({
    agencies: one,
    totalAgencies: 1,
    totalPages: 1,
    offset: 0,
    pageOutOfRange: false,
  });
  expect(sliceDirectoryPage(one, 2)).toEqual({
    agencies: [],
    totalAgencies: 1,
    totalPages: 1,
    offset: DIRECTORY_PAGE_SIZE,
    pageOutOfRange: true,
  });
  const many = Array.from({ length: DIRECTORY_PAGE_SIZE * 2 + 5 }, (_, index) => agency(index + 1));
  const middle = sliceDirectoryPage(many, 2);
  expect(middle.totalAgencies).toBe(DIRECTORY_PAGE_SIZE * 2 + 5);
  expect(middle.totalPages).toBe(3);
  expect(middle.offset).toBe(DIRECTORY_PAGE_SIZE);
  expect(middle.agencies).toHaveLength(DIRECTORY_PAGE_SIZE);
  expect(middle.agencies[0]?.id).toBe(DIRECTORY_PAGE_SIZE + 1);
  const last = sliceDirectoryPage(many, 3);
  expect(last.agencies).toHaveLength(5);
  expect(last.pageOutOfRange).toBe(false);
  expect(sliceDirectoryPage(many, 4).pageOutOfRange).toBe(true);
});

test("cache keys separate category, search term and empty filters", () => {
  const keys = new Set([
    directoryFilterKey(null, ""),
    directoryFilterKey("tech", ""),
    directoryFilterKey("bpo", ""),
    directoryFilterKey(null, "acme"),
    directoryFilterKey(null, "Acme"),
    // Untrimmed input selects different rows, so it must not share a cached entry.
    directoryFilterKey(null, " acme"),
  ]);
  expect(keys.size).toBe(5);
  expect(directoryFilterKey(null, "Acme")).toBe(directoryFilterKey(null, "acme"));
  expect(directoryFilterKey(null, " acme")).not.toBe(directoryFilterKey(null, "acme"));
});

type FakeRow = DirectoryAgency;

/**
 * D1 `.raw()` returns positional arrays in the projected column order; the
 * drizzle mapper reads rows by column index, not by name.
 */
function rawRow(row: FakeRow): unknown[] {
  return [
    row.id,
    row.companyName,
    row.website,
    row.niche,
    row.isDayshift ? 1 : 0,
    row.isVerified ? 1 : 0,
    row.isRemote ? 1 : 0,
    row.isMarketplace ? 1 : 0,
  ];
}

function recordingD1(rows: FakeRow[]) {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const dbRows = rows.map(rawRow);
  const env = {
    DB: {
      prepare(sql: string) {
        const record = { sql, params: [] as unknown[] };
        statements.push(record);
        const statement = {
          bind(...values: unknown[]) {
            record.params = values;
            return statement;
          },
          async raw() {
            return dbRows;
          },
          async all() {
            return { success: true, results: dbRows };
          },
          async first() {
            return { success: true, results: dbRows[0] ?? null };
          },
          async run() {
            throw new Error("the public directory route must never write");
          },
        };
        return statement;
      },
      async batch() {
        throw new Error("the public directory route must never batch");
      },
    },
  } as unknown as Parameters<typeof loadDirectoryPage>[0];
  return { env, statements };
}

test("one page view issues one bounded statement: no COUNT, no OFFSET, no writes", async () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    companyName: `Company ${String(index + 1).padStart(3, "0")}`,
    website: null,
    niche: "global-va",
    isDayshift: false,
    isVerified: false,
    isRemote: true,
    isMarketplace: false,
  })) satisfies FakeRow[];
  const { env, statements } = recordingD1(rows);
  // A unique search term guarantees a cache miss, so this exercises the cold read.
  const page = await loadDirectoryPage(env, {
    category: null,
    query: "single-statement-probe",
    page: 2,
  });

  expect(statements).toHaveLength(1);
  const sqlText = statements[0]!.sql;
  expect(sqlText).toContain("va_directory");
  expect(sqlText).toContain("hires_filipinos");
  expect(sqlText).toContain("link_fail_count");
  expect(sqlText).not.toMatch(/\bOFFSET\b/i);
  expect(sqlText).not.toMatch(/\bcount\s*\(/i);
  expect(sqlText).toMatch(/order\s+by/i);
  expect(page.totalAgencies).toBe(120);
  expect(page.totalPages).toBe(3);
  expect(page.agencies).toHaveLength(DIRECTORY_PAGE_SIZE);
  expect(page.agencies[0]?.id).toBe(DIRECTORY_PAGE_SIZE + 1);
  expect(page.pageOutOfRange).toBe(false);
});

test("the same filter key on a later page is served without another statement", async () => {
  const rows = Array.from({ length: 70 }, (_, index) => ({
    id: index + 1,
    companyName: `Cached ${String(index + 1).padStart(3, "0")}`,
    website: null,
    niche: "tech",
    isDayshift: false,
    isVerified: true,
    isRemote: true,
    isMarketplace: false,
  })) satisfies FakeRow[];
  const { env, statements } = recordingD1(rows);
  const key = { category: null as DirectoryCategory | null, query: "repeat-page-probe" };

  const first = await loadDirectoryPage(env, { ...key, page: 1 });
  expect(statements).toHaveLength(1);

  const second = await loadDirectoryPage(env, { ...key, page: 2 });
  expect(statements).toHaveLength(1);
  expect(second.totalAgencies).toBe(first.totalAgencies);
  expect(second.agencies[0]?.id).toBe(DIRECTORY_PAGE_SIZE + 1);

  // A different filter is a different key and still reads.
  const other = await loadDirectoryPage(env, { ...key, query: "another-page-probe", page: 1 });
  expect(statements).toHaveLength(2);
  expect(other.totalAgencies).toBe(70);
});

test("the cache retains, expires, coalesces, isolates keys and never caches a failure", async () => {
  let now = 1_000;
  let loads = 0;
  const value: DirectoryAgency[] = [agency(1)];
  const cache = createDirectoryListingCache({
    ttlMs: 5_000,
    maxKeys: 2,
    maxRows: 10,
    now: () => now,
  });
  const load = async () => {
    loads++;
    return value;
  };

  expect(await cache.load("a", load)).toEqual(value);
  expect(await cache.load("a", load)).toEqual(value);
  expect(loads).toBe(1);

  // Concurrent callers share one read.
  const [x, y] = await Promise.all([cache.load("b", load), cache.load("b", load)]);
  expect(x).toEqual(value);
  expect(y).toEqual(value);
  expect(loads).toBe(2);

  now += 5_001;
  expect(await cache.load("a", load)).toEqual(value);
  expect(loads).toBe(3);

  // Key cap: a third key evicts the oldest retained entry, not the newest.
  await cache.load("c", load);
  expect(loads).toBe(4);
  expect(await cache.load("a", load)).toEqual(value);
  expect(loads).toBe(4);
  await cache.load("b", load);
  expect(loads).toBe(5);

  // A failure is never retained.
  let failures = 0;
  const failing = async () => {
    failures++;
    throw new Error("D1 unavailable");
  };
  await expect(cache.load("boom", failing)).rejects.toThrow("D1 unavailable");
  await expect(cache.load("boom", failing)).rejects.toThrow("D1 unavailable");
  expect(failures).toBe(2);

  // An oversized listing is served but not retained, so a grown table cannot
  // silently become a permanently cached payload.
  let oversizedLoads = 0;
  const oversized = async () => {
    oversizedLoads++;
    return Array.from({ length: 11 }, (_, index) => agency(index + 1));
  };
  expect(await cache.load("big", oversized)).toHaveLength(11);
  expect(await cache.load("big", oversized)).toHaveLength(11);
  expect(oversizedLoads).toBe(2);
});
