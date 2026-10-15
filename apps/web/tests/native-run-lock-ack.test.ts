import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const REFERENCE = "2026-10-12T05:00:00.000Z";
const EPOCH = "1970-01-01T00:00:00.000Z";
const LOCK_ID = "__scrape_run_lock__";
type Scenario = { missingMetadata?: boolean; repeat?: boolean; initial?: "held" | "boundary" | "older-boundary";
  fault?: "before" | "after"; malformed?: "source" | "timestamp" | "duplicate" | "missing-time";
  concurrent?: boolean; newerOwnerBeforeRelease?: boolean };
type Lock = { sourceId: string; lastAttemptAt: string };
type Result = {
  scope: string; reference: string; initialAt: string;
  replies: Array<{ status: number; body: Record<string, unknown>; physicalLock: Lock; transports: unknown[] }>;
  claims: Array<{ method: string; changes: number; sql: string; params: unknown[]; physicalLock: Lock }>;
  releases: Array<{ changes: number; params: unknown[]; physicalLock: Lock }>;
  transports: Array<{ allowed: boolean }>; transportsBeforeResume: number | null;
  finalLock: Lock; sourceFetchStateTriggers: unknown[]; opportunities: number; ledger: number;
};
async function nativeLock(scenario: Scenario): Promise<Result> {
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload", "./scripts/ci/test-environment.ts",
    "./apps/web/tests/fixtures/native-run-lock-ack.ts", JSON.stringify(scenario)], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  if (exit !== 0) throw new Error(`native run-lock fixture failed (${exit}): ${stderr.slice(-3000)}`);
  const markers = stdout.split(/\r?\n/).filter(line => line.startsWith("NATIVE_RUN_LOCK_ACK_RESULT "));
  if (markers.length !== 1) throw new Error("native run-lock fixture did not emit exactly one result");
  const result = JSON.parse(markers[0]!.slice("NATIVE_RUN_LOCK_ACK_RESULT ".length)) as Result;
  console.log(`NATIVE_RUN_LOCK_ACK_EVIDENCE ${JSON.stringify(result)}`);
  expect(result.scope).toBe("REAL_HANDLER_DRIZZLE_NATIVE_SQLITE_ALL_UNCHANGED_MIGRATIONS_SYNTHETIC_ALLOWLISTED_TRANSPORT_NOT_LIVE_D1_CAUSE_PROOF");
  expect(result.reference).toBe(REFERENCE);
  expect(result.sourceFetchStateTriggers).toEqual([]);
  expect(result.transports.every(attempt => attempt.allowed)).toBe(true);
  expect(result.opportunities).toBe(0);
  expect(result.ledger).toBe(0);
  return result;
}

describe("native scrape lock claims acknowledge their actual returned owner", () => {
  test("three ten-minute claims survive missing run metadata and release their owned locks", async () => {
    const result = await nativeLock({ missingMetadata: true, repeat: true });
    expect(result.replies.map(reply => reply.status)).toEqual([200, 200, 200]);
    expect(result.claims.map(claim => claim.changes)).toEqual([1, 1, 1]);
    expect(result.claims.map(claim => claim.physicalLock.lastAttemptAt)).toEqual([
      REFERENCE, "2026-10-12T05:10:00.000Z", "2026-10-12T05:20:00.000Z",
    ]);
    expect(result.claims.every(claim => claim.method === "raw" && /returning/i.test(claim.sql))).toBe(true);
    expect(result.releases.map(release => release.changes)).toEqual([1, 1, 1]);
    expect(result.replies.every(reply => reply.physicalLock.lastAttemptAt === EPOCH)).toBe(true);
    expect(result.transports.length).toBeGreaterThan(0);
  }, 45000);

  for (const initial of ["held", "boundary"] as const) test(`${initial} lock remains held with zero transport or release`, async () => {
    const result = await nativeLock({ missingMetadata: true, initial });
    expect(result.replies[0]!.status).toBe(200);
    expect(result.replies[0]!.body).toMatchObject({ skipped: true, reason: "run-lock-held", lockState: "held" });
    expect(result.claims.map(claim => claim.changes)).toEqual([0]);
    expect(result.finalLock.lastAttemptAt).toBe(result.initialAt);
    expect(result.transports).toEqual([]);
    expect(result.releases).toEqual([]);
  }, 45000);

  test("one millisecond older than the unchanged eight-minute cutoff can acquire and release", async () => {
    const result = await nativeLock({ initial: "older-boundary" });
    expect(result.replies[0]!.status).toBe(200);
    expect(result.claims[0]!.changes).toBe(1);
    expect(result.claims[0]!.params).toEqual([REFERENCE, REFERENCE, LOCK_ID, "2026-10-12T04:52:00.000Z"]);
    expect(result.releases[0]!.changes).toBe(1);
    expect(result.finalLock.lastAttemptAt).toBe(EPOCH);
  }, 45000);

  for (const fault of ["before", "after"] as const) test(`${fault}-commit acknowledgement failure stays unavailable and performs no transport`, async () => {
    const result = await nativeLock({ fault });
    expect(result.replies[0]!.status).toBe(503);
    expect(result.replies[0]!.body).toEqual({ error: "Scrape coordination is temporarily unavailable. Retry shortly." });
    expect(result.transports).toEqual([]);
    expect(result.releases).toEqual([]);
    expect(result.finalLock.lastAttemptAt).toBe(fault === "before" ? EPOCH : REFERENCE);
    expect(result.claims.map(claim => claim.changes)).toEqual(fault === "before" ? [] : [1]);
  }, 45000);

  for (const malformed of ["source", "timestamp", "duplicate", "missing-time"] as const) test(`malformed returned ${malformed} acknowledgement refuses transport despite a physical claim`, async () => {
    const result = await nativeLock({ malformed });
    expect(result.replies[0]!.status).toBe(503);
    expect(result.claims.map(claim => claim.changes)).toEqual([1]);
    expect(result.finalLock).toEqual({ sourceId: LOCK_ID, lastAttemptAt: REFERENCE });
    expect(result.transports).toEqual([]);
    expect(result.releases).toEqual([]);
  }, 45000);

  test("concurrent requests grant one claim while the loser neither fetches nor releases", async () => {
    const result = await nativeLock({ concurrent: true });
    expect(result.replies[0]!.status).toBe(200);
    expect(result.replies[1]!.status).toBe(200);
    expect(result.replies[1]!.body).toMatchObject({ reason: "run-lock-held", lockState: "held" });
    expect(result.claims.map(claim => claim.changes)).toEqual([1, 0]);
    expect(result.transportsBeforeResume).toBe(0);
    expect(result.replies[1]!.transports).toEqual([]);
    expect(result.releases.map(release => release.changes)).toEqual([1]);
    expect(result.finalLock.lastAttemptAt).toBe(EPOCH);
  }, 45000);

  test("release remains fenced when another owner changes the token after this claim", async () => {
    const result = await nativeLock({ newerOwnerBeforeRelease: true });
    expect(result.replies[0]!.status).toBe(200);
    expect(result.claims[0]!.changes).toBe(1);
    expect(result.releases.map(release => release.changes)).toEqual([0]);
    expect(result.finalLock.lastAttemptAt).toBe("2026-10-12T05:10:00.000Z");
  }, 45000);
});
