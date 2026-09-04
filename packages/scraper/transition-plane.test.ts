import { describe, expect, test } from "bun:test";
import {
  decideCanaryPublication,
  decideTypedTransition,
  replayTransitionEvent,
  type CanaryPublicationInput,
  type TypedTransitionRequest,
} from "./transition-plane";

const NOW = "2026-09-05T00:00:00.000Z";
const FUTURE_LEASE = "2026-10-05T00:00:00.000Z";
const EXPIRED_LEASE = "2026-09-04T23:59:59.999Z";

function canaryInput(overrides: Partial<CanaryPublicationInput> = {}): CanaryPublicationInput {
  return {
    sourceId: "greenhouse:grafanalabs",
    compliance: "allowed",
    operational: "canary",
    optOut: false,
    policyExpiry: FUTURE_LEASE,
    canaryMaxNewItemsPerTick: 3,
    proposedNewItems: 3,
    now: NOW,
    evidenceHash: "shadow-evidence-sha256",
    ...overrides,
  };
}

function transitionRequest(overrides: Partial<TypedTransitionRequest> = {}): TypedTransitionRequest {
  return {
    sourceId: "greenhouse:grafanalabs",
    from: { compliance: "allowed", operational: "shadow" },
    to: { compliance: "allowed", operational: "canary" },
    optOut: false,
    cause: "requested_promotion",
    now: NOW,
    policyExpiry: FUTURE_LEASE,
    evidenceHash: "shadow-evidence-sha256",
    observedShadowCount: 3,
    requiredShadowCount: 3,
    canaryMaxNewItemsPerTick: 3,
    ...overrides,
  };
}

describe("SP-23 canary publication decisions", () => {
  test("keeps an active source unlimited while a canary is explicitly capped", () => {
    const active = decideCanaryPublication(
      canaryInput({ operational: "active", canaryMaxNewItemsPerTick: null, proposedNewItems: 50 }),
    );
    const canary = decideCanaryPublication(canaryInput({ proposedNewItems: 3 }));

    expect(active).toMatchObject({
      action: "allow",
      publicationMode: "unlimited",
      allowedNewItems: 50,
      cap: null,
    });
    expect(canary).toMatchObject({
      action: "allow",
      publicationMode: "capped",
      allowedNewItems: 3,
      cap: 3,
    });
  });

  test("rolls a canary back to shadow before publication when its per-tick cap would be breached", () => {
    const decision = decideCanaryPublication(canaryInput({ proposedNewItems: 4 }));

    expect(decision).toMatchObject({
      action: "rollback_to_shadow",
      publicationMode: "blocked",
      allowedNewItems: 0,
      transition: {
        ok: true,
        cause: "canary_cap_breach",
        to: { compliance: "allowed", operational: "shadow" },
      },
    });
    if (decision.action !== "rollback_to_shadow") throw new Error("expected rollback decision");
    expect(decision.transition.event.input).toMatchObject({
      sourceId: "greenhouse:grafanalabs",
      canaryMaxNewItemsPerTick: 3,
      proposedNewItems: 4,
      cause: "canary_cap_breach",
    });
    expect(replayTransitionEvent(decision.transition.event)).toEqual({ ok: true, reason: "replay matches" });
  });

  test("rolls an expired canary back to shadow without allowing one more item", () => {
    const decision = decideCanaryPublication(canaryInput({ policyExpiry: EXPIRED_LEASE, proposedNewItems: 1 }));

    expect(decision).toMatchObject({
      action: "rollback_to_shadow",
      allowedNewItems: 0,
      transition: {
        ok: true,
        cause: "evidence_lease_expired",
        to: { operational: "shadow" },
      },
    });
  });

  test("fails closed when a canary has no positive cap", () => {
    const decision = decideCanaryPublication(canaryInput({ canaryMaxNewItemsPerTick: null }));

    expect(decision).toMatchObject({
      action: "rollback_to_shadow",
      allowedNewItems: 0,
      transition: { ok: true, cause: "invalid_canary_cap", to: { operational: "shadow" } },
    });
  });
});

describe("SP-23 typed transitions", () => {
  test("requires the configured shadow-observation threshold before shadow may become canary", () => {
    const decision = decideTypedTransition(transitionRequest({ observedShadowCount: 2 }));

    expect(decision).toMatchObject({ ok: false, cause: "requested_promotion" });
    expect(decision.reason).toContain("shadow observations");
  });

  test("rejects a topology-skipping candidate to active request", () => {
    const decision = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "candidate" },
        to: { compliance: "allowed", operational: "active" },
      }),
    );

    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("lifecycle graph");
  });

  test("rejects a graph-valid lifecycle edge until it has an explicit typed cause", () => {
    const decision = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "candidate" },
        to: { compliance: "allowed", operational: "shadow" },
        cause: "requested_promotion",
      }),
    );

    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("requested_shadow_entry");
  });

  test("rejects compliance-axis changes and noncanonical source identifiers", () => {
    const authorityChange = decideTypedTransition(
      transitionRequest({
        from: { compliance: "needs_review", operational: "candidate" },
        to: { compliance: "allowed", operational: "candidate" },
      }),
    );
    expect(authorityChange.ok).toBe(false);
    expect(authorityChange.reason).toContain("compliance-axis");

    const whitespaceSource = decideTypedTransition(
      transitionRequest({ sourceId: " greenhouse:grafanalabs " }),
    );
    expect(whitespaceSource.ok).toBe(false);
    expect(whitespaceSource.reason).toContain("canonical");
  });

  test("accepts a source-health quarantine only with source-scoped evidence", () => {
    const missingEvidence = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "active" },
        to: { compliance: "allowed", operational: "quarantined" },
        cause: "health_quarantine",
        evidenceHash: null,
      }),
    );
    expect(missingEvidence.ok).toBe(false);
    expect(missingEvidence.reason).toContain("evidence hash");

    const quarantined = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "active" },
        to: { compliance: "allowed", operational: "quarantined" },
        cause: "health_quarantine",
      }),
    );
    expect(quarantined).toMatchObject({
      ok: true,
      cause: "health_quarantine",
      to: { compliance: "allowed", operational: "quarantined" },
    });
  });

  test("refuses canary to active promotion after its evidence lease expires", () => {
    const decision = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "canary" },
        to: { compliance: "allowed", operational: "active" },
        policyExpiry: EXPIRED_LEASE,
      }),
    );

    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("current evidence lease");
  });

  test("permits canary to shadow only for an automatic rollback cause, and records a deterministic replay input", () => {
    const manual = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "canary" },
        to: { compliance: "allowed", operational: "shadow" },
        cause: "requested_promotion",
      }),
    );
    expect(manual.ok).toBe(false);
    expect(manual.reason).toContain("automatic rollback");

    const rollback = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "canary" },
        to: { compliance: "allowed", operational: "shadow" },
        cause: "canary_cap_breach",
        proposedNewItems: 4,
      }),
    );
    expect(rollback).toMatchObject({
      ok: true,
      cause: "canary_cap_breach",
      event: {
        sourceId: "greenhouse:grafanalabs",
        fromOperational: "canary",
        toOperational: "shadow",
      },
    });
    if (!rollback.ok) throw new Error("expected valid rollback transition");
    expect(replayTransitionEvent(rollback.event)).toEqual({ ok: true, reason: "replay matches" });
  });

  test("detects a tampered replay event instead of silently accepting it", () => {
    const decision = decideTypedTransition(
      transitionRequest({
        from: { compliance: "allowed", operational: "canary" },
        to: { compliance: "allowed", operational: "shadow" },
        cause: "evidence_lease_expired",
        policyExpiry: EXPIRED_LEASE,
      }),
    );
    if (!decision.ok) throw new Error("expected valid rollback transition");

    expect(replayTransitionEvent({ ...decision.event, inputHash: "not-the-original" })).toMatchObject({ ok: false });
    expect(replayTransitionEvent({ ...decision.event, fromCompliance: "conditional" })).toMatchObject({ ok: false });
    expect(replayTransitionEvent({ ...decision.event, toCompliance: "conditional" })).toMatchObject({ ok: false });
    expect(replayTransitionEvent({ ...decision.event, decidedAt: "2030-01-01T00:00:00.000Z" })).toMatchObject({ ok: false });
    expect(replayTransitionEvent({ ...decision.event, evidenceHash: "forged" })).toMatchObject({ ok: false });
  });
});
