import { describe, expect, test } from "bun:test";
import {
  AI_SUBREQUEST_BUDGET_PER_RUN,
  AiBudgetExceededError,
  withAiSubrequestBudget,
} from "../src/pages/api/cron/scrape";

// Regression guard for the 2026-08-08 ingestion freeze.
//
// The scrape route runs the whole pipeline in one Cloudflare Pages Function
// invocation, and Workers Free caps subrequests at 50 per invocation. Every
// env.AI.run() is a subrequest; with ~41 sources fetching + up to 50 items each
// triaged across a 4-model ladder + a skeptic, a single invocation made
// hundreds of AI subrequests, hit the 50 cap, and every remaining AI call
// failed closed ("Too many subrequests"). Inserts collapsed from ~51/day to ~0
// on 2026-08-08 and the board froze at jobs posted 2026-08-07 — with a green
// heartbeat the whole time.
//
// withAiSubrequestBudget caps AI calls per invocation so this cannot recur:
// overflow is deferred to the next 15-minute tick instead.

function fakeEnv(handler: (model: unknown, request: unknown) => unknown) {
  return { AI: { run: handler } };
}

describe("withAiSubrequestBudget", () => {
  test("counts every AI.run call and caps at the budget", async () => {
    let underlying = 0;
    const { env, calls } = withAiSubrequestBudget(
      fakeEnv(() => Promise.resolve({})),
      3
    );

    await env.AI.run("model-a", {});
    await env.AI.run("model-b", {});
    await env.AI.run("model-c", {});
    underlying = 3;

    expect(calls()).toBe(3);
    // The 4th call must throw rather than reach the underlying binding.
    await expect(env.AI.run("model-d", {})).rejects.toBeInstanceOf(AiBudgetExceededError);
    expect(underlying).toBe(3);
  });

  test("exhausted() reflects the cap", async () => {
    const { env, exhausted } = withAiSubrequestBudget(fakeEnv(() => Promise.resolve({})), 2);
    expect(exhausted()).toBe(false);
    await env.AI.run("a", {});
    expect(exhausted()).toBe(false);
    await env.AI.run("b", {});
    expect(exhausted()).toBe(true);
  });

  test("passes the exact request through to the underlying binding", async () => {
    const seen: unknown[] = [];
    const { env } = withAiSubrequestBudget(
      fakeEnv((model, request) => {
        seen.push(request);
        return Promise.resolve({ ok: true });
      }),
      1
    );
    const req = { messages: [] };
    await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", req);
    expect(seen).toEqual([req]);
  });

  test("returns a workable env even without an AI binding (local/dev)", () => {
    const { env, calls, exhausted } = withAiSubrequestBudget({}, 10);
    expect(env.AI).toBeUndefined();
    expect(calls()).toBe(0);
    expect(exhausted()).toBe(false);
  });

  test("default production budget is set", () => {
    expect(AI_SUBREQUEST_BUDGET_PER_RUN).toBeGreaterThan(0);
    expect(AI_SUBREQUEST_BUDGET_PER_RUN).toBeLessThan(50);
  });
});