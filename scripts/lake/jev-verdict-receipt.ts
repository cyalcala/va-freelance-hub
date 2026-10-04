/**
 * INCIDENT-0410: durable Jev verdict-attempt receipts and C18 verdict retention.
 *
 * Why this module exists. `scripts/lake/domain-ats-discovery.ts` asks Jev for an
 * ATS-tenant admission verdict through `judgeViaJev`
 * (`packages/scraper/jev-client.ts`) and persists the answer in
 * `lake_ats_discovery.jev_raw`. The live lake, read 2026-10-04 (VERIFIED_LIVE),
 * holds 1528 tenant evaluations between `2026-10-01 13:32:41Z` and
 * `2026-10-03 21:39:59Z` whose `jev_raw` is NULL, against 98 rows that carry a
 * verdict, all recorded inside one 16-minute window on 2026-09-26. Because
 * `decideAdmission` records nothing when the call fails, `jev_raw IS NULL`
 * cannot distinguish "never consulted", "no API key", "timed out", "HTTP
 * error", "unexpected model" and "invalid answer". That single ambiguity is why
 * the question "why is Jev silent" survived four sessions.
 *
 * What this module is. Pure, writer-free logic for two things:
 *   1. `classifyJevAttempt` turns the real `JevJudgeResult` returned by the real
 *      client into a durable, gate-neutral attempt outcome. It carries no
 *      request or response content: the client's fixed-diagnostic contract is
 *      preserved, because source-derived text is untrusted.
 *   2. `retainVerdictReceipt` implements CONSTITUTION §8.3 (C18) for a
 *      single-column current-state row: a recorded verdict is never erased by a
 *      later evaluation that produced no verdict. Erasing it would falsify the
 *      historical fact that the decision was made, which §1.3 #4 forbids.
 *
 * What this module is not. It grants no authority and changes no runtime. The
 * production writer is `domain-ats-discovery.ts:625-639`, a MERGE_RUBRIC §4.3
 * HOLD path, so the two-line adoption fix is a proposal, not a commit. Nothing
 * here lowers `JEV_MIN_CONFIDENCE` (0.70), `PUBLISH_PH_RATE_FLOOR` (0.20) or any
 * quality ceiling, and Jev stays L1 ADVISE: `renderAttemptReceipt` is proved
 * below to be inert for the publication gate.
 */

import type { JevJudgeResult } from "../../packages/scraper/jev-client";

/** Durable, content-free outcome of one Jev consultation attempt. */
export const JEV_ATTEMPT_OUTCOMES = [
  "verdict_recorded",
  "api_key_missing",
  "transport_failed_or_timed_out",
  "provider_http_error",
  "invalid_response_json",
  "unexpected_model",
  "invalid_answer",
  "invalid_request",
  "unknown_failure",
] as const;

export type JevAttemptOutcome = (typeof JEV_ATTEMPT_OUTCOMES)[number];

export type JevAttemptRecord = {
  outcome: JevAttemptOutcome;
  /** Provider HTTP status when the failure reported one, else null. */
  httpStatus: number | null;
  /** Model echoed by the provider on a recorded verdict, else null. */
  model: string | null;
  /** Verdict choice and confidence when one was validated, else null. */
  choice: "ADMIT" | "SHADOW" | "REJECT" | null;
  confidence: number | null;
  /**
   * True when the outcome cannot be resolved into one of the named causes, so a
   * reviewer must read provider telemetry instead of the lake. Never silently
   * folded into a named cause: an unclassified attempt is itself the finding.
   */
  unclassified: boolean;
};

const ADMISSION_QUESTION = "admission";

/**
 * Classifies one real client result. Pure and total: every possible
 * `JevJudgeResult` maps to exactly one outcome, including an empty one.
 */
export function classifyJevAttempt(
  result: JevJudgeResult,
  questionName: string = ADMISSION_QUESTION,
): JevAttemptRecord {
  const answer = result.answers?.[questionName];
  if (result.ok && answer) {
    return {
      outcome: "verdict_recorded",
      httpStatus: typeof result.status === "number" ? result.status : null,
      model: typeof result.model === "string" ? result.model : null,
      choice: answer.choice as JevAttemptRecord["choice"],
      confidence: answer.confidence,
      unclassified: false,
    };
  }

  const error = (result.error ?? "").trim();
  const httpStatus = typeof result.status === "number" ? result.status : null;
  return {
    outcome: classifyFailure(error, httpStatus),
    httpStatus,
    model: null,
    choice: null,
    confidence: null,
    unclassified: classifyFailure(error, httpStatus) === "unknown_failure",
  };
}

/**
 * Maps the client's fixed diagnostic strings onto durable outcomes. The client
 * emits a closed set (see `packages/scraper/jev-client.ts`); anything else is
 * reported as `unknown_failure` rather than guessed, so an unrecognised provider
 * failure cannot masquerade as a known cause.
 */
function classifyFailure(error: string, httpStatus: number | null): JevAttemptOutcome {
  if (error.startsWith("OPENROUTER_API_KEY is not configured")) return "api_key_missing";
  if (error === "Jev request failed or timed out") return "transport_failed_or_timed_out";
  if (error.includes("invalid JSON")) return "invalid_response_json";
  if (error === "Provider returned an unexpected model") return "unexpected_model";
  if (error === "Invalid Jev decision response") return "invalid_answer";
  if (error === "questions are required" || error === "each question needs at least two criteria") {
    return "invalid_request";
  }
  if (error.startsWith("timeoutMs must be between")) return "invalid_request";
  if (error.startsWith("OpenRouter request failed") && httpStatus !== null) {
    return "provider_http_error";
  }
  return "unknown_failure";
}

export type ReceiptTransition = {
  /** The receipt that must be persisted after the transition. */
  retained: string | null;
  /** True when a recorded receipt was preserved instead of being overwritten. */
  preserved: boolean;
  /** True when a different non-null receipt replaces an older one (C18 supersession). */
  superseded: boolean;
};

/**
 * C18 retention for a single-column current-state row.
 *
 * A newer evaluation with no verdict must not blank an older recorded verdict:
 * the older decision remains historically valid as a past assertion. A newer
 * non-null receipt does supersede an older one, which is allowed and reported.
 */
export function describeReceiptTransition(
  previous: string | null | undefined,
  next: string | null | undefined,
): ReceiptTransition {
  const prior = previous ?? null;
  const fresh = next ?? null;
  if (fresh === null) {
    return { retained: prior, preserved: prior !== null, superseded: false };
  }
  return { retained: fresh, preserved: false, superseded: prior !== null && prior !== fresh };
}

/** The persisted value for the transition: a verdict is never erased. */
export function retainVerdictReceipt(
  previous: string | null | undefined,
  next: string | null | undefined,
): string | null {
  return describeReceiptTransition(previous, next).retained;
}

/**
 * Renders an attempt outcome as the durable, gate-neutral text a lake writer
 * should store when no verdict was produced.
 *
 * Gate-neutrality is the whole point, and it is proved against the real
 * `parseJevRaw` in `auto-publish-policy.ts`: the text contains no
 * `:(ADMIT|SHADOW|REJECT)@` token, so an attempt receipt can never be read as a
 * verdict and can never satisfy the ambiguous band's only relief. It records
 * that an attempt happened, which is the evidence that is currently missing.
 */
export function renderAttemptReceipt(record: JevAttemptRecord, observedAt: string): string {
  if (record.outcome === "verdict_recorded") {
    const model = record.model ?? "unknown-model";
    return `${model}:${record.choice}@${record.confidence}`;
  }
  const status = record.httpStatus === null ? "" : `/http${record.httpStatus}`;
  return `${JEV_ATTEMPT_RECEIPT_PREFIX}${record.outcome}${status}@${observedAt}`.slice(0, 500);
}

/**
 * The conflict clause a `lake_ats_discovery` upsert must use to keep C18
 * retention. `excluded.jev_raw` is the value proposed by this evaluation and the
 * unqualified column is the stored one, so a null proposal keeps the stored
 * verdict. This is proposal text for the HOLD-path writer, not production SQL.
 */
export const JEV_RECEIPT_CONFLICT_CLAUSE = "coalesce(excluded.jev_raw, jev_raw)";

/**
 * Prefix that marks a stored value as an attempt receipt rather than a verdict.
 * A verdict is `<model>:<CHOICE>@<confidence>`; a receipt never starts this way,
 * so the two are distinguishable without re-parsing the confidence.
 */
export const JEV_ATTEMPT_RECEIPT_PREFIX = "attempt:";

/**
 * The conflict clause a `lake_ats_discovery` upsert must use when attempt
 * receipts share the `jev_raw` column with recorded verdicts.
 *
 * It is strictly stronger than {@link JEV_RECEIPT_CONFLICT_CLAUSE}, which only
 * stops a null proposal from blanking a stored value. C18 (CONSTITUTION §8.3)
 * protects a recorded *decision*: an attempt receipt is not a decision, so a
 * receipt proposed by a later evaluation must not displace a verdict that was
 * actually recorded. Otherwise the observability fix would itself erase the
 * historical fact, which §1.3 #4 forbids.
 *
 *   stored verdict + new receipt -> keep the verdict
 *   stored anything  + new null   -> keep the stored value
 *   stored verdict + new verdict  -> supersede (allowed, reported)
 */
export const JEV_RECEIPT_RETENTION_CLAUSE = `CASE
  WHEN jev_raw IS NOT NULL
   AND jev_raw NOT LIKE '${JEV_ATTEMPT_RECEIPT_PREFIX}%'
   AND excluded.jev_raw LIKE '${JEV_ATTEMPT_RECEIPT_PREFIX}%'
  THEN jev_raw
  ELSE coalesce(excluded.jev_raw, jev_raw)
END`;

/** True when a stored `jev_raw` value is an attempt receipt, not a verdict. */
export function isJevAttemptReceipt(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(JEV_ATTEMPT_RECEIPT_PREFIX);
}

/**
 * Executable specification of {@link JEV_RECEIPT_RETENTION_CLAUSE}.
 *
 * `retainVerdictReceipt` implements the weaker null-only rule that predates
 * receipts; this is the rule a writer must use once receipts and verdicts share
 * the column. Kept as an explicit second function rather than folded into the
 * first so the two contracts cannot be confused.
 */
export function resolveJevRawTransition(
  stored: string | null | undefined,
  proposed: string | null | undefined,
): string | null {
  const prior = stored ?? null;
  const next = proposed ?? null;
  if (prior !== null && !isJevAttemptReceipt(prior) && isJevAttemptReceipt(next)) return prior;
  return next ?? prior;
}

/**
 * Executable proof harness: the real `lake_ats_discovery` column shape
 * (`scripts/lake/init-lake.ts:152` and `domain-ats-discovery.ts:625-639`) with
 * the retention clause applied, so a reviewer can run the adoption fix without
 * touching production. It writes only the local in-memory table named here.
 */
export const RECEIPT_PROBE_TABLE = "jev_receipt_probe";

export const RECEIPT_RETENTION_UPSERT_SQL = `
INSERT INTO ${RECEIPT_PROBE_TABLE} (ats_family, tenant_slug, review_status, jev_raw)
VALUES (?, ?, ?, ?)
ON CONFLICT(ats_family, tenant_slug) DO UPDATE SET
  review_status = excluded.review_status,
  jev_raw = ${JEV_RECEIPT_CONFLICT_CLAUSE};
`.trim();