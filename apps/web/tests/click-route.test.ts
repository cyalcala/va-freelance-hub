import { describe, expect, test } from "bun:test";
import { type SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { createClickHandler } from "../src/pages/api/click/[id]";
import { PUBLIC_PH_ELIGIBILITIES } from "../src/lib/public-opportunities";

const STORED_URL = "https://example.com/jobs/123";

type StoredRow = {
  sourceUrl: string;
  applicationUrl: string | null;
  isActive?: boolean;
  phEligibility?: string;
};

const PUBLIC_ROW: Required<StoredRow> = {
  sourceUrl: STORED_URL,
  applicationUrl: null,
  isActive: true,
  phEligibility: "eligible_verified",
};

/**
 * The fake answers row visibility from the eligibility columns the route's own
 * `where` clause mentions, not from a hard-coded answer. It compiles the real
 * drizzle condition the handler passed in, so dropping the shared predicate from
 * the query makes a non-public row visible again and the assertions below fail.
 * That keeps these behavioural tests (real handler, real SQL composition)
 * instead of source-grep `toContain` assertions.
 */
function makeDb(options: { updateError?: Error; readError?: Error; readWait?: Promise<void>; updateWait?: Promise<void>; row?: StoredRow | null } = {}) {
  let updates = 0;
  let reads = 0;
  const whereClauses: Array<{ sql: string; params: unknown[] }> = [];
  const row = options.row === undefined ? PUBLIC_ROW : options.row;
  const dialect = new SQLiteSyncDialect();
  const db = {
    select: () => {
      reads += 1;
      return {
        from: () => ({
          where: (condition: SQL) => {
            const compiled = dialect.sqlToQuery(condition);
            whereClauses.push({ sql: compiled.sql, params: [...compiled.params] });
            return {
              limit: async () => {
                if (options.readError) throw options.readError;
                if (options.readWait) await options.readWait;
                if (!row) return [];
                const constrainsEligibility =
                  /is_active/i.test(compiled.sql) && /ph_eligibility/i.test(compiled.sql);
                const visible = constrainsEligibility
                  ? row.isActive === true && PUBLIC_PH_ELIGIBILITIES.includes(row.phEligibility as never)
                  : true;
                return visible ? [{ sourceUrl: row.sourceUrl, applicationUrl: row.applicationUrl }] : [];
              },
            };
          },
        }),
      };
    },
    update: () => ({
      set: () => ({
        where: async () => {
          updates += 1;
          if (options.updateWait) await options.updateWait;
          if (options.updateError) throw options.updateError;
        },
      }),
    }),
  };
  return { db, updateCount: () => updates, readCount: () => reads, whereClauses };
}

function requestContext(env: Record<string, unknown>, target = STORED_URL, id = "123") {
  return {
    params: { id },
    request: new Request(
      `https://remotejobs.ph/api/click/${encodeURIComponent(id)}?url=${encodeURIComponent(target)}`,
      { headers: { "cf-connecting-ip": "203.0.113.9" } },
    ),
    locals: { runtime: { env } },
    redirect: (url: string, status: number) => new Response(null, {
      status,
      headers: { Location: url },
    }),
  } as any;
}

describe("click route analytics isolation", () => {
  test("an absent limiter performs zero analytics writes and still redirects", async () => {
    const { db, updateCount } = makeDb();
    const response = await createClickHandler({ getDb: () => db as any })(requestContext({}));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(STORED_URL);
    expect(updateCount()).toBe(0);
  });

  test("a proven allowed limiter permits one analytics write", async () => {
    const { db, updateCount } = makeDb();
    const keys: string[] = [];
    const env = {
      API_RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          keys.push(key);
          return { success: true };
        },
      },
    };
    const response = await createClickHandler({ getDb: () => db as any })(requestContext(env));

    expect(response.status).toBe(302);
    expect(updateCount()).toBe(1);
    expect(keys).toEqual(["click:203.0.113.9"]);
  });

  test("an over-limit result skips the write and still redirects", async () => {
    const { db, updateCount } = makeDb();
    const env = { API_RATE_LIMITER: { limit: async () => ({ success: false }) } };
    const response = await createClickHandler({ getDb: () => db as any })(requestContext(env));

    expect(response.status).toBe(302);
    expect(updateCount()).toBe(0);
  });

  test("limiter errors cannot block a validated redirect", async () => {
    const { db, updateCount } = makeDb();
    const env = { API_RATE_LIMITER: { limit: async () => { throw new Error("limiter unavailable"); } } };
    const response = await createClickHandler({ getDb: () => db as any })(requestContext(env));

    expect(response.status).toBe(302);
    expect(updateCount()).toBe(0);
  });

  test("analytics update errors cannot block a validated redirect", async () => {
    const { db, updateCount } = makeDb({ updateError: new Error("D1 quota") });
    const env = { API_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const response = await createClickHandler({ getDb: () => db as any })(requestContext(env));

    expect(response.status).toBe(302);
    expect(updateCount()).toBe(1);
  });

  test("unsafe targets remain rejected before limiter or analytics work", async () => {
    const { db, updateCount } = makeDb();
    let limiterCalls = 0;
    const env = { API_RATE_LIMITER: { limit: async () => { limiterCalls += 1; return { success: true }; } } };
    const response = await createClickHandler({ getDb: () => db as any })(
      requestContext(env, "https://evil.example/steal"),
    );

    expect(response.status).toBe(403);
    expect(limiterCalls).toBe(0);
    expect(updateCount()).toBe(0);
  });
});

describe("click outage recovery", () => {
  test("D1 quota failure gives a retryable uncached refusal without an outbound redirect", async () => {
    const { db, updateCount } = makeDb({ readError: new Error("D1 daily limit exceeded [7500]") });
    const response = await createClickHandler({ getDb: () => db as any })(requestContext({}));
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBeNull();
    expect(await response.text()).toContain("retry");
    expect(updateCount()).toBe(0);
  });

  test("a hung eligibility read is bounded and never authorizes a fallback redirect", async () => {
    const { db, updateCount } = makeDb({ readWait: new Promise(() => {}) });
    const response = await createClickHandler({ getDb: () => db as any, eligibilityTimeoutMs: 10 })(requestContext({}));
    expect(response.status).toBe(503);
    expect(response.headers.get("Location")).toBeNull();
    expect(updateCount()).toBe(0);
  });

  test("a hung optional limiter cannot strand a validated redirect", async () => {
    const { db, updateCount } = makeDb();
    const response = await createClickHandler({ getDb: () => db as any, analyticsTimeoutMs: 10 })(
      requestContext({ API_RATE_LIMITER: { limit: () => new Promise(() => {}) } }),
    );
    expect(response.status).toBe(302);
    expect(updateCount()).toBe(0);
  });

  test("a hung optional analytics write cannot strand a validated redirect", async () => {
    const { db } = makeDb({ updateWait: new Promise(() => {}) });
    const response = await createClickHandler({ getDb: () => db as any, analyticsTimeoutMs: 10 })(
      requestContext({ API_RATE_LIMITER: { limit: async () => ({ success: true }) } }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(STORED_URL);
  });
});

/**
 * A job id is attacker-controlled path input on an unauthenticated endpoint, and
 * this route is the site's outbound apply redirect. `parseInt` accepted any
 * numeric PREFIX, so `/api/click/12abc`, `/api/click/ 12`, `/api/click/+12` and
 * `/api/click/1e3` all resolved job 12 while `pages/jobs/[id].astro` — the other
 * live public route that takes a job id — requires `/^[1-9]\d*$/`. That cost a
 * prod D1 row read per malformed request before any validation (the exact cost
 * class that exhausted the free tier and 503'd the site, error 7500 in
 * `.shift/evidence.md`) and let one canonical opening accrue clicks under two
 * spellings. These assert the reject happens BEFORE the D1 binding is touched.
 */
describe("click route job-id validation", () => {
  const MALFORMED_IDS: Array<[string, string]> = [
    ["a trailing suffix", "123abc"],
    ["a numeric prefix only", "1e3"],
    ["leading whitespace", " 123"],
    ["an explicit plus sign", "+123"],
    ["a decimal point", "12.9"],
    ["a leading zero", "0123"],
    ["zero", "0"],
    ["a negative value", "-123"],
    ["an exponent", "1e309"],
    ["a non-numeric value", "abc"],
    ["percent-encoded digits", "%20123"],
  ];

  for (const [label, id] of MALFORMED_IDS) {
    test(`${label} is rejected without reading D1 or recording a click`, async () => {
      const { db, updateCount, readCount } = makeDb();
      let limiterCalls = 0;
      const env = { API_RATE_LIMITER: { limit: async () => { limiterCalls += 1; return { success: true }; } } };

      const response = await createClickHandler({ getDb: () => db as any })(
        requestContext(env, STORED_URL, id),
      );

      expect(response.status).toBe(400);
      // The whole point: a malformed id must cost no D1 read and no D1 write.
      expect(readCount()).toBe(0);
      expect(updateCount()).toBe(0);
      expect(limiterCalls).toBe(0);
      expect(response.headers.get("location")).toBeNull();
    });
  }

  test("a missing id is rejected without reading D1", async () => {
    const { db, readCount } = makeDb();
    const context = requestContext({}, STORED_URL, "");
    context.params = {};

    const response = await createClickHandler({ getDb: () => db as any })(context);

    expect(response.status).toBe(400);
    expect(readCount()).toBe(0);
  });

  test("the largest safe integer id is still accepted and read exactly once", async () => {
    const { db, readCount } = makeDb();
    const response = await createClickHandler({ getDb: () => db as any })(
      requestContext({}, STORED_URL, String(Number.MAX_SAFE_INTEGER)),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(STORED_URL);
    expect(readCount()).toBe(1);
  });

  test("an id beyond the safe-integer range is rejected without reading D1", async () => {
    const { db, readCount } = makeDb();
    const response = await createClickHandler({ getDb: () => db as any })(
      // 9007199254740993 is MAX_SAFE_INTEGER + 2 and parses exactly in JS, so this
      // asserts the range check rather than a float-rounding accident.
      requestContext({}, STORED_URL, "9007199254740993"),
    );

    expect(response.status).toBe(400);
    expect(readCount()).toBe(0);
  });
});

/**
 * Public-eligibility parity on the outbound apply redirect (v6.5 §3.2 #11).
 *
 * `/api/click/<id>` is the site's outbound apply redirect — the surface that
 * actually sends a job seeker off-site — and it was the only public surface
 * taking a job id that did NOT compose the shared eligibility contract:
 * `jobs/[id].astro` selected with `and(eq(id), publicOpportunityFilters())`,
 * while the click route selected with `eq(id)` alone. So a row the site has
 * decided is not publicly eligible (`is_active = 0` after link verification,
 * prune or a source leaving compliance; `ph_eligibility` outside
 * `eligible_verified` / `eligible_likely`) 404s on `/jobs/<id>`, is absent from
 * the board, search, sitemap and JSON-LD, and yet answered a live 302 to that
 * hidden row's stored apply URL — while incrementing its `click_count`.
 *
 * `public-eligibility-parity.test.ts` lists the surfaces that must reference the
 * shared predicate; the click route was not on that list, which is why the
 * divergence survived sessions 19-24. These assert the behaviour through the real
 * handler, with the fake deriving row visibility from the predicate the route
 * actually composed.
 */
describe("click route honours the public eligibility contract", () => {
  test("the single lookup composes the shared eligibility predicate", async () => {
    const { db, whereClauses } = makeDb();
    const response = await createClickHandler({ getDb: () => db as any })(requestContext({}, STORED_URL));

    expect(response.status).toBe(302);
    expect(whereClauses).toHaveLength(1);
    const [clause] = whereClauses;
    expect(clause.sql.toLowerCase()).toContain("is_active");
    expect(clause.sql.toLowerCase()).toContain("ph_eligibility");
    // The bound values are the accepted pair, not a route-local copy.
    expect(clause.params).toContain("eligible_verified");
    expect(clause.params).toContain("eligible_likely");
    // One lookup only: the predicate rides along on the read that already happened.
    expect(clause.sql.toLowerCase()).toContain('"id" =');
  });

  const NON_PUBLIC_ROWS: Array<[string, StoredRow]> = [
    ["deactivated (is_active = 0)", { ...PUBLIC_ROW, isActive: false }],
    ["geo-unclear", { ...PUBLIC_ROW, phEligibility: "unclear" }],
    ["geo-ineligible", { ...PUBLIC_ROW, phEligibility: "ineligible" }],
    ["eligibility never adjudicated", { ...PUBLIC_ROW, phEligibility: "pending" }],
  ];

  for (const [label, row] of NON_PUBLIC_ROWS) {
    test(`a ${label} row is not redirected, not written and not rate limited`, async () => {
      const { db, updateCount, readCount } = makeDb({ row });
      let limiterCalls = 0;
      const env = { API_RATE_LIMITER: { limit: async () => { limiterCalls += 1; return { success: true }; } } };

      const response = await createClickHandler({ getDb: () => db as any })(
        requestContext(env, STORED_URL),
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("location")).toBeNull();
      expect(readCount()).toBe(1);
      // The refusal must precede the limiter and the prod D1 write.
      expect(limiterCalls).toBe(0);
      expect(updateCount()).toBe(0);
    });
  }

  test("an eligible_likely row still redirects exactly as before", async () => {
    const { db, updateCount } = makeDb({ row: { ...PUBLIC_ROW, phEligibility: "eligible_likely" } });
    const env = { API_RATE_LIMITER: { limit: async () => ({ success: true }) } };

    const response = await createClickHandler({ getDb: () => db as any })(requestContext(env));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(STORED_URL);
    expect(updateCount()).toBe(1);
  });

  test("the cross-host application_url fallback is still reachable for a public row", async () => {
    const { db } = makeDb({
      row: {
        ...PUBLIC_ROW,
        applicationUrl: "https://jobs.unrelated-host.example/apply/9",
      },
    });

    const response = await createClickHandler({ getDb: () => db as any })(
      requestContext({}, "https://jobs.unrelated-host.example/apply/9"),
    );

    // Not the unrelated host: resolveOutboundUrl falls back to the attributable
    // source listing. Unchanged by this unit, asserted so the 404 path above
    // cannot be confused with a sanitization failure.
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(STORED_URL);
  });
});
