/**
 * SP-23 — capped canary and typed transition plane.
 *
 * This is deliberately a pure decision authority. It has no database or
 * scheduler imports: a later, single publication gateway must consume these
 * decisions before any canary is wired into the live scrape path. That keeps
 * the current exact-six path byte-for-byte unchanged while making the future
 * canary contract explicit, testable, and replayable.
 */

import { hashString } from "./contentHash";
import {
  validateTransition,
  type ComplianceState,
  type OperationalState,
} from "./source-lifecycle";

export const TRANSITION_PLANE_VERSION = "sp23-v1";

export type TransitionCause =
  | "requested_promotion"
  | "canary_cap_breach"
  | "evidence_lease_expired"
  | "invalid_canary_cap";

export interface LifecycleState {
  compliance: ComplianceState;
  operational: OperationalState;
}

export interface TypedTransitionRequest {
  sourceId: string;
  from: LifecycleState;
  to: LifecycleState;
  optOut: boolean;
  cause: TransitionCause;
  now: string;
  policyExpiry?: string | null;
  evidenceHash?: string | null;
  observedShadowCount?: number | null;
  requiredShadowCount?: number | null;
  canaryMaxNewItemsPerTick?: number | null;
  proposedNewItems?: number | null;
}

export interface TransitionEventInput {
  version: string;
  sourceId: string;
  fromCompliance: ComplianceState;
  fromOperational: OperationalState;
  toCompliance: ComplianceState;
  toOperational: OperationalState;
  optOut: boolean;
  cause: TransitionCause;
  now: string;
  policyExpiry: string | null;
  evidenceHash: string | null;
  observedShadowCount: number | null;
  requiredShadowCount: number | null;
  canaryMaxNewItemsPerTick: number | null;
  proposedNewItems: number | null;
}

export interface TransitionEvent {
  sourceId: string;
  fromCompliance: ComplianceState;
  fromOperational: OperationalState;
  toCompliance: ComplianceState;
  toOperational: OperationalState;
  cause: TransitionCause;
  decidedAt: string;
  evidenceHash: string | null;
  input: TransitionEventInput;
  inputJson: string;
  inputHash: string;
  decisionHash: string;
}

export type TypedTransitionDecision =
  | {
      ok: true;
      reason: "transition allowed";
      cause: TransitionCause;
      from: LifecycleState;
      to: LifecycleState;
      event: TransitionEvent;
    }
  | {
      ok: false;
      reason: string;
      cause: TransitionCause;
      from: LifecycleState;
      to: LifecycleState;
    };

export interface CanaryPublicationInput {
  sourceId: string;
  compliance: ComplianceState;
  operational: OperationalState;
  optOut: boolean;
  policyExpiry?: string | null;
  canaryMaxNewItemsPerTick?: number | null;
  proposedNewItems: number;
  now: string;
  evidenceHash?: string | null;
}

export type CanaryPublicationDecision =
  | {
      action: "allow";
      publicationMode: "unlimited" | "capped";
      allowedNewItems: number;
      cap: number | null;
    }
  | {
      action: "rollback_to_shadow";
      publicationMode: "blocked";
      allowedNewItems: 0;
      cap: number | null;
      transition: Extract<TypedTransitionDecision, { ok: true }>;
    }
  | {
      action: "block";
      publicationMode: "blocked";
      allowedNewItems: 0;
      cap: number | null;
      reason: string;
    };

function hasPositiveInteger(value: number | null | undefined): value is number {
  return Number.isInteger(value) && value > 0;
}

function validInstant(value: string | null | undefined): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function hasCurrentLease(policyExpiry: string | null | undefined, now: string): boolean {
  if (!validInstant(policyExpiry) || !validInstant(now)) return false;
  return new Date(policyExpiry).getTime() > new Date(now).getTime();
}

function buildEventInput(request: TypedTransitionRequest): TransitionEventInput {
  return {
    version: TRANSITION_PLANE_VERSION,
    sourceId: request.sourceId,
    fromCompliance: request.from.compliance,
    fromOperational: request.from.operational,
    toCompliance: request.to.compliance,
    toOperational: request.to.operational,
    optOut: request.optOut,
    cause: request.cause,
    now: request.now,
    policyExpiry: request.policyExpiry ?? null,
    evidenceHash: request.evidenceHash ?? null,
    observedShadowCount: request.observedShadowCount ?? null,
    requiredShadowCount: request.requiredShadowCount ?? null,
    canaryMaxNewItemsPerTick: request.canaryMaxNewItemsPerTick ?? null,
    proposedNewItems: request.proposedNewItems ?? null,
  };
}

function buildEvent(request: TypedTransitionRequest): TransitionEvent {
  const input = buildEventInput(request);
  const inputJson = JSON.stringify(input);
  const inputHash = hashString(inputJson);
  const decisionHash = hashString(JSON.stringify({
    version: TRANSITION_PLANE_VERSION,
    sourceId: request.sourceId,
    from: request.from,
    to: request.to,
    cause: request.cause,
    inputHash,
  }));
  return {
    sourceId: request.sourceId,
    fromCompliance: request.from.compliance,
    fromOperational: request.from.operational,
    toCompliance: request.to.compliance,
    toOperational: request.to.operational,
    cause: request.cause,
    decidedAt: request.now,
    evidenceHash: request.evidenceHash ?? null,
    input,
    inputJson,
    inputHash,
    decisionHash,
  };
}

function rejected(request: TypedTransitionRequest, reason: string): TypedTransitionDecision {
  return { ok: false, reason, cause: request.cause, from: request.from, to: request.to };
}

/**
 * Validate one requested lifecycle transition and produce the immutable input
 * packet that a later D1 gateway can persist. The packet is deterministic: no
 * clock, random ID, or I/O is read outside the supplied request.
 */
export function decideTypedTransition(request: TypedTransitionRequest): TypedTransitionDecision {
  if (!request.sourceId.trim()) return rejected(request, "sourceId is required");
  if (!validInstant(request.now)) return rejected(request, "evaluation instant is not a valid timestamp");

  const lifecycle = validateTransition(request.from, request.to, request.optOut, request.now);
  if (!lifecycle.ok) return rejected(request, lifecycle.reason);

  const isCanaryRollback = request.from.operational === "canary" && request.to.operational === "shadow";
  if (isCanaryRollback) {
    if (
      request.cause !== "canary_cap_breach" &&
      request.cause !== "evidence_lease_expired" &&
      request.cause !== "invalid_canary_cap"
    ) {
      return rejected(request, "canary → shadow is reserved for an automatic rollback cause");
    }
    if (request.cause === "canary_cap_breach") {
      if (!hasPositiveInteger(request.canaryMaxNewItemsPerTick)) {
        return rejected(request, "canary cap breach requires a positive configured cap");
      }
      if ((request.proposedNewItems ?? 0) <= request.canaryMaxNewItemsPerTick) {
        return rejected(request, "canary cap breach requires proposed items above the configured cap");
      }
    }
    if (request.cause === "evidence_lease_expired" && hasCurrentLease(request.policyExpiry, request.now)) {
      return rejected(request, "evidence lease has not expired");
    }
  }

  const isCanaryPromotion = request.from.operational === "shadow" && request.to.operational === "canary";
  if (isCanaryPromotion) {
    if (request.cause !== "requested_promotion") {
      return rejected(request, "shadow → canary requires a requested promotion cause");
    }
    if (!hasPositiveInteger(request.requiredShadowCount) || (request.observedShadowCount ?? 0) < request.requiredShadowCount) {
      return rejected(request, "insufficient qualifying shadow observations for canary promotion");
    }
    if (!hasPositiveInteger(request.canaryMaxNewItemsPerTick)) {
      return rejected(request, "canary promotion requires a positive per-tick cap");
    }
    if (!hasCurrentLease(request.policyExpiry, request.now)) {
      return rejected(request, "canary promotion requires a current evidence lease");
    }
  }

  const isActivePromotion = request.from.operational === "canary" && request.to.operational === "active";
  if (isActivePromotion) {
    if (request.cause !== "requested_promotion") {
      return rejected(request, "canary → active requires a requested promotion cause");
    }
    if (!hasCurrentLease(request.policyExpiry, request.now)) {
      return rejected(request, "canary → active requires a current evidence lease");
    }
  }

  return {
    ok: true,
    reason: "transition allowed",
    cause: request.cause,
    from: request.from,
    to: request.to,
    event: buildEvent(request),
  };
}

function automaticRollback(input: CanaryPublicationInput, cause: Extract<TransitionCause, "canary_cap_breach" | "evidence_lease_expired" | "invalid_canary_cap">): CanaryPublicationDecision {
  const transition = decideTypedTransition({
    sourceId: input.sourceId,
    from: { compliance: input.compliance, operational: "canary" },
    to: { compliance: input.compliance, operational: "shadow" },
    optOut: input.optOut,
    cause,
    now: input.now,
    policyExpiry: input.policyExpiry ?? null,
    evidenceHash: input.evidenceHash ?? null,
    canaryMaxNewItemsPerTick: input.canaryMaxNewItemsPerTick ?? null,
    proposedNewItems: input.proposedNewItems,
  });
  if (!transition.ok) {
    return {
      action: "block",
      publicationMode: "blocked",
      allowedNewItems: 0,
      cap: input.canaryMaxNewItemsPerTick ?? null,
      reason: transition.reason,
    };
  }
  return {
    action: "rollback_to_shadow",
    publicationMode: "blocked",
    allowedNewItems: 0,
    cap: input.canaryMaxNewItemsPerTick ?? null,
    transition,
  };
}

/**
 * Decide the source-scoped publication envelope for one tick. A cap breach is
 * fail-closed: the batch publishes zero items and returns an automatic rollback
 * event instead of selecting an arbitrary partial subset to expose publicly.
 */
export function decideCanaryPublication(input: CanaryPublicationInput): CanaryPublicationDecision {
  if (!Number.isInteger(input.proposedNewItems) || input.proposedNewItems < 0) {
    return { action: "block", publicationMode: "blocked", allowedNewItems: 0, cap: null, reason: "proposedNewItems must be a non-negative integer" };
  }
  if (input.optOut || (input.compliance !== "allowed" && input.compliance !== "conditional")) {
    return { action: "block", publicationMode: "blocked", allowedNewItems: 0, cap: null, reason: "source is not publication-eligible" };
  }
  if (input.operational === "active") {
    return {
      action: "allow",
      publicationMode: "unlimited",
      allowedNewItems: input.proposedNewItems,
      cap: null,
    };
  }
  if (input.operational !== "canary") {
    return { action: "block", publicationMode: "blocked", allowedNewItems: 0, cap: null, reason: `operational state ${input.operational} is not publicly publishable` };
  }
  if (!hasPositiveInteger(input.canaryMaxNewItemsPerTick)) {
    return automaticRollback(input, "invalid_canary_cap");
  }
  if (!hasCurrentLease(input.policyExpiry, input.now)) {
    return automaticRollback(input, "evidence_lease_expired");
  }
  if (input.proposedNewItems > input.canaryMaxNewItemsPerTick) {
    return automaticRollback(input, "canary_cap_breach");
  }
  return {
    action: "allow",
    publicationMode: "capped",
    allowedNewItems: input.proposedNewItems,
    cap: input.canaryMaxNewItemsPerTick,
  };
}

/** Re-run a stored event using only its canonical input packet. */
export function replayTransitionEvent(event: TransitionEvent): { ok: boolean; reason: string } {
  if (hashString(event.inputJson) !== event.inputHash) {
    return { ok: false, reason: "input hash does not match serialized input" };
  }
  let input: TransitionEventInput;
  try {
    input = JSON.parse(event.inputJson) as TransitionEventInput;
  } catch {
    return { ok: false, reason: "serialized input is not valid JSON" };
  }
  const decision = decideTypedTransition({
    sourceId: input.sourceId,
    from: { compliance: input.fromCompliance, operational: input.fromOperational },
    to: { compliance: input.toCompliance, operational: input.toOperational },
    optOut: input.optOut,
    cause: input.cause,
    now: input.now,
    policyExpiry: input.policyExpiry,
    evidenceHash: input.evidenceHash,
    observedShadowCount: input.observedShadowCount,
    requiredShadowCount: input.requiredShadowCount,
    canaryMaxNewItemsPerTick: input.canaryMaxNewItemsPerTick,
    proposedNewItems: input.proposedNewItems,
  });
  if (!decision.ok) return { ok: false, reason: `replay rejected input: ${decision.reason}` };
  if (
    decision.event.inputHash !== event.inputHash ||
    decision.event.decisionHash !== event.decisionHash ||
    decision.event.sourceId !== event.sourceId ||
    decision.event.fromOperational !== event.fromOperational ||
    decision.event.toOperational !== event.toOperational ||
    decision.event.cause !== event.cause
  ) {
    return { ok: false, reason: "replayed decision does not match stored event" };
  }
  return { ok: true, reason: "replay matches" };
}
