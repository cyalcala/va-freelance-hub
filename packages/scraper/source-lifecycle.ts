/**
 * SP-05 — Candidate lifecycle, evidence leases, and opt-out memory.
 *
 * ADR-006 §2: compliance and operational states are independent axes.
 * This module enforces:
 *  - compliance holds never auto-promote via operational change
 *  - expired or denied evidence makes a source dormant/blocked without delete
 *  - opt-out is checked before shadow/canary entry
 *
 * No I/O; pure functions so they are unit-testable without D1. Runtime callers
 * (prospector, doctor, scrape route) will use these guards before mutating
 * `source_registry` or publishing.
 */

import type { RegistryComplianceState, RegistryOperationalState } from "./policy-resolver";

// ─── State vocabulary (ADR-006) ───────────────────────────────────────────

export type ComplianceState = RegistryComplianceState;
export type OperationalState = RegistryOperationalState;

export const COMPLIANCE_STATES: ReadonlySet<ComplianceState> = new Set([
  "needs_review",
  "allowed",
  "conditional",
  "awaiting_permission",
  "blocked",
  "deprecated",
]);

export const OPERATIONAL_STATES: ReadonlySet<OperationalState> = new Set([
  "candidate",
  "shadow",
  "canary",
  "active",
  "review_due",
  "degraded",
  "quarantined",
  "paused",
  "retired",
]);

// ─── Operational transition graph (strategy §Two independent state axes) ──

// Allowed directed edges. `paused` is intentionally terminal via reviewed
// decision only — auto-recovery from degraded/quarantined is bounded.
const OPERATIONAL_EDGES: Record<OperationalState, ReadonlySet<OperationalState>> = {
  candidate: new Set(["shadow", "paused", "retired"]),
  shadow: new Set(["canary", "paused", "quarantined", "retired"]),
  // SP-23: canary → shadow is an explicit rollback edge. The typed transition
  // plane restricts it to automatic cap/lease failures; this graph only owns
  // the state topology.
  canary: new Set(["shadow", "active", "paused", "quarantined", "degraded", "retired"]),
  active: new Set(["review_due", "degraded", "quarantined", "paused", "retired"]),
  review_due: new Set(["active", "paused", "retired"]),
  degraded: new Set(["quarantined", "paused", "active", "retired"]),
  quarantined: new Set(["paused", "retired", "active"]),
  paused: new Set(["candidate", "retired"]),
  retired: new Set([]),
};

/**
 * Whether a direct operational state transition is structurally allowed.
 * This is the topology only; compliance/opt-out/lease guards still apply
 * for shadow/canary/active promotions.
 */
export function isValidOperationalTransition(
  from: OperationalState,
  to: OperationalState,
): boolean {
  if (from === to) return true;
  const allowed = OPERATIONAL_EDGES[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * Whether the compliance axis allows a data-collection promotion.
 * Only `allowed` and `conditional` may ever run shadow/canary/active
 * (migration CHECK + policy-resolver guard).
 */
export function isComplianceAllowsShadowCanaryActive(compliance: ComplianceState): boolean {
  return compliance === "allowed" || compliance === "conditional";
}

/**
 * Whether a compliance hold is active (must never be auto-promoted).
 * awaiting_permission/needs_review/blocked/deprecated all block shadow/canary/active.
 */
export function isComplianceHold(compliance: ComplianceState): boolean {
  return !isComplianceAllowsShadowCanaryActive(compliance);
}

// ─── Opt-out guard ─────────────────────────────────────────────────────────

export function isOptedOut(sourceId: string, optOutIds: ReadonlySet<string>): boolean {
  return optOutIds.has(sourceId);
}

// ─── Shadow/canary/active entry guards ────────────────────────────────────

export interface PromotionGuardInput {
  compliance: ComplianceState;
  operational: OperationalState;
  optOut: boolean;
  reviewDeadline?: string | null;
  policyExpiry?: string | null;
  nowIso?: string;
}

export function canEnterShadow(input: PromotionGuardInput): { ok: boolean; reason: string } {
  if (input.optOut) return { ok: false, reason: "opt-out" };
  if (isComplianceHold(input.compliance)) return { ok: false, reason: `compliance ${input.compliance} is not allowed|conditional` };
  if (input.operational !== "candidate") return { ok: false, reason: `operational must be candidate, got ${input.operational}` };
  // Shadow is only for allowed/conditional candidates — no lease check beyond
  // needing a future review_deadline (set by lifecycle). Empty deadlines are
  // tolerated for legacy rows but new candidates should carry one.
  return { ok: true, reason: "ok" };
}

export function canEnterCanary(input: PromotionGuardInput): { ok: boolean; reason: string } {
  if (input.optOut) return { ok: false, reason: "opt-out" };
  if (isComplianceHold(input.compliance)) return { ok: false, reason: `compliance ${input.compliance} is not allowed|conditional` };
  if (input.operational !== "shadow") return { ok: false, reason: `operational must be shadow, got ${input.operational}` };
  return { ok: true, reason: "ok" };
}

export function canEnterActive(input: PromotionGuardInput): { ok: boolean; reason: string } {
  if (input.optOut) return { ok: false, reason: "opt-out" };
  if (isComplianceHold(input.compliance)) return { ok: false, reason: `compliance ${input.compliance} is not allowed|conditional` };
  if (input.operational !== "canary") return { ok: false, reason: `operational must be canary, got ${input.operational}` };
  return { ok: true, reason: "ok" };
}

// Generic guard used by future caller before any shadow/canary/active write.
export function isPromotionBlocked(input: PromotionGuardInput, targetOperational: OperationalState): { blocked: boolean; reason: string | null } {
  if (targetOperational === "shadow") {
    const r = canEnterShadow(input);
    return r.ok ? { blocked: false, reason: null } : { blocked: true, reason: r.reason };
  }
  if (targetOperational === "canary") {
    const r = canEnterCanary(input);
    return r.ok ? { blocked: false, reason: null } : { blocked: true, reason: r.reason };
  }
  if (targetOperational === "active") {
    const r = canEnterActive(input);
    return r.ok ? { blocked: false, reason: null } : { blocked: true, reason: r.reason };
  }
  // Non-promotional transitions are topology-checked only; compliance hold
  // does not block moving to paused/quarantined/retired.
  return { blocked: false, reason: null };
}

// ─── Lease / deadline helpers (strategy §Evidence leases) ─────────────────

/**
 * Parse ISO string safely; returns null for empty/invalid (treated as no deadline).
 */
function parseIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function isReviewDeadlineOverdue(reviewDeadlineIso: string | null | undefined, nowIso: string): boolean {
  const deadline = parseIso(reviewDeadlineIso);
  if (deadline === null) return false;
  const now = Date.parse(nowIso);
  return now >= deadline;
}

export function isPolicyExpired(policyExpiryIso: string | null | undefined, nowIso: string): boolean {
  const expiry = parseIso(policyExpiryIso);
  if (expiry === null) return false;
  const now = Date.parse(nowIso);
  return now >= expiry;
}

export function isEvidenceLeaseExpired(
  evidenceCapturedAt: string | null | undefined,
  leaseDays: number,
  nowIso: string,
): boolean {
  const captured = parseIso(evidenceCapturedAt);
  if (captured === null) return false;
  const now = Date.parse(nowIso);
  const leaseMs = leaseDays * 86_400_000;
  return now >= captured + leaseMs;
}

export function computeReviewDeadline(nowIso: string, days = 14): string {
  const t = Date.parse(nowIso) + days * 86_400_000;
  return new Date(t).toISOString();
}

export function computePolicyExpiry(nowIso: string, leaseDays: number): string {
  const t = Date.parse(nowIso) + leaseDays * 86_400_000;
  return new Date(t).toISOString();
}

/**
 * Whether remediation (renewal 30 days before expiry) should start.
 * Strategy: renewal work begins 30 days before evidence expiry.
 */
export function isRenewalDue(policyExpiryIso: string | null | undefined, nowIso: string, leadDays = 30): boolean {
  const expiry = parseIso(policyExpiryIso);
  if (expiry === null) return false;
  const now = Date.parse(nowIso);
  return now >= expiry - leadDays * 86_400_000 && now < expiry;
}

// ─── Expiry application (no delete, only state drift) ─────────────────────

export interface SourceRegistryLike {
  sourceId: string;
  complianceState: ComplianceState;
  operationalState: OperationalState;
  reviewDeadline?: string | null;
  policyExpiry?: string | null;
  optOut?: boolean | number;
}

export interface ExpiryResult {
  changed: boolean;
  nextCompliance: ComplianceState;
  nextOperational: OperationalState;
  reason: string | null;
}

/**
 * Apply lease/deadline expiry without deleting history.
 *
 * Rules (strategy §evidence leases §5, ADR-006 §5):
 * - policyExpiry past → blocks new promotions; a public canary returns to
 *   private shadow immediately, while shadow/active move to review_due
 *   (14-day grace). If already review_due and still past expiry, move to
 *   paused. Paused/retired stay.
 * - reviewDeadline past while still needs_review/candidate → stays candidate
 *   but is overdue (caller should surface review debt); no auto-promote.
 * - Never auto-promotes a compliance hold; never deletes rows.
 */
export function applyLeaseExpiry(
  row: SourceRegistryLike,
  nowIso: string,
): ExpiryResult {
  const noChange: ExpiryResult = {
    changed: false,
    nextCompliance: row.complianceState,
    nextOperational: row.operationalState,
    reason: null,
  };

  const expired = isPolicyExpired(row.policyExpiry, nowIso);
  if (!expired) return noChange;

  // Already dormant — stay dormant
  if (row.operationalState === "paused" || row.operationalState === "retired") {
    return noChange;
  }

  // SP-23: a canary is public exposure, so an expired lease removes it from
  // publication immediately but preserves private observation/history.
  if (row.operationalState === "canary") {
    return {
      changed: true,
      nextCompliance: row.complianceState,
      nextOperational: "shadow",
      reason: `policy_expiry ${row.policyExpiry} past ${nowIso} while canary → shadow (automatic public rollback, no delete)`,
    };
  }

  // Shadow/active with expired policy → review_due grace window.
  if (row.operationalState === "shadow" || row.operationalState === "active") {
    return {
      changed: true,
      nextCompliance: row.complianceState,
      nextOperational: "review_due",
      reason: `policy_expiry ${row.policyExpiry} past ${nowIso} → review_due (14-day grace, no delete)`,
    };
  }

  if (row.operationalState === "review_due") {
    // Still expired after grace → pause (dormant, history retained)
    return {
      changed: true,
      nextCompliance: row.complianceState,
      nextOperational: "paused",
      reason: `policy_expiry ${row.policyExpiry} past ${nowIso} while review_due → paused (dormant, history retained)`,
    };
  }

  // degraded/quarantined with expiry → quarantine/paused (no auto-recover)
  if (row.operationalState === "degraded" || row.operationalState === "quarantined") {
    return {
      changed: true,
      nextCompliance: row.complianceState,
      nextOperational: "quarantined",
      reason: `policy_expiry ${row.policyExpiry} past ${nowIso} while ${row.operationalState} → quarantined (dormant)`,
    };
  }

  // candidate with expired reviewDeadline — remain candidate but overdue
  return noChange;
}

/**
 * Validate a requested state transition against the lifecycle contract.
 * Returns blocked reason or ok.
 */
export function validateTransition(
  from: { compliance: ComplianceState; operational: OperationalState },
  to: { compliance: ComplianceState; operational: OperationalState },
  optOut: boolean,
  nowIso?: string,
): { ok: boolean; reason: string } {
  // Operational topology first
  if (!isValidOperationalTransition(from.operational, to.operational)) {
    return { ok: false, reason: `operational ${from.operational} → ${to.operational} not allowed by lifecycle graph` };
  }
  // Compliance holds never promote to shadow/canary/active
  if (
    (to.operational === "shadow" || to.operational === "canary" || to.operational === "active") &&
    isComplianceHold(to.compliance)
  ) {
    return { ok: false, reason: `CHECK: ${to.operational} requires allowed|conditional but got ${to.compliance}` };
  }
  // Opt-out blocks any promotion to shadow/canary/active
  if (optOut && (to.operational === "shadow" || to.operational === "canary" || to.operational === "active")) {
    return { ok: false, reason: "opt-out blocks shadow/canary/active" };
  }
  return { ok: true, reason: "ok" };
}
