import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { validateSnapshotCandidate } from "../src/lib/public-serving-snapshot";
import { isFeedRecoverableInactiveReason } from "../src/lib/inactive-reason";
import { PUBLICATION_DRIFT_INACTIVE_REASON } from "../src/lib/publication-drift-withdrawal";
import type { PublicBoard, PublicJob } from "../src/lib/public-board";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";

type DriftRow = {
  id: number; title: string; active: number; eligibility: string; type: string | null;
  postedAt: string | null; reason: string | null;
};
type DriftResult = {
  reference: string;
  driftMutations: number;
  aborted: { examined: number; withdrawnIds: number[] };
  first: { examined: number; withdrawnIds: number[] };
  second: { examined: number; withdrawnIds: number[] };
  rows: DriftRow[];
  visible: Array<{ id: number }>;
  ledgerCount: number;
  applyFresh: { status: number; location: string | null };
  applyOnsite: { status: number; location: string | null };
  applyMissingDate: { status: number; location: string | null };
  transports: number;
};

function job(id: number): PublicJob {
  return {
    id, title: `Job ${id}`, company: null, type: "freelance",
    sourceUrl: `https://example.com/jobs/${id}`, sourcePlatform: "Native", sourceId: "remotive",
    tags: [], category: "support", experienceLevel: null, postedAt: FRESH, scrapedAt: REFERENCE,
    geoScope: "worldwide", phEligibility: "eligible_likely", geoEvidence: null, description: null,
    clientTimezone: null, locationType: "remote", payRange: null, updatedAt: REFERENCE,
  };
}

async function nativeDrift(): Promise<DriftResult> {
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload",
    "./scripts/ci/test-environment.ts", "./apps/web/tests/fixtures/native-publication-drift.ts"],
  { cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  if (exit !== 0) throw new Error(`native publication drift fixture failed (${exit}): ${stderr.slice(-4000)}`);
  const markers = stdout.split(/\r?\n/).filter((line) => line.startsWith("NATIVE_PUBLICATION_DRIFT_RESULT "));
  if (markers.length !== 1) throw new Error(`native publication drift fixture did not emit exactly one result\n${stderr.slice(-2000)}`);
  return JSON.parse(markers[0]!.slice("NATIVE_PUBLICATION_DRIFT_RESULT ".length)) as DriftResult;
}

describe("public drift withdrawal", () => {
  test("explicit non-remote and non-window dates leave the public predicate idempotently", async () => {
    const result = await nativeDrift();
    const row = (title: string) => {
      const found = result.rows.find((candidate) => candidate.title === title);
      if (!found) throw new Error(`missing ${title}`);
      return found;
    };
    expect(result.reference).toBe(REFERENCE);
    expect(result.transports).toBe(0);
    expect(result.ledgerCount).toBe(0);
    expect(result.aborted).toEqual({ examined: 0, withdrawnIds: [] });
    expect(result.driftMutations).toBe(1);
    expect(result.first.examined).toBe(9);
    expect(result.first.withdrawnIds).toHaveLength(5);
    expect(result.second.examined).toBe(4);
    expect(result.second.withdrawnIds).toEqual([]);

    for (const title of ["withdraw-onsite", "withdraw-hybrid", "withdraw-stale", "withdraw-future", "withdraw-invalid"]) {
      const withdrawn = row(title);
      expect(withdrawn.active).toBe(0);
      expect(withdrawn.reason).toBe(PUBLICATION_DRIFT_INACTIVE_REASON);
      expect(result.first.withdrawnIds).toContain(withdrawn.id);
      expect(result.visible.some((visible) => visible.id === withdrawn.id)).toBe(false);
    }

    for (const title of ["retain-fresh", "retain-boundary", "retain-null-workplace", "retain-missing-date", "retain-repaired-date"]) {
      const retained = row(title);
      expect(retained.active).toBe(1);
      expect(retained.reason).toBeNull();
      expect(result.first.withdrawnIds).not.toContain(retained.id);
      expect(result.visible.map((visible) => visible.id)).toContain(retained.id);
    }
    expect(row("retain-repaired-date").postedAt).toBe(FRESH);
    expect(row("retain-unclear-onsite")).toMatchObject({ active: 1, eligibility: "unclear", reason: null });
    expect(row("retain-ineligible-stale")).toMatchObject({ active: 1, eligibility: "ineligible", reason: null });
    expect(row("retain-already-inactive")).toMatchObject({ active: 0, reason: "stale-feed" });
    expect(result.visible.map((visible) => visible.id).sort((a, b) => a - b)).toEqual(
      ["retain-fresh", "retain-boundary", "retain-null-workplace", "retain-missing-date", "retain-repaired-date"]
        .map((title) => row(title).id).sort((a, b) => a - b),
    );

    expect(result.applyFresh).toEqual({
      status: 302,
      location: "https://remotive.com/remote-jobs/customer-support/retain-fresh",
    });
    expect(result.applyOnsite).toEqual({ status: 404, location: null });
    expect(result.applyMissingDate.status).toBe(302);
    expect(isFeedRecoverableInactiveReason(PUBLICATION_DRIFT_INACTIVE_REASON)).toBe(false);
  }, 30000);

  test("a collapsed replacement board stays rejected and the previous board stays intact", () => {
    const active: PublicBoard = {
      generatedAt: REFERENCE,
      jobs: Array.from({ length: 20 }, (_, index) => job(index + 1)),
      directory: [],
    };
    const candidate: PublicBoard = { ...active, jobs: [job(1)] };
    const decision = validateSnapshotCandidate(candidate, active);
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toContain("Suspicious job count collapse");
    expect(active.jobs).toHaveLength(20);
  });
});
