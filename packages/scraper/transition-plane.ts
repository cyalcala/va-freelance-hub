/**
 * SP-23 — capped canary and typed transition plane.
 *
 * This is deliberately a pure decision authority. It has no database or
 * scheduler imports: a later, single publication gateway must consume these
 * decisions before any canary is wired into the live scrape path. That keeps
 * the current exact-six path byte-for-byte unchanged while making the future
 * canary contract explicit, testable, and replayable.
 */

import {
  validateTransition,
  type ComplianceState,
  type OperationalState,
} from "./source-lifecycle";

export const TRANSITION_PLANE_VERSION = "sp23-v1";

export type TransitionCause =
  | "requested_shadow_entry"
  | "requested_promotion"
  | "canary_cap_breach"
  | "evidence_lease_expired"
  | "invalid_canary_cap"
  | "health_quarantine"
  | "policy_expiry_review"
  | "emergency_pause"
  | "retirement";

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
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasNonNegativeInteger(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function hasOptionalSafeInteger(value: number | null | undefined): boolean {
  return value === null || value === undefined || (
    typeof value === "number" && Number.isSafeInteger(value)
  );
}

const STRICT_UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validInstant(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !STRICT_UTC_INSTANT.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isCanonicalSourceId(value: string): boolean {
  // Keep durable identities portable across TypeScript and SQLite. This
  // deliberately admits the established namespace separators (`:`, `.`, `_`,
  // `-`) while excluding Unicode lookalikes and every whitespace code point.
  return /^[a-z0-9:._-]+$/.test(value);
}

function hasEvidenceHash(value: string | null | undefined): value is string {
  // Evidence is a durable source-scoped token (for example `sha256:...`),
  // rather than arbitrary prose or a URL. Keeping it ASCII gives the D1 JSON
  // packet and JavaScript replay one unambiguous UTF-8 representation.
  return typeof value === "string" && /^[A-Za-z0-9._:-]+$/.test(value);
}

/**
 * SQLite can independently verify this exact UTF-8 hex encoding with
 * `hex(input_json)`. It is an audit/replay fingerprint, deliberately not a
 * cryptographic hash or the masterplan's future tamper-evident ledger.
 */
function canonicalInputFingerprint(inputJson: string): string {
  return Array.from(
    new TextEncoder().encode(inputJson),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("").toUpperCase();
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
  const inputHash = canonicalInputFingerprint(inputJson);
  // The canonical input contains every decision field, so one SQL-verifiable
  // fingerprint serves as both the input and immutable decision identity.
  const decisionHash = inputHash;
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
  if (!isCanonicalSourceId(request.sourceId)) {
    return rejected(request, "sourceId must be a non-empty lowercase ASCII canonical identifier");
  }
  if (!validInstant(request.now)) return rejected(request, "evaluation instant is not a valid timestamp");
  if (
    !hasOptionalSafeInteger(request.observedShadowCount)
    || !hasOptionalSafeInteger(request.requiredShadowCount)
    || !hasOptionalSafeInteger(request.canaryMaxNewItemsPerTick)
    || !hasOptionalSafeInteger(request.proposedNewItems)
  ) {
    return rejected(request, "transition numeric fields must be JavaScript-safe integers or null");
  }

  // SP-23 only changes the operational axis. Authority/compliance adjudication
  // needs its own evidence contract and must not hitch a ride on a publication
  // transition just because the lifecycle topology happens to permit it.
  if (request.from.compliance !== request.to.compliance) {
    return rejected(request, "compliance-axis changes require a separate adjudication gateway");
  }

  const isCanaryRollback = request.from.operational === "canary" && request.to.operational === "shadow";
  // An automatic canary exit must be able to complete even if an opt-out or a
  // compliance hold arrived after the source entered canary. It is an exit,
  // not a new shadow entry: publication remains zero and the resolver's
  // opt-out/compliance gates still prevent any future fetch or exposure.
  const lifecycle = isCanaryRollback
    ? { ok: true, reason: "automatic canary exit" }
    : validateTransition(request.from, request.to, request.optOut, request.now);
  if (!lifecycle.ok) return rejected(request, lifecycle.reason);

  const isShadowEntry = request.from.operational === "candidate" && request.to.operational === "shadow";
  const isCanaryPromotion = request.from.operational === "shadow" && request.to.operational === "canary";
  const isActivePromotion = request.from.operational === "canary" && request.to.operational === "active";

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
    if (request.cause === "invalid_canary_cap" && hasPositiveInteger(request.canaryMaxNewItemsPerTick)) {
      return rejected(request, "invalid canary cap rollback requires a missing or invalid cap");
    }
  } else if (
    request.cause === "canary_cap_breach" ||
    request.cause === "evidence_lease_expired" ||
    request.cause === "invalid_canary_cap"
  ) {
    return rejected(request, `${request.cause} is only valid for canary → shadow automatic rollback`);
  }

  if (isShadowEntry) {
    if (request.cause !== "requested_shadow_entry") {
      return rejected(request, "candidate → shadow requires requested_shadow_entry");
    }
    if (!hasEvidenceHash(request.evidenceHash)) {
      return rejected(request, "shadow entry requires a source-scoped evidence hash");
    }
    if (!hasCurrentLease(request.policyExpiry, request.now)) {
      return rejected(request, "shadow entry requires a current evidence lease");
    }
  } else if (isCanaryPromotion) {
    if (request.cause !== "requested_promotion") return rejected(request, "shadow → canary requires a requested promotion cause");
    if (
      !hasPositiveInteger(request.requiredShadowCount) ||
      !hasNonNegativeInteger(request.observedShadowCount) ||
      request.observedShadowCount < request.requiredShadowCount
    ) {
      return rejected(request, "insufficient qualifying shadow observations for canary promotion");
    }
    if (!hasEvidenceHash(request.evidenceHash)) return rejected(request, "canary promotion requires a source-scoped evidence hash");
    if (!hasPositiveInteger(request.canaryMaxNewItemsPerTick)) {
      return rejected(request, "canary promotion requires a positive per-tick cap");
    }
    if (!hasCurrentLease(request.policyExpiry, request.now)) {
      return rejected(request, "canary promotion requires a current evidence lease");
    }
  } else if (isActivePromotion) {
    if (request.cause !== "requested_promotion") return rejected(request, "canary → active requires a requested promotion cause");
    if (!hasEvidenceHash(request.evidenceHash)) return rejected(request, "canary → active requires a source-scoped evidence hash");
    if (!hasCurrentLease(request.policyExpiry, request.now)) {
      return rejected(request, "canary → active requires a current evidence lease");
    }
  } else if (request.to.operational === "quarantined") {
    if (request.cause !== "health_quarantine") return rejected(request, "transition to quarantined requires health_quarantine");
    if (!hasEvidenceHash(request.evidenceHash)) return rejected(request, "health quarantine requires a source-scoped evidence hash");
  } else if (request.to.operational === "review_due") {
    if (request.cause !== "policy_expiry_review") return rejected(request, "transition to review_due requires policy_expiry_review");
    if (request.from.operational !== "shadow" && request.from.operational !== "active") {
      return rejected(request, "policy expiry review is only valid from shadow or active");
    }
    if (hasCurrentLease(request.policyExpiry, request.now)) return rejected(request, "policy expiry review requires an expired evidence lease");
  } else if (request.to.operational === "paused") {
    if (request.cause !== "emergency_pause") return rejected(request, "transition to paused requires emergency_pause");
  } else if (request.to.operational === "retired") {
    if (request.cause !== "retirement") return rejected(request, "transition to retired requires retirement");
  } else if (!isCanaryRollback) {
    return rejected(request, "lifecycle edge has no accepted SP-23 typed cause");
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
  if (!isCanonicalSourceId(input.sourceId)) {
    return { action: "block", publicationMode: "blocked", allowedNewItems: 0, cap: null, reason: "sourceId must be a non-empty lowercase ASCII canonical identifier" };
  }
  if (!validInstant(input.now)) {
    return { action: "block", publicationMode: "blocked", allowedNewItems: 0, cap: null, reason: "evaluation instant is not a valid timestamp" };
  }
  if (!Number.isSafeInteger(input.proposedNewItems) || input.proposedNewItems < 0) {
    return { action: "block", publicationMode: "blocked", allowedNewItems: 0, cap: null, reason: "proposedNewItems must be a non-negative JavaScript-safe integer" };
  }
  if (input.operational === "canary") {
    // Prioritize the durable exit event over eligibility checks. Otherwise an
    // opt-out arriving in the same tick could block publication but leave an
    // expired or over-cap canary in its public lifecycle state.
    if (!hasPositiveInteger(input.canaryMaxNewItemsPerTick)) {
      return automaticRollback(input, "invalid_canary_cap");
    }
    if (!hasCurrentLease(input.policyExpiry, input.now)) {
      return automaticRollback(input, "evidence_lease_expired");
    }
    if (input.proposedNewItems > input.canaryMaxNewItemsPerTick) {
      return automaticRollback(input, "canary_cap_breach");
    }
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
  return {
    action: "allow",
    publicationMode: "capped",
    allowedNewItems: input.proposedNewItems,
    cap: input.canaryMaxNewItemsPerTick ?? null,
  };
}

/** Re-run a stored event using only its canonical input packet. */
export function replayTransitionEvent(event: TransitionEvent): { ok: boolean; reason: string } {
  if (canonicalInputFingerprint(event.inputJson) !== event.inputHash) {
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
  const expected = decision.event;
  if (
    expected.inputJson !== event.inputJson ||
    expected.inputHash !== event.inputHash ||
    expected.decisionHash !== event.decisionHash ||
    expected.sourceId !== event.sourceId ||
    expected.fromCompliance !== event.fromCompliance ||
    expected.fromOperational !== event.fromOperational ||
    expected.toCompliance !== event.toCompliance ||
    expected.toOperational !== event.toOperational ||
    expected.cause !== event.cause ||
    expected.decidedAt !== event.decidedAt ||
    expected.evidenceHash !== event.evidenceHash
  ) {
    return { ok: false, reason: "replayed decision does not match stored event" };
  }
  return { ok: true, reason: "replay matches" };
}
