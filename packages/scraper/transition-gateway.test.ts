import { describe, expect, test } from "bun:test";
import {
  applyTypedTransition,
  qualifyAdmissionObservations,
  type TransitionGatewayDatabase,
  type TransitionGatewayRunResult,
  type TransitionGatewayStatement,
} from "./transition-gateway";
import { ADMISSION_TEST_NOW, admissionFixture, observationFixture } from "./test-fixtures/admission";

const NOW = "2026-09-05T00:00:00.000Z";
const FUTURE_LEASE = "2026-10-05T00:00:00.000Z";

class FakeStatement implements TransitionGatewayStatement {
  values: unknown[] = [];

  constructor(
    private readonly query: string,
    private readonly response: unknown,
    private readonly runs: Array<{ query: string; values: unknown[] }>,
    private readonly runError?: Error,
    private readonly runResult: TransitionGatewayRunResult = { success: true },
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
    return this.runResult;
  }
}

class FakeDatabase implements TransitionGatewayDatabase {
  readonly runs: Array<{ query: string; values: unknown[] }> = [];
  private readonly responseQueues: Record<string, unknown[]>;

  constructor(
    responses: Record<string, unknown[]>,
    private readonly insertOptions: {
      error?: Error;
      result?: TransitionGatewayRunResult;
    } = {},
  ) {
    this.responseQueues = Object.fromEntries(
      Object.entries(responses).map(([key, value]) => [key, [...value]]),
    );
  }

  prepare(query: string): TransitionGatewayStatement {
    if (query.includes("AS sourceJson")) {
      return new FakeStatement(query, {
        sourceJson: JSON.stringify(this.responseQueues.registry?.shift() ?? null),
        providerJson: JSON.stringify(this.responseQueues.provider?.shift() ?? null),
        evidenceJson: JSON.stringify(this.responseQueues.evidence?.shift() ?? null),
        durableOptOut: this.responseQueues.optOut?.shift() ? 1 : 0,
      }, this.runs);
    }
    const key = query.includes("FROM source_admission_evidence")
      ? "evidence"
      : query.includes("FROM provider_profiles")
        ? "provider"
        : query.includes("FROM source_shadow_observations")
          ? "observations"
          : query.includes("FROM source_opt_outs")
            ? "optOut"
            : query.includes("FROM source_registry")
              ? "registry"
              : "insert";
    const response = this.responseQueues[key]?.shift() ?? null;
    return new FakeStatement(
      query,
      response,
      this.runs,
      key === "insert" ? this.insertOptions.error : undefined,
      key === "insert" ? this.insertOptions.result : undefined,
    );
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

async function canaryAdmissionDb(
  insertOptions: ConstructorParameters<typeof FakeDatabase>[1] = {},
  extraObservations: Awaited<ReturnType<typeof observationFixture>> = [],
) {
  const fixture = await admissionFixture();
  const observations = [...await observationFixture(fixture), ...extraObservations];
  const db = new FakeDatabase({
    registry: [
      shadowSnapshot({
        source_id: fixture.source.sourceId,
        compliance_state: fixture.source.complianceState,
        policy_expiry: fixture.source.policyExpiry,
        canary_max_new_items_per_tick: fixture.source.canaryMaxNewItemsPerTick,
      }),
      fixture.source,
    ],
    optOut: [null, null],
    provider: [fixture.provider],
    evidence: [fixture.evidence],
    observations: [{ observations_json: JSON.stringify(observations) }],
    insert: [null],
  }, insertOptions);
  return { db, fixture, observations };
}

describe("SP-23 transition gateway", () => {
  test("loads current evidence and ignores a caller-selected observation threshold", async () => {
    const { db, fixture } = await canaryAdmissionDb();

    const result = await applyTypedTransition(db, {
      sourceId: fixture.source.sourceId,
      to: { compliance: fixture.source.complianceState, operational: "canary" },
      cause: "requested_promotion",
      now: ADMISSION_TEST_NOW,
      evidenceHash: "caller-forged-token",
      requiredShadowCount: 1,
    });

    expect(result.persisted).toBe(true);
    expect(result.decision).toMatchObject({
      ok: true,
      from: { compliance: "conditional", operational: "shadow" },
      to: { compliance: "conditional", operational: "canary" },
    });
    expect(db.runs).toHaveLength(1);
    expect(db.runs[0]?.values).toContain("sp23-v2");
    expect(db.runs[0]?.values).toContain(fixture.evidence.packetSha256);
    const packet = JSON.parse(String(db.runs[0]?.values[9]));
    expect(packet.requiredShadowCount).toBe(8);
    expect(packet.observedShadowCount).toBe(8);
    expect(packet.admission.observationPolicyVersion).toBe("sp23-shadow-7d-v1");
    expect(packet.admission.qualifyingObservationIds).toHaveLength(8);
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
    const { db, fixture } = await canaryAdmissionDb({
      error: new Error("transition event does not match current source registry state"),
    });

    const result = await applyTypedTransition(db, {
      sourceId: fixture.source.sourceId,
      to: { compliance: fixture.source.complianceState, operational: "canary" },
      cause: "requested_promotion",
      now: ADMISSION_TEST_NOW,
    });

    expect(result).toMatchObject({ persisted: false, decision: { ok: false } });
    expect(db.runs).toHaveLength(1);
  });

  test("fails closed when D1 resolves an unsuccessful event write", async () => {
    const { db, fixture } = await canaryAdmissionDb({ result: { success: false } });

    const result = await applyTypedTransition(db, {
      sourceId: fixture.source.sourceId,
      to: { compliance: fixture.source.complianceState, operational: "canary" },
      cause: "requested_promotion",
      now: ADMISSION_TEST_NOW,
    });

    expect(result).toMatchObject({ persisted: false, decision: { ok: false } });
    expect(db.runs).toHaveLength(1);
  });

  test("persists a zero-publication canary rollback even when durable opt-out arrived after entry", async () => {
    const db = new FakeDatabase({
      registry: [shadowSnapshot({ operational_state: "canary" })],
      optOut: [{ source_id: "greenhouse:grafanalabs" }],
      insert: [null],
    });

    const result = await applyTypedTransition(db, {
      sourceId: "greenhouse:grafanalabs",
      to: { compliance: "allowed", operational: "shadow" },
      cause: "canary_cap_breach",
      now: NOW,
      evidenceHash: "cap-breach-evidence",
      proposedNewItems: 4,
    });

    expect(result).toMatchObject({
      persisted: true,
      decision: { ok: true, cause: "canary_cap_breach", to: { operational: "shadow" } },
    });
    expect(db.runs).toHaveLength(1);
  });

  test("rejects a later failed observation in the current evidence window", async () => {
    const fixture = await admissionFixture();
    const healthy = await observationFixture(fixture);
    const failedAt = new Date(Date.parse(healthy[healthy.length - 1]!.observedAt) + 60_000).toISOString();
    const failed = { ...healthy[0]!, id: 99, observedAt: failedAt, outcome: "SCHEMA_BROKEN", dispatchKey: "later-failure" };
    failed.resultJson = JSON.stringify({ ...JSON.parse(failed.resultJson), timestamp: failedAt, diagnostic: { ...JSON.parse(failed.resultJson).diagnostic, outcome: "SCHEMA_BROKEN" } });
    const { db } = await canaryAdmissionDb({}, [failed]);
    const result = await applyTypedTransition(db, {
      sourceId: fixture.source.sourceId,
      to: { compliance: fixture.source.complianceState, operational: "canary" },
      cause: "requested_promotion",
      now: ADMISSION_TEST_NOW,
    });
    expect(result).toMatchObject({ persisted: false, decision: { ok: false } });
    expect(db.runs).toHaveLength(0);
  });
});

describe("SP-23B qualifying observation window", () => {
  test("requires eight distinct current days, span, freshness, and a plausible result", async () => {
    const fixture = await admissionFixture();
    const rows = await observationFixture(fixture);
    expect(await qualifyAdmissionObservations(fixture, rows, ADMISSION_TEST_NOW)).toMatchObject({ ok: true, ids: [1, 2, 3, 4, 5, 6, 7, 8] });
    expect((await qualifyAdmissionObservations(fixture, rows.slice(1), ADMISSION_TEST_NOW)).ok).toBe(false);
    expect((await qualifyAdmissionObservations(fixture, rows, "2026-09-18T00:00:00.000Z")).ok).toBe(false);
    const empty = rows.map((row, index) => ({ ...row, plausibleItems: 0, outcome: "HEALTHY_EMPTY" as const }));
    expect((await qualifyAdmissionObservations(fixture, empty, ADMISSION_TEST_NOW)).ok).toBe(false);
    const rebound = { ...rows[0]!, shadowEntryHash: "OLD-EPOCH" };
    expect((await qualifyAdmissionObservations(fixture, [rebound, ...rows.slice(1)], ADMISSION_TEST_NOW)).ok).toBe(false);
  });
});
