import { describe, it, expect } from "bun:test";
import {
  sweepUnclearBacklog,
  DAILY_SWEEP_CAP,
  SWEEP_BUDGET_IDLE_TICK,
} from "../src/pages/api/cron/scrape";

// Regression coverage for the unclear-backlog sweep. Every bug this guards
// against actually shipped to production on 2026-07-26:
//   - the sweep silently resolving nothing while advancing cursors
//   - a daily cap that over-counted and threw away ~40% of its budget
//   - legacy backfill rows starving freshly-scraped jobs
// The sweep is the only AI consumer that runs on every cron tick, so its
// budgeting and ordering are load-bearing.

const OBSERVED = "2026-07-26T12:00:00.000Z";
const TODAY = "2026-07-26";

type SelectResult = any[];

/**
 * Minimal drizzle-shaped fake. Supports exactly the chains the sweep uses:
 *   select().from().where().[orderBy()].limit()   -> next queued result
 *   insert().values().onConflictDoUpdate()        -> recorded
 *   update().set().where()                        -> recorded
 * Query builders are thenable in drizzle; here only the terminal call needs to
 * resolve, which is enough because the sweep always awaits at the end.
 */
function makeFakeDb(selectResults: SelectResult[]) {
  const calls = {
    selects: 0,
    limits: [] as number[],
    updates: [] as any[],
    upserts: [] as any[],
  };
  const queue = [...selectResults];

  const db: any = {
    select() {
      calls.selects += 1;
      const builder: any = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: (n: number) => {
          calls.limits.push(n);
          return Promise.resolve(queue.shift() ?? []);
        },
      };
      return builder;
    },
    insert() {
      return {
        values: (vals: any) => ({
          onConflictDoUpdate: (arg: any) => {
            calls.upserts.push({ vals, arg });
            return Promise.resolve();
          },
          onConflictDoNothing: () => Promise.resolve(),
        }),
      };
    },
    update() {
      return {
        set: (vals: any) => ({
          where: () => {
            calls.updates.push(vals);
            return Promise.resolve();
          },
        }),
      };
    },
  };
  return { db, calls };
}

/** env whose AI returns the queued payloads in order. */
function makeEnv(responses: string[], onRun?: (model: string) => void) {
  const queue = [...responses];
  const models: string[] = [];
  return {
    env: {
      AI: {
        run: async (model: string) => {
          models.push(model);
          onRun?.(model);
          const next = queue.shift();
          if (next === undefined) throw new Error("AI unavailable (queue empty)");
          return { response: next };
        },
      },
    },
    models,
  };
}

const row = (id: number) => ({
  id,
  title: `Job ${id}`,
  description: "Remote role, open worldwide.",
  tags: null,
  company: "Acme",
  locationRaw: "Remote",
});

const ELIGIBLE = JSON.stringify({
  eligibleForFilipinos: true,
  reason: "Open worldwide",
  category: "tech",
  tags: ["remote"],
});
const SKEPTIC_AGREES = JSON.stringify({ eligible: true, reason: "no disqualifier" });
const SKEPTIC_REFUTES = JSON.stringify({ eligible: false, reason: "US only in fine print" });

describe("sweepUnclearBacklog — daily cap", () => {
  it("skips entirely once the day's tally reaches the cap", async () => {
    // Quota row says the cap is already spent today.
    const { db, calls } = makeFakeDb([[{ day: TODAY, used: DAILY_SWEEP_CAP }]]);
    const { env, models } = makeEnv([]);

    const stats = await sweepUnclearBacklog(db, env, OBSERVED, SWEEP_BUDGET_IDLE_TICK);

    expect(stats).toEqual({ retriaged: 0, upgraded: 0, deactivated: 0 });
    // No row queries and no AI spend after the cap is hit.
    expect(calls.selects).toBe(1);
    expect(models).toEqual([]);
  });

  it("ignores a tally from a previous day (self-resets at 00:00 UTC)", async () => {
    const { db } = makeFakeDb([
      [{ day: "2026-07-25", used: DAILY_SWEEP_CAP }], // stale stamp
      [row(1)],                                       // fresh
      [],                                             // legacy
    ]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]);

    const stats = await sweepUnclearBacklog(db, env, OBSERVED, 1);

    // Stale tally must not throttle: the row was processed.
    expect(stats.retriaged).toBe(1);
  });

  it("clamps the per-tick budget to what remains of the cap", async () => {
    const { db, calls } = makeFakeDb([
      [{ day: TODAY, used: DAILY_SWEEP_CAP - 1 }], // only 1 left
      [row(1)],
      [],
    ]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]);

    await sweepUnclearBacklog(db, env, OBSERVED, SWEEP_BUDGET_IDLE_TICK);

    // The fresh-row query must ask for 1, not the full idle-tick budget.
    expect(calls.limits[1]).toBe(1);
  });

  it("charges attempts to the tally even when every call fails", async () => {
    const { db, calls } = makeFakeDb([
      [{ day: TODAY, used: 0 }],
      [row(1), row(2)],
      [],
    ]);
    const { env } = makeEnv([]); // AI throws immediately -> aiUnavailable

    await sweepUnclearBacklog(db, env, OBSERVED, 2);

    // A quota outage must not be retryable without limit inside the same day.
    const tally = calls.upserts.find((u) => u.vals.sourceId === "__sweep_quota__");
    expect(tally).toBeDefined();
    expect(tally.vals.lastCount).toBeGreaterThan(0);
    expect(tally.vals.lastSuccessAt).toBe(TODAY);
  });
});

describe("sweepUnclearBacklog — fresh-first ordering", () => {
  it("queries fresh rows before legacy and spends leftover budget on legacy", async () => {
    const { db, calls } = makeFakeDb([
      [{ day: TODAY, used: 0 }],
      [row(1)],          // 1 fresh row returned for a budget of 3
      [row(2), row(3)],  // legacy fills the remaining 2
    ]);
    const { env } = makeEnv([
      ELIGIBLE, SKEPTIC_AGREES,
      ELIGIBLE, SKEPTIC_AGREES,
      ELIGIBLE, SKEPTIC_AGREES,
    ]);

    const stats = await sweepUnclearBacklog(db, env, OBSERVED, 3);

    // limits[1] is the fresh query, limits[2] the legacy top-up.
    expect(calls.limits[1]).toBe(3);
    expect(calls.limits[2]).toBe(2); // 3 budget - 1 fresh row
    expect(stats.retriaged).toBe(3);
  });

  it("does not query legacy at all when fresh rows fill the budget", async () => {
    const { db, calls } = makeFakeDb([
      [{ day: TODAY, used: 0 }],
      [row(1), row(2)], // fills a budget of 2
    ]);
    const { env } = makeEnv([
      ELIGIBLE, SKEPTIC_AGREES,
      ELIGIBLE, SKEPTIC_AGREES,
    ]);

    await sweepUnclearBacklog(db, env, OBSERVED, 2);

    // Only quota + fresh queries: new jobs never wait behind the backfill.
    expect(calls.selects).toBe(2);
  });
});

describe("sweepUnclearBacklog — verdicts", () => {
  it("upgrades a row when triage and skeptic agree", async () => {
    const { db, calls } = makeFakeDb([[{ day: TODAY, used: 0 }], [row(1)], []]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]);

    const stats = await sweepUnclearBacklog(db, env, OBSERVED, 1);

    expect(stats).toMatchObject({ retriaged: 1, upgraded: 1, deactivated: 0 });
    const write = calls.updates.find((u) => u.phEligibility === "eligible_likely");
    expect(write).toBeDefined();
    expect(write.geoEvidence).toContain("re-triage");
  });

  it("deactivates on a consensus split rather than publishing", async () => {
    const { db, calls } = makeFakeDb([[{ day: TODAY, used: 0 }], [row(1)], []]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_REFUTES]);

    const stats = await sweepUnclearBacklog(db, env, OBSERVED, 1);

    expect(stats).toMatchObject({ retriaged: 1, upgraded: 0, deactivated: 1 });
    const write = calls.updates.find((u) => u.isActive === false);
    expect(write).toBeDefined();
    // Fails closed: stays unclear, does not become eligible.
    expect(write.phEligibility).toBe("unclear");
  });

  it("advances the cursor and records a diagnosis when AI is unavailable", async () => {
    const { db, calls } = makeFakeDb([[{ day: TODAY, used: 0 }], [row(1), row(2)], []]);
    const { env } = makeEnv([]); // every call throws

    const stats = await sweepUnclearBacklog(db, env, OBSERVED, 2);

    expect(stats).toEqual({ retriaged: 0, upgraded: 0, deactivated: 0 });
    // Cursor moved so one poison row cannot wedge the queue forever.
    expect(calls.updates.some((u) => u.geoCheckedAt === OBSERVED && !u.phEligibility)).toBe(true);
    // The reason is parked where a plain D1 query can read it.
    const diag = calls.upserts.find((u) => u.vals.sourceId === "__sweep_diag__");
    expect(diag).toBeDefined();
    expect(String(diag.vals.lastError).length).toBeGreaterThan(0);
  });

  it("stops after two consecutive AI failures instead of burning the budget", async () => {
    const { db, calls } = makeFakeDb([
      [{ day: TODAY, used: 0 }],
      [row(1), row(2), row(3), row(4), row(5)],
      [],
    ]);
    const { env, models } = makeEnv([]); // all fail

    await sweepUnclearBacklog(db, env, OBSERVED, 5);

    // Only rows 1 and 2 are attempted; the ladder is tried per row, so assert on
    // rows touched rather than raw model-call count.
    const cursorAdvances = calls.updates.filter((u) => u.geoCheckedAt === OBSERVED && !u.phEligibility);
    expect(cursorAdvances.length).toBe(2);
    expect(models.length).toBeGreaterThan(0);
  });
});
