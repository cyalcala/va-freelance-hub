import { describe, expect, test } from "bun:test";
import {
  applyTypedTransition,
  type TransitionGatewayDatabase,
  type TransitionGatewayStatement,
} from "./transition-gateway";

const NOW = "2026-09-05T00:00:00.000Z";
const FUTURE_LEASE = "2026-10-05T00:00:00.000Z";

class FakeStatement implements TransitionGatewayStatement {
  values: unknown[] = [];

  constructor(
    private readonly query: string,
    private readonly response: unknown,
    private readonly runs: Array<{ query: string; values: unknown[] }>,
    private readonly runError?: Error,
  ) {}

  bind(...values: unknown[]): TransitionGatewayStatement {
    this.values = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    return (this.response ?? null) as T | null;
  }

  async run(): Promise<unknown> {
    this.runs.push({ query: this.query, values: this.values });
    if (this.runError) throw this.runError;
    return { success: true };
  }
}

class FakeDatabase implements TransitionGatewayDatabase {
  readonly runs: Array<{ query: string; values: unknown[] }> = [];
  private readonly responseQueues: Record<string, unknown[]>;

  constructor(
    responses: Record<string, unknown[]>,
    private readonly insertError?: Error,
  ) {
    this.responseQueues = Object.fromEntries(
      Object.entries(responses).map(([key, value]) => [key, [...value]]),
    );
  }

  prepare(query: string): TransitionGatewayStatement {
    const key = query.includes("FROM source_registry")
      ? "registry"
      : query.includes("FROM source_opt_outs")
        ? "optOut"
        : query.includes("FROM source_shadow_observations")
          ? "observations"
          : "insert";
    const response = this.responseQueues[key]?.shift() ?? null;
    return new FakeStatement(query, response, this.runs, key === "insert" ? this.insertError : undefined);
  }
}

function shadowSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    source_id: "greenhouse:grafanalabs",
    compliance_state: "allowed",
    operational_state: "shadow",
    opt_out: 0,
    policy_expiry: FUTURE_LEASE,
    canary_max_new_items_per_tick: 3,
    ...overrides,
  };
}

describe("SP-23 transition gateway", () => {
  test("re-reads the registry and durable opt-out state before atomically persisting a typed promotion event", async () => {
    const db = new FakeDatabase({
      registry: [shadowSnapshot()],
      optOut: [null],
      observations: [{ qualifying_count: 3 }],
      insert: [null],
    });

    const result = await applyTypedTransition(db, {
      sourceId: "greenhouse:grafanalabs",
      to: { compliance: "allowed", operational: "canary" },
      cause: "requested_promotion",
      now: NOW,
      evidenceHash: "shadow-evidence-sha",
      requiredShadowCount: 3,
    });

    expect(result.persisted).toBe(true);
    expect(result.decision).toMatchObject({
      ok: true,
      from: { compliance: "allowed", operational: "shadow" },
      to: { compliance: "allowed", operational: "canary" },
    });
    expect(db.runs).toHaveLength(1);
    expect(db.runs[0]?.query).toContain("INSERT INTO source_transition_events");
    expect(db.runs[0]?.values).toContain("greenhouse:grafanalabs");
    expect(db.runs[0]?.values).toContain("requested_promotion");
  });

  test("does not permit a caller to forge a missing current row or an opt-out", async () => {
    const missing = new FakeDatabase({ registry: [null] });
    const missingResult = await applyTypedTransition(missing, {
      sourceId: "greenhouse:grafanalabs",
      to: { compliance: "allowed", operational: "canary" },
      cause: "requested_promotion",
      now: NOW,
      evidenceHash: "shadow-evidence-sha",
      requiredShadowCount: 3,
    });
    expect(missingResult.persisted).toBe(false);
    expect(missingResult.decision).toMatchObject({ ok: false });
    expect(missing.runs).toHaveLength(0);

    const optedOut = new FakeDatabase({
      registry: [shadowSnapshot()],
      optOut: [{ source_id: "greenhouse:grafanalabs" }],
      observations: [{ qualifying_count: 3 }],
    });
    const optedOutResult = await applyTypedTransition(optedOut, {
      sourceId: "greenhouse:grafanalabs",
      to: { compliance: "allowed", operational: "canary" },
      cause: "requested_promotion",
      now: NOW,
      evidenceHash: "shadow-evidence-sha",
      requiredShadowCount: 3,
    });
    expect(optedOutResult.persisted).toBe(false);
    expect(optedOutResult.decision).toMatchObject({ ok: false });
    expect(optedOut.runs).toHaveLength(0);
  });

  test("turns an insert-time stale transition rejection into a controlled non-persisted result", async () => {
    const db = new FakeDatabase({
      registry: [shadowSnapshot()],
      optOut: [null],
      observations: [{ qualifying_count: 3 }],
    }, new Error("transition event does not match current source registry state"));

    const result = await applyTypedTransition(db, {
      sourceId: "greenhouse:grafanalabs",
      to: { compliance: "allowed", operational: "canary" },
      cause: "requested_promotion",
      now: NOW,
      evidenceHash: "shadow-evidence-sha",
      requiredShadowCount: 3,
    });

    expect(result).toMatchObject({ persisted: false, decision: { ok: false } });
    expect(db.runs).toHaveLength(1);
  });
});
