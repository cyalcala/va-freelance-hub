import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { robotsModeForSourceId } from "../src/pages/api/cron/scrape";
import capturedAuthority from "./fixtures/workable-authority-identities-2026-10-13.json";

const REFERENCE = "2026-10-12T05:00:00.000Z";
const sourceId = (letter: string) => `workable:zz-native-${letter}`;
type Scenario = { invalidAttemptAt?: string | null; stateReadFailure?: boolean;
  admittedTokens?: boolean; focusPineapple?: boolean; workableRobots?: "disallowed" | "http503" | "throw" };
type Attempt = { sourceId: string; lastAttemptAt: string | null; lastCount: number };
type Transport = { sourceId: string | null; kind: string; allowed: boolean };
type Result = {
  scope: string; replies: Array<{ now: string; status: number; transports: Transport[]; attempts: Attempt[]; stateAvailable: boolean;
    workableResults: Array<{ sourceId: string; ok: boolean; count: number; skipped: boolean; robotsVerdict?: string; robotsMode?: string; skipReason?: string }> }>;
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
  expect(result.scope).toBe("ACTUAL_HANDLER_DRIZZLE_NATIVE_SQLITE_UNCHANGED_MIGRATIONS_THROUGH_0054_SYNTHETIC_INITIAL_REGISTRY_AND_VALIDATED_PACKETS_NOT_LIVE_FLOW_PROOF");
  expect(result.transports.every(attempt => attempt.allowed)).toBe(true);
  expect(result.transports.filter(attempt => ["workable:myoutdesk", "workable:pineapple", "workable:virtualstaff365"].includes(attempt.sourceId ?? ""))).toEqual([]);
  expect(result.aiCalls).toBe(0);
  expect(result.opportunities).toBe(0);
  expect(result.ledger).toBe(0);
  expect(result.transitionEvents).toBe(0);
  expect(result.finalRegistry).toEqual(result.initialRegistry);
  expect(result.initialRegistry).toHaveLength(10);
  expect(result.directory).toEqual([{ token: "myoutdesk", verifiedAt: null }, { token: "pineapple", verifiedAt: null }, { token: "virtualstaff365", verifiedAt: null }]);
  expect(result.appliedMigrations).toContain("0039_canary_transition_plane.sql");
  expect(result.appliedMigrations).toContain("0054_public_serving_snapshot.sql");
  expect(result.appliedMigrations.every(name => /^\d{4}_.+\.sql$/.test(name) && Number(name.slice(0, 4)) <= 54)).toBe(true);
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

const admitted = capturedAuthority.sourceIds;

for (const workableRobots of ["disallowed", "http503", "throw"] as const) {
  test(`actual0054 ATS branch withholds captured pineapple-staffing widget GETs on ${workableRobots} robots`, async () => {
    const result = await nativeWorkable({ admittedTokens: true, focusPineapple: true, workableRobots });
    expect(result.replies).toHaveLength(1);
    const reply = result.replies[0]!;
    expect(requests(reply)).toEqual([]);
    const withheld = reply.workableResults.filter(item => item.robotsMode === "enforce");
    expect(withheld.map(item => item.sourceId).sort()).toEqual(["workable:pineapple-staffing"]);
    for (const item of withheld) {
      expect(item.skipped).toBe(true);
      expect(item.robotsVerdict).toBe(workableRobots === "disallowed" ? "disallowed" : "unknown");
      expect(item.skipReason).toContain("robots.txt blocks or withholds");
    }
    expect(reply.workableResults.find(item => item.sourceId === "workable:pineapple")?.skipped).toBe(true);
    expect(result.initialRegistry.filter((entry: any) => entry.operational === "canary")
      .every((entry: any) => entry.cap === 2)).toBe(true);
  }, 45000);
}

test("actual0054 admitted Workable identities still rotate through permitted robots without source changes", async () => {
  const result = await nativeWorkable({ admittedTokens: true });
  expect(result.replies.map(requests)).toEqual([admitted.slice(0, 2), admitted.slice(2, 4),
    admitted.slice(4, 6), admitted.slice(6), [], admitted.slice(0, 2)]);
  expect(new Set(result.transports.filter(item => item.kind === "workable").map(item => item.sourceId)).size).toBe(7);
  for (const reply of result.replies) {
    for (const item of reply.workableResults.filter(item => !item.skipped)) {
      expect(item.robotsMode).toBe("enforce");
      expect(item.robotsVerdict).toBe("allowed");
    }
  }
}, 45000);

test("robots scope follows pinned captured authority IDs, including pineapple-staffing rather than its unadmitted alias", async () => {
  const text = await Bun.file(new URL("./fixtures/workable-authority-identities-2026-10-13.json", import.meta.url)).text();
  expect(new Bun.CryptoHasher("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex")).toBe("04a8217ba19b18e102b9b25e7cc1a16e7613ecf9f4d7c4a2965b1aecc8829eeb");
  expect(capturedAuthority.sourceArtifactSha256).toBe("3f7521e70d178aa9b8dda3aba1f5a9b4a988d9e58a23228dee44a83c2c910620");
  expect(capturedAuthority.sourceIds).toHaveLength(7);
  expect(capturedAuthority.sourceIds).toContain("workable:pineapple-staffing");
  expect(capturedAuthority.sourceIds).not.toContain("workable:pineapple");
  for (const id of capturedAuthority.sourceIds) expect(robotsModeForSourceId(id)).toBe("enforce");
  expect(robotsModeForSourceId("workable:pineapple")).toBe("observe");
});
