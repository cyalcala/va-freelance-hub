import { describe, expect, test } from "bun:test";
import {
  assessCanaryReadiness,
  renderCanaryReadinessReport,
  type ShadowSourceRow,
  type ShadowObservationRow,
} from "./canary-readiness";

const NOW = "2026-09-19T12:00:00.000Z";

function makeSource(sourceId: string, providerId: string = "breezy"): ShadowSourceRow {
  return {
    source_id: sourceId,
    provider_id: providerId,
    display_name: sourceId,
    endpoint_url: `https://example.com/api/${sourceId}`,
    company_token: sourceId.split(":")[1],
    compliance_state: "conditional",
    operational_state: "shadow",
    canary_max_new_items_per_tick: 2,
    policy_expiry: "2027-03-10T00:00:00.000Z",
  };
}

function makeObs(
  id: number,
  sourceId: string,
  observedAt: string,
  outcome: string = "HEALTHY_WITH_RESULTS",
  plausibleItems: number = 10,
): ShadowObservationRow {
  return {
    id,
    source_id: sourceId,
    provider_id: sourceId.split(":")[0],
    observed_at: observedAt,
    outcome,
    plausible_items: plausibleItems,
    request_count: 1,
    bytes_received: 500,
    item_count: 10,
    evidence_hash: "a".repeat(64),
    admission_evidence_id: 1,
    shadow_entry_hash: "ENTRY_HASH",
    dispatch_key: `key-${id}`,
  };
}

describe("canary-readiness diagnostic", () => {
  test("reports NO_OBSERVATIONS when source has no shadow history", () => {
    const source = makeSource("breezy:test");
    const audit = assessCanaryReadiness([source], [], NOW);

    expect(audit.totalShadowSources).toBe(1);
    expect(audit.qualifiedReadyCount).toBe(0);
    expect(audit.sources[0].qualificationStatus).toBe("NO_OBSERVATIONS");
    expect(audit.sources[0].canaryReady).toBe(false);
  });

  test("reports QUALIFIED_READY for mature source with 8+ days and 7+ span with zero defects", () => {
    const source = makeSource("breezy:20four7va");
    const obs: ShadowObservationRow[] = [];
    // 9 distinct days across 8 full days span
    for (let day = 11; day <= 19; day++) {
      const dayStr = String(day).padStart(2, "0");
      obs.push(makeObs(day, "breezy:20four7va", `2026-09-${dayStr}T10:00:00.000Z`, "HEALTHY_WITH_RESULTS", 5));
    }

    const audit = assessCanaryReadiness([source], obs, NOW);
    expect(audit.qualifiedReadyCount).toBe(1);
    expect(audit.sources[0].qualificationStatus).toBe("QUALIFIED_READY");
    expect(audit.sources[0].canaryReady).toBe(true);
    expect(audit.sources[0].distinctDays).toBe(9);
    expect(audit.sources[0].minDaysPassed).toBe(true);
    expect(audit.sources[0].minSpanPassed).toBe(true);
    expect(audit.sources[0].freshnessPassed).toBe(true);
  });

  test("reports IN_PROGRESS when source has fewer than 8 distinct days", () => {
    const source = makeSource("breezy:time-etc");
    const obs: ShadowObservationRow[] = [];
    // 5 distinct days
    for (let day = 15; day <= 19; day++) {
      const dayStr = String(day).padStart(2, "0");
      obs.push(makeObs(day, "breezy:time-etc", `2026-09-${dayStr}T10:00:00.000Z`, "HEALTHY_WITH_RESULTS", 2));
    }

    const audit = assessCanaryReadiness([source], obs, NOW);
    expect(audit.qualifiedReadyCount).toBe(0);
    expect(audit.inProgressCount).toBe(1);
    expect(audit.sources[0].qualificationStatus).toBe("IN_PROGRESS");
    expect(audit.sources[0].canaryReady).toBe(false);
    expect(audit.sources[0].distinctDays).toBe(5);
  });

  test("reports RATE_LIMITED_RESET when RATE_LIMITED observations occur after first qualifying observation", () => {
    const source = makeSource("workable:coconutva", "workable");
    const obs: ShadowObservationRow[] = [];
    // Day 1: healthy
    obs.push(makeObs(1, "workable:coconutva", "2026-09-11T10:00:00.000Z", "HEALTHY_WITH_RESULTS", 20));
    // Day 2..8: rate limited
    for (let day = 12; day <= 18; day++) {
      const dayStr = String(day).padStart(2, "0");
      obs.push(makeObs(day, "workable:coconutva", `2026-09-${dayStr}T10:00:00.000Z`, "RATE_LIMITED", 0));
    }

    const audit = assessCanaryReadiness([source], obs, NOW);
    expect(audit.qualifiedReadyCount).toBe(0);
    expect(audit.rateLimitedResetCount).toBe(1);
    expect(audit.sources[0].qualificationStatus).toBe("RATE_LIMITED_RESET");
    expect(audit.sources[0].canaryReady).toBe(false);
    expect(audit.sources[0].disqualifyingCount).toBe(7);
  });

  test("renders markdown report with executive summary and matrix", () => {
    const source = makeSource("breezy:20four7va");
    const obs: ShadowObservationRow[] = [];
    for (let day = 11; day <= 19; day++) {
      const dayStr = String(day).padStart(2, "0");
      obs.push(makeObs(day, "breezy:20four7va", `2026-09-${dayStr}T10:00:00.000Z`, "HEALTHY_WITH_RESULTS", 5));
    }

    const audit = assessCanaryReadiness([source], obs, NOW);
    const md = renderCanaryReadinessReport(audit);

    expect(md).toContain("# Canary Readiness Audit Report (EX-CANARY-READINESS)");
    expect(md).toContain("breezy:20four7va");
    expect(md).toContain("QUALIFIED_READY");
    expect(md).toContain("Autonomy Cutover Predicate 10-Condition Audit");
  });
});
