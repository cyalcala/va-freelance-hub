import { describe, expect, test } from "bun:test";
import {
  recoverGateEligiblePending,
  GATE_ELIGIBLE_GEO_SCOPES,
} from "../src/pages/api/cron/scrape";
import { FakePublicationDatabase } from "./publication-db-fake";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

// Board-freshness fallback (2026-08-20 freeze follow-up).
//
// When durable triage was opted into and abandoned, gate-passed listings piled
// up as hidden `pending-triage` rows. The 10k-neuron/day budget is too scarce to
// AI-drain them promptly, so the ones the deterministic geo-gate ALREADY judged
// PH-eligible are published without AI and re-vetted later by the unclear sweep.
// This guards that only the safe scopes publish, and that the write is fail-soft.

const OBSERVED = "2026-08-20T02:00:00.000Z";

function fakeDb(changes: number, fail = false) {
  const captured: { set?: any; whereCalled?: boolean } = {};
  const rows = Array.from({ length: fail ? 1 : changes }, (_, index) => ({ id: index + 1, sourceId: "we-work-remotely" }));
  const db: any = {
    select() {
      const builder: any = { from: () => builder, where: () => Promise.resolve(rows) };
      return builder;
    },
    update() {
      return {
        set: (vals: any) => {
          captured.set = vals;
          return {
            where: (clause: any) => {
              captured.whereCalled = true;
              return { returning: async () => {
                if (fail) throw new Error("D1 write rejected");
                const params = new SQLiteSyncDialect().sqlToQuery(clause).params;
                return rows.filter(row => params.includes(row.id)).map(row => ({ id: row.id }));
              } };
            },
          };
        },
      };
    },
  };
  return { db, captured };
}

describe("recoverGateEligiblePending", () => {
  test("only the three PH-open geo scopes are treated as gate-eligible", () => {
    expect([...GATE_ELIGIBLE_GEO_SCOPES].sort()).toEqual([
      "apac_incl_ph",
      "ph_only",
      "worldwide",
    ]);
    // country_locked / region_excl_ph / unknown must NOT be here — they need AI.
    expect(GATE_ELIGIBLE_GEO_SCOPES).not.toContain("unknown");
    expect(GATE_ELIGIBLE_GEO_SCOPES).not.toContain("country_locked");
    expect(GATE_ELIGIBLE_GEO_SCOPES).not.toContain("region_excl_ph");
  });

  test("publishes: sets is_active, clears the pending reason, returns changes", async () => {
    const { db, captured } = fakeDb(58);
    const n = await recoverGateEligiblePending(db, OBSERVED);
    expect(n).toBe(58);
    expect(captured.whereCalled).toBe(true);
    expect(captured.set.isActive).toBe(true);
    expect(captured.set.inactiveReason).toBe(null);
    expect(captured.set.phEligibility).toBeDefined();
    expect(captured.set.updatedAt).toBe(OBSERVED);
    expect(captured.set.lastSeenInFeedAt).toBe(OBSERVED);
  });

  test("a thrown update acknowledgement reports UNKNOWN instead of known zero", async () => {
    const { db } = fakeDb(0, true);
    await expect(recoverGateEligiblePending(db, OBSERVED)).rejects.toMatchObject({ publicationOutcome: "UNKNOWN" });
  });

  test("with a publication db, publishes attributed pending rows and holds missing source identities", async () => {
    const rows = [
      { id: 3, sourceId: "we-work-remotely" },
      { id: 4, sourceId: null },
    ];
    const captured: { set?: any; selected: boolean; updates: number; whereClauses: any[] } = { selected: false, updates: 0, whereClauses: [] };
    const db: any = {
      select() {
        captured.selected = true;
        const builder: any = {
          from: () => builder,
          where: () => Promise.resolve(rows),
        };
        return builder;
      },
      update() {
        return {
          set: (vals: any) => {
            captured.set = vals;
            return {
              where: (clause: any) => {
                captured.whereClauses.push(clause);
                captured.updates += 1;
                return { returning: async () => [{ id: 3 }] };
              },
            };
          },
        };
      },
    };
    const publicationDb = new FakePublicationDatabase({ ownership: [{ ownedCount: 1,
      postingRows: JSON.stringify([{ id: 3, postedAt: OBSERVED }]) }] });
    const n = await recoverGateEligiblePending(db, OBSERVED, publicationDb);
    expect(n).toBe(1);
    expect(captured.selected).toBe(true);
    expect(captured.updates).toBe(1);
    expect(captured.set.isActive).toBe(true);
    expect(captured.set.inactiveReason).toBe(null);
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    const params = new SQLiteSyncDialect().sqlToQuery(captured.whereClauses[0]).params;
    expect(params).toContain(3);
    expect(params).toContain("we-work-remotely");
    expect(params).toContain("pending-triage");
    expect(params).toContain("ph_only");
    expect(publicationDb.runs.filter(run => run.query.includes("INSERT INTO source_publication_ledger"))
      .map(run => [run.values[0], run.values[3], run.values[5], run.values[6]]))
      .toEqual([["we-work-remotely", "unlimited", 1, "[3]"], ["unattributed", "blocked", 0, "[]"]]);
  });

  test("blocked publication leaves gate-eligible pending rows hidden", async () => {
    const captured = { updates: 0 };
    const db: any = {
      select() {
        const builder: any = {
          from: () => builder,
          where: () => Promise.resolve([{ id: 8, sourceId: "greenhouse:test" }]),
        };
        return builder;
      },
      update() {
        return {
          set: () => ({
            where: () => {
              captured.updates += 1;
              return Promise.resolve({ meta: { changes: 1 } });
            },
          }),
        };
      },
    };
    const publicationDb = new FakePublicationDatabase({
      registry: [
        {
          sourceId: "greenhouse:test",
          compliance: "allowed",
          operational: "shadow",
          optOut: 0,
          policyExpiry: null,
          canaryMaxNewItemsPerTick: null,
        },
        {
          sourceId: "greenhouse:test",
          compliance: "allowed",
          operational: "shadow",
          optOut: 0,
          policyExpiry: null,
          canaryMaxNewItemsPerTick: null,
        },
      ],
      optOut: [null],
    });
    const n = await recoverGateEligiblePending(db, OBSERVED, publicationDb);
    expect(n).toBe(0);
    expect(captured.updates).toBe(0);
  });
});
