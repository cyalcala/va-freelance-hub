import { describe, expect, test } from "bun:test";
import { createClickHandler } from "../src/pages/api/click/[id]";

const STORED_URL = "https://example.com/jobs/123";

function makeDb(options: { updateError?: Error } = {}) {
  let updates = 0;
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ sourceUrl: STORED_URL, applicationUrl: null }],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          updates += 1;
          if (options.updateError) throw options.updateError;
        },
      }),
    }),
  };
  return { db, updateCount: () => updates };
}

function requestContext(env: Record<string, unknown>, target = STORED_URL) {
  return {
    params: { id: "123" },
    request: new Request(`https://remotejobs.ph/api/click/123?url=${encodeURIComponent(target)}`, {
      headers: { "cf-connecting-ip": "203.0.113.9" },
    }),
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
