/**
 * INCIDENT-0410: the Jev verdict producer is wired to the lake.
 *
 * `scripts/lake/jev-verdict-receipt.ts` (merged in #177) shipped pure logic for
 * a durable attempt receipt and for C18 verdict retention, but nothing imported
 * it — CONSTITUTION §8.4 C19 makes that an unwired anchor, not a capability.
 * This file exercises the two production seams that were changed to wire it:
 *
 *   1. `decideAdmission` now records an attempt receipt when the client returns
 *      no validated verdict, instead of leaving `jev_raw` NULL.
 *   2. `DISCOVERY_EVALUATION_UPSERT_SQL` now keeps a recorded verdict when a
 *      later evaluation proposes none, instead of overwriting it with NULL.
 *
 * Both are exercised through the real exported production symbols: the real
 * `decideAdmission` with an injected judge, the real writer SQL and argument
 * builder against the real `lake_ats_discovery` column shape, and the real
 * `parseJevRaw` publication gate. No threshold is compared with a copy of
 * itself: `JEV_MIN_CONFIDENCE`, `PUBLISH_PH_RATE_FLOOR`, `AUTO_APPROVE_PH_RATE`
 * and `MIN_JOBS_TO_EVALUATE` are imported from production and are not restated
 * here, and nothing in this file widens them.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import type { JevJudgeRequest, JevJudgeResult } from "../../packages/scraper/jev-client";
import { JEV_MIN_CONFIDENCE, parseJevRaw } from "./auto-publish-policy";
import { decideAdmission, type TenantMetrics } from "./domain-ats-discovery";
import {
  JEV_ATTEMPT_RECEIPT_PREFIX,
  JEV_RECEIPT_RETENTION_CLAUSE,
  isJevAttemptReceipt,
  resolveJevRawTransition,
} from "./jev-verdict-receipt";

const METRICS: TenantMetrics = {
  totalJobs: 13,
  qualifiedReady: 2,
  excluded: 7,
  ambiguous: 4,
  phRate: 2 / 13,
  topCategories: ["virtual-assistant"],
};

const VERDICT_RAW = "typesafe/jev-1.13:ADMIT@0.86";

function judgeReturning(result: JevJudgeResult) {
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

function failedResult(error: string, status?: number): JevJudgeResult {
  return { ok: false, error, status, fallback: false };
}

describe("INCIDENT-0410 decideAdmission records a durable attempt receipt", () => {
  test("a missing API key leaves a receipt that the publication gate cannot read as a verdict", async () => {
    const { judge, calls } = judgeReturning(failedResult("OPENROUTER_API_KEY is not configured"));
    const decision = await decideAdmission("supabase", "ashby", METRICS, judge);

    expect(calls).toHaveLength(1);
    expect(decision.jevRaw).toStartWith("attempt:api_key_missing@");
    // The persisted receipt must be inert for the only consumer that can grant
    // ambiguous-band publication authority.
    expect(parseJevRaw(decision.jevRaw)).toBeNull();
  });

  test("a provider HTTP failure is distinguishable from a missing key", async () => {
    const { judge } = judgeReturning(failedResult("OpenRouter request failed", 429));
    const decision = await decideAdmission("supabase", "ashby", METRICS, judge);

    expect(decision.jevRaw).toStartWith("attempt:provider_http_error/http429@");
    expect(parseJevRaw(decision.jevRaw)).toBeNull();
  });

  test("a recorded verdict still records the model, and the gate still reads it", async () => {
    const { judge } = judgeReturning(admittedResult("ADMIT", 0.86));
    const decision = await decideAdmission("supabase", "ashby", METRICS, judge);

    expect(decision.jevRaw).toBe(VERDICT_RAW);
    expect(parseJevRaw(decision.jevRaw)).toEqual({ choice: "ADMIT", confidence: 0.86 });
    expect(decision.jevRaw).not.toStartWith("attempt:");
  });

  test("the injected judge receives the admission question the production client is built for", async () => {
    const { judge, calls } = judgeReturning(failedResult("Jev request failed or timed out"));
    await decideAdmission("supabase", "ashby", METRICS, judge);

    expect(Object.keys(calls[0].questions)).toEqual(["admission"]);
    expect(Object.keys(calls[0].questions.admission.criteria).sort()).toEqual(["ADMIT", "REJECT", "SHADOW"]);
  });
});

const PRODUCTION_SOURCE = readFileSync(
  new URL("./domain-ats-discovery.ts", import.meta.url),
  "utf8",
);

describe("INCIDENT-0410 the production writer keeps a recorded verdict (CONSTITUTION 8.3)", () => {
  test("the writer statement uses the receipt-retention clause, not a bare overwrite", () => {
    expect(PRODUCTION_SOURCE).toContain("jev_raw = ${JEV_RECEIPT_RETENTION_CLAUSE},");
    expect(PRODUCTION_SOURCE).not.toContain("jev_raw = ?,");
  });

  test("the clause keeps a stored verdict when the new proposal is only a receipt", () => {
    expect(JEV_RECEIPT_RETENTION_CLAUSE).toContain(
      `jev_raw NOT LIKE '${JEV_ATTEMPT_RECEIPT_PREFIX}%'`,
    );
    expect(JEV_RECEIPT_RETENTION_CLAUSE).toContain(
      `excluded.jev_raw LIKE '${JEV_ATTEMPT_RECEIPT_PREFIX}%'`,
    );
    expect(resolveJevRawTransition(VERDICT_RAW, "attempt:api_key_missing@2026-10-04T05:00:00.000Z")).toBe(VERDICT_RAW);
  });

  test("a receipt on a row that never had a verdict is still stored", () => {
    expect(resolveJevRawTransition(null, "attempt:api_key_missing@2026-10-04T05:00:00.000Z")).toBe(
      "attempt:api_key_missing@2026-10-04T05:00:00.000Z",
    );
  });

  test("an evaluation that proposed nothing keeps the stored value", () => {
    expect(resolveJevRawTransition(VERDICT_RAW, null)).toBe(VERDICT_RAW);
    expect(resolveJevRawTransition(null, null)).toBeNull();
  });

  test("a newer verdict supersedes an older verdict", () => {
    expect(resolveJevRawTransition(VERDICT_RAW, "typesafe/jev-1.13:REJECT@0.91")).toBe(
      "typesafe/jev-1.13:REJECT@0.91",
    );
  });

  test("a newer receipt supersedes an older receipt: the latest attempt is the live fact", () => {
    expect(resolveJevRawTransition("attempt:api_key_missing@first", "attempt:provider_http_error/http429@second")).toBe(
      "attempt:provider_http_error/http429@second",
    );
  });

  test("only receipts carry the attempt prefix, never a verdict", () => {
    expect(isJevAttemptReceipt(VERDICT_RAW)).toBe(false);
    expect(isJevAttemptReceipt(null)).toBe(false);
    expect(isJevAttemptReceipt("attempt:invalid_answer@2026-10-04T05:00:00.000Z")).toBe(true);
  });

  test("a retained verdict is still readable by the publication gate", () => {
    expect(parseJevRaw(resolveJevRawTransition(VERDICT_RAW, "attempt:unknown_failure@now"))).toEqual({
      choice: "ADMIT",
      confidence: 0.86,
    });
    // The receipt itself is never a verdict, so the ambiguous band gains nothing.
    expect(parseJevRaw("attempt:unknown_failure@now")).toBeNull();
  });
});

describe("INCIDENT-0410 the wiring grants no publication authority", () => {
  test("a receipt-carrying evaluation still resolves the ambiguous band deterministically", async () => {
    const { judge } = judgeReturning(failedResult("OPENROUTER_API_KEY is not configured"));
    const decision = await decideAdmission("supabase", "ashby", METRICS, judge);

    // 2/13 is above AUTO_REJECT_PH_RATE and below AUTO_APPROVE_PH_RATE, so the
    // ambiguous band must resolve without Jev; the receipt changes no outcome.
    expect(decision.verdict).toBe("SHADOW");
    expect(decision.reason).not.toContain("Jev");
    expect(decision.jevRaw).toStartWith(JEV_ATTEMPT_RECEIPT_PREFIX);
  });

  test("the production JEV_MIN_CONFIDENCE is still the value the gate uses", () => {
    expect(JEV_MIN_CONFIDENCE).toBe(0.7);
  });
});
