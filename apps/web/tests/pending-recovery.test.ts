import { describe, expect, test } from "bun:test";
import {
  recoverGateEligiblePending,
  GATE_ELIGIBLE_GEO_SCOPES,
} from "../src/pages/api/cron/scrape";
import { FakePublicationDatabase } from "./publication-db-fake";

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
  const db: any = {
    update() {
      return {
        set: (vals: any) => {
          captured.set = vals;
          return {
            where: () => {
              captured.whereCalled = true;
              return fail
                ? Promise.reject(new Error("D1 write rejected"))
                : Promise.resolve({ meta: { changes } });
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
    expect(captured.set.updatedAt).toBe(OBSERVED);
    expect(captured.set.lastSeenInFeedAt).toBe(OBSERVED);
  });

  test("fail-soft: a rejected write returns 0 and never throws", async () => {
    const { db } = fakeDb(0, true);
    const n = await recoverGateEligiblePending(db, OBSERVED);
    expect(n).toBe(0);
  });

  test("with a publication db, selects pending rows and reserves exposure before publishing", async () => {
    const rows = [
      { id: 3, sourceId: "we-work-remotely" },
      { id: 4, sourceId: null },
    ];
    const captured: { set?: any; selected: boolean; updates: number } = { selected: false, updates: 0 };
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
              where: () => {
                captured.updates += 1;
                return Promise.resolve({ meta: { changes: 1 } });
              },
            };
          },
        };
      },
    };
    const publicationDb = new FakePublicationDatabase();
    const n = await recoverGateEligiblePending(db, OBSERVED, publicationDb);
    expect(n).toBe(2);
    expect(captured.selected).toBe(true);
    expect(captured.updates).toBe(2);
    expect(captured.set.isActive).toBe(true);
    expect(captured.set.inactiveReason).toBe(null);
    expect(publicationDb.runs.some((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toBe(true);
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
      registry: [{
        sourceId: "greenhouse:test",
        compliance: "allowed",
        operational: "shadow",
        optOut: 0,
        policyExpiry: null,
        canaryMaxNewItemsPerTick: null,
      }],
      optOut: [null],
    });
    const n = await recoverGateEligiblePending(db, OBSERVED, publicationDb);
    expect(n).toBe(0);
    expect(captured.updates).toBe(0);
  });
});
