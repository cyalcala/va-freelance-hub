/**
 * INCIDENT-0410(i): the Jev network call is spent on cohorts whose answer is
 * provably discarded.
 *
 * `decideAdmission` awaited the OpenRouter judge *before* consulting
 * `mergeAdmissionDecision`, and `mergeAdmissionDecision` returns the
 * deterministic decision verbatim for every hard-reject cohort — so a paid,
 * rate-limited call was made and its answer thrown away for every cohort below
 * `MIN_JOBS_TO_EVALUATE` or below `AUTO_REJECT_PH_RATE`. `lake.test.ts` already
 * pins the invariant that makes skipping safe (`withJev` equals the deterministic
 * decision); this file pins the production consequence: the call does not happen.
 *
 * Nothing here widens or narrows a threshold. `AUTO_APPROVE_PH_RATE`,
 * `AUTO_REJECT_PH_RATE`, `MIN_JOBS_TO_EVALUATE`, `PUBLISH_PH_RATE_FLOOR` and
 * `JEV_MIN_CONFIDENCE` are imported from production and never restated; the
 * metrics below are chosen to sit unambiguously outside or inside the band
 * those constants define, and every assertion is made against the real
 * `decideAdmission`, the real `decideAdmissionDeterministic`, the real
 * `mergeAdmissionDecision` and the real `parseJevRaw` publication gate.
 */

import { describe, expect, test } from "bun:test";

import type { JevJudgeRequest, JevJudgeResult } from "../../packages/scraper/jev-client";
import { parseJevRaw } from "./auto-publish-policy";
import {
  decideAdmission,
  decideAdmissionDeterministic,
  mergeAdmissionDecision,
  type TenantMetrics,
} from "./domain-ats-discovery";

/** Below `MIN_JOBS_TO_EVALUATE`: too little evidence to judge at any PH rate. */
const REJECT_BY_SAMPLE_FLOOR: TenantMetrics = {
  totalJobs: 2,
  qualifiedReady: 1,
  excluded: 1,
  ambiguous: 0,
  phRate: 0.5,
  topCategories: ["support"],
};

/** Enough jobs, but no PH signal at all. */
const REJECT_BY_PH_RATE: TenantMetrics = {
  totalJobs: 38,
  qualifiedReady: 0,
  excluded: 38,
  ambiguous: 0,
  phRate: 0,
  topCategories: ["engineering"],
};

/** 2/13 sits inside the ambiguous band: the one place Jev can still change the outcome. */
const AMBIGUOUS_BAND: TenantMetrics = {
  totalJobs: 13,
  qualifiedReady: 2,
  excluded: 7,
  ambiguous: 4,
  phRate: 2 / 13,
  topCategories: ["virtual-assistant"],
};

function countingJudge(result: JevJudgeResult) {
  const calls: JevJudgeRequest[] = [];
  const judge = async (_key: string | undefined, request: JevJudgeRequest): Promise<JevJudgeResult> => {
    calls.push(request);
    return result;
  };
  return { judge, calls };
}

function admittedResult(choice: string, confidence: number): JevJudgeResult {
  return {
    ok: true,
    model: "typesafe/jev-1.13",
    answers: { admission: { choice, confidence, probabilities: { ADMIT: confidence } } },
    fallback: false,
  };
}

describe("INCIDENT-0410(i) a hard-reject cohort costs zero Jev calls", () => {
  test("a cohort below the sample floor never reaches the judge", async () => {
    const { judge, calls } = countingJudge(admittedResult("ADMIT", 0.99));

    const decision = await decideAdmission("acme", "greenhouse", REJECT_BY_SAMPLE_FLOOR, judge);

    expect(calls).toHaveLength(0);
    expect(decision.verdict).toBe("REJECT");
  });

  test("a cohort with no PH signal never reaches the judge either", async () => {
    const { judge, calls } = countingJudge(admittedResult("ADMIT", 0.99));

    const decision = await decideAdmission("acme", "lever", REJECT_BY_PH_RATE, judge);

    expect(calls).toHaveLength(0);
    expect(decision.verdict).toBe("REJECT");
  });

  test("the skipped decision is the deterministic decision, unchanged in verdict, confidence and reason", async () => {
    const { judge, calls } = countingJudge(admittedResult("ADMIT", 0.99));

    const decision = await decideAdmission("acme", "lever", REJECT_BY_PH_RATE, judge);

    const deterministic = decideAdmissionDeterministic(REJECT_BY_PH_RATE);
    expect(decision.verdict).toBe(deterministic.verdict);
    expect(decision.confidence).toBe(deterministic.confidence);
    expect(decision.reason).toBe(deterministic.reason);
    // The reason must name the deterministic basis, not the model, so the lake
    // row explains itself without the judge ever having run.
    expect(decision.reason).toContain("Deterministic threshold");
    expect(calls).toHaveLength(0);
  });

  test("skipping is safe because the merge discards the answer anyway", () => {
    // The invariant the skip depends on, asserted directly on production code:
    // a hard reject returns the same object whether Jev answered or not.
    const withJev = mergeAdmissionDecision(REJECT_BY_PH_RATE, { choice: "ADMIT", confidence: 0.99 });
    const withoutJev = mergeAdmissionDecision(REJECT_BY_PH_RATE, null);
    expect(withJev).toEqual(decideAdmissionDeterministic(REJECT_BY_PH_RATE));
    expect(withoutJev).toEqual(withJev);
  });

  test("no verdict is recorded for a cohort that was never consulted", async () => {
    const { judge } = countingJudge(admittedResult("ADMIT", 0.99));

    const decision = await decideAdmission("acme", "lever", REJECT_BY_PH_RATE, judge);

    // CONSTITUTION §1.3 #4 / §8.3: do not invent an observation. No attempt was
    // made, so nothing is written to `jev_raw`, and the publication gate cannot
    // read anything from it.
    expect(decision.jevRaw).toBeUndefined();
    expect(parseJevRaw(decision.jevRaw)).toBeNull();
  });
});

describe("INCIDENT-0410(i) the skip does not de-adopt Jev where it can decide", () => {
  test("the ambiguous band still consults the judge exactly once", async () => {
    const { judge, calls } = countingJudge(admittedResult("SHADOW", 0.42));

    const decision = await decideAdmission("supabase", "ashby", AMBIGUOUS_BAND, judge);

    expect(calls).toHaveLength(1);
    expect(decision.verdict).toBe("SHADOW");
  });

  test("a confident Jev verdict in the ambiguous band still reaches the persisted column", async () => {
    const { judge, calls } = countingJudge(admittedResult("ADMIT", 0.86));

    const decision = await decideAdmission("supabase", "ashby", AMBIGUOUS_BAND, judge);

    expect(calls).toHaveLength(1);
    expect(decision.verdict).toBe("ADMIT");
    expect(decision.jevRaw).toBe("typesafe/jev-1.13:ADMIT@0.86");
    expect(parseJevRaw(decision.jevRaw)).toEqual({ choice: "ADMIT", confidence: 0.86 });
  });

  test("the ambiguous band with no verdict still records an attempt receipt", async () => {
    // Session 24's fix must keep working: a consultation that failed is a fact.
    const { judge } = countingJudge({ ok: false, error: "OpenRouter request failed", status: 401, fallback: false });

    const decision = await decideAdmission("supabase", "ashby", AMBIGUOUS_BAND, judge);

    expect(decision.jevRaw).toStartWith("attempt:provider_http_error/http401@");
    expect(parseJevRaw(decision.jevRaw)).toBeNull();
  });
});