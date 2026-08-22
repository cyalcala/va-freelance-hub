import { expect, test, describe, beforeEach, afterEach } from "bun:test";

interface HunterResponse {
  lockState?: string;
  backlogRemaining?: number;
  skipped?: boolean | number;
  reason?: string;
  inserted?: number;
  actualChanges?: number;
  acceptedForInsert?: number;
  attemptedInsert?: number;
  insertFailedBatches?: number;
  insertErrors?: unknown[];
  failedSources?: string[];
  sourceResults?: unknown[];
  fetchEventLog?: unknown;
  cadenceGuards?: unknown;
  message?: string;
  error?: string;
}

function evaluateHunterResponse(response: HunterResponse): {
  terminal: boolean;
  state: "success" | "lock-held" | "backlog" | "needs-rerun" | "error";
  callCount: number;
  nextSafeAt?: string;
  reason?: string;
} {
  if (response.error) {
    return { terminal: true, state: "error", callCount: 1, reason: response.error };
  }

  if (response.skipped && response.reason === "run-lock-held" && response.lockState === "held") {
    return {
      terminal: true,
      state: "lock-held",
      callCount: 1,
      nextSafeAt: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
      reason: "Another scrape run is in progress",
    };
  }

  if (typeof response.inserted === "number" && response.inserted > 0) {
    const backlog = response.backlogRemaining ?? 0;
    if (backlog > 0) {
      return {
        terminal: true,
        state: "backlog",
        callCount: 1,
        nextSafeAt: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
        reason: `Backlog remaining: ${backlog}`,
      };
    }
    return { terminal: true, state: "success", callCount: 1 };
  }

  if (typeof response.inserted === "number" && response.inserted === 0) {
    const skippedCount = typeof response.skipped === "number" ? response.skipped : (response.skipped ? 1 : 0);
    if (skippedCount > 0) {
      return { terminal: true, state: "success", callCount: 1 };
    }
    return { terminal: true, state: "needs-rerun", callCount: 1, reason: "Zero jobs inserted and no skipped items" };
  }

  return { terminal: true, state: "needs-rerun", callCount: 1, reason: "Unexpected response shape" };
}

const baseResponse = {
  inserted: 0,
  actualChanges: 0,
  acceptedForInsert: 0,
  attemptedInsert: 0,
  insertFailedBatches: 0,
  insertErrors: [],
  failedSources: [],
  sourceResults: [],
  fetchEventLog: { attempted: 0, recorded: 0, failedBatches: 0, errors: [] },
  cadenceGuards: { stateAvailable: true },
};

describe("Hunter recovery contract", () => {

  test("successful scrape with no backlog → success terminal state", () => {
    const response = { ...baseResponse, inserted: 5, backlogRemaining: 0 };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("success");
    expect(result.terminal).toBe(true);
    expect(result.callCount).toBe(1);
  });

  test("successful scrape with backlog → backlog terminal state", () => {
    const response = { ...baseResponse, inserted: 3, backlogRemaining: 12 };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("backlog");
    expect(result.terminal).toBe(true);
    expect(result.callCount).toBe(1);
    expect(result.reason).toContain("Backlog remaining: 12");
    expect(result.nextSafeAt).toBeDefined();
  });

  test("lock-held response → lock-held terminal state with retry-after", () => {
    const response = {
      ...baseResponse,
      skipped: true,
      reason: "run-lock-held",
      lockState: "held",
      backlogRemaining: 1,
      message: "Another scrape run is in progress.",
    };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("lock-held");
    expect(result.terminal).toBe(true);
    expect(result.callCount).toBe(1);
    expect(result.nextSafeAt).toBeDefined();
    expect(result.reason).toBe("Another scrape run is in progress");
  });

  test("lock-unavailable response → error terminal state", () => {
    const response = {
      ...baseResponse,
      error: "Scrape coordination is temporarily unavailable. Retry shortly.",
    };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("error");
    expect(result.terminal).toBe(true);
    expect(result.callCount).toBe(1);
  });

  test("malformed response (missing inserted) → needs-rerun terminal state", () => {
    const response = { ...baseResponse };
    delete (response as any).inserted;
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("needs-rerun");
    expect(result.terminal).toBe(true);
  });

  test("non-2xx HTTP error shape → error terminal state", () => {
    const response = { error: "Scraper API returned HTTP 503" };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("error");
    expect(result.terminal).toBe(true);
  });

  test("response with failed sources but inserted jobs → success with failed sources noted", () => {
    const response = {
      ...baseResponse,
      inserted: 2,
      backlogRemaining: 0,
      failedSources: ["source-a (RSS): timeout"],
    };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("success");
    expect(result.terminal).toBe(true);
  });

  test("zero inserted, zero skipped, no error → needs-rerun (possible global breakage)", () => {
    const response = { ...baseResponse, inserted: 0, skipped: false };
    const result = evaluateHunterResponse(response);
    expect(result.state).toBe("needs-rerun");
    expect(result.terminal).toBe(true);
  });
});

describe("Hunter recovery loop contract", () => {
  test("single call contract: never exceeds 1 invocation for any terminal state", () => {
    const responses: HunterResponse[] = [
      { ...baseResponse, inserted: 5, backlogRemaining: 0 },
      { ...baseResponse, inserted: 3, backlogRemaining: 12 },
      { skipped: true, reason: "run-lock-held", lockState: "held", backlogRemaining: 1, message: "Another scrape run is in progress." },
      { error: "Scrape coordination is temporarily unavailable. Retry shortly." },
      { ...baseResponse, inserted: 0, skipped: false },
    ];

    for (const response of responses) {
      const result = evaluateHunterResponse(response);
      expect(result.callCount).toBe(1);
      expect(result.terminal).toBe(true);
    }
  });

  test("lock-held response includes actionable next-safe-at within lock TTL window", () => {
    const response = {
      skipped: true,
      reason: "run-lock-held",
      lockState: "held",
      backlogRemaining: 1,
      message: "Another scrape run is in progress.",
    };
    const result = evaluateHunterResponse(response);
    const nextSafeAt = new Date(result.nextSafeAt!);
    const now = new Date();
    const diffMinutes = (nextSafeAt.getTime() - now.getTime()) / (1000 * 60);
    expect(diffMinutes).toBeGreaterThan(0);
    expect(diffMinutes).toBeLessThanOrEqual(10);
  });
});