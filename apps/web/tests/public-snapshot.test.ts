import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { homepageFromSnapshot } from "../src/lib/homepage-data";
import { matchesJobQuery, sliceDirectory, slicePublicJobs, type PublicJob } from "../src/lib/public-board";
import {
  CLAIM_REFRESH_SQL,
  createD1SnapshotStore,
  packBoard,
  resetPublicBoardState,
  resolvePublicBoard,
  type SnapshotDatabase,
  type SnapshotStore,
} from "../src/lib/public-serving-snapshot";

function job(partial: Partial<PublicJob> & Pick<PublicJob, "id" | "title">): PublicJob {
  return {
    company: null,
    type: "freelance",
    sourceUrl: `https://example.com/${partial.id}`,
    sourcePlatform: "Remotive",
    sourceId: null,
    tags: [],
    category: "admin",
    experienceLevel: null,
    postedAt: "2026-10-01 00:00:00",
    scrapedAt: "2026-10-01 00:00:00",
    geoScope: "worldwide",
    phEligibility: "eligible_verified",
    geoEvidence: null,
    description: null,
    clientTimezone: null,
    locationType: "remote",
    payRange: null,
    updatedAt: null,
    ...partial,
  };
}

function d1Like(db: Database): SnapshotDatabase {
  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async all() {
              return { results: db.query(sql).all(...params as never[]) as Record<string, unknown>[] };
            },
            async first<T>() {
              return (db.query(sql).get(...params as never[]) as T | null) ?? null;
            },
            async run() {
              db.query(sql).run(...params as never[]);
              const changes = db.query("SELECT changes() AS changes").get() as { changes: number };
              return { meta: { changes: changes.changes } };
            },
          };
        },
      };
    },
  };
}

function sourceDatabase(): Database {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE opportunities (
    id INTEGER PRIMARY KEY,
    title TEXT, company TEXT, type TEXT, source_url TEXT, source_platform TEXT,
    source_id TEXT, tags TEXT, category TEXT, experience_level TEXT,
    posted_at TEXT, scraped_at TEXT, geo_scope TEXT, ph_eligibility TEXT,
    geo_evidence TEXT, description TEXT, client_timezone TEXT, location_type TEXT,
    pay_range TEXT, updated_at TEXT, is_active INTEGER
  );
  CREATE TABLE va_directory (
    id INTEGER PRIMARY KEY,
    company_name TEXT, website TEXT, niche TEXT,
    is_dayshift INTEGER, is_verified INTEGER, is_remote INTEGER, is_marketplace INTEGER,
    hires_filipinos INTEGER, link_fail_count INTEGER
  );
  CREATE TABLE public_serving_snapshot (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    generated_at TEXT NOT NULL,
    refresh_started_at TEXT,
    payload TEXT NOT NULL
  );`);
  return db;
}

test("the snapshot query keeps only public jobs and visible directory rows", async () => {
  const db = sourceDatabase();
  try {
    db.exec(`INSERT INTO opportunities
      (id, title, is_active, ph_eligibility, description, category, source_platform, source_url)
      VALUES
      (1, 'Visible', 1, 'eligible_verified', '${"x".repeat(800)}', 'admin', 'Remotive', 'https://a.example/1'),
      (2, 'Likely', 1, 'eligible_likely', 'short', 'writing', 'Jobicy', 'https://a.example/2'),
      (3, 'Unclear', 1, 'unclear', 'nope', 'admin', 'Remotive', 'https://a.example/3'),
      (4, 'Inactive', 0, 'eligible_verified', 'nope', 'admin', 'Remotive', 'https://a.example/4')`);
    db.exec(`INSERT INTO va_directory
      (id, company_name, niche, hires_filipinos, link_fail_count, is_dayshift, is_verified, is_remote, is_marketplace)
      VALUES
      (1, 'Open Co', 'global-va', 1, 0, 1, 1, 1, 0),
      (2, 'Hidden Co', 'global-va', 0, 0, 0, 0, 1, 0),
      (3, 'Dead Link Co', 'bpo', 1, 3, 0, 0, 1, 0)`);
    const board = await createD1SnapshotStore(d1Like(db)).build("2026-10-06T00:00:00.000Z");
    expect(board.jobs.map((row) => row.id)).toEqual([1, 2]);
    expect(board.jobs[0]?.description?.length).toBe(800);
    expect(board.directory.map((row) => row.companyName)).toEqual(["Open Co"]);
    expect(board.directory[0]?.isDayshift).toBe(true);
  } finally {
    db.close();
  }
});

test("one stale snapshot row is served immediately and rebuilt by a single lease", async () => {
  const db = sourceDatabase();
  try {
    const old = "2026-10-05T00:00:00.000Z";
    const payload = await packBoard({
      generatedAt: old,
      jobs: [job({ id: 7, title: "Cached role" })],
      directory: [],
    });
    db.query("INSERT INTO public_serving_snapshot (id, generated_at, payload) VALUES (1, ?, ?)")
      .run(old, payload);
    let builds = 0;
    const store = createD1SnapshotStore(d1Like(db));
    const wrapped: SnapshotStore = {
      ...store,
      async build(generatedAt: string) {
        builds += 1;
        return { generatedAt, jobs: [job({ id: 8, title: "Rebuilt" })], directory: [] };
      },
    };
    resetPublicBoardState();
    const pending: Promise<unknown>[] = [];
    const now = Date.parse("2026-10-06T03:00:00.000Z");
    const served = await resolvePublicBoard({
      now,
      cache: null,
      store: wrapped,
      waitUntil(promise) { pending.push(promise); },
    });
    expect(served.jobs.map((row) => row.id)).toEqual([7]);
    await Promise.all(pending);
    expect(builds).toBe(1);
    resetPublicBoardState();
    const pendingAgain: Promise<unknown>[] = [];
    const second = await resolvePublicBoard({
      now: now + 16 * 60 * 1000,
      cache: null,
      store: wrapped,
      waitUntil(promise) { pendingAgain.push(promise); },
    });
    await Promise.all(pendingAgain);
    expect(builds).toBe(1);
    expect(second.jobs.map((row) => row.id)).toEqual([8]);
  } finally {
    db.close();
  }
});

test("a cold quota failure does not scan the jobs table", async () => {
  resetPublicBoardState();
  let builds = 0;
  const store: SnapshotStore = {
    async read() { throw new Error("D1 daily limit exceeded"); },
    async claimRefresh() { return false; },
    async write() {},
    async build() {
      builds += 1;
      return { generatedAt: "2026-10-06T00:00:00.000Z", jobs: [], directory: [] };
    },
  };
  await expect(resolvePublicBoard({ now: Date.now(), cache: null, store })).rejects.toThrow("daily limit");
  expect(builds).toBe(0);
});

test("a warm board does not read D1 again", async () => {
  resetPublicBoardState();
  let reads = 0;
  const store: SnapshotStore = {
    async read() {
      reads += 1;
      return null;
    },
    async claimRefresh() { return false; },
    async write() {},
    async build(generatedAt) {
      return { generatedAt, jobs: [job({ id: 1, title: "Only once" })], directory: [] };
    },
  };
  const now = Date.now();
  await resolvePublicBoard({ now, cache: null, store });
  await resolvePublicBoard({ now: now + 1000, cache: null, store });
  expect(reads).toBe(1);
});

test("quota failure serves the edge snapshot and does not scan D1", async () => {
  resetPublicBoardState();
  const generatedAt = "2026-10-06T00:00:00.000Z";
  const payload = await packBoard({
    generatedAt,
    jobs: [job({ id: 4, title: "Edge role" })],
    directory: [],
  });
  const bodies = new Map<string, { body: string; headers: Headers }>();
  const cache = {
    async match(request: Request) {
      const hit = bodies.get(request.url);
      return hit ? new Response(hit.body, { headers: new Headers(hit.headers) }) : undefined;
    },
    async put(request: Request, response: Response) {
      bodies.set(request.url, { body: await response.text(), headers: response.headers });
    },
  };
  await cache.put(new Request("https://remotejobs-ph.pages.dev/__snapshot/public-board-v1"), new Response(payload, {
    headers: { "x-snapshot-generated-at": generatedAt },
  }));
  let builds = 0;
  const store: SnapshotStore = {
    async read() { throw new Error("D1 daily limit exceeded"); },
    async claimRefresh() { throw new Error("D1 daily limit exceeded"); },
    async write() { throw new Error("D1 daily limit exceeded"); },
    async build() { builds += 1; return { generatedAt, jobs: [], directory: [] }; },
  };
  const pending: Promise<unknown>[] = [];
  const board = await resolvePublicBoard({
    now: Date.parse("2026-10-06T02:00:00.000Z"),
    cache,
    store,
    waitUntil(promise) { pending.push(promise); },
  });
  await Promise.all(pending);
  expect(board.jobs.map((row) => row.id)).toEqual([4]);
  expect(builds).toBe(0);
});

test("homepage preview and search use the snapshot without a second eligibility rule", () => {
  const board = {
    generatedAt: "2026-10-06T00:00:00.000Z",
    directory: [{ id: 1, companyName: "Open Co", website: null, niche: "global-va", isDayshift: false, isVerified: true, isRemote: true, isMarketplace: false }],
    jobs: [
      job({ id: 1, title: "Older", category: "admin", postedAt: "2026-10-01 00:00:00" }),
      job({ id: 2, title: "Newest virtual assistant", category: "admin", postedAt: "2026-10-06 00:00:00", sourceId: "breezy:open" }),
      job({ id: 3, title: "Unclear should not be here", category: "admin", postedAt: "2026-10-07 00:00:00", phEligibility: "unclear" }),
      job({ id: 4, title: "Virtually unrelated", category: "writing", postedAt: "2026-10-05 00:00:00" }),
    ],
  };
  const homepage = homepageFromSnapshot(board);
  expect(homepage.stats).toEqual({ opportunities: 4, companies: 1 });
  expect(homepage.latestOpportunities[0]?.id).toBe(3);
  expect(homepage.featuredAgencyOpportunities.map((row) => row.id)).toEqual([2]);
  const search = slicePublicJobs(board.jobs, { query: "virtual assistant", offset: 0, limit: 30 });
  expect(search.jobs.map((row) => row.id)).toEqual([2]);
  expect(matchesJobQuery(board.jobs[3]!, "virtual")).toBe(false);
  const directory = sliceDirectory(board.directory, { query: "open", category: null, offset: 0, limit: 48 });
  expect(directory.total).toBe(1);
});

test("the refresh lease cannot be taken twice inside its window", () => {
  const db = sourceDatabase();
  try {
    db.exec(`INSERT INTO public_serving_snapshot (id, generated_at, payload) VALUES (1, '2026-10-05T00:00:00.000Z', '{}')`);
    const claim = db.prepare(CLAIM_REFRESH_SQL);
    const now = "2026-10-06T03:00:00.000Z";
    const staleBefore = "2026-10-06T02:00:00.000Z";
    const leaseBefore = "2026-10-06T02:50:00.000Z";
    claim.run(now, staleBefore, leaseBefore);
    expect((db.query("SELECT changes() AS changes").get() as { changes: number }).changes).toBe(1);
    claim.run(now, staleBefore, leaseBefore);
    expect((db.query("SELECT changes() AS changes").get() as { changes: number }).changes).toBe(0);
  } finally {
    db.close();
  }
});
