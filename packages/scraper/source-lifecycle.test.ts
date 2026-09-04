import { describe, expect, test } from "bun:test";
import {
  canEnterShadow,
  canEnterCanary,
  canEnterActive,
  isValidOperationalTransition,
  isComplianceAllowsShadowCanaryActive,
  isComplianceHold,
  isOptedOut,
  isReviewDeadlineOverdue,
  isPolicyExpired,
  isEvidenceLeaseExpired,
  isRenewalDue,
  computeReviewDeadline,
  computePolicyExpiry,
  applyLeaseExpiry,
  validateTransition,
} from "./source-lifecycle";

describe("operational transition graph", () => {
  test("candidate → shadow is allowed, candidate → active is not", () => {
    expect(isValidOperationalTransition("candidate", "shadow")).toBe(true);
    expect(isValidOperationalTransition("candidate", "active")).toBe(false);
    expect(isValidOperationalTransition("candidate", "canary")).toBe(false);
  });
  test("shadow → canary allowed, shadow → active via canary only", () => {
    expect(isValidOperationalTransition("shadow", "canary")).toBe(true);
    expect(isValidOperationalTransition("shadow", "active")).toBe(false);
  });
  test("canary → active allowed", () => {
    expect(isValidOperationalTransition("canary", "active")).toBe(true);
  });
  test("active → review_due → paused is the expiry path", () => {
    expect(isValidOperationalTransition("active", "review_due")).toBe(true);
    expect(isValidOperationalTransition("review_due", "paused")).toBe(true);
    expect(isValidOperationalTransition("active", "paused")).toBe(true);
  });
  test("active → degraded → quarantined → paused", () => {
    expect(isValidOperationalTransition("active", "degraded")).toBe(true);
    expect(isValidOperationalTransition("degraded", "quarantined")).toBe(true);
    expect(isValidOperationalTransition("quarantined", "paused")).toBe(true);
  });
  test("paused cannot jump to active", () => {
    expect(isValidOperationalTransition("paused", "active")).toBe(false);
    expect(isValidOperationalTransition("paused", "shadow")).toBe(false);
    expect(isValidOperationalTransition("paused", "candidate")).toBe(true);
  });
  test("retired is terminal", () => {
    expect(isValidOperationalTransition("retired", "active")).toBe(false);
    expect(isValidOperationalTransition("retired", "candidate")).toBe(false);
  });
});

describe("compliance guard — never auto-promote a hold", () => {
  test("allowed/conditional allow shadow, all holds block", () => {
    expect(isComplianceAllowsShadowCanaryActive("allowed")).toBe(true);
    expect(isComplianceAllowsShadowCanaryActive("conditional")).toBe(true);
    expect(isComplianceAllowsShadowCanaryActive("needs_review")).toBe(false);
    expect(isComplianceAllowsShadowCanaryActive("awaiting_permission")).toBe(false);
    expect(isComplianceAllowsShadowCanaryActive("blocked")).toBe(false);
    expect(isComplianceAllowsShadowCanaryActive("deprecated")).toBe(false);
  });
  test("isComplianceHold mirrors not-allowed", () => {
    expect(isComplianceHold("blocked")).toBe(true);
    expect(isComplianceHold("allowed")).toBe(false);
  });
});

describe("opt-out blocks shadow/canary/active", () => {
  const opt = new Set(["workable:acme", "evil:feed"]);
  test("isOptedOut true for listed id", () => {
    expect(isOptedOut("workable:acme", opt)).toBe(true);
    expect(isOptedOut("unknown:foo", opt)).toBe(false);
  });
  test("canEnterShadow blocked by optOut", () => {
    expect(canEnterShadow({ compliance: "allowed", operational: "candidate", optOut: true }).ok).toBe(false);
    expect(canEnterShadow({ compliance: "allowed", operational: "candidate", optOut: false }).ok).toBe(true);
  });
  test("canEnterCanary blocked by optOut", () => {
    expect(canEnterCanary({ compliance: "allowed", operational: "shadow", optOut: true }).ok).toBe(false);
    expect(canEnterCanary({ compliance: "allowed", operational: "shadow", optOut: false }).ok).toBe(true);
  });
  test("canEnterActive blocked by optOut", () => {
    expect(canEnterActive({ compliance: "allowed", operational: "canary", optOut: true }).ok).toBe(false);
    expect(canEnterActive({ compliance: "allowed", operational: "canary", optOut: false }).ok).toBe(true);
  });
  test("unknown identities with opt-out never become publishable", () => {
    const r = canEnterShadow({ compliance: "needs_review", operational: "candidate", optOut: true });
    expect(r.ok).toBe(false);
  });
});

describe("shadow/canary/active entry requires allowed|conditional", () => {
  test("needs_review candidate cannot shadow", () => {
    expect(canEnterShadow({ compliance: "needs_review", operational: "candidate", optOut: false }).ok).toBe(false);
  });
  test("awaiting_permission cannot shadow", () => {
    expect(canEnterShadow({ compliance: "awaiting_permission", operational: "candidate", optOut: false }).ok).toBe(false);
  });
  test("blocked cannot shadow", () => {
    expect(canEnterShadow({ compliance: "blocked", operational: "candidate", optOut: false }).ok).toBe(false);
  });
  test("allowed candidate can shadow", () => {
    expect(canEnterShadow({ compliance: "allowed", operational: "candidate", optOut: false }).ok).toBe(true);
  });
  test("conditional candidate can shadow", () => {
    expect(canEnterShadow({ compliance: "conditional", operational: "candidate", optOut: false }).ok).toBe(true);
  });
  test("canary must be from shadow", () => {
    expect(canEnterCanary({ compliance: "allowed", operational: "candidate", optOut: false }).ok).toBe(false);
    expect(canEnterCanary({ compliance: "allowed", operational: "shadow", optOut: false }).ok).toBe(true);
  });
  test("active must be from canary", () => {
    expect(canEnterActive({ compliance: "allowed", operational: "shadow", optOut: false }).ok).toBe(false);
    expect(canEnterActive({ compliance: "allowed", operational: "canary", optOut: false }).ok).toBe(true);
  });
});

describe("lease / deadline helpers", () => {
  const now = "2026-08-29T00:00:00.000Z";
  test("isPolicyExpired at boundary", () => {
    expect(isPolicyExpired("2026-08-29T00:00:00.000Z", now)).toBe(true);
    expect(isPolicyExpired("2026-08-29T00:00:00.001Z", now)).toBe(false);
    expect(isPolicyExpired("2026-08-28T23:59:59.999Z", now)).toBe(true);
    expect(isPolicyExpired(null, now)).toBe(false);
    expect(isPolicyExpired(undefined, now)).toBe(false);
  });
  test("isReviewDeadlineOverdue", () => {
    expect(isReviewDeadlineOverdue("2026-08-28T00:00:00.000Z", now)).toBe(true);
    expect(isReviewDeadlineOverdue("2026-08-30T00:00:00.000Z", now)).toBe(false);
  });
  test("isEvidenceLeaseExpired", () => {
    const captured = "2026-02-28T00:00:00.000Z"; // 182 days before Aug 29
    expect(isEvidenceLeaseExpired(captured, 180, now)).toBe(true);
    expect(isEvidenceLeaseExpired("2026-08-28T00:00:00.000Z", 180, now)).toBe(false);
  });
  test("computeReviewDeadline adds 14 days", () => {
    expect(computeReviewDeadline(now, 14)).toBe("2026-09-12T00:00:00.000Z");
    expect(computeReviewDeadline(now, 7)).toBe("2026-09-05T00:00:00.000Z");
  });
  test("computePolicyExpiry adds leaseDays", () => {
    const p180 = computePolicyExpiry("2026-01-01T00:00:00.000Z", 180);
    expect(p180).toBe("2026-06-30T00:00:00.000Z");
    const p365 = computePolicyExpiry("2026-01-01T00:00:00.000Z", 365);
    expect(p365).toBe("2027-01-01T00:00:00.000Z");
  });
  test("isRenewalDue 30 days before expiry", () => {
    // expiry Sep 28, renewal due from Aug 29
    const expiry = "2026-09-28T00:00:00.000Z";
    expect(isRenewalDue(expiry, "2026-08-29T00:00:00.000Z", 30)).toBe(true);
    expect(isRenewalDue(expiry, "2026-08-28T00:00:00.000Z", 30)).toBe(false);
    expect(isRenewalDue(expiry, "2026-09-28T00:00:00.000Z", 30)).toBe(false); // at expiry, already expired, not renewal
  });
});

describe("applyLeaseExpiry — expired evidence makes dormant without delete", () => {
  const now = "2026-08-29T00:00:00.000Z";
  const past = "2026-08-28T00:00:00.000Z";
  const future = "2026-09-28T00:00:00.000Z";

  test("not expired → no change", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s1", complianceState: "allowed", operationalState: "active", policyExpiry: future },
      now,
    );
    expect(r.changed).toBe(false);
    expect(r.nextOperational).toBe("active");
  });

  test("active with expired policy → review_due (grace, no delete)", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s1", complianceState: "allowed", operationalState: "active", policyExpiry: past },
      now,
    );
    expect(r.changed).toBe(true);
    expect(r.nextOperational).toBe("review_due");
    expect(r.reason).toContain("review_due");
  });

  test("shadow with expired policy → review_due", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s2", complianceState: "conditional", operationalState: "shadow", policyExpiry: past },
      now,
    );
    expect(r.nextOperational).toBe("review_due");
  });

  test("canary with expired policy → shadow so its public exposure stops immediately", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s3", complianceState: "allowed", operationalState: "canary", policyExpiry: past },
      now,
    );
    expect(r.changed).toBe(true);
    expect(r.nextOperational).toBe("shadow");
    expect(r.reason).toContain("shadow");
  });

  test("review_due with still-expired → paused (dormant, history retained)", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s4", complianceState: "allowed", operationalState: "review_due", policyExpiry: past },
      now,
    );
    expect(r.nextOperational).toBe("paused");
    expect(r.reason).toContain("paused");
  });

  test("already paused stays paused (no delete, no churn)", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s5", complianceState: "blocked", operationalState: "paused", policyExpiry: past },
      now,
    );
    expect(r.changed).toBe(false);
  });

  test("already retired stays retired", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s6", complianceState: "deprecated", operationalState: "retired", policyExpiry: past },
      now,
    );
    expect(r.changed).toBe(false);
  });

  test("candidate with expired review_deadline alone does not auto-promote or auto-block", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s7", complianceState: "needs_review", operationalState: "candidate", reviewDeadline: past, policyExpiry: future },
      now,
    );
    // candidate + future policy → no automatic state change; review debt surfaces
    expect(r.changed).toBe(false);
    expect(r.nextOperational).toBe("candidate");
  });

  test("degraded with expired → quarantined", () => {
    const r = applyLeaseExpiry(
      { sourceId: "s8", complianceState: "allowed", operationalState: "degraded", policyExpiry: past },
      now,
    );
    expect(r.nextOperational).toBe("quarantined");
  });
});

describe("validateTransition — compliance holds never auto-promote", () => {
  test("candidate/allowed → shadow allowed is ok", () => {
    expect(
      validateTransition(
        { compliance: "needs_review", operational: "candidate" },
        { compliance: "allowed", operational: "shadow" },
        false,
      ).ok,
    ).toBe(true);
  });
  test("needs_review → shadow is CHECK violation", () => {
    const r = validateTransition(
      { compliance: "needs_review", operational: "candidate" },
      { compliance: "needs_review", operational: "shadow" },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("allowed|conditional");
  });
  test("blocked → shadow blocked", () => {
    expect(
      validateTransition(
        { compliance: "blocked", operational: "candidate" },
        { compliance: "blocked", operational: "shadow" },
        false,
      ).ok,
    ).toBe(false);
  });
  test("awaiting_permission → canary blocked", () => {
    expect(
      validateTransition(
        { compliance: "awaiting_permission", operational: "shadow" },
        { compliance: "awaiting_permission", operational: "canary" },
        false,
      ).ok,
    ).toBe(false);
  });
  test("opt-out blocks even allowed shadow", () => {
    expect(
      validateTransition(
        { compliance: "allowed", operational: "candidate" },
        { compliance: "allowed", operational: "shadow" },
        true,
      ).ok,
    ).toBe(false);
  });
  test("operational topology violation blocked even when compliance ok", () => {
    expect(
      validateTransition(
        { compliance: "allowed", operational: "candidate" },
        { compliance: "allowed", operational: "active" },
        false,
      ).ok,
    ).toBe(false);
  });
  test("paused → candidate via review is allowed", () => {
    expect(
      validateTransition(
        { compliance: "blocked", operational: "paused" },
        { compliance: "needs_review", operational: "candidate" },
        false,
      ).ok,
    ).toBe(true);
  });
});
