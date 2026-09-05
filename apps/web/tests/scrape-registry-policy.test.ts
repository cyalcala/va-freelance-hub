import { describe, expect, mock, test } from "bun:test";
import { sourceOptOuts, sourceRegistry } from "@va-hub/db";
import { createScrapeHandler } from "../src/pages/api/cron/scrape";

function requestContext(authorized = true) {
  return {
    request: new Request("https://remotejobs.ph/api/cron/scrape", {
      method: "POST",
      headers: authorized ? { Authorization: "Bearer test-cron-secret" } : {},
    }),
    locals: { runtime: { env: { CRON_SECRET: "test-cron-secret" } } },
  } as any;
}

function policyDb(failOn?: "registry" | "opt-outs") {
  const reads: string[] = [];
  const writes: string[] = [];
  const db = {
    select() {
      return {
        async from(table: unknown) {
          const name = table === sourceRegistry ? "registry"
            : table === sourceOptOuts ? "opt-outs" : "unexpected";
          reads.push(name);
          if (name === failOn) throw new Error(`${name} unavailable`);
          if (name === "unexpected") throw new Error("ingestion must not start");
          return [];
        },
      };
    },
    insert() {
      writes.push("lock-seed");
      return { values: () => ({ onConflictDoNothing: async () => {} }) };
    },
    update() {
      writes.push("lock-claim");
      // A held lock is a safe observation point after successful policy loading.
      return { set: () => ({ where: async () => ({ meta: { changes: 0 } }) }) };
    },
  };
  return { db, reads, writes };
}

describe("scrape route governance snapshot boundary", () => {
  for (const unavailable of ["registry", "opt-outs"] as const) {
    test(`${unavailable} failure stops the tick before acquiring a lock or ingesting`, async () => {
      const { db, reads, writes } = policyDb(unavailable);
      const handler = createScrapeHandler({ getDb: () => db as any });

      // Bun's spyOn reuses existing mock history; another suite may leave a
      // mocked global fetch installed. A fresh replacement counts this request
      // alone and still blocks every unexpected outbound call.
      const previousFetch = globalThis.fetch;
      const outbound = mock(async () => {
        throw new Error("outbound requests are forbidden in this test");
      });
      globalThis.fetch = outbound as unknown as typeof fetch;
      try {
        const response = await handler(requestContext());

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toMatchObject({ reason: "registry-policy-unavailable" });
        expect(reads).toEqual(unavailable === "registry" ? ["registry"] : ["registry", "opt-outs"]);
        expect(writes).toEqual([]);
        expect(outbound).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = previousFetch;
      }
    });
  }

  test("verified empty governance tables preserve the fallback path and existing held-lock response", async () => {
    const { db, reads, writes } = policyDb();
    const response = await createScrapeHandler({ getDb: () => db as any })(requestContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ skipped: true, reason: "run-lock-held" });
    expect(reads).toEqual(["registry", "opt-outs"]);
    expect(writes).toEqual(["lock-seed", "lock-claim"]);
  });

  test("unauthorized requests do not read governance state", async () => {
    const { db, reads, writes } = policyDb("registry");
    const response = await createScrapeHandler({ getDb: () => db as any })(requestContext(false));

    expect(response.status).toBe(401);
    expect(reads).toEqual([]);
    expect(writes).toEqual([]);
  });
});
