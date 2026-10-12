import { expect, test } from "bun:test";
import { assessScrapeResponse, MAX_SCRAPE_RESPONSE_BYTES, readScrapeResponseBody } from "./scrape-response";

// All actual non-lock terminal API paths include these fields. Triage is absent
// on the no-jobs/dedup paths; missing optional counters must remain null.
function completed(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { inserted: 0, actualChanges: 0, insertFailedBatches: 0, insertErrors: [],
    failedSources: [], sourceResults: [],
    fetchEventLog: { attempted: 0, recorded: 0, failedBatches: 0 },
    cadenceGuards: { stateAvailable: true }, ...extra };
}
function assess(extra: Record<string, unknown>, status = 200) {
  return assessScrapeResponse(JSON.stringify(completed(extra)), status);
}

test("completed and backlog counts stay API-reported rather than certified public flow", () => {
  const result = assess({ inserted: 3, actualChanges: 3, backlogRemaining: 8 });
  expect(result).toMatchObject({ publicationOutcome: "REPORTED", inserted: 3,
    actualChanges: 3, confirmedPublishedLowerBound: null, reconciliationRequired: false,
    diagnosticsComplete: true, responseEvidence: { terminalState: "completed" } });
  expect(JSON.stringify(result)).not.toContain("certified");
});

test("actual no-jobs and dedup shapes remain valid without optional triage counters", () => {
  for (const skipped of [0, 12]) {
    const result = assess({ skipped, droppedNoUrl: 0, stateWriteFailed: 0 });
    expect(result.responseEvidence.terminalState).toBe("completed");
    expect(result.inserted).toBe(0);
    expect(result.failureCounts.triageFailures).toBeNull();
    expect(result.failureCounts.triageAiUnavailable).toBeNull();
  }
});

test("held lock requires the actual tuple and omits publication counter evidence", () => {
  const result = assessScrapeResponse(JSON.stringify({ skipped: true, reason: "run-lock-held",
    lockState: "held", backlogRemaining: 1 }), 200);
  expect(result).toMatchObject({ publicationOutcome: "SKIPPED", reconciliationRequired: false,
    inserted: null, actualChanges: null, confirmedPublishedLowerBound: null,
    responseEvidence: { terminalState: "lock-held", reason: "RUN_LOCK_HELD" } });
});

for (const contradiction of [{}, { lockState: "unavailable" }, { lockState: "held", inserted: 0 },
  { lockState: "held", actualChanges: null }, { lockState: "held", confirmedPublishedLowerBound: 2 },
  { lockState: "held", triageFailures: "1" }, { lockState: "held", droppedNoUrl: 1 },
  { lockState: "held", backlogRemaining: "invalid" }]) {
  test(`held lock rejects contradictory evidence ${JSON.stringify(contradiction)}`, () => {
    const result = assessScrapeResponse(JSON.stringify({ skipped: true, reason: "run-lock-held", ...contradiction }), 200);
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.inserted).toBeNull();
  });
}

for (const signal of [{ publicationOutcome: "UNKNOWN" }, { exposure: "UNKNOWN" },
  { code: "POST_PERSISTENCE_FAILURE" }, { reconciliationRequired: true }]) {
  for (const status of [200, 500]) {
    test(`uncertainty overrides counts on HTTP ${status}: ${JSON.stringify(signal)}`, () => {
      const result = assess({ ...signal, inserted: 4, actualChanges: 4,
        confirmedPublishedLowerBound: 2 }, status);
      expect(result).toMatchObject({ publicationOutcome: "UNKNOWN", reconciliationRequired: true,
        inserted: null, actualChanges: null, confirmedPublishedLowerBound: 2,
        responseEvidence: { operation: "scrape", httpStatus: status, transport: "COMPLETE",
          bodyValidity: "JSON_OBJECT", terminalState: "unknown", reason: "PUBLICATION_OUTCOME_UNKNOWN" } });
    });
  }
}

test("only a validated nonnegative safe integer prefix can survive unknown publication", () => {
  for (const prefix of [-1, 0.5, "2", null, Number.MAX_SAFE_INTEGER + 1]) {
    expect(assess({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: prefix }, 500)
      .confirmedPublishedLowerBound).toBeNull();
  }
  expect(assess({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 0 }, 500)
    .confirmedPublishedLowerBound).toBe(0);
});

test("ordinary HTTP failures retain status but cannot certify no publication", () => {
  for (const status of [401, 429, 500, 503, 307, 308]) {
    const result = assess({ inserted: 4, actualChanges: 4, error: "PRIVATE_RESPONSE_MARKER" }, status);
    expect(result).toMatchObject({ publicationOutcome: "UNKNOWN", inserted: null,
      actualChanges: null, reconciliationRequired: true, responseEvidence: { httpStatus: status,
        terminalState: "error", reason: "HTTP_RESPONSE_REJECTED" } });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
  }
});

test("transport and interrupted body are explicit uncertainty without exception text", () => {
  expect(assessScrapeResponse("", null, "INCOMPLETE", "UNREADABLE")).toMatchObject({
    publicationOutcome: "UNKNOWN", inserted: null, confirmedPublishedLowerBound: null,
    responseEvidence: { httpStatus: null, transport: "INCOMPLETE", bodyValidity: "UNREADABLE",
      reason: "TRANSPORT_INCOMPLETE" },
  });
  expect(assessScrapeResponse("{", 200, "INCOMPLETE", "UNREADABLE").actualChanges).toBeNull();
});

test("malformed JSON and non-object acknowledgements are never successful zeroes", () => {
  for (const raw of ["not json", "null", "[]", "1", '"ok"', "{}"]) {
    const result = assessScrapeResponse(raw, 200);
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.inserted).toBeNull();
  }
});

test("unsafe, fractional, unequal or incomplete publication totals stay unknown", () => {
  for (const extra of [{ inserted: 0.5, actualChanges: 0.5 }, { inserted: -1 },
    { actualChanges: "0" }, { inserted: Number.MAX_SAFE_INTEGER + 1 },
    { inserted: 2, actualChanges: 1, backlogRemaining: 0 },
    { inserted: 2, actualChanges: 2 }, { skipped: true },
    { publicationOutcome: "REPORTED" }, { reconciliationRequired: "false" }]) {
    expect(assess(extra).publicationOutcome).toBe("UNKNOWN");
  }
});

for (const field of ["insertFailedBatches", "rejectedInsertFailedBatches", "pendingInsertFailedBatches",
  "triageFailures", "triageAiUnavailable", "triageBudgetDeferred", "pendingDrainDeferred",
  "stateWriteFailed", "droppedNoUrl"]) {
  test(`unresolved ${field} fails health while preserving reported publication totals`, () => {
    const result = assess({ [field]: 3 });
    expect(result).toMatchObject({ publicationOutcome: "REPORTED", inserted: 0, actualChanges: 0,
      reconciliationRequired: false, diagnosticsComplete: true,
      responseEvidence: { terminalState: "degraded", reason: "INGESTION_DEGRADED" } });
    expect(result.failureCounts[field as keyof typeof result.failureCounts]).toBe(3);
  });
}

test("malformed supplied failure counters cannot become healthy zeroes", () => {
  for (const invalid of ["1", null, -1, 0.5, {}, Number.MAX_SAFE_INTEGER + 1]) {
    const result = assess({ triageFailures: invalid });
    expect(result.responseEvidence.terminalState).toBe("degraded");
    expect(result.diagnosticsComplete).toBe(false);
    expect(result.failureCounts.triageFailures).toBeNull();
  }
});

test("missing required diagnostics stay incomplete; optional absent counts stay null", () => {
  for (const field of ["insertFailedBatches", "insertErrors", "failedSources", "sourceResults",
    "fetchEventLog", "cadenceGuards"]) {
    const body = completed(); delete body[field];
    const result = assessScrapeResponse(JSON.stringify(body), 200);
    expect(result.responseEvidence.terminalState).toBe("degraded");
    expect(result.diagnosticsComplete).toBe(false);
  }
});

test("failed source, insert and fetch-event evidence degrades without raw text", () => {
  for (const extra of [{ failedSources: ["PRIVATE_RESPONSE_MARKER"] },
    { sourceResults: [{ ok: false, error: "PRIVATE_RESPONSE_MARKER" }] },
    { insertErrors: [{ batchStart: 0, batchSize: 1, error: "PRIVATE_RESPONSE_MARKER" }] },
    { fetchEventLog: { attempted: 1, recorded: 0, failedBatches: 1 } },
    { cadenceGuards: { stateAvailable: false, stateError: "PRIVATE_RESPONSE_MARKER" } }]) {
    const result = assess(extra);
    expect(result.responseEvidence.terminalState).toBe("degraded");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
  }
});

test("invalid diagnostic arrays, nested counts and truncation cannot certify health", () => {
  for (const extra of [{ failedSources: "failed" }, { failedSources: [null] },
    { sourceResults: [{ ok: true, count: 0.5 }] }, { sourceResults: [{ ok: "true", count: 0 }] },
    { insertErrors: [{ batchStart: "0", batchSize: 1 }] },
    { fetchEventLog: { attempted: 1, recorded: 0, failedBatches: "1" } },
    { cadenceGuards: { stateAvailable: "true" } },
    { sourceResults: Array.from({ length: 129 }, () => ({ ok: true, count: 0 })) }]) {
    expect(assess(extra).diagnosticsComplete).toBe(false);
    expect(assess(extra).responseEvidence.terminalState).toBe("degraded");
  }
});

test("unknown acknowledgement preserves only allowlisted metadata", () => {
  const result = assess({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 1,
    error: "PRIVATE_RESPONSE_MARKER", message: "PRIVATE_RESPONSE_MARKER",
    url: "https://PRIVATE_RESPONSE_MARKER", headers: { Authorization: "PRIVATE_RESPONSE_MARKER" },
    receipt: { secret: "PRIVATE_RESPONSE_MARKER" } }, 500);
  expect(result.confirmedPublishedLowerBound).toBe(1);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
});

test("server error acknowledgement is fixed and cannot leak its message", () => {
  const result = assess({ error: "PRIVATE_RESPONSE_MARKER" });
  expect(result.responseEvidence.reason).toBe("SERVER_REPORTED_ERROR");
  expect(JSON.stringify(result)).not.toContain("PRIVATE_RESPONSE_MARKER");
});

test("pure assessment bounds UTF-8 bytes rather than JavaScript characters", () => {
  const raw = JSON.stringify({ error: "é".repeat(MAX_SCRAPE_RESPONSE_BYTES / 2) });
  expect(assessScrapeResponse(raw, 200).responseEvidence.bodyValidity).toBe("OVERSIZED");
});

test("bounded stream stops and cancels without a Content-Length header", async () => {
  let canceled = false;
  let reads = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { reads++; controller.enqueue(new Uint8Array(65_536)); },
    cancel() { canceled = true; },
  });
  expect(await readScrapeResponseBody(new Response(body))).toEqual({ raw: "", bodyValidity: "OVERSIZED" });
  expect(canceled).toBe(true);
  expect(reads).toBeLessThanOrEqual(18);
});

test("exact byte bound allows completion and preserves split UTF-8 chunks", async () => {
  const raw = JSON.stringify({ padding: "x".repeat(MAX_SCRAPE_RESPONSE_BYTES - 14) });
  expect(new TextEncoder().encode(raw).byteLength).toBe(MAX_SCRAPE_RESPONSE_BYTES);
  expect(await readScrapeResponseBody(new Response(raw))).toMatchObject({ raw });
  const bytes = new TextEncoder().encode(JSON.stringify({ message: "é" }));
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    const at = bytes.indexOf(0xc3) + 1;
    controller.enqueue(bytes.slice(0, at)); controller.enqueue(bytes.slice(at)); controller.close();
  } });
  expect((await readScrapeResponseBody(new Response(stream))).raw).toBe(JSON.stringify({ message: "é" }));
});

test("body read failure withholds partial private bytes and exception text", async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new TextEncoder().encode("PRIVATE_RESPONSE_MARKER"));
    controller.error(new Error("PRIVATE_RESPONSE_MARKER"));
  } });
  expect(await readScrapeResponseBody(new Response(stream))).toEqual({ raw: "", bodyValidity: "UNREADABLE" });
});

const REGISTRY_FAILURE = { error: "Source policy verification is temporarily unavailable. Retry shortly.",
  reason: "registry-policy-unavailable", runDurationMs: 8 };
const LOCK_FAILURE = { error: "Scrape coordination is temporarily unavailable. Retry shortly." };

for (const [name, body, failureClass] of [
  ["registry policy", REGISTRY_FAILURE, "REGISTRY_POLICY_UNAVAILABLE"],
  ["run lock", LOCK_FAILURE, "RUN_LOCK_UNAVAILABLE"],
] as const) {
  test(`503 serverFailureClass retains only the exact ${name} signature without accepting publication`, () => {
    const result = assessScrapeResponse(JSON.stringify(body), 503);
    expect(result).toMatchObject({ publicationOutcome: "UNKNOWN", reconciliationRequired: true,
      inserted: null, actualChanges: null, confirmedPublishedLowerBound: null, diagnosticsComplete: false,
      responseEvidence: { httpStatus: 503, transport: "COMPLETE", bodyValidity: "JSON_OBJECT",
        terminalState: "error", reason: "HTTP_RESPONSE_REJECTED", serverFailureClass: failureClass } });
    expect(JSON.stringify(result)).not.toContain(body.error);
    expect(Object.values(result.failureCounts).every(value => value === null)).toBe(true);
  });
}

for (const [name, body] of [
  ["private message", { error: "PRIVATE_503_ERROR SECRET_503_TOKEN" }],
  ["code-like untrusted message", { error: "REGISTRY_POLICY_UNAVAILABLE" }],
  ["non-string error", { error: [LOCK_FAILURE.error] }],
  ["registry reason without exact error", { ...REGISTRY_FAILURE, error: "PRIVATE_503_ERROR" }],
  ["registry error without reason", { error: REGISTRY_FAILURE.error, runDurationMs: 8 }],
  ["registry duration missing", { error: REGISTRY_FAILURE.error, reason: REGISTRY_FAILURE.reason }],
  ["registry duration invalid", { ...REGISTRY_FAILURE, runDurationMs: "8" }],
  ["registry duration negative", { ...REGISTRY_FAILURE, runDurationMs: -1 }],
  ["contradictory registry reason and lock error", { ...REGISTRY_FAILURE, ...LOCK_FAILURE }],
  ["contradictory lock reason", { ...LOCK_FAILURE, reason: "run-lock-held" }],
  ["positive publication evidence", { ...REGISTRY_FAILURE, inserted: 27, actualChanges: 27 }],
  ["uncertain publication evidence", { ...REGISTRY_FAILURE, publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 2 }],
  ["extra private fields", { ...LOCK_FAILURE, message: "PRIVATE_503_ERROR", credential: "SECRET_503_TOKEN" }],
  ["server-supplied class spoof", { ...LOCK_FAILURE, serverFailureClass: "REGISTRY_POLICY_UNAVAILABLE" }],
  ["array body", [REGISTRY_FAILURE]],
] as const) {
  test(`503 serverFailureClass abstains on ${name} without retaining private or contradictory input`, () => {
    const result = assessScrapeResponse(JSON.stringify(body), 503);
    expect(result.responseEvidence.serverFailureClass).toBe("UNCLASSIFIED_SERVER_ERROR");
    expect(result.publicationOutcome).toBe("UNKNOWN");
    expect(result.inserted).toBeNull();
    expect(result.actualChanges).toBeNull();
    expect(result.reconciliationRequired).toBe(true);
    const retained = JSON.stringify(result);
    expect(retained).not.toContain("PRIVATE_503_ERROR");
    expect(retained).not.toContain("SECRET_503_TOKEN");
  });
}

test("serverFailureClass requires 503 for known signatures and never annotates non-server responses", () => {
  for (const status of [200, 401, 429, null, 600]) {
    expect(assessScrapeResponse(JSON.stringify(REGISTRY_FAILURE), status).responseEvidence.serverFailureClass).toBeUndefined();
  }
  for (const status of [500, 502, 504]) {
    expect(assessScrapeResponse(JSON.stringify(REGISTRY_FAILURE), status).responseEvidence.serverFailureClass).toBe("UNCLASSIFIED_SERVER_ERROR");
  }
  expect(assess({}).responseEvidence.serverFailureClass).toBeUndefined();
  expect(assessScrapeResponse(JSON.stringify({ skipped: true, reason: "run-lock-held", lockState: "held" }), 200)
    .responseEvidence.serverFailureClass).toBeUndefined();
});

test("503 serverFailureClass cannot use malformed oversized unreadable or incomplete response evidence", () => {
  for (const result of [
    assessScrapeResponse("{", 503),
    assessScrapeResponse(JSON.stringify(REGISTRY_FAILURE), 503, "INCOMPLETE"),
    assessScrapeResponse(JSON.stringify(REGISTRY_FAILURE), 503, "COMPLETE", "UNREADABLE"),
    assessScrapeResponse(JSON.stringify(REGISTRY_FAILURE), 503, "COMPLETE", "OVERSIZED"),
    assessScrapeResponse(JSON.stringify({ ...REGISTRY_FAILURE, padding: "x".repeat(MAX_SCRAPE_RESPONSE_BYTES) }), 503),
  ]) {
    expect(result.responseEvidence.serverFailureClass).toBe("UNCLASSIFIED_SERVER_ERROR");
    expect(result.inserted).toBeNull();
    expect(result.publicationOutcome).toBe("UNKNOWN");
  }
});
