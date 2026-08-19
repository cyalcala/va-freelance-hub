import { describe, it, expect } from "bun:test";
import {
  drainPendingTriageInline,
  PENDING_DRAIN_PER_TICK,
} from "../src/pages/api/cron/scrape";

// Regression coverage for the 2026-08-18/19 board freeze recovery.
//
// When durable triage was (accidentally) opted in but its Inngest drain was not
// running, every gate-passed listing was parked as a hidden `pending-triage`
// row and never published. drainPendingTriageInline is the inline recovery:
// it re-runs the SAME decideTriage verdict and updates each row in place, so the
// backlog drains with no dependency on the external Inngest cron. It shares the
// scrape invocation's AI budget, so it must never spend past an exhausted budget.

const OBSERVED = "2026-08-20T00:00:00.000Z";

// The row shape decideTriage/geoGate see is identical to the sweep's, so the
// same fixtures produce the same gate verdict (geoScope "unknown" → skeptic runs).
const pendingRow = (id: number) => ({
  id,
  title: `Job ${id}`,
  description: "Remote role, open worldwide.",
  company: "Acme",
  tags: null,
  locationRaw: "Remote",
  sourceUrl: `https://example.com/job/${id}`,
  applicationUrl: null,
});

// Geo-neutral row → geoGate returns "unknown", so decideTriage takes the second
// (skeptic) vote — the only path that can produce a consensus split.
const neutralRow = (id: number) => ({
  id,
  title: `Assistant ${id}`,
  description: "Join our team to help with daily tasks.",
  company: "Acme",
  tags: null,
  locationRaw: null,
  sourceUrl: `https://example.com/job/${id}`,
  applicationUrl: null,
});

const ELIGIBLE = JSON.stringify({
  eligibleForFilipinos: true,
  reason: "Open worldwide",
  category: "tech",
  tags: ["remote"],
});
const INELIGIBLE = JSON.stringify({
  eligibleForFilipinos: false,
  reason: "US-only, onsite",
});
const SKEPTIC_AGREES = JSON.stringify({ eligible: true, reason: "no disqualifier" });
const SKEPTIC_REFUTES = JSON.stringify({ eligible: false, reason: "US only in fine print" });

/** drizzle-shaped fake: select().from().where().orderBy().limit() → pendingRows;
 *  update().set().where() recorded (or rejected when failUpdates). */
function makeFakeDb(pendingRows: any[], failUpdates = false) {
  const calls = { selects: 0, limits: [] as number[], updates: [] as any[] };
  const db: any = {
    select() {
      calls.selects += 1;
      const builder: any = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: (n: number) => {
          calls.limits.push(n);
          return Promise.resolve(pendingRows);
        },
      };
      return builder;
    },
    update() {
      return {
        set: (vals: any) => ({
          where: () => {
            calls.updates.push(vals);
            return failUpdates ? Promise.reject(new Error("D1 write rejected")) : Promise.resolve();
          },
        }),
      };
    },
  };
  return { db, calls };
}

/** env whose AI returns the queued payloads in order; throws when drained. */
function makeEnv(responses: string[]) {
  const queue = [...responses];
  const models: string[] = [];
  return {
    env: {
      AI: {
        run: async (model: string) => {
          models.push(model);
          const next = queue.shift();
          if (next === undefined) throw new Error("AI unavailable (queue empty)");
          return { response: next };
        },
      },
    },
    models,
  };
}

/** Budget that reports exhausted only after `allow` non-exhausted checks. */
function makeBudget(allow = Infinity) {
  let checks = 0;
  return { exhausted: () => ++checks > allow };
}

describe("drainPendingTriageInline", () => {
  it("publishes an eligible pending row (is_active=1, reason cleared)", async () => {
    const { db, calls } = makeFakeDb([pendingRow(1)]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]);

    const stats = await drainPendingTriageInline(db, env, makeBudget(), OBSERVED);

    expect(stats).toMatchObject({ claimed: 1, published: 1, rejected: 0, quarantined: 0, deferred: 0 });
    expect(calls.updates.length).toBe(1);
    expect(calls.updates[0].isActive).toBe(true);
    expect(calls.updates[0].inactiveReason).toBeNull();
  });

  it("rejects an ineligible pending row (policy-rejected, stays hidden)", async () => {
    const { db, calls } = makeFakeDb([pendingRow(1)]);
    const { env } = makeEnv([INELIGIBLE]);

    const stats = await drainPendingTriageInline(db, env, makeBudget(), OBSERVED);

    expect(stats).toMatchObject({ claimed: 1, published: 0, rejected: 1 });
    expect(calls.updates[0].inactiveReason).toBe("policy-rejected");
    expect(calls.updates[0].isActive).toBeUndefined(); // never flipped active
  });

  it("quarantines on a consensus split rather than publishing", async () => {
    const { db, calls } = makeFakeDb([neutralRow(1)]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_REFUTES]);

    const stats = await drainPendingTriageInline(db, env, makeBudget(), OBSERVED);

    expect(stats).toMatchObject({ claimed: 1, published: 0, quarantined: 1 });
    expect(calls.updates[0].inactiveReason).toBe("policy-rejected");
    expect(calls.updates[0].phEligibility).toBe("unclear");
  });

  it("FAILS CLOSED on AI-unavailable: row left pending, no write", async () => {
    const { db, calls } = makeFakeDb([pendingRow(1)]);
    const { env } = makeEnv([]); // AI throws immediately

    const stats = await drainPendingTriageInline(db, env, makeBudget(), OBSERVED);

    expect(stats).toMatchObject({ claimed: 1, published: 0, rejected: 0, deferred: 1 });
    expect(calls.updates.length).toBe(0); // nothing published or rejected
  });

  it("does nothing (no query) when the AI budget is already exhausted", async () => {
    const { db, calls } = makeFakeDb([pendingRow(1)]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]);

    const stats = await drainPendingTriageInline(db, env, makeBudget(0), OBSERVED);

    expect(stats).toEqual({ claimed: 0, published: 0, rejected: 0, quarantined: 0, deferred: 0 });
    expect(calls.selects).toBe(0); // never even claims rows
  });

  it("stops mid-batch when the shared budget runs out", async () => {
    const { db, calls } = makeFakeDb([pendingRow(1), pendingRow(2), pendingRow(3)]);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]); // only enough for row 1
    // Budget allows the top-of-function check + row 1, then reports exhausted.
    const stats = await drainPendingTriageInline(db, env, makeBudget(2), OBSERVED);

    expect(stats.claimed).toBe(1); // row 2 and 3 not touched this pass
    expect(calls.updates.length).toBe(1);
  });

  it("claims at most the requested limit (defaults to PENDING_DRAIN_PER_TICK)", async () => {
    const { db, calls } = makeFakeDb([]);
    const { env } = makeEnv([]);

    await drainPendingTriageInline(db, env, makeBudget(), OBSERVED);

    expect(calls.limits[0]).toBe(PENDING_DRAIN_PER_TICK);
  });

  it("durable-write truth: a rejected write is not credited as published", async () => {
    const { db } = makeFakeDb([pendingRow(1)], /* failUpdates */ true);
    const { env } = makeEnv([ELIGIBLE, SKEPTIC_AGREES]);

    const stats = await drainPendingTriageInline(db, env, makeBudget(), OBSERVED);

    // The publish write threw, so it counts as deferred, not published.
    expect(stats).toMatchObject({ claimed: 1, published: 0, deferred: 1 });
  });
});
