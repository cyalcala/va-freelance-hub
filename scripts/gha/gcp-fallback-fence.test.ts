import { describe, expect, test } from "bun:test";
import { createVerify, generateKeyPairSync } from "node:crypto";
import {
  busyIntervalsFor,
  decideFromCloudRun,
  decideFromLakeStraddle,
  decideFromShadowHeartbeat,
  decideLakePrecheck,
  evaluateWindow,
  gcpExclusionInterval,
  GCP_SLOT_MINUTE,
  GCP_WORST_CASE_SLOT_MINUTES,
  latestSettledSlotFireMs,
  nextSlotFireMs,
  parseUtc,
  slotSettledMs,
  type LakeBacklogSnapshot,
} from "./gcp-fallback-fence";
import { mintAccessToken, parseArgs, parseWranglerFirstRow, readCloudRunExecutions, SHADOW_HEARTBEAT_SQL } from "./gcp-fallback-gate";

const MIN = 60_000;
const at = (iso: string) => Date.parse(iso);

/** Absolute GCP busy spans (fire .. fire + worst case) around `ms`. */
function gcpRuns(ms: number): Array<[number, number]> {
  const hour = Math.floor(ms / 3_600_000) * 3_600_000;
  const spans: Array<[number, number]> = [];
  for (let h = -2; h <= 3; h += 1) {
    for (const minute of Object.values(GCP_SLOT_MINUTE)) {
      const fire = hour + h * 3_600_000 + minute * MIN;
      spans.push([fire, fire + GCP_WORST_CASE_SLOT_MINUTES * MIN]);
    }
  }
  return spans;
}

describe("time fence", () => {
  test("exclusion zone is computed from the live slots: [:45, :07)", () => {
    expect(gcpExclusionInterval()).toMatchObject({ startMinute: 45, endMinute: 7 });
    expect(GCP_SLOT_MINUTE).toEqual({ "lake-publish-job": 47, "shadow-dispatch-job": 53 });
  });

  test("work inside the free span starts immediately", () => {
    expect(evaluateWindow(at("2026-10-04T04:30:00Z"), busyIntervalsFor("lake-publish-job"), 8)).toMatchObject({ ok: true, waitMs: 0 });
    expect(evaluateWindow(at("2026-10-04T04:07:00Z"), busyIntervalsFor("lake-publish-job"), 8).ok).toBe(true);
    // Budget ends exactly at :45 (half-open interval): allowed.
    expect(evaluateWindow(at("2026-10-04T04:41:00Z"), busyIntervalsFor("shadow-dispatch-job"), 4).ok).toBe(true);
  });

  test("a late fire inside or near a GCP slot waits for :07", () => {
    for (const iso of ["2026-10-04T04:42:00Z", "2026-10-04T04:47:30Z", "2026-10-04T04:53:00Z", "2026-10-04T05:06:59Z"]) {
      const w = evaluateWindow(at(iso), busyIntervalsFor("shadow-dispatch-job"), 4);
      expect(w.ok).toBe(false);
      expect(new Date(w.windowStartMs).getUTCMinutes()).toBe(7);
    }
    const lake = evaluateWindow(at("2026-10-04T04:40:00Z"), busyIntervalsFor("lake-publish-job"), 8);
    expect(lake.ok).toBe(false);
    expect(new Date(lake.windowStartMs).toISOString()).toBe("2026-10-04T05:07:00.000Z");
  });

  test("shadow fallback also stays clear of the Worker :20 dispatch", () => {
    const w = evaluateWindow(at("2026-10-04T04:17:00Z"), busyIntervalsFor("shadow-dispatch-job"), 4);
    expect(w.ok).toBe(false);
    expect(new Date(w.windowStartMs).toISOString()).toBe("2026-10-04T04:22:00.000Z");
    expect(evaluateWindow(at("2026-10-04T04:17:00Z"), busyIntervalsFor("lake-publish-job"), 4).ok).toBe(true);
  });

  test("exhaustive: no permitted start (any second of the day, any budget) overlaps a worst-case GCP run", () => {
    const day = at("2026-10-04T00:00:00Z");
    for (const job of ["lake-publish-job", "shadow-dispatch-job"] as const) {
      for (const budget of [1, 4, 8, 18, 30]) {
        for (let s = 0; s < 86_400; s += 37) {
          const now = day + s * 1000;
          const w = evaluateWindow(now, busyIntervalsFor(job), budget);
          const start = w.windowStartMs;
          expect(start).toBeGreaterThanOrEqual(now);
          for (const [fire, end] of gcpRuns(start)) {
            expect(start < end && start + budget * MIN > fire).toBe(false);
          }
        }
      }
    }
  });

  test("measured late GHA deliveries (2026-09-30..10-03) would all have been fenced", () => {
    // Real scheduled-run creation times of gha-shadow-dispatch.yml and gha-lake-publish.yml.
    const delivered = [
      "2026-10-03T23:07:52Z", "2026-10-03T19:58:52Z", "2026-10-03T17:19:04Z", "2026-10-02T20:47:52Z",
      "2026-10-02T15:52:12Z", "2026-10-01T06:07:41Z", "2026-09-30T23:56:44Z", "2026-09-29T20:53:06Z",
      "2026-10-03T09:50:46Z", "2026-10-02T20:42:35Z", "2026-10-01T07:49:45Z",
    ];
    for (const iso of delivered) {
      for (const job of ["lake-publish-job", "shadow-dispatch-job"] as const) {
        const w = evaluateWindow(at(iso), busyIntervalsFor(job), job === "lake-publish-job" ? 18 : 4);
        for (const [fire, end] of gcpRuns(w.windowStartMs)) {
          expect(w.windowStartMs < end && w.windowStartMs + (job === "lake-publish-job" ? 18 : 4) * MIN > fire).toBe(false);
        }
      }
    }
  });

  test("slot helpers", () => {
    expect(new Date(nextSlotFireMs("lake-publish-job", at("2026-10-04T04:12:00Z"))).toISOString()).toBe("2026-10-04T04:47:00.000Z");
    expect(new Date(nextSlotFireMs("lake-publish-job", at("2026-10-04T04:48:00Z"))).toISOString()).toBe("2026-10-04T05:47:00.000Z");
    expect(new Date(nextSlotFireMs("shadow-dispatch-job", at("2026-10-04T04:53:00Z"))).toISOString()).toBe("2026-10-04T04:53:00.000Z");
    expect(new Date(slotSettledMs(at("2026-10-04T04:47:00Z"))).toISOString()).toBe("2026-10-04T05:01:00.000Z");
  });
});

describe("parseUtc", () => {
  test("accepts ISO and SQLite UTC forms, rejects garbage", () => {
    expect(parseUtc("2026-10-04T01:47:32.123Z")).toBe(at("2026-10-04T01:47:32.123Z"));
    expect(parseUtc("2026-10-04 01:47:32")).toBe(at("2026-10-04T01:47:32Z"));
    expect(parseUtc("not a date")).toBeNull();
    expect(parseUtc(null)).toBeNull();
    expect(parseUtc("")).toBeNull();
  });
});

describe("Cloud Run executions health", () => {
  const now = at("2026-10-04T02:15:00Z");
  const L = "lake-publish-job" as const;
  test("unreadable is unknown", () => {
    expect(decideFromCloudRun(null, now, L).action).toBe("unknown");
  });
  test("latest settled slot is the most recent fire whose worst case has passed", () => {
    expect(new Date(latestSettledSlotFireMs(L, now)).toISOString()).toBe("2026-10-04T01:47:00.000Z");
    expect(new Date(latestSettledSlotFireMs("shadow-dispatch-job", at("2026-10-04T02:07:00Z"))).toISOString()).toBe("2026-10-04T01:53:00.000Z");
    expect(new Date(latestSettledSlotFireMs("shadow-dispatch-job", at("2026-10-04T02:06:00Z"))).toISOString()).toBe("2026-10-04T00:53:00.000Z");
  });
  test("success in the latest slot is standby", () => {
    const d = decideFromCloudRun([
      { name: "lake-publish-job-nnn72", createTime: "2026-10-04T01:47:05Z", completionTime: "2026-10-04T01:47:35Z", succeededCount: 1 },
    ], now, L);
    expect(d).toMatchObject({ action: "standby", signal: "cloud-run-executions" });
  });
  test("a running execution is standby even without a recent success", () => {
    const d = decideFromCloudRun([
      { name: "x-run", createTime: "2026-10-04T02:13:00Z", completionTime: null },
      { name: "x-old", createTime: "2026-10-03T20:47:00Z", completionTime: "2026-10-03T20:47:30Z", succeededCount: 1 },
    ], now, L);
    expect(d.action).toBe("standby");
    expect(d.reason).toContain("running");
  });
  test("failed latest slot is takeover", () => {
    const d = decideFromCloudRun([
      { name: "x-fail", createTime: "2026-10-04T01:47:00Z", completionTime: "2026-10-04T01:52:00Z", failedCount: 1 },
      { name: "x-ok", createTime: "2026-10-04T00:47:00Z", completionTime: "2026-10-04T00:47:30Z", succeededCount: 1 },
    ], now, L);
    expect(d.action).toBe("takeover");
    expect(d.reason).toContain("failed");
  });
  test("missed slot is takeover, even right at the window start (shadow :07 edge)", () => {
    expect(decideFromCloudRun([
      { name: "x-ok", createTime: "2026-10-04T00:47:00Z", completionTime: "2026-10-04T00:47:30Z", succeededCount: 1 },
    ], now, L).action).toBe("takeover");
    // At 02:07 the 01:53 shadow slot has settled; the 00:53 success (74 min old) must NOT cover it.
    const d = decideFromCloudRun([
      { name: "s-ok", createTime: "2026-10-04T00:53:04Z", completionTime: "2026-10-04T00:53:21Z", succeededCount: 1 },
    ], at("2026-10-04T02:07:00Z"), "shadow-dispatch-job");
    expect(d.action).toBe("takeover");
    expect(d.reason).toContain("missed");
  });
  test("a manual success shortly before the slot covers it; empty history is takeover", () => {
    expect(decideFromCloudRun([
      { name: "manual", createTime: "2026-10-04T01:35:00Z", completionTime: "2026-10-04T01:35:30Z", succeededCount: 1 },
    ], now, L).action).toBe("standby");
    expect(decideFromCloudRun([], now, L).action).toBe("takeover");
  });
});

describe("D1 shadow heartbeat proxy", () => {
  const now = at("2026-10-04T02:15:00Z");
  test("unreadable is unknown", () => {
    expect(decideFromShadowHeartbeat(null, now).action).toBe("unknown");
    expect(decideFromShadowHeartbeat({ lastObservedAt: null, shadowRows: null }, now).action).toBe("unknown");
    expect(decideFromShadowHeartbeat({ lastObservedAt: "garbage", shadowRows: 3 }, now).action).toBe("unknown");
    expect(decideFromShadowHeartbeat({ lastObservedAt: "2026-10-04T03:00:00Z", shadowRows: 3 }, now).action).toBe("unknown");
  });
  test("no shadow rows is standby", () => {
    expect(decideFromShadowHeartbeat({ lastObservedAt: null, shadowRows: 0 }, now).action).toBe("standby");
  });
  test("observation within 4 h is standby (normal eligible=0 gaps are ~3 h)", () => {
    expect(decideFromShadowHeartbeat({ lastObservedAt: "2026-10-03T23:53:13Z", shadowRows: 3 }, now).action).toBe("standby");
  });
  test("no observation for 4 h is takeover", () => {
    expect(decideFromShadowHeartbeat({ lastObservedAt: "2026-10-03 22:14:00", shadowRows: 3 }, now).action).toBe("takeover");
    expect(decideFromShadowHeartbeat({ lastObservedAt: null, shadowRows: 3 }, now).action).toBe("takeover");
  });
});

describe("Turso lake backlog straddle proxy", () => {
  const slot = at("2026-10-04T04:47:00Z");
  const snap = (readAt: string, pending: number, synced: number, last: string | null): LakeBacklogSnapshot => ({
    readAt, pendingStatements: pending, syncedRows: synced, lastSyncedAt: last,
  });
  const before = snap("2026-10-04T04:20:00Z", 6, 840, "2026-10-03 14:00:47");

  test("empty or unreadable backlog needs no straddle", () => {
    expect(decideLakePrecheck(null)?.action).toBe("unknown");
    expect(decideLakePrecheck(snap("2026-10-04T04:20:00Z", 0, 840, null))?.action).toBe("standby");
    expect(decideLakePrecheck(before)).toBeNull();
  });
  test("rows still pending after a settled slot with no sync progress is takeover", () => {
    const d = decideFromLakeStraddle(before, snap("2026-10-04T05:07:00Z", 6, 840, "2026-10-03 14:00:47"), slot);
    expect(d.action).toBe("takeover");
  });
  test("sync progress across the slot is standby", () => {
    expect(decideFromLakeStraddle(before, snap("2026-10-04T05:07:00Z", 2, 844, "2026-10-04 04:47:30"), slot).action).toBe("standby");
  });
  test("backlog cleared is standby", () => {
    expect(decideFromLakeStraddle(before, snap("2026-10-04T05:07:00Z", 0, 846, "2026-10-04 04:47:30"), slot).action).toBe("standby");
  });
  test("snapshots that do not straddle a settled slot are unknown", () => {
    expect(decideFromLakeStraddle(before, snap("2026-10-04T04:55:00Z", 6, 840, null), slot).action).toBe("unknown");
    expect(decideFromLakeStraddle(snap("2026-10-04T04:50:00Z", 6, 840, null), snap("2026-10-04T05:07:00Z", 6, 840, null), slot).action).toBe("unknown");
    expect(decideFromLakeStraddle(before, null, slot).action).toBe("unknown");
  });
});

describe("gate CLI helpers", () => {
  test("force comes only from the FORCE env and arguments are validated", () => {
    expect(parseArgs(["--job", "lake-publish-job", "--work-budget-minutes", "8"], {}).force).toBe(false);
    expect(parseArgs(["--job", "lake-publish-job", "--work-budget-minutes", "8"], { FORCE: "true" }).force).toBe(true);
    expect(() => parseArgs(["--job", "lake-miner-job", "--work-budget-minutes", "8"], {})).toThrow();
    expect(() => parseArgs(["--job", "lake-publish-job", "--work-budget-minutes", "45"], {})).toThrow();
  });

  test("heartbeat SQL is a single read-only SELECT", () => {
    expect(SHADOW_HEARTBEAT_SQL.trim().startsWith("SELECT")).toBe(true);
    expect(SHADOW_HEARTBEAT_SQL).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|REPLACE|CREATE)\b/i);
  });

  test("parses wrangler --json output", () => {
    expect(parseWranglerFirstRow('[{"results":[{"shadow_rows":3,"last_observed_at":"2026-10-04T00:53:14Z"}],"success":true}]'))
      .toEqual({ shadow_rows: 3, last_observed_at: "2026-10-04T00:53:14Z" });
    expect(parseWranglerFirstRow("boom")).toBeNull();
    expect(parseWranglerFirstRow('[{"results":[]}]')).toBeNull();
  });

  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keyJson = JSON.stringify({
    client_email: "viewer@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    token_uri: "https://oauth2.example/token",
  });

  test("mints a short-lived token with a valid RS256 signature", async () => {
    let assertion = "";
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      assertion = new URLSearchParams(String(init.body)).get("assertion") ?? "";
      return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await mintAccessToken(keyJson, fakeFetch)).toBe("tok");
    const [h, c, sig] = assertion.split(".");
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    expect(claims.scope).toBe("https://www.googleapis.com/auth/cloud-platform");
    expect(claims.exp - claims.iat).toBe(600);
    expect(claims.aud).toBe("https://oauth2.example/token");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${h}.${c}`);
    expect(verifier.verify(publicKey, Buffer.from(sig, "base64url"))).toBe(true);
  });

  test("reads executions with GET and maps them; API failure is null", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const ok = (async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? "GET" });
      if (url.includes("token")) return new Response(JSON.stringify({ access_token: "tok" }));
      return new Response(JSON.stringify({ executions: [{
        name: "projects/p/locations/r/jobs/lake-publish-job/executions/lake-publish-job-abc",
        createTime: "2026-10-04T01:47:05Z", completionTime: "2026-10-04T01:47:35Z", succeededCount: 1,
      }] }));
    }) as unknown as typeof fetch;
    const rows = await readCloudRunExecutions("lake-publish-job", keyJson, ok);
    expect(rows).toEqual([{ name: "lake-publish-job-abc", createTime: "2026-10-04T01:47:05Z", completionTime: "2026-10-04T01:47:35Z", succeededCount: 1, failedCount: 0, cancelledCount: 0 }]);
    expect(calls[1]).toMatchObject({ method: "GET" });
    expect(calls[1].url).toContain("/jobs/lake-publish-job/executions");
    const denied = (async (url: string) => url.includes("token")
      ? new Response(JSON.stringify({ access_token: "tok" }))
      : new Response("{}", { status: 403 })) as unknown as typeof fetch;
    expect(await readCloudRunExecutions("lake-publish-job", keyJson, denied)).toBeNull();
  });
});
