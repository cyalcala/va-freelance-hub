import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { decideFailoverTakeover } from "../../../packages/scraper/failover-clock";

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

describe("Hunter workflow terminal-state contract", () => {
  const workflowPath = resolve(import.meta.dir, "../../../.github/workflows/gha-hunter-pulse.yml");
  const failoverCliPath = resolve(import.meta.dir, "../../../scripts/gha/evaluate-failover-clock.ts");

  test("classifies zero inserts with skipped jobs as success in execution and summary paths", async () => {
    const workflow = await Bun.file(workflowPath).text();
    const skippedOnlySuccessRules = workflow.match(
      /elif \.inserted == 0 and \(\(\.skipped \| if type == "number" then \. > 0 else false end\)\) then "success"\r?\n\s+elif \.inserted == 0 then "needs-rerun"/g,
    ) ?? [];

    expect(skippedOnlySuccessRules).toHaveLength(2);
  });

  test("does not let empty optional summary fields determine shell step status", async () => {
    const workflow = await Bun.file(workflowPath).text();

    expect(workflow).toMatch(/if \[ -n "\$MESSAGE" \]; then\s+echo "Message: \$MESSAGE"\s+fi/);
    expect(workflow).not.toContain('[ -n "$MESSAGE" ] && echo "Message: $MESSAGE"');
    expect(workflow).not.toContain('[ -n "${NEXT_SAFE_AT:-}" ] &&');
    expect(workflow).not.toContain('[ -n "${MESSAGE:-}" ] &&');
  });

  test("read-only clock snapshot includes the shared heartbeat, lock, latest fetch, and UTC observation", async () => {
    const workflow = await Bun.file(workflowPath).text();
    const match = workflow.match(/HUNTER_DIAG_SQL: >-\r?\n((?: {8}[^\r\n]+\r?\n)+)/);
    expect(match).not.toBeNull();
    const sql = match![1].replace(/^ {8}/gm, "").replace(/\s+/g, " ").trim();

    expect(sql).toMatch(/^SELECT\b/i);
    expect(sql).toContain("ORDER BY timestamp DESC LIMIT 1");
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER)\b/i);
    expect(sql).not.toContain("last_error");

    const db = new Database(":memory:");
    try {
      db.exec("CREATE TABLE source_fetch_state (source_id TEXT PRIMARY KEY, last_attempt_at TEXT, updated_at TEXT)");
      db.exec("CREATE TABLE source_fetch_events (timestamp TEXT NOT NULL)");
      db.exec("CREATE INDEX source_fetch_events_timestamp_idx ON source_fetch_events (timestamp)");
      db.exec(`INSERT INTO source_fetch_state VALUES
        ('__ingest_diag__', '2026-09-27T09:00:00.000Z', '2026-09-27T09:00:00.000Z'),
        ('__scrape_run_lock__', '2026-09-27T09:01:00.000Z', '2026-09-27T09:02:00.000Z')`);
      db.exec("INSERT INTO source_fetch_events VALUES ('2026-09-27T08:59:00.000Z'), ('2026-09-27T09:03:00.000Z')");
      db.exec("PRAGMA query_only = ON");

      const before = db.query(sql).get() as Record<string, string>;
      expect(before.last_attempt_at).toBe("2026-09-27T09:00:00.000Z");
      expect(before.lock_last_attempt_at).toBe("2026-09-27T09:01:00.000Z");
      expect(before.lock_updated_at).toBe("2026-09-27T09:02:00.000Z");
      expect(before.latest_source_fetch_event_at).toBe("2026-09-27T09:03:00.000Z");
      expect(before.observation_utc).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z$/);
      expect(Object.keys(before)).not.toContain("last_error");

      db.exec("PRAGMA query_only = OFF");
      db.exec("UPDATE source_fetch_state SET last_attempt_at = '2026-09-27T09:04:00.000Z', updated_at = '2026-09-27T09:05:00.000Z' WHERE source_id = '__scrape_run_lock__'");
      db.exec("PRAGMA query_only = ON");
      const after = db.query(sql).get() as Record<string, string>;
      expect(after.last_attempt_at).toBe(before.last_attempt_at);
      expect(after.lock_last_attempt_at).toBe("2026-09-27T09:04:00.000Z");
      expect(after.lock_updated_at).toBe("2026-09-27T09:05:00.000Z");
    } finally {
      db.close();
    }
  });

  test("an unavailable fetch-event table still yields the original heartbeat takeover decision", async () => {
    const workflow = await Bun.file(workflowPath).text();
    const match = workflow.match(/HUNTER_HEARTBEAT_SQL: >-\r?\n((?: {8}[^\r\n]+\r?\n)+)/);
    expect(match).not.toBeNull();
    const sql = match![1].replace(/^ {8}/gm, "").replace(/\s+/g, " ").trim();
    expect(sql).not.toContain("FROM source_fetch_events");
    expect(sql).not.toContain("last_error");

    const db = new Database(":memory:");
    try {
      db.exec("CREATE TABLE source_fetch_state (source_id TEXT PRIMARY KEY, last_attempt_at TEXT, updated_at TEXT)");
      db.exec("INSERT INTO source_fetch_state VALUES ('__ingest_diag__', '2026-09-27T09:00:00.000Z', '2026-09-27T09:00:00.000Z')");
      db.exec("PRAGMA query_only = ON");
      const row = db.query(sql).get() as Record<string, string | null>;
      expect(row.last_attempt_at).toBe("2026-09-27T09:00:00.000Z");
      expect(row.latest_source_fetch_event_at).toBeNull();
      expect(row.diagnostic_status).toBe("heartbeat-only-fallback");
      expect(decideFailoverTakeover({
        lastAttemptAt: row.last_attempt_at,
        now: "2026-09-27T10:00:00.000Z",
      }).action).toBe("takeover");
    } finally {
      db.close();
    }

    const preStep = workflow.split("- name: Query Durable Clock Heartbeat (schedule only)")[1]
      .split("- name: Determine Failover Necessity (schedule only)")[0];
    expect(preStep.indexOf('"$HUNTER_DIAG_SQL"')).toBeLessThan(preStep.indexOf('"$HUNTER_HEARTBEAT_SQL"'));
  });

  test("augmented D1 row preserves the existing failover decision", async () => {
    const cli = await Bun.file(failoverCliPath).text();
    expect(cli).toContain("const row = parsed?.[0]?.results?.[0]");
    expect(cli).toContain("lastAttemptAt = row?.last_attempt_at ?? null");

    const lastAttemptAt = "2026-09-27T09:00:00.000Z";
    const baseline = [{ results: [{ last_attempt_at: lastAttemptAt }] }];
    const augmented = [{ results: [{
      observation_utc: "2026-09-27T10:00:00.000Z",
      last_attempt_at: lastAttemptAt,
      lock_last_attempt_at: "2026-09-27T09:45:00.000Z",
      lock_updated_at: "2026-09-27T09:46:00.000Z",
      latest_source_fetch_event_at: "2026-09-27T09:40:00.000Z",
    }] }];
    const decide = (snapshot: typeof baseline) => decideFailoverTakeover({
      lastAttemptAt: JSON.parse(JSON.stringify(snapshot))?.[0]?.results?.[0]?.last_attempt_at ?? null,
      now: "2026-09-27T10:00:00.000Z",
    });

    expect(decide(augmented).action).toBe("takeover");
    expect(decide(augmented)).toEqual(decide(baseline));
  });

  test("post-lock diagnostic is one bounded read and both snapshots enter the evidence artifact", async () => {
    const workflow = await Bun.file(workflowPath).text();
    expect(workflow).toContain("steps.hunt.outputs.terminal_state == 'lock-held'");
    expect(workflow).toContain('echo "terminal_state=$TERMINAL_STATE" >> "$GITHUB_OUTPUT"');
    expect((workflow.match(/-X POST "\$SCRAPE_API_URL"/g) ?? [])).toHaveLength(1);
    const postStep = workflow.split("- name: Query Clock After Lock-Held Takeover (schedule only)")[1]
      .split("- name: Evaluate Hunter Health")[0];
    expect((postStep.match(/timeout 90s npx wrangler@4\.143\.0 d1 execute DB --remote --env production/g) ?? [])).toHaveLength(1);
    expect(postStep).toContain('"$HUNTER_HEARTBEAT_SQL"');
    expect(postStep).not.toContain("-X POST");
    expect(workflow).toMatch(/^\s+failover-diag\.json\r?$/m);
    expect(workflow).toMatch(/^\s+failover-diag-post-lock\.json\r?$/m);
    expect(workflow).toContain("'[{\"results\":[],\"observation_utc\":\"%s\",\"query_status\":\"failed\"}]\\n'");
  });
});
