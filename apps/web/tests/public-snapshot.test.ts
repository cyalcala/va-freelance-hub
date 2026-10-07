import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { homepageFromSnapshot } from "../src/lib/homepage-data";
import { matchesJobQuery, sliceDirectory, slicePublicJobs, type PublicJob } from "../src/lib/public-board";
import {
  CLAIM_REFRESH_SQL,
  WRITE_SNAPSHOT_SQL,
  createD1SnapshotStore,
  getPublicSnapshotHealth,
  packBoard,
  promoteSnapshot,
  resetPublicBoardState,
  resolvePublicBoard,
  validateSnapshotCandidate,
  type SnapshotDatabase,
  type SnapshotStore,
} from "../src/lib/public-serving-snapshot";
import { getDurableLkgSnapshot } from "../src/lib/durable-lkg-snapshot";

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

test("a cold quota failure serves the durable LKG snapshot and does not scan the jobs table", async () => {
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
  // With LKG fallback, availability is preserved (no 503) and D1 jobs table is NOT scanned
  const board = await resolvePublicBoard({ now: Date.now(), cache: null, store });
  expect(board.jobs.length).toBeGreaterThan(0);
  expect(builds).toBe(0);

  // If fallback is explicitly disabled, it re-throws without scanning D1
  resetPublicBoardState();
  await expect(resolvePublicBoard({ now: Date.now(), cache: null, store, allowLkgFallback: false })).rejects.toThrow("daily limit");
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

test("independent stores share the first missing-row lease and recover an abandoned claim", async () => {
  const db = sourceDatabase();
  try {
    const first = createD1SnapshotStore(d1Like(db));
    const second = createD1SnapshotStore(d1Like(db));
    const claims = await Promise.all([first, second].map((store) => store.claimRefresh(
      "2026-10-07T10:00:00.000Z", "2026-10-07T09:00:00.000Z", "2026-10-07T09:50:00.000Z",
    )));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await first.read())?.payload).toBe("");
    expect(await second.claimRefresh("2026-10-07T10:11:00.000Z", "2026-10-07T09:11:00.000Z", "2026-10-07T10:01:00.000Z")).toBe(true);
  } finally { db.close(); }
});

test("a cold loser of the missing-row lease serves LKG without scanning tables", async () => {
  resetPublicBoardState();
  let builds = 0;
  const board = await resolvePublicBoard({ now: Date.parse("2026-10-07T10:00:00.000Z"), cache: null, store: {
    async read() { return null; }, async claimRefresh() { return false; }, async write() {},
    async build() { builds += 1; throw new Error("Must not scan"); },
  } });
  expect(builds).toBe(0);
  expect(board.jobs.length).toBeGreaterThan(0);
  expect(getPublicSnapshotHealth().lastSource).toBe("durable_lkg");
});

test("a late writer from an expired lease cannot roll back the durable snapshot row", () => {
  const db = sourceDatabase();
  try {
    const write = db.prepare(WRITE_SNAPSHOT_SQL);
    write.run("2026-10-06T12:00:00.000Z", "newer-good");
    write.run("2026-10-06T11:00:00.000Z", "late-old");
    expect(db.query("SELECT generated_at, payload FROM public_serving_snapshot WHERE id=1").get())
      .toEqual({ generated_at: "2026-10-06T12:00:00.000Z", payload: "newer-good" });
  } finally { db.close(); }
});

describe("Phase 4 — Snapshot Validation", () => {
  test("rejects fields that would crash a public renderer or query", async () => {
    const malformedFields = [
      { tags: null }, { tags: [null] }, { postedAt: 42 },
      { sourceId: {} }, { company: {} }, { description: {} },
    ];
    for (const fields of malformedFields) {
      resetPublicBoardState();
      const invalid = {
        generatedAt: new Date().toISOString(),
        jobs: [job({ id: 1, title: "Partial snapshot", ...fields } as never)],
        directory: [],
      };
      expect(validateSnapshotCandidate(invalid).ok).toBe(false);
      const board = await resolvePublicBoard({
        now: Date.now(), cache: null,
        store: {
          async read() { return { generatedAt: invalid.generatedAt, payload: JSON.stringify(invalid) }; },
          async claimRefresh() { return false; }, async write() {},
          async build() { throw new Error("D1 unavailable"); },
        },
      });
      // Exercise the real consumer that previously threw on malformed tags/dates.
      expect(() => slicePublicJobs(board.jobs, { query: "assistant", offset: 0, limit: 30 })).not.toThrow();
      expect(getPublicSnapshotHealth().status).toBe("lkg_fallback");
    }
  });

  test("rejects a cold empty job board even if directory rows exist", () => {
    const candidate = getDurableLkgSnapshot();
    candidate.jobs = [];
    expect(validateSnapshotCandidate(candidate).ok).toBe(false);
  });

  test("a partial rebuild cannot erase an established directory", () => {
    const active = getDurableLkgSnapshot();
    const candidate = { ...active, directory: [] };
    expect(validateSnapshotCandidate(candidate, active).ok).toBe(false);
  });

  test("accepts a well-formed candidate snapshot", () => {
    const candidate = {
      generatedAt: "2026-10-06T12:00:00.000Z",
      jobs: [job({ id: 1, title: "Valid Job" })],
      directory: [{ id: 1, companyName: "Valid Co", website: null, niche: "global-va", isDayshift: false, isVerified: true, isRemote: true, isMarketplace: false }],
    };
    const result = validateSnapshotCandidate(candidate);
    expect(result.ok).toBe(true);
  });

  test("rejects candidates with invalid or unparseable timestamps", () => {
    expect(validateSnapshotCandidate({ generatedAt: "not-a-date", jobs: [], directory: [] }).ok).toBe(false);
    expect(validateSnapshotCandidate({ generatedAt: "", jobs: [], directory: [] }).ok).toBe(false);
    expect(validateSnapshotCandidate({ jobs: [], directory: [] }).ok).toBe(false);
  });

  test("rejects candidate with invalid job IDs or missing required fields", () => {
    const badId = {
      generatedAt: "2026-10-06T12:00:00.000Z",
      jobs: [job({ id: NaN, title: "Bad ID" })],
      directory: [],
    };
    expect(validateSnapshotCandidate(badId).ok).toBe(false);

    const missingTitle = {
      generatedAt: "2026-10-06T12:00:00.000Z",
      jobs: [{ id: 1, title: "", sourceUrl: "https://a.com", sourcePlatform: "X", category: "admin" }],
      directory: [],
    };
    expect(validateSnapshotCandidate(missingTitle).ok).toBe(false);
  });

  test("rejects candidate with empty jobs array when active board has active listings (anti-collapse)", () => {
    const active = {
      generatedAt: "2026-10-06T10:00:00.000Z",
      jobs: [job({ id: 1, title: "Job 1" }), job({ id: 2, title: "Job 2" }), job({ id: 3, title: "Job 3" })],
      directory: [],
    };
    const emptyCandidate = {
      generatedAt: "2026-10-06T11:00:00.000Z",
      jobs: [],
      directory: [{ id: 1, companyName: "Co", website: null, niche: "global-va", isDayshift: false, isVerified: true, isRemote: true, isMarketplace: false }],
    };
    const result = validateSnapshotCandidate(emptyCandidate, active);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Unexpected empty candidate");
    }
  });

  test("rejects severe count collapse when active board has large corpus", () => {
    const activeJobs = Array.from({ length: 100 }, (_, i) => job({ id: i + 1, title: `Job ${i}` }));
    const active = {
      generatedAt: "2026-10-06T10:00:00.000Z",
      jobs: activeJobs,
      directory: [],
    };
    const collapsedCandidate = {
      generatedAt: "2026-10-06T11:00:00.000Z",
      jobs: [job({ id: 999, title: "Only One Survives" })],
      directory: [],
    };
    const result = validateSnapshotCandidate(collapsedCandidate, active);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Suspicious job count collapse");
    }
  });
});

describe("Phase 6 — Failure-Injection Tests (Tests A through I)", () => {
  test("an oversized candidate cannot replace memory, edge, or the durable row", async () => {
    resetPublicBoardState();
    const initial = Date.parse("2026-10-06T00:00:00.000Z");
    const good = { generatedAt: new Date(initial).toISOString(), jobs: [job({ id: 1, title: "Fits storage" })], directory: [] };
    promoteSnapshot(good, "memory", initial);
    let writes = 0;
    let edgeWrites = 0;
    const pending: Promise<unknown>[] = [];
    const now = initial + 2 * 60 * 60 * 1000;
    const store: SnapshotStore = {
      async read() { return null; }, async claimRefresh() { return true; },
      async write() { writes += 1; },
      async build(generatedAt) { return { generatedAt, jobs: [job({ id: 2, title: randomBytes(800_000).toString("base64") })], directory: [] }; },
    };
    await resolvePublicBoard({
      now, store, cache: { async match() { return undefined; }, async put() { edgeWrites += 1; } },
      waitUntil(p) { pending.push(p); },
    });
    await Promise.all(pending);
    const served = await resolvePublicBoard({ now: now + 1, cache: null, store });
    expect(served.jobs.map((j) => j.id)).toEqual([1]);
    expect(writes).toBe(0);
    expect(edgeWrites).toBe(0);
    expect(getPublicSnapshotHealth(now).lastRefreshResult).toBe("failed");
  });

  test("a hanging cold D1 read has a bounded wait before durable failover", async () => {
    resetPublicBoardState();
    let builds = 0;
    const board = await resolvePublicBoard({
      now: Date.now(), cache: null, dependencyTimeoutMs: 10,
      store: {
        async read() { return new Promise(() => {}); },
        async claimRefresh() { return false; }, async write() {},
        async build() { builds += 1; throw new Error("must not scan while the read hangs"); },
      },
    });
    expect(board.jobs.length).toBeGreaterThan(0);
    expect(getPublicSnapshotHealth().status).toBe("lkg_fallback");
    expect(getPublicSnapshotHealth().lastRefreshError).toBe("snapshot_timeout");
    expect(builds).toBe(0);
  });

  test("a hanging edge cache cannot prevent durable failover", async () => {
    resetPublicBoardState();
    const board = await resolvePublicBoard({
      now: Date.now(), dependencyTimeoutMs: 10,
      cache: { async match() { return new Promise(() => {}); }, async put() {} },
      store: {
        async read() { throw new Error("D1 quota exceeded"); },
        async claimRefresh() { return false; }, async write() {},
        async build() { throw new Error("D1 quota exceeded"); },
      },
    });
    expect(board.jobs.length).toBeGreaterThan(0);
    expect(getPublicSnapshotHealth().status).toBe("lkg_fallback");
  });

  test("a failed durable write cannot promote the replacement over the active board", async () => {
    resetPublicBoardState();
    const initial = Date.parse("2026-10-06T00:00:00.000Z");
    promoteSnapshot({ generatedAt: new Date(initial).toISOString(), jobs: [job({ id: 1, title: "Durable good" })], directory: [] }, "memory", initial);
    const pending: Promise<unknown>[] = [];
    const now = initial + 2 * 60 * 60 * 1000;
    let writes = 0;
    const store: SnapshotStore = {
      async read() { return null; }, async claimRefresh() { return true; },
      async build(generatedAt) { return { generatedAt, jobs: [job({ id: 2, title: "Unpersisted replacement" })], directory: [] }; },
      async write() { writes += 1; throw new Error("D1 write quota exceeded"); },
    };
    await resolvePublicBoard({ now, cache: null, store, waitUntil(p) { pending.push(p); } });
    await Promise.all(pending);
    const served = await resolvePublicBoard({ now: now + 1, cache: null, store });
    expect(writes).toBe(1);
    expect(served.jobs.map((j) => j.id)).toEqual([1]);
    expect(getPublicSnapshotHealth(now).lastRefreshResult).toBe("failed");
  });

  test("an older edge copy cannot overwrite a newer active snapshot", async () => {
    resetPublicBoardState();
    const initial = Date.parse("2026-10-06T10:00:00.000Z");
    const newer = { generatedAt: new Date(initial).toISOString(), jobs: [job({ id: 2, title: "Newer good" })], directory: [] };
    promoteSnapshot(newer, "memory", initial);
    const old = { generatedAt: "2026-10-06T08:00:00.000Z", jobs: [job({ id: 1, title: "Older edge" })], directory: [] };
    const payload = await packBoard(old);
    const pending: Promise<unknown>[] = [];
    const board = await resolvePublicBoard({
      now: initial + 16 * 60 * 1000,
      cache: { async match() { return new Response(payload, { headers: { "x-snapshot-generated-at": old.generatedAt } }); }, async put() {} },
      store: { async read() { return null; }, async claimRefresh() { return false; }, async build() { return newer; }, async write() {} },
      waitUntil(p) { pending.push(p); },
    });
    await Promise.all(pending);
    expect(board.jobs.map((j) => j.id)).toEqual([2]);
  });

  test("a failing waitUntil hook cannot crash a stale public response", async () => {
    resetPublicBoardState();
    const initial = Date.parse("2026-10-06T00:00:00.000Z");
    promoteSnapshot({ generatedAt: new Date(initial).toISOString(), jobs: [job({ id: 1, title: "Still usable" })], directory: [] }, "memory", initial);
    const board = await resolvePublicBoard({
      now: initial + 2 * 60 * 60 * 1000, cache: null,
      store: { async read() { throw new Error("D1 offline"); }, async claimRefresh() { return false; }, async build() { throw new Error("offline"); }, async write() {} },
      waitUntil() { throw new Error("Runtime context unavailable"); },
    });
    expect(board.jobs.map((j) => j.id)).toEqual([1]);
  });

  // Test A: D1 unavailable + valid cached snapshot -> serves cached board
  test("Test A: D1 unavailable + valid in-memory snapshot continues serving without throwing", async () => {
    resetPublicBoardState();
    const goodBoard = {
      generatedAt: "2026-10-06T10:00:00.000Z",
      jobs: [job({ id: 42, title: "Cached Production Job" })],
      directory: [],
    };
    promoteSnapshot(goodBoard, "memory", Date.now());

    const failingStore: SnapshotStore = {
      async read() { throw new Error("D1 connection lost"); },
      async claimRefresh() { throw new Error("D1 unavailable"); },
      async write() { throw new Error("D1 unavailable"); },
      async build() { throw new Error("D1 unavailable"); },
    };

    const board = await resolvePublicBoard({
      now: Date.now(),
      cache: null,
      store: failingStore,
    });
    expect(board.jobs.map((j) => j.id)).toEqual([42]);
  });

  // Test B: D1 unavailable + cold runtime + durable LKG exists -> serves durable LKG
  test("Test B: D1 unavailable + cold runtime serves durable LKG without crashing", async () => {
    resetPublicBoardState();
    const failingStore: SnapshotStore = {
      async read() { throw new Error("D1 daily row read limit exceeded [code: 7500]"); },
      async claimRefresh() { throw new Error("D1 unavailable"); },
      async write() { throw new Error("D1 unavailable"); },
      async build() { throw new Error("D1 unavailable"); },
    };

    const board = await resolvePublicBoard({
      now: Date.now(),
      cache: null,
      store: failingStore,
    });
    expect(board.jobs.length).toBeGreaterThan(0);
    const health = getPublicSnapshotHealth();
    expect(health.status).toBe("lkg_fallback");
    expect(health.d1QuotaFailed).toBe(true);
  });

  // Test C: Snapshot refresh throws exception -> existing snapshot remains available
  test("Test C: snapshot refresh throws exception -> existing snapshot remains available", async () => {
    resetPublicBoardState();
    const initialTime = Date.parse("2026-10-06T00:00:00.000Z");
    const activeBoard = {
      generatedAt: new Date(initialTime).toISOString(),
      jobs: [job({ id: 50, title: "Steady Job" })],
      directory: [],
    };
    promoteSnapshot(activeBoard, "memory", initialTime);

    // After 2 hours, snapshot is stale; refresh is scheduled but throws
    const now = initialTime + 2 * 60 * 60 * 1000;
    const failingStore: SnapshotStore = {
      async read() { return null; },
      async claimRefresh() { return true; },
      async write() {},
      async build() { throw new Error("Upstream API timeout during build"); },
    };

    const pending: Promise<unknown>[] = [];
    const board = await resolvePublicBoard({
      now,
      cache: null,
      store: failingStore,
      waitUntil(p) { pending.push(p); },
    });
    // The active board was preserved and served immediately
    expect(board.jobs.map((j) => j.id)).toEqual([50]);

    await Promise.allSettled(pending);
    // Even after background failure, active snapshot is still intact
    const health = getPublicSnapshotHealth(now);
    expect(health.lastRefreshResult).toBe("failed");
    expect(health.jobCount).toBe(1);
  });

  // Test D: Candidate snapshot malformed -> candidate rejected; previous snapshot retained
  test("Test D: candidate snapshot malformed -> candidate rejected; previous snapshot retained", async () => {
    resetPublicBoardState();
    const initialTime = Date.parse("2026-10-06T00:00:00.000Z");
    const activeBoard = {
      generatedAt: new Date(initialTime).toISOString(),
      jobs: [job({ id: 70, title: "Protected Job" })],
      directory: [],
    };
    promoteSnapshot(activeBoard, "memory", initialTime);

    const now = initialTime + 2 * 60 * 60 * 1000;
    const malformedStore: SnapshotStore = {
      async read() { return null; },
      async claimRefresh() { return true; },
      async write() {},
      async build() {
        return {
          generatedAt: new Date(now).toISOString(),
          jobs: [{ id: NaN, title: "" } as unknown as PublicJob],
          directory: [],
        };
      },
    };

    const pending: Promise<unknown>[] = [];
    const board = await resolvePublicBoard({
      now,
      cache: null,
      store: malformedStore,
      waitUntil(p) { pending.push(p); },
    });
    expect(board.jobs.map((j) => j.id)).toEqual([70]);

    await Promise.allSettled(pending);
    const health = getPublicSnapshotHealth(now);
    expect(health.lastRefreshResult).toBe("rejected");
    expect(health.jobCount).toBe(1);
  });

  // Test E: Candidate snapshot unexpectedly empty -> candidate rejected unless explicitly allowed
  test("Test E: candidate snapshot unexpectedly empty -> candidate rejected; previous retained", async () => {
    resetPublicBoardState();
    const initialTime = Date.parse("2026-10-06T00:00:00.000Z");
    const activeBoard = {
      generatedAt: new Date(initialTime).toISOString(),
      jobs: [job({ id: 80, title: "Job A" }), job({ id: 81, title: "Job B" })],
      directory: [],
    };
    promoteSnapshot(activeBoard, "memory", initialTime);

    const now = initialTime + 2 * 60 * 60 * 1000;
    const emptyStore: SnapshotStore = {
      async read() { return null; },
      async claimRefresh() { return true; },
      async write() {},
      async build() {
        return {
          generatedAt: new Date(now).toISOString(),
          jobs: [],
          directory: [],
        };
      },
    };

    const pending: Promise<unknown>[] = [];
    const board = await resolvePublicBoard({
      now,
      cache: null,
      store: emptyStore,
      waitUntil(p) { pending.push(p); },
    });
    expect(board.jobs.length).toBe(2);

    await Promise.allSettled(pending);
    const health = getPublicSnapshotHealth(now);
    expect(health.lastRefreshResult).toBe("rejected");
    expect(health.jobCount).toBe(2);
  });

  // Test F: Quota error during refresh -> public board remains operational
  test("Test F: quota error during refresh -> public board remains operational", async () => {
    resetPublicBoardState();
    const initialTime = Date.parse("2026-10-06T00:00:00.000Z");
    const activeBoard = {
      generatedAt: new Date(initialTime).toISOString(),
      jobs: [job({ id: 90, title: "Quota Immune Job" })],
      directory: [],
    };
    promoteSnapshot(activeBoard, "memory", initialTime);

    const now = initialTime + 2 * 60 * 60 * 1000;
    const quotaStore: SnapshotStore = {
      async read() { throw new Error("D1 daily row read limit exceeded [code: 7500]"); },
      async claimRefresh() { throw new Error("D1 daily row read limit exceeded [code: 7500]"); },
      async write() { throw new Error("D1 daily row read limit exceeded [code: 7500]"); },
      async build() { throw new Error("D1 daily row read limit exceeded [code: 7500]"); },
    };

    const pending: Promise<unknown>[] = [];
    const board = await resolvePublicBoard({
      now,
      cache: null,
      store: quotaStore,
      waitUntil(p) { pending.push(p); },
    });
    expect(board.jobs.map((j) => j.id)).toEqual([90]);

    await Promise.allSettled(pending);
    expect(getPublicSnapshotHealth(now).d1QuotaFailed).toBe(true);
    expect(getPublicSnapshotHealth(now).jobCount).toBe(1);
  });

  // Test G: Multiple concurrent refresh requests -> no corruption/race-induced outage
  test("Test G: multiple concurrent requests share single inflight load and do not corrupt state", async () => {
    resetPublicBoardState();
    let builds = 0;
    const slowStore: SnapshotStore = {
      async read() { return null; },
      async claimRefresh() { return true; },
      async write() {},
      async build(generatedAt) {
        builds += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          generatedAt,
          jobs: [job({ id: 100, title: "Concurrency Safe" })],
          directory: [],
        };
      },
    };

    const now = Date.now();
    const [boardA, boardB, boardC] = await Promise.all([
      resolvePublicBoard({ now, cache: null, store: slowStore }),
      resolvePublicBoard({ now, cache: null, store: slowStore }),
      resolvePublicBoard({ now, cache: null, store: slowStore }),
    ]);

    expect(boardA.jobs.map((j) => j.id)).toEqual([100]);
    expect(boardB.jobs.map((j) => j.id)).toEqual([100]);
    expect(boardC.jobs.map((j) => j.id)).toEqual([100]);
    expect(builds).toBe(1);
  });

  // Test H: Deployment / cold start -> durable snapshot restores board without requiring upstream availability
  test("Test H: deployment cold start restores board without requiring upstream availability", async () => {
    resetPublicBoardState();
    const offlineStore: SnapshotStore = {
      async read() { throw new Error("Database offline"); },
      async claimRefresh() { throw new Error("Database offline"); },
      async write() { throw new Error("Database offline"); },
      async build() { throw new Error("Database offline"); },
    };

    const board = await resolvePublicBoard({
      now: Date.now(),
      cache: null,
      store: offlineStore,
    });

    expect(board.jobs.length).toBeGreaterThanOrEqual(10);
    expect(board.directory.length).toBeGreaterThanOrEqual(5);
    expect(board.jobs.some((j) => j.category === "admin")).toBe(true);
    expect(board.jobs.some((j) => j.category === "tech")).toBe(true);
  });

  // Test I: Snapshot cache expired -> triggers refresh behavior but DOES NOT remove the usable stale snapshot
  test("Test I: snapshot cache expired triggers refresh but DOES NOT delete the usable stale snapshot", async () => {
    resetPublicBoardState();
    const initialTime = Date.parse("2026-10-06T00:00:00.000Z");
    const activeBoard = {
      generatedAt: new Date(initialTime).toISOString(),
      jobs: [job({ id: 200, title: "Long-lived Stale Job" })],
      directory: [],
    };
    promoteSnapshot(activeBoard, "memory", initialTime);

    // Request arrives well past TTL (e.g. 5 hours later)
    const now = initialTime + 5 * 60 * 60 * 1000;
    let refreshTriggered = false;
    const store: SnapshotStore = {
      async read() { return null; },
      async claimRefresh() {
        refreshTriggered = true;
        return false;
      },
      async write() {},
      async build(generatedAt) {
        return { generatedAt, jobs: [job({ id: 201, title: "Fresh" })], directory: [] };
      },
    };

    const pending: Promise<unknown>[] = [];
    const served = await resolvePublicBoard({
      now,
      cache: null,
      store,
      waitUntil(p) { pending.push(p); },
    });

    // Stale snapshot is served immediately (0ms wait, no deletion)
    expect(served.jobs.map((j) => j.id)).toEqual([200]);
    await Promise.allSettled(pending);
    expect(refreshTriggered).toBe(true);
  });
});

describe("Phase 7 — Observability & Telemetry", () => {
  test("getPublicSnapshotHealth reflects current snapshot lifecycle and status", () => {
    resetPublicBoardState();
    expect(getPublicSnapshotHealth().status).toBe("degraded");

    const now = Date.now();
    const lkg = getDurableLkgSnapshot();
    promoteSnapshot(lkg, "durable_lkg", now);
    const lkgHealth = getPublicSnapshotHealth(now);
    expect(lkgHealth.status).toBe("lkg_fallback");
    expect(lkgHealth.lastSource).toBe("durable_lkg");
    expect(lkgHealth.jobCount).toBe(lkg.jobs.length);

    resetPublicBoardState();
    const freshBoard = {
      generatedAt: new Date(now).toISOString(),
      jobs: [job({ id: 301, title: "Freshly Generated" })],
      directory: [],
    };
    promoteSnapshot(freshBoard, "d1", now);
    const freshHealth = getPublicSnapshotHealth(now);
    expect(freshHealth.status).toBe("fresh");
    expect(freshHealth.lastSource).toBe("d1");
    expect(freshHealth.jobCount).toBe(1);

    // Stale after 2 hours
    const staleHealth = getPublicSnapshotHealth(now + 2 * 60 * 60 * 1000);
    expect(staleHealth.status).toBe("stale");
    expect(staleHealth.ageMs).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000);
  });
});

