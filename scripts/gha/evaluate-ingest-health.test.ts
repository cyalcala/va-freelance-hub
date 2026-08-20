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

  // Board-freshness backstop: the 2026-08-18 freeze kept a GREEN heartbeat while
  // the board silently stopped publishing. A clean, recent heartbeat must still
  // alert when no new visible job has landed for longer than the threshold.
  test("alerts when the board is frozen despite a healthy heartbeat", () => {
    expect(evaluateIngestHealth({
      rows: [{ last_error: null, hours_since_attempt: 1, board_stale_hours: 40 }],
      workerDeployedAt: "2026-08-12T00:00:00.000Z",
      now,
    })).toMatchObject({
      status: "alert",
      alert: true,
      reason: "board frozen: no new visible job in 40h (scrape green but publishing nothing)",
    });
  });

  test("stays healthy when the board refreshed within the threshold", () => {
    expect(evaluateIngestHealth({
      rows: [{ last_error: null, hours_since_attempt: 1, board_stale_hours: 10 }],
      workerDeployedAt: "2026-08-12T00:00:00.000Z",
      now,
    })).toMatchObject({ status: "healthy", alert: false });
  });

  test.each([null, undefined, "null"])(
    "never false-alarms when board age is absent: %s",
    (board_stale_hours) => {
      expect(evaluateIngestHealth({
        rows: [{ last_error: null, hours_since_attempt: 1, board_stale_hours }],
        workerDeployedAt: "2026-08-12T00:00:00.000Z",
        now,
      })).toMatchObject({ status: "healthy", alert: false });
    },
  );
});
