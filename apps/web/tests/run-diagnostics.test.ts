import { describe, expect, test } from "bun:test";
import {
  DIAG_ERROR_MAX_LENGTH,
  INGEST_DIAG_ID,
  buildIngestDiagRow,
  buildIngestDiagUpdate,
  summarizeRunDiagnostics,
} from "../src/lib/run-diagnostics";

describe("summarizeRunDiagnostics", () => {
  test("a clean run produces no summary", () => {
    const result = summarizeRunDiagnostics({
      insertFailedBatches: 0,
      insertErrorCount: 0,
      triageFailures: 0,
      failedSourceCount: 0,
      cadenceStateAvailable: true,
    });

    expect(result.degraded).toBe(false);
    expect(result.signalCount).toBe(0);
    expect(result.summary).toBeNull();
  });

  test("an empty input is treated as clean", () => {
    expect(summarizeRunDiagnostics({}).degraded).toBe(false);
  });

  test("failed insert batches are reported", () => {
    const result = summarizeRunDiagnostics({ insertFailedBatches: 3 });

    expect(result.degraded).toBe(true);
    expect(result.signalCount).toBe(1);
    expect(result.summary).toBe("insertFailedBatches=3");
  });

  test("failed fetch-event logging is reported (the S-1 regression class)", () => {
    const result = summarizeRunDiagnostics({ fetchEventFailedBatches: 2 });

    expect(result.degraded).toBe(true);
    expect(result.summary).toBe("fetchEventFailedBatches=2");
  });

  test("items dropped at the final URL boundary degrade the durable run", () => {
    const result = summarizeRunDiagnostics({ droppedNoUrl: 4 });
    expect(result.degraded).toBe(true);
    expect(result.summary).toBe("droppedNoUrl=4");
  });

  test("triage failures and AI unavailability are distinct signals", () => {
    const result = summarizeRunDiagnostics({
      triageFailures: 4,
      triageAiUnavailable: 7,
    });

    expect(result.signalCount).toBe(2);
    expect(result.summary).toContain("triageFailures=4");
    expect(result.summary).toContain("triageAiUnavailable=7");
  });

  test("budget-deferred triage is a distinct, surfaced signal", () => {
    const result = summarizeRunDiagnostics({
      triageBudgetDeferred: 9,
      triageAiUnavailable: 0,
    });

    expect(result.degraded).toBe(true);
    expect(result.signalCount).toBe(1);
    expect(result.summary).toBe("triageBudgetDeferred=9");
  });

  test("unavailable cadence state is reported only when explicitly false", () => {
    expect(summarizeRunDiagnostics({ cadenceStateAvailable: false }).summary)
      .toBe("cadenceStateUnavailable");
    // undefined means "not reported", which must not read as a failure.
    expect(summarizeRunDiagnostics({ cadenceStateAvailable: undefined }).degraded)
      .toBe(false);
    expect(summarizeRunDiagnostics({ cadenceStateAvailable: true }).degraded)
      .toBe(false);
  });

  test("multiple signals are joined and counted", () => {
    const result = summarizeRunDiagnostics({
      insertFailedBatches: 1,
      insertErrorCount: 2,
      rejectedInsertFailedBatches: 3,
      fetchEventFailedBatches: 4,
      triageFailures: 5,
      triageAiUnavailable: 6,
      failedSourceCount: 7,
      cadenceStateAvailable: false,
    });

    expect(result.degraded).toBe(true);
    expect(result.signalCount).toBe(8);
    expect(result.summary).toContain("insertFailedBatches=1");
    expect(result.summary).toContain("cadenceStateUnavailable");
  });

  test("negative, fractional and non-finite counters never fire a signal", () => {
    const result = summarizeRunDiagnostics({
      insertFailedBatches: -1,
      triageFailures: Number.NaN,
      failedSourceCount: Number.POSITIVE_INFINITY,
    });

    expect(result.degraded).toBe(false);
  });

  test("fractional counters are floored rather than dropped", () => {
    expect(summarizeRunDiagnostics({ insertFailedBatches: 2.9 }).summary)
      .toBe("insertFailedBatches=2");
  });

  test("a pathological error set is truncated for storage", () => {
    const result = summarizeRunDiagnostics({
      insertFailedBatches: Number.MAX_SAFE_INTEGER,
      insertErrorCount: Number.MAX_SAFE_INTEGER,
      rejectedInsertFailedBatches: Number.MAX_SAFE_INTEGER,
      fetchEventFailedBatches: Number.MAX_SAFE_INTEGER,
      triageFailures: Number.MAX_SAFE_INTEGER,
      triageAiUnavailable: Number.MAX_SAFE_INTEGER,
      failedSourceCount: Number.MAX_SAFE_INTEGER,
    });

    expect(result.summary!.length).toBeLessThanOrEqual(DIAG_ERROR_MAX_LENGTH);
  });
});

describe("buildIngestDiagRow", () => {
  const observedAt = "2026-08-11T00:00:00.000Z";

  test("a clean run stamps both the attempt and the success heartbeat", () => {
    const row = buildIngestDiagRow(observedAt, summarizeRunDiagnostics({}));

    expect(row.sourceId).toBe(INGEST_DIAG_ID);
    expect(row.lastAttemptAt).toBe(observedAt);
    expect(row.lastSuccessAt).toBe(observedAt);
    expect(row.lastError).toBeNull();
    expect(row.lastCount).toBe(0);
  });

  test("a degraded run stamps the attempt but not the success heartbeat", () => {
    const row = buildIngestDiagRow(
      observedAt,
      summarizeRunDiagnostics({ insertFailedBatches: 1 }),
    );

    expect(row.lastAttemptAt).toBe(observedAt);
    expect(row.lastSuccessAt).toBeNull();
    expect(row.lastError).toBe("insertFailedBatches=1");
    expect(row.lastCount).toBe(1);
  });

  test("the row is marked as a diagnostic, not a real source", () => {
    const row = buildIngestDiagRow(observedAt, summarizeRunDiagnostics({}));

    expect(row.sourceType).toBe("diag");
    expect(row.collectionMethod).toBe("diag");
    expect(row.complianceStatus).toBe("diag");
  });
});

describe("buildIngestDiagUpdate", () => {
  const observedAt = "2026-08-11T00:00:00.000Z";

  test("a clean run advances the success heartbeat and clears the error", () => {
    const update = buildIngestDiagUpdate(observedAt, summarizeRunDiagnostics({}));

    expect(update).toHaveProperty("lastSuccessAt", observedAt);
    expect(update.lastError).toBeNull();
    expect(update.lastAttemptAt).toBe(observedAt);
  });

  test("a degraded run omits lastSuccessAt so the last clean run is preserved", () => {
    const update = buildIngestDiagUpdate(
      observedAt,
      summarizeRunDiagnostics({ triageFailures: 2 }),
    );

    // Writing null here would erase the value that tells an operator how long
    // the degradation has lasted.
    expect(update).not.toHaveProperty("lastSuccessAt");
    expect(update.lastError).toBe("triageFailures=2");
    expect(update.lastAttemptAt).toBe(observedAt);
  });

  test("the attempt heartbeat advances on every run regardless of outcome", () => {
    const clean = buildIngestDiagUpdate(observedAt, summarizeRunDiagnostics({}));
    const degraded = buildIngestDiagUpdate(
      observedAt,
      summarizeRunDiagnostics({ failedSourceCount: 1 }),
    );

    expect(clean.lastAttemptAt).toBe(observedAt);
    expect(degraded.lastAttemptAt).toBe(observedAt);
  });
});
