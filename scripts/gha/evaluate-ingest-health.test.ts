import { describe, expect, test } from "bun:test";
import { evaluateIngestHealth } from "./evaluate-ingest-health.mjs";

const now = "2026-08-13T04:00:00.000Z";

describe("evaluateIngestHealth", () => {
  test("allows a bounded grace period before the first heartbeat row", () => {
    expect(evaluateIngestHealth({ rows: [], workerDeployedAt: "2026-08-13T03:00:00.000Z", now })).toMatchObject({
      status: "grace",
      alert: false,
    });
  });

  test("alerts when the heartbeat row is still absent after grace", () => {
    expect(evaluateIngestHealth({ rows: [], workerDeployedAt: "2026-08-13T01:00:00.000Z", now })).toMatchObject({
      status: "alert",
      alert: true,
      reason: "diagnostic heartbeat row missing after deployment grace",
    });
  });

  test("alerts when no successful Worker deployment can establish grace", () => {
    expect(evaluateIngestHealth({ rows: [], workerDeployedAt: null, now })).toMatchObject({
      status: "alert",
      alert: true,
    });
  });

  test("alerts on a stale or degraded heartbeat", () => {
    expect(evaluateIngestHealth({
      rows: [{ last_error: "triage unavailable", hours_since_attempt: 4 }],
      workerDeployedAt: "2026-08-12T00:00:00.000Z",
      now,
    })).toMatchObject({
      status: "alert",
      alert: true,
      reason: "degraded run: triage unavailable; no scrape run in 4h (clock may be stopped)",
    });
  });

  test.each([null, undefined, "not-a-number", -1]) (
    "alerts when a present heartbeat has an incomplete attempt age: %s",
    (hours_since_attempt) => {
      expect(evaluateIngestHealth({
        rows: [{ last_error: null, hours_since_attempt }],
        workerDeployedAt: "2026-08-12T00:00:00.000Z",
        now,
      })).toMatchObject({
        status: "alert",
        alert: true,
        reason: "heartbeat row has no valid last-attempt age",
      });
    },
  );

  test("accepts a recent clean heartbeat", () => {
    expect(evaluateIngestHealth({
      rows: [{ last_error: null, hours_since_attempt: 1 }],
      workerDeployedAt: "2026-08-12T00:00:00.000Z",
      now,
    })).toMatchObject({ status: "healthy", alert: false });
  });
});
