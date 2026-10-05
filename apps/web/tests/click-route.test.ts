import { describe, expect, test } from "bun:test";
import { createClickHandler } from "../src/pages/api/click/[id]";

const STORED_URL = "https://example.com/jobs/123";

function makeDb(options: { updateError?: Error } = {}) {
  let updates = 0;
  let reads = 0;
  const db = {
    select: () => {
      reads += 1;
      return {
        from: () => ({
          where: () => ({
            limit: async () => [{ sourceUrl: STORED_URL, applicationUrl: null }],
          }),
        }),
      };
    },
    update: () => ({
      set: () => ({
        where: async () => {
          updates += 1;
          if (options.updateError) throw options.updateError;
        },
      }),
    }),
  };
  return { db, updateCount: () => updates, readCount: () => reads };
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
