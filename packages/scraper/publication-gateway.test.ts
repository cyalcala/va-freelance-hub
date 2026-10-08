import { describe, expect, test } from "bun:test";
import {
  publishPublicExposure,
  publicationTickKey,
  clampLedgerPublishedCount,
  LEGACY_EXACT_SIX_SOURCE_IDS,
  loadPublicationPolicy,
  type PublicationDatabase,
  type PublicationStatement,
} from "./publication-gateway";

const NOW = "2026-09-06T12:00:00.000Z";
const TICK = publicationTickKey("scrape", NOW);
const REAL_LEGACY_SOURCES = ["we-work-remotely", "remotive", "real-work-from-anywhere", "remote-ok", "jobicy-admin-support-apac", "jobicy-supporting-apac"];
const activePolicy = (sourceId: string, policyExpiry: unknown) => ({
  sourceId, compliance: "allowed", operational: "active", optOut: 0, policyExpiry, canaryMaxNewItemsPerTick: null,
});

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
  test("unattributed has no unregistered legacy publication exemption", async () => {
    const db = new FakeDatabase({ registry: [null], retry: [null], optOut: [null] });
    let persisted = 0;
    const result = await publishPublicExposure(db, { sourceId: "unattributed", now: NOW, tickKey: TICK,
      retryKey: "unattributed-held", proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, ids: [] });
    expect(persisted).toBe(0);
    expect(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values.slice(3, 7))
      .toEqual(["blocked", 1, 0, "[]"]);
    expect(LEGACY_EXACT_SIX_SOURCE_IDS.has("unattributed")).toBe(false);
  });

  test("all six real unregistered legacy sources retain their accepted null-lease exemption", async () => {
    expect([...LEGACY_EXACT_SIX_SOURCE_IDS].sort()).toEqual([...REAL_LEGACY_SOURCES].sort());
    for (const sourceId of REAL_LEGACY_SOURCES) {
      const db = new FakeDatabase({ registry: [null], retry: [null], optOut: [null] });
      let persisted = 0;
      const result = await publishPublicExposure(db, { sourceId, now: NOW, tickKey: TICK,
        retryKey: `legacy:${sourceId}`, proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
      expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1 });
      expect(persisted).toBe(1);
    }
  });

  test("registry active sources require a valid exact canonical future policy lease", async () => {
    for (const policyExpiry of [null, undefined, "", "invalid", "2026-10-01", "2026-10-01T00:00:00Z",
      "2026-10-01T00:00:00.000+00:00", "2027-02-30T00:00:00.000Z", "2026-10-01T00:00:00.000Z\0hidden", 123]) {
      const db = new FakeDatabase({ registry: [activePolicy("greenhouse:tenant", policyExpiry)], retry: [null], optOut: [null] });
      let persisted = 0;
      const result = await publishPublicExposure(db, { sourceId: "greenhouse:tenant", now: NOW, tickKey: TICK,
        retryKey: "invalid-active-lease", proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
      expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, ids: [] });
      expect(persisted).toBe(0);
      expect(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values.slice(3, 7))
        .toEqual(["blocked", 1, 0, "[]"]);
    }
  });

  test("an active lease expires at equality rather than one instant afterward", async () => {
    const db = new FakeDatabase({ registry: [activePolicy("greenhouse:tenant", NOW)], retry: [null], optOut: [null] });
    let persisted = 0;
    const result = await publishPublicExposure(db, { sourceId: "greenhouse:tenant", now: NOW, tickKey: TICK,
      retryKey: "equal-active-lease", proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, reason: "source policy has expired" });
    expect(persisted).toBe(0);
  });

  test("registered real legacy sources obey registry restrictions instead of a null-lease fallback", async () => {
    for (const sourceId of REAL_LEGACY_SOURCES) {
      const db = new FakeDatabase({ registry: [{ ...activePolicy(sourceId, null), authorityOrigin: "legacy-fallback" }], retry: [null], optOut: [null] });
      let persisted = 0;
      const result = await publishPublicExposure(db, { sourceId, now: NOW, tickKey: TICK,
        retryKey: `registered:${sourceId}`, proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
      expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0 });
      expect(persisted).toBe(0);
    }
  });

  test("durable opt-outs block both legacy fallback and current leased registry sources", async () => {
    for (const sourceId of REAL_LEGACY_SOURCES.concat("greenhouse:tenant")) {
      for (const registry of [null, activePolicy(sourceId, "2026-10-01T00:00:00.000Z")]) {
        const db = new FakeDatabase({ registry: [registry], retry: [null], optOut: [{ source_id: sourceId }] });
        let persisted = 0;
        const result = await publishPublicExposure(db, { sourceId, now: NOW, tickKey: TICK,
          retryKey: `opt-out:${sourceId}`, proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
        expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0 });
        expect(persisted).toBe(0);
      }
    }
  });

  test("policy provenance is server-derived and registry opt-outs remain effective", async () => {
    for (const [sourceId, registry, authorityOrigin] of [
      ["remotive", null, "legacy-fallback"], ["unattributed", null, "unregistered"],
      ["remotive", { ...activePolicy("remotive", null), authorityOrigin: "legacy-fallback" }, "registry"],
    ] as const) {
      const db = new FakeDatabase({ registry: [registry], optOut: [null] });
      expect(await loadPublicationPolicy(db, sourceId)).toMatchObject({ authorityOrigin });
    }
    const db = new FakeDatabase({ registry: [{ ...activePolicy("remotive", "2026-10-01T00:00:00.000Z"), optOut: 1 }], retry: [null], optOut: [null] });
    let persisted = 0;
    const result = await publishPublicExposure(db, { sourceId: "remotive", now: NOW, tickKey: TICK,
      retryKey: "registry-opt-out", proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [1] }; } });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0 });
    expect(persisted).toBe(0);
  });

  test("a canonical registry lease strictly after now permits allowed and conditional active sources", async () => {
    for (const compliance of ["allowed", "conditional"]) {
      const db = new FakeDatabase({ registry: [{ ...activePolicy("greenhouse:tenant", "2026-09-06T12:00:00.001Z"), compliance }], retry: [null], optOut: [null] });
      let persisted = 0;
      const result = await publishPublicExposure(db, { sourceId: "greenhouse:tenant", now: NOW, tickKey: TICK,
        retryKey: `valid-active:${compliance}`, proposedCount: 1, persist: async () => { persisted++; return { publishedCount: 1, ids: [7] }; } });
      expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, ids: [7] });
      expect(persisted).toBe(1);
    }
  });

  test("keeps an unregistered exact-six source unlimited", async () => {
    const db = new FakeDatabase({ registry: [null], retry: [null] });
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "r1", proposedCount: 4,
      persist: async (allowed) => ({ publishedCount: allowed, ids: [1, 2, 3, 4] }),
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 4, replayed: false });
    expect(db.runs.some((run) => run.query.includes("INSERT INTO source_publication_ledger") && run.values.includes("unlimited"))).toBe(true);
  });

  test("blocks an unregistered non-exact-six source from publishing (F4 repair)", async () => {
    const db = new FakeDatabase({ registry: [null], retry: [null], optOut: [null] });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "unknown:rogue-feed", now: NOW, tickKey: TICK, retryKey: "rogue1", proposedCount: 5,
      persist: async () => { persisted += 1; return { publishedCount: 5, ids: [1] }; },
    });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, reason: "source is not publication-eligible" });
    expect(persisted).toBe(0);
    expect(db.runs.some((run) => run.query.includes("INSERT INTO source_publication_ledger") && run.values.includes("blocked"))).toBe(true);
  });

  test("blocks an opted-out source even if in exact-six (F4 repair)", async () => {
    const db = new FakeDatabase({
      registry: [null],
      optOut: [{ source_id: "we-work-remotely" }],
      retry: [null],
    });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "optout1", proposedCount: 4,
      persist: async () => { persisted += 1; return { publishedCount: 4, ids: [1] }; },
    });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, reason: "source is not publication-eligible" });
    expect(persisted).toBe(0);
  });

  test("blocks an active source whose policy has expired (F4 repair)", async () => {
    const db = new FakeDatabase({
      registry: [{
        sourceId: "breezy:expired-agency",
        compliance: "conditional",
        operational: "active",
        optOut: 0,
        policyExpiry: "2026-09-01T00:00:00.000Z", // Expired relative to NOW (2026-09-06)
        canaryMaxNewItemsPerTick: null,
      }],
      optOut: [null],
      retry: [null],
    });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "breezy:expired-agency", now: NOW, tickKey: TICK, retryKey: "exp1", proposedCount: 3,
      persist: async () => { persisted += 1; return { publishedCount: 3, ids: [1] }; },
    });
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, reason: "source policy has expired" });
    expect(persisted).toBe(0);
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
      retry: [{ sourceId: "we-work-remotely", tickKey: TICK, proposedCount: 2,
        mode: "unlimited", publishedCount: 2, publishedIdsJson: "[10,11]" }],
    });
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "r1", proposedCount: 2,
      persist: async () => { persisted += 1; return { publishedCount: 2, ids: [99] }; },
    });
    expect(result).toMatchObject({ ok: true, publishedCount: 2, ids: [10, 11], replayed: true });
    expect(persisted).toBe(0);
  });

  test("partial replay projections fail closed without persistence, ledger writes or transitions", async () => {
    const complete = { sourceId: "we-work-remotely", tickKey: TICK, proposedCount: 2,
      mode: "unlimited", publishedCount: 2, publishedIdsJson: "[10,11]" };
    for (const key of Object.keys(complete)) {
      const partial: Record<string, unknown> = { ...complete }; delete partial[key];
      const db = new FakeDatabase({ retry: [partial] }); let persisted = 0;
      const result = await publishPublicExposure(db, { sourceId: "we-work-remotely", now: NOW, tickKey: TICK,
        retryKey: "missing-field", proposedCount: 2,
        persist: async () => { persisted++; return { publishedCount: 2, ids: [99, 100] }; } });
      expect(result.ok).toBe(false); expect(persisted).toBe(0); expect(db.runs).toEqual([]);
    }
  });

  test("replay counts are strict safe integers and non-publishing modes cannot conceal exposure", async () => {
    const complete = { sourceId: "we-work-remotely", tickKey: TICK, proposedCount: 2,
      mode: "unlimited", publishedCount: 2, publishedIdsJson: "[10,11]" };
    for (const change of [{ proposedCount: "2" }, { publishedCount: "2" }, { proposedCount: null }, { publishedCount: null },
      { proposedCount: Number.NaN }, { publishedCount: Number.POSITIVE_INFINITY }, { publishedCount: true },
      { publishedCount: -1 }, { publishedCount: 1.5 }, { publishedCount: 3 },
      { proposedCount: Number.MAX_SAFE_INTEGER + 1 }, { mode: "blocked" }, { mode: "rolled_back" }]) {
      const db = new FakeDatabase({ retry: [{ ...complete, ...change }] }); let persisted = 0;
      const result = await publishPublicExposure(db, { sourceId: "we-work-remotely", now: NOW, tickKey: TICK,
        retryKey: "invalid-replay", proposedCount: 2,
        persist: async () => { persisted++; return { publishedCount: 2, ids: [99, 100] }; } });
      expect(result.ok).toBe(false); expect(persisted).toBe(0); expect(db.runs).toEqual([]);
    }
  });

  test("valid capped historical replay preserves its receipt without treating it as fresh authority", async () => {
    const db = new FakeDatabase({ retry: [{ sourceId: "greenhouse:retired", tickKey: TICK, proposedCount: 2,
      mode: "capped", publishedCount: 1, publishedIdsJson: "[11]" }], registry: [activePolicy("greenhouse:retired", null)] });
    let persisted = 0;
    const result = await publishPublicExposure(db, { sourceId: "greenhouse:retired", now: NOW, tickKey: TICK,
      retryKey: "historical-capped", proposedCount: 2,
      persist: async () => { persisted++; return { publishedCount: 2, ids: [99, 100] }; } });
    expect(result).toEqual({ ok: true, mode: "capped", publishedCount: 1, ids: [11], replayed: true });
    expect(persisted).toBe(0); expect(db.runs).toEqual([]);
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

  test("rejects an inflated fresh acknowledgement instead of clamping away unknown exposure", async () => {
    const db = new FakeDatabase({ registry: [null], retry: [null] });
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "inflated1", proposedCount: 1,
      persist: async (allowed) => {
        expect(allowed).toBe(1);
        return { publishedCount: 2, ids: [101, 102] };
      },
    });
    expect(result).toMatchObject({ ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN" });
    expect(db.runs).toEqual([]);
  });

  test("clampLedgerPublishedCount bounds raw counts to [0, proposed]", () => {
    expect(clampLedgerPublishedCount(1, 2)).toBe(1);
    expect(clampLedgerPublishedCount(1, 1)).toBe(1);
    expect(clampLedgerPublishedCount(1, 0)).toBe(0);
    expect(clampLedgerPublishedCount(0, 1)).toBe(0);
    expect(clampLedgerPublishedCount(3, -5)).toBe(0);
    expect(clampLedgerPublishedCount(3, Number.NaN)).toBe(0);
  });
});

describe("truthful fresh publication acknowledgements", () => {
  const invalidAcknowledgements: Array<[string, unknown]> = [
    ["null result", null], ["missing count", { ids: [7] }], ["string count", { publishedCount: "1", ids: [7] }],
    ["negative count", { publishedCount: -1, ids: [] }], ["fractional count", { publishedCount: 0.5, ids: [7] }],
    ["NaN count", { publishedCount: Number.NaN, ids: [] }], ["infinite count", { publishedCount: Infinity, ids: [7] }],
    ["unsafe count", { publishedCount: Number.MAX_SAFE_INTEGER + 1, ids: [7] }],
    ["excess count", { publishedCount: 3, ids: [7, 8, 9] }], ["missing IDs", { publishedCount: 1 }],
    ["non-array IDs", { publishedCount: 1, ids: { 0: 7, length: 1 } }],
    ["missing ID", { publishedCount: 2, ids: [7] }], ["extra ID", { publishedCount: 1, ids: [7, 8] }],
    ["duplicate IDs", { publishedCount: 2, ids: [7, 7] }], ["zero ID", { publishedCount: 1, ids: [0] }],
    ["negative ID", { publishedCount: 1, ids: [-7] }], ["fractional ID", { publishedCount: 1, ids: [7.5] }],
    ["unsafe ID", { publishedCount: 1, ids: [Number.MAX_SAFE_INTEGER + 1] }],
    ["string ID", { publishedCount: 1, ids: ["7"] }], ["null ID", { publishedCount: 1, ids: [null] }],
    ["sparse IDs", { publishedCount: 1, ids: new Array(1) }], ["zero count with hidden IDs", { publishedCount: 0, ids: [7] }],
  ];
  const disguisedDuplicates = [7, 7];
  disguisedDuplicates[Symbol.iterator] = () => [7, 8][Symbol.iterator]();
  invalidAcknowledgements.push(["iterator-concealed duplicate IDs", { publishedCount: 2, ids: disguisedDuplicates }]);
  const inheritedId = new Array(1);
  Object.setPrototypeOf(inheritedId, Object.assign(Object.create(Array.prototype), { 0: 7 }));
  invalidAcknowledgements.push(["prototype-concealed sparse ID", { publishedCount: 1, ids: inheritedId }]);

  function publishingDb(mode: "unlimited" | "capped") {
    return new FakeDatabase({ retry: [null], registry: mode === "unlimited" ? [null] : [{
      sourceId: "greenhouse:test", compliance: "allowed", operational: "canary", optOut: 0,
      policyExpiry: "2026-10-01T00:00:00.000Z", canaryMaxNewItemsPerTick: 2,
    }] });
  }
  function freshRequest(mode: "unlimited" | "capped", persist: () => Promise<{ publishedCount: number; ids: number[] }>) {
    return { sourceId: mode === "unlimited" ? "remotive" : "greenhouse:test", now: NOW,
      tickKey: TICK, retryKey: "fresh-ack", proposedCount: 2, persist };
  }

  for (const mode of ["unlimited", "capped"] as const) {
    for (const [name, acknowledgement] of invalidAcknowledgements) {
      test(`${mode} fresh ${name} reports post-persistence uncertainty without a success ledger`, async () => {
        const db = publishingDb(mode); let persisted = 0;
        const result = await publishPublicExposure(db, freshRequest(mode, async () => {
          persisted++; return acknowledgement as { publishedCount: number; ids: number[] };
        }));
        expect(result).toEqual({ ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true,
          exposure: "UNKNOWN", reason: "publication persistence returned an invalid acknowledgement" });
        expect(persisted).toBe(1); expect(db.runs).toEqual([]);
      });
    }

    test(`${mode} fresh legitimate conflict-only zero is an exact empty receipt`, async () => {
      const db = publishingDb(mode);
      const result = await publishPublicExposure(db, freshRequest(mode, async () => ({ publishedCount: 0, ids: [] })));
      expect(result).toEqual({ ok: true, mode, publishedCount: 0, ids: [], replayed: false });
      expect(db.runs[0]?.values.slice(3, 7)).toEqual([mode, 2, 0, "[]"]);
    });

    test(`${mode} callback throw reports possible effects without leaking the caught message`, async () => {
      const db = publishingDb(mode);
      const result = await publishPublicExposure(db, freshRequest(mode, async () => { throw new Error("secret callback evidence"); }));
      expect(result).toEqual({ ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true,
        exposure: "UNKNOWN", reason: "publication persistence did not complete with a valid acknowledgement" });
      expect(JSON.stringify(result)).not.toContain("secret"); expect(db.runs).toEqual([]);
    });

    test(`${mode} acknowledgement access failure has a fixed post-persistence result`, async () => {
      const db = publishingDb(mode);
      const result = await publishPublicExposure(db, freshRequest(mode, async () => ({
        get publishedCount(): number { throw new Error("secret acknowledgement evidence"); }, ids: [7],
      })));
      expect(result).toEqual({ ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true,
        exposure: "UNKNOWN", reason: "publication persistence returned an invalid acknowledgement" });
      expect(db.runs).toEqual([]);
    });

    test(`${mode} exact IDs detach from callback memory before ledger suspension`, async () => {
      const db = publishingDb(mode), ids = [7, 8];
      const prepare = db.prepare.bind(db);
      db.prepare = query => {
        const statement = prepare(query);
        if (query.includes("INSERT INTO source_publication_ledger")) {
          const run = statement.run.bind(statement);
          statement.run = async () => { ids.splice(0, ids.length, 99); await Promise.resolve(); return run(); };
        }
        return statement;
      };
      const result = await publishPublicExposure(db, freshRequest(mode, async () => ({ publishedCount: 2, ids })));
      expect(result).toEqual({ ok: true, mode, publishedCount: 2, ids: [7, 8], replayed: false });
      expect(ids).toEqual([99]); expect(db.runs[0]?.values.slice(5, 7)).toEqual([2, "[7,8]"]);
    });
  }
});
