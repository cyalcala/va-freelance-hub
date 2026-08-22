// SRC-4D fixtures: shared-origin cadence groups (Jobicy-only).
//
// Covers the unit contract's required cases: two-feed alternation fairness,
// starvation-freedom, capped 429 backoff, success recovery, clock skew, and
// missing state. All decisions are pure functions over durable state, so these
// fixtures need no DB or network.
import { describe, expect, it } from "bun:test";
import {
  CADENCE_GROUP_BACKOFF_BASE_MINUTES,
  CADENCE_GROUP_BACKOFF_MAX_MINUTES,
  countConsecutiveRateLimitErrors,
  planCadenceGroupTurns,
  rateLimitBackoffMinutes,
} from "../src/pages/api/cron/scrape";
import { sources as staticSources } from "@va-hub/scraper";

const ADMIN = "jobicy-admin-support-apac";
const SUPPORTING = "jobicy-supporting-apac";

function state(lastAttemptAt: string | null): { lastAttemptAt: string | null } {
  return { lastAttemptAt };
}

function plan(
  states: Record<string, { lastAttemptAt: string | null }>,
  attemptErrors: Record<string, Array<string | null>> = {},
  observedAt = "2026-08-23T00:00:00.000Z",
) {
  return planCadenceGroupTurns({
    sources: staticSources,
    states: new Map(Object.entries(states)),
    attemptErrorsBySourceId: new Map(Object.entries(attemptErrors)),
    observedAt,
  });
}

describe("SRC-4D cadence group fixture", () => {
  it("marks exactly the two Jobicy feeds as one shared-origin group", () => {
    const grouped = staticSources.filter((s) => s.cadenceGroup);
    expect(grouped.map((s) => s.id).sort()).toEqual([ADMIN, SUPPORTING].sort());
    expect(new Set(grouped.map((s) => s.cadenceGroup)).size).toBe(1);
    expect(grouped.every((s) => s.minFetchIntervalMinutes === 60)).toBe(true);
  });
});

describe("countConsecutiveRateLimitErrors", () => {
  it("returns 0 for missing or empty history", () => {
    expect(countConsecutiveRateLimitErrors(undefined)).toBe(0);
    expect(countConsecutiveRateLimitErrors([])).toBe(0);
  });

  it("counts only the leading run of HTTP 429 errors (newest first)", () => {
    expect(countConsecutiveRateLimitErrors(["HTTP 429", "HTTP 429"])).toBe(2);
    // A success or any different failure breaks the streak.
    expect(countConsecutiveRateLimitErrors(["HTTP 429", null, "HTTP 429"])).toBe(1);
    expect(countConsecutiveRateLimitErrors(["HTTP 503", "HTTP 429"])).toBe(0);
    expect(countConsecutiveRateLimitErrors([null])).toBe(0);
  });
});

describe("rateLimitBackoffMinutes", () => {
  it("doubles from the base level and caps at the maximum", () => {
    expect(rateLimitBackoffMinutes(0)).toBe(0);
    expect(rateLimitBackoffMinutes(1)).toBe(CADENCE_GROUP_BACKOFF_BASE_MINUTES);
    expect(rateLimitBackoffMinutes(2)).toBe(CADENCE_GROUP_BACKOFF_BASE_MINUTES * 2);
    expect(rateLimitBackoffMinutes(3)).toBe(CADENCE_GROUP_BACKOFF_BASE_MINUTES * 4);
    expect(rateLimitBackoffMinutes(4)).toBe(CADENCE_GROUP_BACKOFF_MAX_MINUTES);
    expect(rateLimitBackoffMinutes(10)).toBe(CADENCE_GROUP_BACKOFF_MAX_MINUTES);
  });

  it("treats invalid streaks as no backoff", () => {
    expect(rateLimitBackoffMinutes(-3)).toBe(0);
    expect(rateLimitBackoffMinutes(Number.NaN)).toBe(0);
  });
});

describe("planCadenceGroupTurns", () => {
  const T0 = "2026-08-23T00:00:00.000Z";
  const TEN_HOURS_AGO = "2026-08-22T14:00:00.000Z";
  const NINE_POINT_FIVE_HOURS_AGO = "2026-08-22T14:30:00.000Z";

  it("defers all but one eligible member, naming the group and turn holder", () => {
    const result = plan({
      [ADMIN]: state(TEN_HOURS_AGO),
      [SUPPORTING]: state(NINE_POINT_FIVE_HOURS_AGO),
    });
    // Older attempt wins the tick.
    expect(result.deferred.has(SUPPORTING)).toBe(true);
    expect(result.deferred.has(ADMIN)).toBe(false);
    expect(result.deferred.get(SUPPORTING)).toContain("jobicy.com");
    expect(result.deferred.get(SUPPORTING)).toContain(ADMIN);
  });

  it("is deterministic on ties (configured order wins)", () => {
    const states = {
      [ADMIN]: state(TEN_HOURS_AGO),
      [SUPPORTING]: state(TEN_HOURS_AGO),
    };
    const first = plan(states);
    const second = plan(states);
    expect(first.deferred.has(ADMIN)).toBe(false);
    expect(first.deferred.has(SUPPORTING)).toBe(true);
    expect([...first.deferred.entries()]).toEqual([...second.deferred.entries()]);
  });

  it("alternates turns across ticks instead of starving either feed", () => {
    let adminState = TEN_HOURS_AGO;
    let supportingState = NINE_POINT_FIVE_HOURS_AGO;
    const winners: string[] = [];
    let tick = Date.parse(T0);

    for (let i = 0; i < 6; i += 1) {
      const observedAt = new Date(tick).toISOString();
      const result = plan({ [ADMIN]: state(adminState), [SUPPORTING]: state(supportingState) }, {}, observedAt);
      const winner = result.deferred.has(ADMIN) ? SUPPORTING : ADMIN;
      winners.push(winner);

      // Simulate the winner's real fetch: its durable lastAttemptAt advances.
      if (winner === ADMIN) adminState = observedAt;
      else supportingState = observedAt;
      tick += 70 * 60_000;
    }

    expect(winners).toEqual([ADMIN, SUPPORTING, ADMIN, SUPPORTING, ADMIN, SUPPORTING]);
  });

  it("lets a member without prior state win immediately (never starved)", () => {
    const result = plan({
      [ADMIN]: state(null),
      [SUPPORTING]: state(NINE_POINT_FIVE_HOURS_AGO),
    });
    expect(result.deferred.has(ADMIN)).toBe(false);
    expect(result.deferred.get(SUPPORTING)).toContain(ADMIN);
  });

  it("survives clock skew without crashing or mis-deferring", () => {
    // Unparseable timestamps rank as never-attempted; a future stamp keeps the
    // existing guard semantics (still inside its minimum interval).
    const result = plan({
      [ADMIN]: state("not-a-timestamp"),
      [SUPPORTING]: state("2026-08-23T12:00:00.000Z"),
    });
    expect(result.deferred.has(ADMIN)).toBe(false);
    // SUPPORTING is individually interval-skipped (future lastAttemptAt), so
    // only ADMIN is eligible and no deferral decision is needed at all.
    expect(result.deferred.size).toBe(0);
  });

  it("applies capped 429 backoff to the failing member's own interval", () => {
    // 90 minutes old: inside the plain 60-minute guard's reach but outside the
    // 120-minute effective interval once two consecutive 429s add +60m.
    const ninetyMinutesAgo = "2026-08-22T22:30:00.000Z";
    const states = {
      [ADMIN]: state(ninetyMinutesAgo),
      [SUPPORTING]: state(TEN_HOURS_AGO),
    };

    // Without 429 history the 10-hour-old SUPPORTING attempt is oldest and
    // takes the turn; ADMIN waits behind it.
    const withoutErrors = plan(states);
    expect(withoutErrors.backoffMinutes.size).toBe(0);
    expect(withoutErrors.deferred.get(ADMIN)).toContain(SUPPORTING);

    // With a leading 2x-429 streak the backoff blocks ADMIN's own interval
    // this tick; SUPPORTING then proceeds alone with no deferral decision.
    const withBackoff = plan(states, { [ADMIN]: ["HTTP 429", "HTTP 429"] });
    expect(withBackoff.backoffMinutes.get(ADMIN)).toBe(CADENCE_GROUP_BACKOFF_BASE_MINUTES * 2);
    expect(withBackoff.deferred.size).toBe(0);
  });

  it("resets backoff after a successful attempt breaks the 429 streak", () => {
    const result = plan(
      {
        [ADMIN]: state(TEN_HOURS_AGO),
        [SUPPORTING]: state(TEN_HOURS_AGO),
      },
      {
        [ADMIN]: [null, "HTTP 429", "HTTP 429"],
      },
    );
    expect(result.backoffMinutes.get(ADMIN)).toBeUndefined();
  });

  it("records no deferral when zero or one member is eligible", () => {
    // Both still inside their own intervals -> nobody eligible, nobody deferred.
    const allSkipped = plan({
      [ADMIN]: state("2026-08-22T23:30:00.000Z"),
      [SUPPORTING]: state("2026-08-22T23:30:00.000Z"),
    });
    expect(allSkipped.deferred.size).toBe(0);

    // One member skipped, one eligible -> the eligible one simply proceeds.
    const solo = plan({
      [ADMIN]: state("2026-08-22T23:30:00.000Z"),
      [SUPPORTING]: state(TEN_HOURS_AGO),
    });
    expect(solo.deferred.size).toBe(0);
  });
});
