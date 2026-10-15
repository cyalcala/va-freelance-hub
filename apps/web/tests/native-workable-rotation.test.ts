import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const REFERENCE = "2026-10-12T05:00:00.000Z";
const sourceId = (letter: string) => `workable:zz-native-${letter}`;
type Scenario = { invalidAttemptAt?: string | null; stateReadFailure?: boolean };
type Attempt = { sourceId: string; lastAttemptAt: string | null; lastCount: number };
type Transport = { sourceId: string | null; kind: string; allowed: boolean };
type Result = {
  scope: string; replies: Array<{ now: string; status: number; transports: Transport[]; attempts: Attempt[]; stateAvailable: boolean;
    workableResults: Array<{ sourceId: string; ok: boolean; count: number; skipped: boolean }> }>;
  transports: Transport[]; aiCalls: number; initialRegistry: unknown[]; finalRegistry: unknown[]; appliedMigrations: string[];
  registryTriggers: Array<{ name: string }>; directory: Array<{ token: string; verifiedAt: string | null }>;
  sourceFetchStateTriggers: unknown[]; opportunities: number; ledger: number; transitionEvents: number;
};
async function nativeWorkable(scenario: Scenario): Promise<Result> {
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload", "./scripts/ci/test-environment.ts",
    "./apps/web/tests/fixtures/native-workable-rotation.ts", JSON.stringify(scenario)], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (exit !== 0) throw new Error(`native Workable fixture failed (${exit}): ${stderr.slice(-2500)}`);
  const markers = stdout.split(/\r?\n/).filter(line => line.startsWith("NATIVE_WORKABLE_ROTATION_RESULT "));
  if (markers.length !== 1) throw new Error("native Workable fixture must emit exactly one result");
  const result = JSON.parse(markers[0]!.slice("NATIVE_WORKABLE_ROTATION_RESULT ".length)) as Result;
  console.log(`NATIVE_WORKABLE_ROTATION_EVIDENCE ${JSON.stringify(result)}`);
  expect(result.scope).toBe("ACTUAL_HANDLER_DRIZZLE_NATIVE_SQLITE_ALL_UNCHANGED_MIGRATIONS_SYNTHETIC_INITIAL_REGISTRY_NOT_ADMISSION_OR_LIVE_FLOW_PROOF");
  expect(result.transports.every(attempt => attempt.allowed)).toBe(true);
  expect(result.transports.filter(attempt => ["workable:myoutdesk", "workable:virtualstaff365"].includes(attempt.sourceId ?? ""))).toEqual([]);
  expect(result.aiCalls).toBe(0);
  expect(result.opportunities).toBe(0);
  expect(result.ledger).toBe(0);
  expect(result.transitionEvents).toBe(0);
  expect(result.finalRegistry).toEqual(result.initialRegistry);
  expect(result.initialRegistry).toHaveLength(9);
  expect(result.directory).toEqual([{ token: "myoutdesk", verifiedAt: null }, { token: "virtualstaff365", verifiedAt: null }]);
  expect(result.appliedMigrations).toContain("0039_canary_transition_plane.sql");
  expect(result.registryTriggers.map(row => row.name)).toContain("source_registry_initial_state_is_dormant");
  expect(result.registryTriggers.map(row => row.name)).toContain("source_registry_state_requires_transition_event");
  expect(result.sourceFetchStateTriggers).toEqual([]);
  expect(result.replies.every(reply => reply.status === 200)).toBe(true);
  return result;
}
const requests = (reply: Result["replies"][number]) => reply.transports.filter(row => row.kind === "workable").map(row => {
  if (typeof row.sourceId !== "string") throw new Error("Workable request receipt lacks its canonical source identity");
  return row.sourceId;
});

test("actual handler rotates registry-only empty Workable feeds using durable attempts and the unchanged sixty-minute cadence", async () => {
  const result = await nativeWorkable({});
  expect(result.replies.map(requests)).toEqual([[sourceId("a"), sourceId("b")], [sourceId("c"), sourceId("d")],
    [sourceId("e"), sourceId("f")], [sourceId("g")], [], [sourceId("a"), sourceId("b")]]);
  for (const reply of result.replies) {
    expect(requests(reply).length).toBeLessThanOrEqual(2);
    expect(new Set(requests(reply)).size).toBe(requests(reply).length);
    for (const id of requests(reply)) {
      expect(reply.attempts.find(row => row.sourceId === id)).toEqual({ sourceId: id, lastAttemptAt: reply.now, lastCount: 0 });
      expect(reply.workableResults.find(row => row.sourceId === id)).toMatchObject({ ok: true, count: 0, skipped: false });
    }
  }
  expect(result.replies[0]!.now).toBe(REFERENCE);
  expect(result.replies[1]!.now).toBe("2026-10-12T05:10:00.000Z");
}, 45000);

for (const invalidAttemptAt of [null, "not-a-timestamp"]) {
  test(`actual handler withholds an existing ${JSON.stringify(invalidAttemptAt)} attempt and preserves that unknown state`, async () => {
    const result = await nativeWorkable({ invalidAttemptAt });
    expect(requests(result.replies[0]!)).toEqual([sourceId("b"), sourceId("c")]);
    expect(result.replies[0]!.attempts.find(row => row.sourceId === sourceId("a")))
      .toEqual({ sourceId: sourceId("a"), lastAttemptAt: invalidAttemptAt, lastCount: 0 });
    expect(result.replies[0]!.workableResults.find(row => row.sourceId === sourceId("a"))?.skipped).toBe(true);
  }, 45000);
}

test("actual handler withholds Workable transport when its durable attempt snapshot is unavailable", async () => {
  const result = await nativeWorkable({ stateReadFailure: true });
  expect(result.replies[0]!.stateAvailable).toBe(false);
  expect(requests(result.replies[0]!)).toEqual([]);
  expect(result.replies[0]!.attempts).toEqual([]);
}, 45000);
