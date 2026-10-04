/**
 * SSAE-02 replay-coverage matrix as executable characterization fixtures.
 *
 * The SSAE-02 deliverable is a compact source-memory contract whose verify/exit
 * criterion is "state fixture cases for missing evidence, unknown dependencies,
 * policy/opt-out expiry, concurrent versions and URL/content distinction, with no
 * unsupported enum writes". Until this file, that criterion existed only as prose
 * in `docs/audits/2026-10-04-SSAE-02-COMPACT-SOURCE-MEMORY.md` (§3.4 action
 * feasibility matrix, §4.1 dependency sets, §5 replay coverage matrix, §7 state
 * fixture cases) — a CONSTITUTION §8.4 "paper" gap, since documentation does not
 * prove implementation.
 *
 * Scope and honesty statement (read before citing anything here):
 *
 * - These tests characterize EXISTING repository code. They add no gate, no
 *   threshold, no accepted parameter, no writer, no clock, no publication path and
 *   no enum. Nothing here is runtime evidence.
 * - Every record in this file is a synthetic fixture. No live Turso or D1 read
 *   happened, so every runtime count, coverage ratio and replay rate is UNKNOWN.
 * - SSAE-02 stays PROPOSED. This file does not accept the card, does not accept
 *   any MATH item, and does not certify the replay capability it describes.
 * - Recorded findings (F-RC-*) state reproducible CURRENT behavior with its
 *   consequence named. None is fixed here; each needs its own authorized unit.
 * - Labels follow the program convention: `SSAE-02:`.
 */

import { describe, it, expect } from "bun:test";

// The matrix under characterization: mode selection and hard feasibility.
import {
  selectProcessingMode,
  evaluateFeasibility,
  CURRENT_VERSIONS,
  type SourceMemoryRecord,
  type VersionDeps,
  type ProcessingMode,
} from "./source-ranker";

// Per-job field-level completeness, material digests and delta detection.
import {
  emptyClocks,
  applySighting,
  checkReplayCoverage,
  materialDigest,
  unknownMaterialFields,
  MATERIAL_FIELDS,
  type JobMaterialFacts,
} from "./observation-clocks";

// Fingerprint / content identity bases actually used by the two writers.
import { computeFingerprint, truncatePayload, MAX_RAW_PAYLOAD_CHARS } from "./lake-shared";
import { toContentHash, hashString } from "../../packages/scraper/contentHash";

// Publication-decision and concentration replay.
import {
  decideAutoPublish,
  wilsonLowerBound,
  concentrationAllowance,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
  MIN_JOBS_FOR_RATE,
  JEV_MIN_CONFIDENCE,
  type InventorySnapshot,
} from "./auto-publish-policy";

// Conditional-fetch validator replay.
import { conditionalValidatorsForPersistence } from "../../apps/web/src/lib/conditional-state";
import { unchangedOutput } from "../../packages/scraper/conditional";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = "2026-10-04T02:00:00.000Z";

function versions(overrides: Partial<VersionDeps> = {}): VersionDeps {
  return { ...CURRENT_VERSIONS, ...overrides };
}

function record(overrides: Partial<SourceMemoryRecord> = {}): SourceMemoryRecord {
  return {
    source_id: "we-work-remotely",
    provider_id: "WeWorkRemotely",
    declared_capability: "rss_xml",
    endpoint_url: "https://weworkremotely.com/remote-jobs.rss",
    company_token: null,
    payload_kind: "xml",
    selected_processor: "rss_xml",
    routing_warnings: [],
    fetch_state: {
      etag: 'W/"v1"',
      last_modified: "2026-10-03T00:00:00.000Z",
      last_body_hash: "0f2c1a",
      last_fetch_at: "2026-10-03T12:00:00.000Z",
      last_fetch_ok: true,
      consecutive_failures: 0,
      backoff_until: null,
    },
    lake_state: {
      last_raw_observation_id: 41,
      last_candidate_count: 120,
      last_qualified_ready: 24,
      last_ingestion_at: "2026-10-03T12:00:00.000Z",
      last_sighting_at: "2026-10-03T12:00:00.000Z",
    },
    publication_state: {
      compliance_state: "allowed",
      operational_state: "active",
      policy_expiry: null,
      opt_out: false,
      lease_expiry: null,
      last_decision: "ADMIT",
      last_decision_at: "2026-09-30T00:00:00.000Z",
      last_publication_at: "2026-10-03T12:05:00.000Z",
      last_publication_count: 24,
      last_publication_mode: "capped",
      concentration_status: "OK",
    },
    health_rollup: {
      recent_success_rate: 0.97,
      recent_ph_rate: 0.2,
      recent_false_ph_rate: null,
      last_quality_check_at: "2026-10-01T00:00:00.000Z",
      robots_last_checked_at: "2026-10-01T00:00:00.000Z",
      robots_allows: true,
    },
    version_deps: versions(),
    retention: {
      raw_observation_ttl_days: 30,
      candidate_ttl_days: 180,
      sighting_ttl_days: 365,
      fetch_state_ttl_days: 90,
      publication_receipt_ttl_days: 3650,
    },
    replay_coverage: {
      can_replay_geo_gate: true,
      can_replay_triage: true,
      can_replay_fingerprint: true,
      can_replay_conditional: true,
      can_replay_publication: true,
      missing_fields: [],
    },
    material_digests: {
      fingerprint_hash: "fp-9ac1",
      content_hash: "ch-31bd",
      description_hash: null,
      policy_hash: "constitution-v5.2",
    },
    ...overrides,
  };
}

function facts(overrides: Partial<JobMaterialFacts> = {}): JobMaterialFacts {
  return {
    title: "Virtual Assistant — Pacific",
    location_raw: "Anywhere (Remote)",
    remote: "remote",
    description_digest: "desc-77c1",
    apply_url: "https://boards.greenhouse.io/acme/jobs/9001",
    posted_at: "2026-10-02T08:00:00.000Z",
    safety: "clear",
    ...overrides,
  };
}

// ─── §4.1 dependency sets per processing mode ────────────────────────────────

describe("SSAE-02: §4.1 dependency set required per processing mode", () => {
  it("REUSE requires every version dependency to match the current deployment", () => {
    const base = record();
    expect(selectProcessingMode(base, versions()).mode).toBe("REUSE");

    // Every single-key change must deny REUSE. §4.1 says ANY dependency change
    // invalidates REUSE, so this asserts per key rather than one example.
    const denied: Array<[keyof VersionDeps, ProcessingMode]> = [
      ["policy_version", "BOUNDED_REPLAY"],
      ["geo_gate_version", "BOUNDED_REPLAY"],
      ["triage_version", "BOUNDED_REPLAY"],
      ["fingerprint_version", "BOUNDED_REPLAY"],
      ["content_hash_version", "BOUNDED_REPLAY"],
      ["processor_version", "REINDEX"],
      ["jev_version", "REINDEX"],
    ];
    for (const [key, expected] of denied) {
      const changed = selectProcessingMode(base, versions({ [key]: `next-${key}` } as Partial<VersionDeps>));
      expect({ key, mode: changed.mode }).toEqual({ key, mode: expected });
      expect(changed.dependencies).not.toBeNull();
    }
  });

  it("§7.2 unknown dependencies deny REUSE and demand the conservative FULL mode", () => {
    const base = record();
    for (const stamp of ["unknown", "unversioned", ""]) {
      const stamped = record({ version_deps: versions({ processor_version: stamp }) });
      const selected = selectProcessingMode(stamped, versions());
      expect({ stamp, mode: selected.mode }).toEqual({ stamp, mode: "FULL" });
      expect(selected.reason).toContain("conservative");
    }
  });

  it("§7.4 a concurrent policy_version on stored evidence yields BOUNDED_REPLAY, not REUSE", () => {
    const stale = record({ version_deps: versions({ policy_version: "constitution-v5.1" }) });
    const selected = selectProcessingMode(stale, versions());
    expect(selected.mode).toBe("BOUNDED_REPLAY");
    expect(selected.dependencies).toContain("POLICY");
  });
});

// ─── §3.4 action feasibility: hard gates per action ─────────────────────────

describe("SSAE-02: §3.4 hard gates precede any mode or score", () => {
  it("an opted-out source is infeasible and its cached positive decision is invalidated", () => {
    const optedOut = record({
      publication_state: { ...record().publication_state, opt_out: true },
    });
    const gate = evaluateFeasibility(optedOut, new Date(NOW));
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("OPT_OUT");
    expect(selectProcessingMode(optedOut, versions()).mode).toBe("BOUNDED_REPLAY");
  });

  it("an expired policy lease and an expired evidence lease are distinct hard gates", () => {
    const base = record();
    const expiredPolicy = record({
      publication_state: { ...base.publication_state, policy_expiry: "2026-09-01T00:00:00.000Z" },
    });
    const expiredLease = record({
      publication_state: { ...base.publication_state, lease_expiry: "2026-09-01T00:00:00.000Z" },
    });
    expect(evaluateFeasibility(expiredPolicy, new Date(NOW)).hardGate).toBe("POLICY_EXPIRY");
    expect(evaluateFeasibility(expiredLease, new Date(NOW)).hardGate).toBe("LEASE_EXPIRY");
    expect(selectProcessingMode(expiredPolicy, versions()).mode).toBe("BOUNDED_REPLAY");
    expect(selectProcessingMode(expiredLease, versions()).mode).toBe("BOUNDED_REPLAY");
  });

  it("robots disallow and an active backoff both deny the fetch action", () => {
    const base = record();
    expect(
      evaluateFeasibility(record({ health_rollup: { ...base.health_rollup, robots_allows: false } }), new Date(NOW)),
    ).toMatchObject({ permitted: false, hardGate: "ROBOTS" });
    expect(
      evaluateFeasibility(
        record({ fetch_state: { ...base.fetch_state, backoff_until: "2026-10-05T00:00:00.000Z" } }),
        new Date(NOW),
      ),
    ).toMatchObject({ permitted: false, hardGate: "RATE_LIMIT" });
  });

  it("a transient-failure count above the threshold is not permanent proof of a bad source", () => {
    const base = record();
    const failing = record({
      fetch_state: { ...base.fetch_state, consecutive_failures: 4, last_fetch_ok: false },
    });
    // Denied for now, and the reason names the observed failures rather than
    // declaring the source permanently unacceptable.
    const gate = evaluateFeasibility(failing, new Date(NOW));
    expect(gate.permitted).toBe(false);
    expect(gate.hardGate).toBe("RATE_LIMIT");
    expect(gate.reason).toContain("4 consecutive failures");
  });

  it("§7.1 a source with no prior evidence is FULL, and is not silently REUSE", () => {
    const fresh = record({
      fetch_state: {
        etag: null,
        last_modified: null,
        last_body_hash: null,
        last_fetch_at: null,
        last_fetch_ok: false,
        consecutive_failures: 0,
        backoff_until: null,
      },
      lake_state: {
        last_raw_observation_id: null,
        last_candidate_count: 0,
        last_qualified_ready: 0,
        last_ingestion_at: null,
        last_sighting_at: null,
      },
      material_digests: { fingerprint_hash: "", content_hash: "", description_hash: null, policy_hash: "constitution-v5.2" },
    });
    const selected = selectProcessingMode(fresh, versions());
    expect(selected.mode).toBe("FULL");
    expect(evaluateFeasibility(fresh, new Date(NOW)).permitted).toBe(true);
  });
});

// ─── §5 replay coverage matrix, row by row ───────────────────────────────────

describe("SSAE-02: §5 matrix row — geo-gate re-evaluation", () => {
  it("is replayable only when every material fact is known, and a missing fact is reported", () => {
    const complete = checkReplayCoverage(
      applySighting(emptyClocks("id-geo-1"), { observed_at: "2026-10-01T00:00:00.000Z", identity_hash: "id-geo-1", facts: facts() })
        .clocks,
    );
    expect(complete).toEqual({ complete: true, missing_material_fields: [], requires_full_reacquisition: false });

    const missing = checkReplayCoverage(
      applySighting(emptyClocks("id-geo-2"), {
        observed_at: "2026-10-01T00:00:00.000Z",
        identity_hash: "id-geo-2",
        facts: facts({ location_raw: null, remote: "unknown" }),
      }).clocks,
    );
    expect(missing.complete).toBe(false);
    expect(missing.requires_full_reacquisition).toBe(true);
    expect(missing.missing_material_fields.sort()).toEqual(["location_raw", "remote"]);
  });

  it("F-RC-6 — the executable field set is not the documented one: `tags` and `company` are not replay fields", () => {
    // §5 lists the geo-gate requirement as location_raw, description, tags, title,
    // company. VERIFIED_CODE: the only completeness oracle in the repo is
    // `unknown_material_fields` over MATERIAL_FIELDS, which has no `tags` and no
    // `company`, and carries a `remote` disposition and a description *digest*
    // instead of a description. Consequence: this file cannot verify the §5 geo
    // row field-for-field, and a record with a complete oracle can still be
    // missing the fields §5 names. Recorded, not fixed.
    expect(MATERIAL_FIELDS).not.toContain("tags" as never);
    expect(MATERIAL_FIELDS).not.toContain("company" as never);
    expect(MATERIAL_FIELDS).toContain("location_raw");
    const completeButUndocumented = unknownMaterialFields(facts());
    expect(completeButUndocumented).toEqual([]);
  });
});

describe("SSAE-02: §5 matrix row — fingerprint re-computation", () => {
  it("recomputes identically from company, title and apply domain (VERIFIED_CODE)", () => {
    const a = computeFingerprint("Acme Corp", "Virtual Assistant", "https://boards.greenhouse.io/acme/jobs/9001");
    const b = computeFingerprint("acme-corp", "virtual assistant", "https://boards.greenhouse.io/acme/jobs/9002");
    // Punctuation/case in the company and the job id in the path are normalized away.
    expect(a).toBe(b);
    expect(computeFingerprint("Acme Corp", "Virtual Assistant", "https://jobs.lever.co/acme/9001")).not.toBe(a);
  });

  it("§7.5 identity survives a description change; the material digest does not", () => {
    const before = facts({ description_digest: "desc-77c1" });
    const after = facts({ description_digest: "desc-9f30" });
    // Identity base: company + title + apply domain. Unchanged by a body edit.
    const identityBefore = computeFingerprint("Acme Corp", before.title!, before.apply_url!);
    const identityAfter = computeFingerprint("Acme Corp", after.title!, after.apply_url!);
    expect(identityAfter).toBe(identityBefore);
    // Material base: length-prefixed over every decision-relevant field. Changed.
    expect(materialDigest(after)).not.toBe(materialDigest(before));
  });

  it("F-RC-4 — §7.5 overstates `content_hash`: the live content hash is title+URL only", () => {
    // §7.5 claims "content_hash differs (title+URL same, but description changed)".
    // VERIFIED_CODE: `toContentHash` hashes exactly `${title}::${sourceUrl}`, so a
    // description edit leaves it byte-identical. Consequence: an unchanged
    // `content_hash` proves neither a stable posting nor unchanged content, and
    // content-sensitive replay must use `materialDigest`, not `toContentHash`.
    const sameTitleUrl = toContentHash("Virtual Assistant", "https://example.com/jobs/9001");
    expect(toContentHash("Virtual Assistant", "https://example.com/jobs/9001")).toBe(sameTitleUrl);
    expect(sameTitleUrl).toBe(hashString("Virtual Assistant::https://example.com/jobs/9001"));
    expect(sameTitleUrl).not.toBe(hashString("Virtual Assistant (Renew)::https://example.com/jobs/9001"));
  });
});

describe("SSAE-02: §5 matrix row — conditional fetch replay", () => {
  it("persists validators only when every item reached a durable terminal outcome", () => {
    expect(conditionalValidatorsForPersistence({ etag: 'W/"v1"', lastModified: "x", bodyHash: "y" }, true)).toEqual({
      etag: 'W/"v1"',
      lastModified: "x",
      bodyHash: "y",
    });
    // Clearing is the conservative direction: re-fetch and re-deduplicate rather
    // than let a later 304 drop an unresolved item.
    expect(conditionalValidatorsForPersistence({ etag: 'W/"v1"', lastModified: "x", bodyHash: "y" }, false)).toEqual({
      etag: null,
      lastModified: null,
      bodyHash: null,
    });
  });

  it("a 304 replays the previous validators but yields no new observation", () => {
    const out = unchangedOutput({ etag: 'W/"v1"', lastModified: "2026-10-03T00:00:00.000Z", lastBodyHash: "0f2c1a" });
    expect(out.notModified).toBe(true);
    expect(out.items).toEqual([]);
    expect(out.bodyHash).toBe("0f2c1a");
  });
});

describe("SSAE-02: §5 matrix row — publication decision replay", () => {
  it("replays the same deterministic decision from the same cohort evidence", () => {
    // 30/100 clears the 0.2 Wilson floor; 24/120 does not (see the ambiguous-band
    // case below), so the cohort size is chosen to make the math-cleared branch
    // the one under test.
    const input = {
      sourceId: "we-work-remotely",
      totalJobs: 100,
      qualifiedReady: 30,
      jevChoice: null as null,
      jevConfidence: null as number | null,
      inventory: null,
    };
    const first = decideAutoPublish(input);
    const second = decideAutoPublish(input);
    expect(first).toEqual(second);
    expect(first.action).toBe("PUBLISH");
    expect(first.wilsonLower).not.toBeNull();
    expect(first.wilsonLower!).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);
  });

  it("the sample floor and the Wilson floor are properties of the cohort, not of a replay flag", () => {
    // Below the sample floor the decision is HOLD even at a 100% PH rate.
    const tiny = decideAutoPublish({
      sourceId: "s",
      totalJobs: MIN_JOBS_FOR_RATE - 1,
      qualifiedReady: MIN_JOBS_FOR_RATE - 1,
      inventory: null,
    });
    expect(tiny.action).toBe("HOLD");
    expect(tiny.publishCount).toBe(0);

    // A hard reject below the PH floor is a REJECT, not an ambiguous HOLD.
    const rejected = decideAutoPublish({ sourceId: "s", totalJobs: 100, qualifiedReady: 3, inventory: null });
    expect(REJECT_PH_RATE_FLOOR).toBeGreaterThan(0);
    expect(rejected.action).toBe("REJECT");

    // A confident Jev verdict only executes the ambiguous band: it cannot promote a
    // cohort the math already cleared, and it cannot veto a cleared one.
    const ambiguous = decideAutoPublish({
      sourceId: "s",
      totalJobs: 100,
      qualifiedReady: 9,
      jevChoice: "ADMIT",
      jevConfidence: JEV_MIN_CONFIDENCE,
      inventory: null,
    });
    expect(ambiguous.action).toBe("PUBLISH");
    expect(wilsonLowerBound(9, 100)!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    const veto = decideAutoPublish({
      sourceId: "s",
      totalJobs: 100,
      qualifiedReady: 30,
      jevChoice: "REJECT",
      jevConfidence: 0.99,
      inventory: null,
    });
    expect(veto.action).toBe("PUBLISH");
  });

  it("§5 gap is reproducible: an ambiguous-band decision that hinged on Jev is not replayable without the Jev evidence", () => {
    // §5 records the gap as "Jev raw verdicts only in lake (jev_raw)". VERIFIED_CODE:
    // drop the retained verdict and the identical cohort replays to a different
    // decision, because `jevChoice`/`jevConfidence` are inputs, not stored facts.
    const withJev = decideAutoPublish({
      sourceId: "s",
      totalJobs: 100,
      qualifiedReady: 9,
      jevChoice: "ADMIT",
      jevConfidence: 0.8,
      inventory: null,
    });
    const withoutJev = decideAutoPublish({ sourceId: "s", totalJobs: 100, qualifiedReady: 9, inventory: null });
    expect(withJev.action).toBe("PUBLISH");
    expect(withoutJev.action).toBe("HOLD");
  });
});

describe("SSAE-02: §5 matrix row — concentration check replay", () => {
  it("F-RC-3 — without a persisted inventory snapshot the ceiling is UNKNOWN, not BLOCKED", () => {
    const base = record();
    const noSnapshot: InventorySnapshot | null = null;
    const unknown = concentrationAllowance(base.source_id, 24, noSnapshot);
    expect(unknown).toEqual({ allowed: 24, concentration: "UNKNOWN" });

    // The same cohort against a real snapshot is capped, so the two are not
    // interchangeable: the matrix's PARTIAL verdict is exact, not cosmetic.
    const snapshot: InventorySnapshot = {
      activeTotal: 400,
      bySource: [
        { sourceId: "we-work-remotely", count: 85 },
        { sourceId: "other-provider", count: 315 },
      ],
    };
    const capped = concentrationAllowance(base.source_id, 24, snapshot);
    // Source ceiling 0.25 leaves room for (100 - 85) / 0.75 = 20 more rows.
    expect(capped.allowed).toBe(20);
    expect(capped.allowed).toBeLessThan(24);
    expect(capped.concentration).toBe("RELIEVES");

    // And the whole gate is inert below the documented minimum inventory, so a
    // small board is not concentration-throttled at all.
    const smallBoard = concentrationAllowance(base.source_id, 24, { activeTotal: 99, bySource: [] });
    expect(smallBoard).toEqual({ allowed: 24, concentration: "UNKNOWN" });
  });

  it("a full-board publish decision is unaffected when concentration cannot be evaluated", () => {
    const decision = decideAutoPublish({
      sourceId: "we-work-remotely",
      totalJobs: 100,
      qualifiedReady: 30,
      inventory: null,
    });
    expect(decision.action).toBe("PUBLISH");
    expect(decision.concentration).toBe("UNKNOWN");
    // The unknown concentration ceiling is not treated as a block: the whole
    // cohort publishes. Recorded as current behavior; it is not an acceptance of
    // the concentration control.
    expect(decision.publishCount).toBe(30);
  });
});

describe("SSAE-02: §5 matrix row — triage re-evaluation (the documented truncation gap)", () => {
  it("the raw observation store truncates at 1M chars, so a large page is not replayable in full", () => {
    const tail = "</html>REMOTE-IN-PHILIPPINES";
    const large = "x".repeat(MAX_RAW_PAYLOAD_CHARS) + tail;
    const stored = truncatePayload(large);
    expect(stored).toHaveLength(MAX_RAW_PAYLOAD_CHARS);
    expect(stored).not.toContain("REMOTE-IN-PHILIPPINES");
    expect(stored).not.toBe(large);
    // Below the cap the payload is retained whole, so the gap is size-dependent.
    expect(truncatePayload("small page")).toBe("small page");
  });

  it("F-RC-1 — the mode selector never consults `replay_coverage`, so a known triage gap does not deny REUSE", () => {
    // The adapter that builds records from the lake stamps
    // `can_replay_triage: false` with `missing_fields: ["raw_payload_full", "jev_raw"]`.
    const gapped = record({
      replay_coverage: {
        can_replay_geo_gate: true,
        can_replay_triage: false,
        can_replay_fingerprint: true,
        can_replay_conditional: true,
        can_replay_publication: true,
        missing_fields: ["raw_payload_full", "jev_raw"],
      },
    });
    const selected = selectProcessingMode(gapped, versions());
    expect(selected.mode).toBe("REUSE");
    expect(selected.reason).toContain("Sufficient compatible evidence");
    // Consequence: §3.4's REUSE row requires compatible material evidence, and the
    // only statement of that evidence's completeness (`replay_coverage`) is not
    // an input to the mode decision. §5's PARTIAL triage row therefore cannot be
    // enforced at the mode boundary today. Recorded, not fixed: SSAE-07 owns the
    // mode selector and PR #169 is not on main.
    expect(selected.dependencies).toBeNull();
  });
});

// ─── §5 cross-row: a complete record still does not imply replay completeness ──

describe("SSAE-02: cross-row invariants of the matrix", () => {
  it("an unknown field is retained as unknown and never counted as a value", () => {
    expect(unknownMaterialFields(facts({ posted_at: null, safety: "unknown" })).sort()).toEqual(["posted_at", "safety"]);
    // An unknown posting date stays null in the digest input; it is never replaced
    // with the observation time.
    const digest = materialDigest(facts({ posted_at: null }));
    expect(digest).not.toBe(materialDigest(facts({ posted_at: "2026-10-02T08:00:00.000Z" })));
  });

  it("F-RC-5 — mode selection reads the wall clock, so a historical replay is not reproducible without a clock seam", () => {
    // VERIFIED_CODE: `selectProcessingMode` compares policy_expiry/lease_expiry
    // against `new Date()` and takes no `now` argument, while `evaluateFeasibility`
    // takes one. Consequence: replaying a past decision with today's clock can
    // classify the same evidence differently, and SSAE-09's exact reconstruction
    // needs an injected clock. Recorded, not fixed.
    expect(selectProcessingMode.length).toBe(2);
    expect(evaluateFeasibility.length).toBe(2);
    const expiringSoon = record({
      publication_state: { ...record().publication_state, lease_expiry: "2000-01-01T00:00:00.000Z" },
    });
    expect(selectProcessingMode(expiringSoon, versions()).mode).toBe("BOUNDED_REPLAY");
    expect(evaluateFeasibility(expiringSoon, new Date("1999-01-01T00:00:00.000Z")).permitted).toBe(true);
  });
});