import { describe, expect, test } from "bun:test";
import {
  publishPublicExposure,
  publicationTickKey,
  type PublicationDatabase,
  type PublicationStatement,
} from "./publication-gateway";

const NOW = "2026-09-06T12:00:00.000Z";
const TICK = publicationTickKey("scrape", NOW);

class FakeStatement implements PublicationStatement {
  constructor(
    private readonly query: string,
    private readonly response: unknown,
    private readonly runs: Array<{ query: string; values: unknown[] }>,
    private values: unknown[] = [],
  ) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return (this.response ?? null) as T | null; }
  async run() {
    this.runs.push({ query: this.query, values: this.values });
    return { success: true };
  }
}

class FakeDatabase implements PublicationDatabase {
  readonly runs: Array<{ query: string; values: unknown[] }> = [];
  constructor(private readonly responses: Record<string, unknown[]>) {}
  prepare(query: string): PublicationStatement {
    const key = query.includes("FROM source_opt_outs") ? "optOut"
      : query.includes("FROM source_publication_ledger WHERE retry_key") ? "retry"
      : query.includes("SUM(published_count)") ? "tickSum"
      : query.includes("FROM source_registry") ? "registry"
      : query.includes("INSERT INTO source_publication_ledger") ? "insert"
      : query.includes("INSERT INTO source_transition_events") ? "transition"
      : "other";
    const response = this.responses[key]?.shift() ?? (key === "tickSum" ? { published: 0 } : null);
    return new FakeStatement(query, response, this.runs);
  }
}

describe("SP-23C publication gateway", () => {
  test("keeps an unregistered exact-six source unlimited", async () => {
    const db = new FakeDatabase({ registry: [null], retry: [null] });
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "r1", proposedCount: 4,
      persist: async (allowed) => ({ publishedCount: allowed, ids: [1, 2, 3, 4] }),
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 4, replayed: false });
    expect(db.runs.some((run) => run.query.includes("INSERT INTO source_publication_ledger") && run.values.includes("unlimited"))).toBe(true);
  });

  test("records an empty tick without calling persist", async () => {
    const db = new FakeDatabase({ registry: [null], retry: [null] });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "empty", proposedCount: 0,
      persist: async () => { persisted += 1; return { publishedCount: 0, ids: [] }; },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 0 });
    expect(persisted).toBe(0);
  });

  test("replays a retry key instead of publishing twice", async () => {
    const db = new FakeDatabase({
      retry: [{ mode: "unlimited", publishedCount: 2, publishedIdsJson: "[10,11]" }],
    });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "r1", proposedCount: 2,
      persist: async () => { persisted += 1; return { publishedCount: 2, ids: [99] }; },
    });
    expect(result).toMatchObject({ ok: true, publishedCount: 2, ids: [10, 11], replayed: true });
    expect(persisted).toBe(0);
  });

  test("blocks a later canary batch in the same tick without publishing a partial subset", async () => {
    const db = new FakeDatabase({
      retry: [null],
      registry: [{ sourceId: "greenhouse:test", compliance: "allowed", operational: "canary", optOut: 0, policyExpiry: "2026-10-01T00:00:00.000Z", canaryMaxNewItemsPerTick: 3 }],
      optOut: [null],
      tickSum: [{ published: 2 }],
    });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "r2", proposedCount: 2,
      persist: async () => { persisted += 1; return { publishedCount: 2, ids: [1, 2] }; },
    });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0 });
    expect(persisted).toBe(0);
  });

  test("rolls a single over-cap canary batch back to shadow and publishes nothing", async () => {
    const db = new FakeDatabase({
      retry: [null],
      registry: [
        { sourceId: "greenhouse:test", compliance: "allowed", operational: "canary", optOut: 0, policyExpiry: "2026-10-01T00:00:00.000Z", canaryMaxNewItemsPerTick: 3 },
        { source_id: "greenhouse:test", compliance_state: "allowed", operational_state: "canary", opt_out: 0, policy_expiry: "2026-10-01T00:00:00.000Z", canary_max_new_items_per_tick: 3 },
      ],
      optOut: [null, null],
      tickSum: [{ published: 0 }],
    });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "r3", proposedCount: 4,
      persist: async () => { persisted += 1; return { publishedCount: 4, ids: [1, 2, 3, 4] }; },
    });
    expect(result).toMatchObject({ ok: true, mode: "rolled_back", publishedCount: 0 });
    expect(persisted).toBe(0);
  });
});
