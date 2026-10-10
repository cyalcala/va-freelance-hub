import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
const BOUNDARY = "2026-09-10T12:00:00.000Z";
const STALE = "2026-09-09T12:00:00.000Z";
type Row = { id: number; title: string; active: number; eligibility: string; type: string | null; source: string; sourceUrl: string; postedAt: string | null };
type NativeResult = {
  scope: { reference: string; clock: string; replacementCount: number };
  thrown: string | null;
  stats: { retriaged: number; upgraded: number; deactivated: number };
  aiCalls: number;
  driftMutations: number;
  rows: Row[];
  visible: Array<{ id: number }>;
  ledger: Array<{ source: string; mode: string; n: number; ids: string }>;
};

async function nativeSweep(): Promise<NativeResult> {
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload",
    "./scripts/ci/test-environment.ts", "./apps/web/tests/fixtures/native-unclear-sweep.ts"],
  { cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (exit !== 0) throw new Error(`native unclear sweep fixture failed (${exit}): ${stderr.slice(-4000)}`);
  const markers = stdout.split(/\r?\n/).filter((line) => line.startsWith("NATIVE_UNCLEAR_SWEEP_RESULT "));
  if (markers.length !== 1) throw new Error(`native unclear sweep fixture did not emit exactly one result\n${stderr.slice(-2000)}`);
  const result = JSON.parse(markers[0]!.slice("NATIVE_UNCLEAR_SWEEP_RESULT ".length)) as NativeResult;
  console.log(`NATIVE_UNCLEAR_SWEEP_EVIDENCE ${JSON.stringify(result)}`);
  return result;
}

describe("actual unclear-backlog sweep publication boundary", () => {
  test("PH upgrades publish only current qualified rows and receipt their actual IDs", async () => {
    const result = await nativeSweep();
    expect(result.scope.reference).toBe(REFERENCE);
    expect(result.scope.clock).toBe("CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF");
    expect(result.scope.replacementCount).toBe(1);
    expect(result.thrown).toBeNull();
    expect(result.aiCalls).toBeGreaterThan(0);
    expect(result.driftMutations).toBe(1);
    const byLabel = new Map(result.rows.map((row) => [row.title, row]));
    const published = ["valid-fresh", "valid-boundary"].map((label) => byLabel.get(label)!);
    expect(published.every((row) => row.active === 1 && row.eligibility === "eligible_likely" && row.type === "remote")).toBe(true);
    expect(published.map((row) => row.postedAt)).toEqual([FRESH, BOUNDARY]);
    expect(result.visible.map((row) => row.id).sort((a, b) => a - b)).toEqual(published.map((row) => row.id).sort((a, b) => a - b));
    expect(result.stats.upgraded).toBe(2);
    const successes = result.ledger.filter((row) => row.n > 0);
    expect(successes.map((row) => ({ source: row.source, n: row.n, ids: JSON.parse(row.ids) }))).toEqual([
      { source: "remotive", n: 1, ids: [published[0]!.id] },
      { source: "we-work-remotely", n: 1, ids: [published[1]!.id] },
    ]);
    for (const label of ["onsite", "hybrid", "null-workplace", "missing-date", "impossible-date", "stale-date", "future-date", "unsafe-url", "opted-out", "unregistered"]) {
      const row = byLabel.get(label)!;
      expect(row.eligibility).toBe("unclear");
      expect(result.visible.some((visible) => visible.id === row.id)).toBe(false);
    }
    expect(byLabel.get("date-drift")).toMatchObject({ eligibility: "unclear", postedAt: STALE });
    expect(result.ledger.some((row) => row.source === "remote-ok" && row.mode === "blocked" && row.n === 0)).toBe(true);
    expect(result.ledger.some((row) => row.source === "greenhouse:not-admitted" && row.mode === "blocked" && row.n === 0)).toBe(true);
    expect(result.ledger.some((row) => JSON.parse(row.ids).includes(byLabel.get("date-drift")!.id))).toBe(false);
  }, 30000);
});
