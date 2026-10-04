import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import { judgeViaJev, type JevJudgeRequest } from "../../packages/scraper/jev-client";
import { JEV_MIN_CONFIDENCE, parseJevRaw } from "./auto-publish-policy";
import {
  JEV_ATTEMPT_OUTCOMES,
  JEV_RECEIPT_CONFLICT_CLAUSE,
  RECEIPT_PROBE_TABLE,
  RECEIPT_RETENTION_UPSERT_SQL,
  classifyJevAttempt,
  describeReceiptTransition,
  renderAttemptReceipt,
  retainVerdictReceipt,
} from "./jev-verdict-receipt";

/**
 * INCIDENT-0410: the Jev attempt must be observable, and a recorded verdict must
 * survive a later evaluation that produced none.
 *
 * Every expectation below is produced by the REAL client
 * (`judgeViaJev`, driven through an injected fetch) and the REAL publication
 * gate (`parseJevRaw`). No threshold and no receipt format is asserted against a
 * copy of itself, and nothing here lowers `JEV_MIN_CONFIDENCE`, the Wilson
 * floor or any quality ceiling.
 */

const ADMISSION_REQUEST: JevJudgeRequest = {
  task: "Admit ATS tenant as autonomous VA lake source",
  state: "tenant=ashby/supabase total=13 qualified=2 ph_rate=0.154",
  questions: {
    admission: {
      instructions: "Choose ADMIT, SHADOW or REJECT.",
      criteria: { ADMIT: "Publish", SHADOW: "Hold", REJECT: "Reject" },
    },
  },
  timeoutMs: 8_000,
};

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

function openProbe(): Database {
  const db = new Database(":memory:");
  db.run(`
    CREATE TABLE ${RECEIPT_PROBE_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ats_family TEXT NOT NULL COLLATE NOCASE,
      tenant_slug TEXT NOT NULL,
      review_status TEXT NOT NULL,
      jev_raw TEXT,
      UNIQUE (ats_family, tenant_slug)
    );
  `.trim());
  return db;
}

describe("classifyJevAttempt over the real client", () => {
  test("a valid System One answer is the only recorded verdict", async () => {
    const result = await judgeViaJev("test-key", ADMISSION_REQUEST, jsonFetch({
      model: "typesafe/jev-1.13-20260917",
      answers: { admission: { choice: "SHADOW", confidence: 0.62, probabilities: { ADMIT: 0.2, SHADOW: 0.62, REJECT: 0.18 } } },
    }));
    const record = classifyJevAttempt(result);
    expect(record.outcome).toBe("verdict_recorded");
    expect(record.unclassified).toBe(false);
    expect(record.model).toBe("typesafe/jev-1.13-20260917");
    expect(record.choice).toBe("SHADOW");
    expect(record.confidence).toBeCloseTo(0.62, 10);
  });

  test("the recorded format is exactly what the real publication gate parses", async () => {
    const result = await judgeViaJev("test-key", ADMISSION_REQUEST, jsonFetch({
      model: "typesafe/jev-1.13-20260917",
      answers: { admission: { choice: "ADMIT", confidence: 0.91, probabilities: { ADMIT: 0.91, SHADOW: 0.06, REJECT: 0.03 } } },
    }));
    const receipt = renderAttemptReceipt(classifyJevAttempt(result), "2026-10-04T04:30:00Z");
    expect(parseJevRaw(receipt)).toEqual({ choice: "ADMIT", confidence: 0.91 });
    expect(parseJevRaw(receipt)!.confidence).toBeGreaterThanOrEqual(JEV_MIN_CONFIDENCE);
  });

  test("a missing API key is distinguishable from every other failure", async () => {
    const record = classifyJevAttempt(await judgeViaJev(undefined, ADMISSION_REQUEST, jsonFetch({})));
    expect(record.outcome).toBe("api_key_missing");
    expect(record.httpStatus).toBeNull();
    expect(record.choice).toBeNull();
  });

  test("transport failure and timeout share one outcome and cannot be split apart", async () => {
    const thrown = await judgeViaJev("test-key", ADMISSION_REQUEST, (() => {
      throw new Error("socket hang up");
    }) as unknown as typeof fetch);
    expect(classifyJevAttempt(thrown).outcome).toBe("transport_failed_or_timed_out");

    const slow = await judgeViaJev(
      "test-key",
      { ...ADMISSION_REQUEST, timeoutMs: 20 },
      ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })) as unknown as typeof fetch,
    );
    expect(classifyJevAttempt(slow).outcome).toBe("transport_failed_or_timed_out");
    expect(classifyJevAttempt(slow).unclassified).toBe(false);
  });

  test("a provider HTTP error keeps its status code", async () => {
    const record = classifyJevAttempt(await judgeViaJev("test-key", ADMISSION_REQUEST, jsonFetch({ error: "nope" }, 429)));
    expect(record.outcome).toBe("provider_http_error");
    expect(record.httpStatus).toBe(429);
  });

  test("a 200 with unparsable JSON is not counted as an HTTP failure", async () => {
    const bad = (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch;
    const record = classifyJevAttempt(await judgeViaJev("test-key", ADMISSION_REQUEST, bad));
    expect(record.outcome).toBe("invalid_response_json");
  });

  test("an unexpected model id is refused rather than trusted", async () => {
    const record = classifyJevAttempt(await judgeViaJev("test-key", ADMISSION_REQUEST, jsonFetch({
      model: "some/other-model",
      answers: { admission: { choice: "ADMIT", confidence: 0.99, probabilities: { ADMIT: 0.99, SHADOW: 0.005, REJECT: 0.005 } } },
    })));
    expect(record.outcome).toBe("unexpected_model");
    expect(record.choice).toBeNull();
  });

  test("an answer whose probabilities do not sum to one is refused", async () => {
    const record = classifyJevAttempt(await judgeViaJev("test-key", ADMISSION_REQUEST, jsonFetch({
      model: "typesafe/jev-1.13",
      answers: { admission: { choice: "ADMIT", confidence: 0.99, probabilities: { ADMIT: 0.9, SHADOW: 0.4, REJECT: 0.05 } } },
    })));
    expect(record.outcome).toBe("invalid_answer");
  });

  test("an unrecognised diagnostic stays unclassified instead of being guessed", () => {
    const record = classifyJevAttempt({ ok: false, error: "something new", fallback: true });
    expect(record.outcome).toBe("unknown_failure");
    expect(record.unclassified).toBe(true);
  });

  test("a malformed request is refused before any network call", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const record = classifyJevAttempt(await judgeViaJev("test-key", { ...ADMISSION_REQUEST, questions: {} }, spy));
    expect(record.outcome).toBe("invalid_request");
    expect(called).toBe(false);
  });

  test("every outcome this module can report is declared", async () => {
    const observed = new Set<string>();
    for (const result of [
      { ok: false, error: "OPENROUTER_API_KEY is not configured", fallback: true },
      { ok: false, error: "Jev request failed or timed out", fallback: true },
      { ok: false, error: "OpenRouter request failed (HTTP 500)", status: 500, fallback: true },
      { ok: false, error: "OpenRouter request failed (HTTP 200, invalid JSON)", fallback: true },
      { ok: false, error: "Provider returned an unexpected model", fallback: true },
      { ok: false, error: "Invalid Jev decision response", fallback: true },
      { ok: false, error: "questions are required", fallback: true },
      { ok: false, error: "timeoutMs must be between 1 and 30000", fallback: true },
      { ok: false, error: "unmapped", fallback: true },
    ]) {
      observed.add(classifyJevAttempt(result as never).outcome);
    }
    for (const outcome of observed) expect(JEV_ATTEMPT_OUTCOMES).toContain(outcome);
  });
});

describe("attempt receipts cannot widen the publication gate", () => {
  const failed = [
    "api_key_missing",
    "transport_failed_or_timed_out",
    "provider_http_error",
    "invalid_response_json",
    "unexpected_model",
    "invalid_answer",
    "invalid_request",
    "unknown_failure",
  ] as const;

  test("no failure receipt parses as a verdict in the real gate", () => {
    for (const outcome of failed) {
      const record = classifyJevAttempt({
        ok: false,
        error: outcome,
        status: outcome === "provider_http_error" ? 503 : undefined,
        fallback: true,
      });
      const receipt = renderAttemptReceipt(record, "2026-10-04T04:30:00Z");
      expect(parseJevRaw(receipt)).toBeNull();
    }
  });

  test("an attempt receipt carries its cause and never leaks request content", () => {
    const receipt = renderAttemptReceipt(
      classifyJevAttempt({ ok: false, error: "OpenRouter request failed (HTTP 429)", status: 429, fallback: true }),
      "2026-10-04T04:30:00Z",
    );
    expect(receipt).toBe("attempt:provider_http_error/http429@2026-10-04T04:30:00Z");
    expect(receipt).not.toContain("ADMIT");
  });

  test("a receipt stays inside the column bound", () => {
    const receipt = renderAttemptReceipt(
      classifyJevAttempt({ ok: false, error: "unmapped", fallback: true }),
      "x".repeat(2000),
    );
    expect(receipt.length).toBeLessThanOrEqual(500);
  });
});

describe("C18 verdict retention", () => {
  test("a later evaluation without a verdict cannot erase a recorded one", () => {
    expect(retainVerdictReceipt("typesafe/jev-1.13-20260917:REJECT@0.94", null)).toBe(
      "typesafe/jev-1.13-20260917:REJECT@0.94",
    );
    expect(retainVerdictReceipt("typesafe/jev-1.13-20260917:REJECT@0.94", undefined)).toBe(
      "typesafe/jev-1.13-20260917:REJECT@0.94",
    );
  });

  test("a newer verdict supersedes an older one instead of being dropped", () => {
    const transition = describeReceiptTransition("typesafe/jev-1.13:SHADOW@0.62", "typesafe/jev-1.13:ADMIT@0.88");
    expect(transition.retained).toBe("typesafe/jev-1.13:ADMIT@0.88");
    expect(transition.superseded).toBe(true);
    expect(transition.preserved).toBe(false);
  });

  test("preserving an old verdict is reported, not silent", () => {
    const transition = describeReceiptTransition("typesafe/jev-1.13:ADMIT@0.81", null);
    expect(transition.preserved).toBe(true);
    expect(transition.retained).toBe("typesafe/jev-1.13:ADMIT@0.81");
  });

  test("a tenant that never had a verdict stays null", () => {
    expect(retainVerdictReceipt(null, null)).toBeNull();
    expect(describeReceiptTransition(undefined, undefined).retained).toBeNull();
  });

  test("an attempt receipt supersedes an attempt receipt but never a verdict", () => {
    const attempt = "attempt:api_key_missing@2026-10-04T04:30:00Z";
    expect(retainVerdictReceipt(attempt, "attempt:api_key_missing@2026-10-04T05:30:00Z")).toBe(
      "attempt:api_key_missing@2026-10-04T05:30:00Z",
    );
    expect(retainVerdictReceipt("typesafe/jev-1.13:ADMIT@0.81", attempt)).toBe(attempt);
  });
});

describe("the proposed upsert clause, executed on the real column shape", () => {
  test("keeps a stored verdict when the new evaluation produced none", () => {
    const db = openProbe();
    db.run(RECEIPT_RETENTION_UPSERT_SQL, ["ashby", "supabase", "shadow_monitor", "typesafe/jev-1.13:SHADOW@0.91"]);
    db.run(RECEIPT_RETENTION_UPSERT_SQL, ["ashby", "supabase", "shadow_monitor", null]);
    const row = db
      .query(`SELECT review_status, jev_raw FROM ${RECEIPT_PROBE_TABLE} WHERE tenant_slug = ?`)
      .get("supabase") as { review_status: string; jev_raw: string | null };
    expect(row.review_status).toBe("shadow_monitor");
    expect(row.jev_raw).toBe("typesafe/jev-1.13:SHADOW@0.91");
    db.close();
  });

  test("the naive clause used today would have erased it", () => {
    const db = openProbe();
    const naive = RECEIPT_RETENTION_UPSERT_SQL.replace(
      JEV_RECEIPT_CONFLICT_CLAUSE,
      "excluded.jev_raw",
    );
    db.run(naive, ["breezy", "sourcefit", "shadow_monitor", "typesafe/jev-1.13:SHADOW@0.91"]);
    db.run(naive, ["breezy", "sourcefit", "shadow_monitor", null]);
    const row = db
      .query(`SELECT jev_raw FROM ${RECEIPT_PROBE_TABLE} WHERE tenant_slug = ?`)
      .get("sourcefit") as { jev_raw: string | null };
    expect(row.jev_raw).toBeNull();
    db.close();
  });

  test("a newer verdict still replaces an older one through the same clause", () => {
    const db = openProbe();
    db.run(RECEIPT_RETENTION_UPSERT_SQL, ["greenhouse", "gitlab", "shadow_monitor", "typesafe/jev-1.13:SHADOW@0.55"]);
    db.run(RECEIPT_RETENTION_UPSERT_SQL, ["greenhouse", "gitlab", "auto_approved", "typesafe/jev-1.13:ADMIT@0.86"]);
    const row = db
      .query(`SELECT review_status, jev_raw FROM ${RECEIPT_PROBE_TABLE} WHERE tenant_slug = ?`)
      .get("gitlab") as { review_status: string; jev_raw: string | null };
    expect(row.jev_raw).toBe("typesafe/jev-1.13:ADMIT@0.86");
    expect(row.review_status).toBe("auto_approved");
    expect(parseJevRaw(row.jev_raw)).toEqual({ choice: "ADMIT", confidence: 0.86 });
    db.close();
  });

  test("repeated unjudged evaluations stay idempotent", () => {
    const db = openProbe();
    db.run(RECEIPT_RETENTION_UPSERT_SQL, ["ashby", "multiplymii", "shadow_monitor", "typesafe/jev-1.13:REJECT@0.77"]);
    for (let i = 0; i < 3; i += 1) {
      db.run(RECEIPT_RETENTION_UPSERT_SQL, ["ashby", "multiplymii", "shadow_monitor", null]);
    }
    const count = db
      .query(`SELECT COUNT(*) AS n FROM ${RECEIPT_PROBE_TABLE} WHERE jev_raw = ?`)
      .get("typesafe/jev-1.13:REJECT@0.77") as { n: number };
    expect(count.n).toBe(1);
    db.close();
  });
});