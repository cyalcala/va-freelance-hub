import { describe, expect, test } from "bun:test";
import {
  ROBOTS_CACHE_TTL_MS,
  checkRobots,
  decideFromEntry,
  originOf,
  type RobotsCacheEntry,
  type RobotsCacheStore,
} from "./robotsGate";

function memoryStore(seed: RobotsCacheEntry[] = []) {
  const rows = new Map<string, RobotsCacheEntry>(seed.map((e) => [e.origin, e]));
  const store: RobotsCacheStore & { puts: RobotsCacheEntry[] } = {
    puts: [],
    async get(origin) {
      return rows.get(origin) ?? null;
    },
    async put(entry) {
      store.puts.push(entry);
      rows.set(entry.origin, entry);
    },
  };
  return store;
}

function response(body: string, status = 200): Response {
  return new Response(body, { status });
}

const NOW = new Date("2026-08-11T00:00:00.000Z");
const now = () => NOW;

describe("originOf", () => {
  test("reduces a URL to the unit robots.txt governs", () => {
    expect(originOf("https://remoteok.com/api?x=1")).toBe("https://remoteok.com");
  });

  test("returns null for an unparseable URL", () => {
    expect(originOf("nope")).toBeNull();
  });
});

describe("checkRobots — fetching and caching", () => {
  test("fetches robots.txt and allows a permitted path", async () => {
    const store = memoryStore();
    const result = await checkRobots("https://remoteok.com/api", {
      store,
      now,
      mode: "enforce",
      fetchImpl: async () => response("User-agent: *\nAllow: /\nCrawl-delay: 1"),
    });

    expect(result.verdict).toBe("allowed");
    expect(result.allowed).toBe(true);
    expect(result.crawlDelay).toBe(1);
    expect(result.fromCache).toBe(false);
  });

  test("caches by origin so one fetch serves many paths", async () => {
    const store = memoryStore();
    let fetches = 0;
    const fetchImpl = async () => {
      fetches += 1;
      return response("User-agent: *\nAllow: /");
    };

    await checkRobots("https://example.com/a", { store, now, fetchImpl });
    await checkRobots("https://example.com/b", { store, now, fetchImpl });

    expect(fetches).toBe(1);
    expect(store.puts).toHaveLength(1);
  });

  test("a cached entry is reused within the TTL", async () => {
    const store = memoryStore([{
      origin: "https://example.com",
      fetchedAt: NOW.toISOString(),
      status: 200,
      body: "User-agent: *\nDisallow: /private",
      crawlDelay: null,
      contentSignals: null,
      error: null,
    }]);

    const result = await checkRobots("https://example.com/private", {
      store,
      now,
      mode: "enforce",
      fetchImpl: async () => { throw new Error("should not fetch"); },
    });

    expect(result.fromCache).toBe(true);
    expect(result.verdict).toBe("disallowed");
  });

  test("an expired entry is refetched", async () => {
    const stale = new Date(NOW.getTime() - ROBOTS_CACHE_TTL_MS - 1).toISOString();
    const store = memoryStore([{
      origin: "https://example.com",
      fetchedAt: stale,
      status: 200,
      body: "User-agent: *\nDisallow: /",
      crawlDelay: null,
      contentSignals: null,
      error: null,
    }]);

    const result = await checkRobots("https://example.com/x", {
      store,
      now,
      mode: "enforce",
      fetchImpl: async () => response("User-agent: *\nAllow: /"),
    });

    expect(result.fromCache).toBe(false);
    expect(result.verdict).toBe("allowed");
  });

  test("an entry with an unparseable timestamp is treated as stale", async () => {
    const store = memoryStore([{
      origin: "https://example.com",
      fetchedAt: "not-a-date",
      status: 200,
      body: "User-agent: *\nDisallow: /",
      crawlDelay: null,
      contentSignals: null,
      error: null,
    }]);

    const result = await checkRobots("https://example.com/x", {
      store,
      now,
      fetchImpl: async () => response("User-agent: *\nAllow: /"),
    });

    expect(result.fromCache).toBe(false);
  });
});

describe("checkRobots — enforcement modes", () => {
  const disallowAll = async () => response("User-agent: *\nDisallow: /");

  test("observe mode reports a would-block but still permits the fetch", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      mode: "observe",
      fetchImpl: disallowAll,
    });

    expect(result.verdict).toBe("disallowed");
    expect(result.wouldBlock).toBe(true);
    expect(result.allowed).toBe(true);
    expect(result.mode).toBe("observe");
  });

  test("enforce mode blocks the fetch", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      mode: "enforce",
      fetchImpl: disallowAll,
    });

    expect(result.allowed).toBe(false);
    expect(result.wouldBlock).toBe(true);
  });

  test("observe is the default, so shipping the gate cannot halt ingestion", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      fetchImpl: disallowAll,
      now,
    });

    expect(result.mode).toBe("observe");
    expect(result.allowed).toBe(true);
  });
});

describe("checkRobots — failure handling", () => {
  test("a network failure is unknown, not an allow", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      mode: "enforce",
      fetchImpl: async () => { throw new Error("ECONNRESET"); },
    });

    expect(result.verdict).toBe("unknown");
    expect(result.allowed).toBe(false);
    expect(result.evidence).toContain("ECONNRESET");
  });

  test("a 5xx withholds consent in enforce mode", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      mode: "enforce",
      fetchImpl: async () => response("", 503),
    });

    expect(result.verdict).toBe("unknown");
    expect(result.allowed).toBe(false);
  });

  test("a 404 means no rules are published, so the fetch proceeds", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      mode: "enforce",
      fetchImpl: async () => response("", 404),
    });

    expect(result.verdict).toBe("allowed");
    expect(result.allowed).toBe(true);
  });

  test("a cache write failure does not break the decision", async () => {
    const store: RobotsCacheStore = {
      async get() { return null; },
      async put() { throw new Error("D1 unavailable"); },
    };

    const result = await checkRobots("https://example.com/x", {
      store,
      now,
      mode: "enforce",
      fetchImpl: async () => response("User-agent: *\nAllow: /"),
    });

    expect(result.verdict).toBe("allowed");
  });

  test("a cache read failure degrades to unknown rather than throwing", async () => {
    const store: RobotsCacheStore = {
      async get() { throw new Error("D1 read failed"); },
      async put() {},
    };

    const result = await checkRobots("https://example.com/x", {
      store,
      now,
      mode: "enforce",
      fetchImpl: async () => response("User-agent: *\nAllow: /"),
    });

    expect(result.verdict).toBe("unknown");
    expect(result.allowed).toBe(false);
  });

  test("an unparseable URL never yields an allow", async () => {
    const result = await checkRobots("garbage", {
      store: memoryStore(),
      now,
      mode: "enforce",
    });

    expect(result.verdict).toBe("unknown");
    expect(result.allowed).toBe(false);
  });
});

describe("content signals via the gate", () => {
  test("ai-input=no is surfaced so triage can be withheld", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      fetchImpl: async () =>
        response("# Content-Signal: search=yes,ai-input=no\nUser-agent: *\nAllow: /"),
    });

    expect(result.verdict).toBe("allowed");
    expect(result.aiInputAllowed).toBe(false);
  });

  test("an unstated ai-input permits triage", async () => {
    const result = await checkRobots("https://example.com/x", {
      store: memoryStore(),
      now,
      fetchImpl: async () => response("User-agent: *\nAllow: /"),
    });

    expect(result.aiInputAllowed).toBe(true);
  });
});

describe("decideFromEntry", () => {
  test("re-derives a decision from a stored row without refetching", () => {
    const entry: RobotsCacheEntry = {
      origin: "https://example.com",
      fetchedAt: NOW.toISOString(),
      status: 200,
      body: "User-agent: *\nDisallow: /admin",
      crawlDelay: null,
      contentSignals: null,
      error: null,
    };

    expect(decideFromEntry(entry, "https://example.com/admin/x").verdict).toBe("disallowed");
    expect(decideFromEntry(entry, "https://example.com/jobs").verdict).toBe("allowed");
  });

  test("a stored fetch error re-derives as unknown", () => {
    const entry: RobotsCacheEntry = {
      origin: "https://example.com",
      fetchedAt: NOW.toISOString(),
      status: 0,
      body: null,
      crawlDelay: null,
      contentSignals: null,
      error: "timeout",
    };

    expect(decideFromEntry(entry, "https://example.com/x").verdict).toBe("unknown");
  });
});
