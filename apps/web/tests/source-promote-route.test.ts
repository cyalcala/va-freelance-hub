import { describe, expect, test } from "bun:test";
import {
  createSourcePromoteHandler,
  SOURCE_PROMOTE_ALLOWLIST,
} from "../src/pages/api/cron/source-promote";

const NOW = "2026-09-19T12:00:00.000Z";

function requestContext(
  body: unknown,
  options: {
    authorized?: boolean;
    hasDb?: boolean;
    sourceRow?: {
      source_id: string;
      compliance_state: "allowed" | "conditional";
      operational_state: string;
      canary_max_new_items_per_tick: number | null;
    } | null;
    method?: string;
  } = {}
) {
  const { authorized = true, hasDb = true, sourceRow = null, method = "POST" } = options;
  const isGet = method === "GET";
  const url = isGet && body && typeof body === "object" && "sourceId" in (body as any)
    ? `https://remotejobs-ph.pages.dev/api/cron/source-promote?sourceId=${encodeURIComponent((body as any).sourceId)}`
    : "https://remotejobs-ph.pages.dev/api/cron/source-promote";

  return {
    request: new Request(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authorized ? { Authorization: "Bearer test-secret" } : {}),
      },
      body: isGet ? undefined : JSON.stringify(body),
    }),
    locals: {
      runtime: {
        env: {
          CRON_SECRET: "test-secret",
          DB: hasDb
            ? {
                prepare: (query: string) => ({
                  bind: (...values: unknown[]) => ({
                    first: async <T>() => sourceRow as T | null,
                    run: async () => ({ success: true }),
                  }),
                }),
              }
            : undefined,
        },
      },
    },
  } as any;
}

describe("source-promote route", () => {
  test("allowlist includes the 5 Breezy Philippine VA agencies", () => {
    expect(SOURCE_PROMOTE_ALLOWLIST).toContain("breezy:20four7va");
    expect(SOURCE_PROMOTE_ALLOWLIST).toContain("breezy:sourcefit");
    expect(SOURCE_PROMOTE_ALLOWLIST).toContain("breezy:remote-craft");
    expect(SOURCE_PROMOTE_ALLOWLIST).toContain("breezy:value-virtual-assistants");
    expect(SOURCE_PROMOTE_ALLOWLIST).toContain("breezy:yokly");
  });

  test("unauthorized requests are rejected with 401", async () => {
    let called = false;
    const handler = createSourcePromoteHandler({
      applyTransition: async () => {
        called = true;
        throw new Error("must not call transition");
      },
    });
    const res = await handler(
      requestContext({ sourceId: "breezy:20four7va" }, { authorized: false })
    );
    expect(res.status).toBe(401);
    expect(called).toBe(false);
  });

  test("missing sourceId returns 400", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(requestContext({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("sourceId is required");
  });

  test("unrecognized sourceId outside allowlist returns 400", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(requestContext({ sourceId: "breezy:unknown-agency" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("not in the canary promotion allowlist");
  });

  test("missing D1 database binding returns 503", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(
      requestContext({ sourceId: "breezy:20four7va" }, { hasDb: false })
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain("DB is unavailable");
  });

  test("source not found in source_registry returns 404", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(
      requestContext({ sourceId: "breezy:20four7va" }, { sourceRow: null })
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found in source_registry");
  });

  test("source already in canary returns 200 with already_canary outcome", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "canary",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.outcome).toBe("already_canary");
    expect(json.sourceId).toBe("breezy:20four7va");
    expect(json.published).toBe(0);
    expect(json.canaryMaxNewItemsPerTick).toBe(2);
  });

  test("source not in shadow operational state returns 409", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "candidate",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.outcome).toBe("rejected");
    expect(json.reason).toContain("only shadow sources can promote to canary");
  });

  test("rejected transition returns 409 with rejection reason", async () => {
    const handler = createSourcePromoteHandler({
      now: () => NOW,
      applyTransition: async () => ({
        persisted: false,
        decision: {
          ok: false,
          reason: "insufficient distinct current shadow days, span, freshness, or plausible results",
          cause: "requested_promotion",
          from: { compliance: "conditional", operational: "shadow" },
          to: { compliance: "conditional", operational: "canary" },
        },
      }),
      wrapDb: () => ({} as any),
    });

    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "shadow",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.outcome).toBe("rejected");
    expect(json.reason).toContain("insufficient distinct current shadow days");
  });

  test("successful transition returns 200 with canary outcome and published: 0", async () => {
    let capturedRequest: any = null;
    const handler = createSourcePromoteHandler({
      now: () => NOW,
      applyTransition: async (_db, request) => {
        capturedRequest = request;
        return {
          persisted: true,
          decision: {
            ok: true,
            reason: "transition allowed",
            cause: "requested_promotion",
            from: { compliance: "conditional", operational: "shadow" },
            to: { compliance: "conditional", operational: "canary" },
            event: {} as any,
          },
        };
      },
      wrapDb: () => ({} as any),
    });

    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "shadow",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.outcome).toBe("canary");
    expect(json.sourceId).toBe("breezy:20four7va");
    expect(json.published).toBe(0);
    expect(capturedRequest).toEqual({
      sourceId: "breezy:20four7va",
      to: { compliance: "conditional", operational: "canary" },
      cause: "requested_promotion",
      now: NOW,
    });
  });

  test("supports GET with query parameter ?sourceId=...", async () => {
    const handler = createSourcePromoteHandler({
      now: () => NOW,
      applyTransition: async () => ({
        persisted: true,
        decision: {
          ok: true,
          reason: "transition allowed",
          cause: "requested_promotion",
          from: { compliance: "conditional", operational: "shadow" },
          to: { compliance: "conditional", operational: "canary" },
          event: {} as any,
        },
      }),
      wrapDb: () => ({} as any),
    });

    const res = await handler(
      requestContext(
        { sourceId: "breezy:sourcefit" },
        {
          method: "GET",
          sourceRow: {
            source_id: "breezy:sourcefit",
            compliance_state: "conditional",
            operational_state: "shadow",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.outcome).toBe("canary");
    expect(json.sourceId).toBe("breezy:sourcefit");
    expect(json.published).toBe(0);
  });

  test("source already in active returns 200 with already_active outcome", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "active",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.outcome).toBe("already_active");
    expect(json.sourceId).toBe("breezy:20four7va");
  });

  test("successfully graduates canary to active when to=active is requested", async () => {
    let capturedRequest: any = null;
    const handler = createSourcePromoteHandler({
      now: () => NOW,
      applyTransition: async (_db, request) => {
        capturedRequest = request;
        return {
          persisted: true,
          decision: {
            ok: true,
            reason: "transition allowed",
            cause: "requested_promotion",
            from: { compliance: "conditional", operational: "canary" },
            to: { compliance: "conditional", operational: "active" },
            event: {} as any,
          },
        };
      },
      wrapDb: () => ({} as any),
    });

    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va", to: "active" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "canary",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.outcome).toBe("active");
    expect(json.sourceId).toBe("breezy:20four7va");
    expect(capturedRequest).toEqual({
      sourceId: "breezy:20four7va",
      to: { compliance: "conditional", operational: "active" },
      cause: "requested_promotion",
      now: NOW,
    });
  });

  test("rejects active graduation when source is in shadow", async () => {
    const handler = createSourcePromoteHandler();
    const res = await handler(
      requestContext(
        { sourceId: "breezy:20four7va", to: "active" },
        {
          sourceRow: {
            source_id: "breezy:20four7va",
            compliance_state: "conditional",
            operational_state: "shadow",
            canary_max_new_items_per_tick: 2,
          },
        }
      )
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.outcome).toBe("rejected");
    expect(json.reason).toContain("only canary sources can graduate to active");
  });
});
