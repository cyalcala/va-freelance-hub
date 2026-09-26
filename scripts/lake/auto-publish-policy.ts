/**
 * Publication policy for auto-approved lake tenants.
 *
 * A human is not in this path. Hard rejects stay deterministic.
 * A Wilson lower bound at or above the admit floor publishes on its own.
 * Jev may decide only the ambiguous band, and only at or above the
 * accepted confidence floor. Jev cannot veto a cleared cohort into a hold.
 */

import { providerFamily, TOP_PROVIDER_FAMILY_SHARE_MAX, TOP_SOURCE_SHARE_MAX } from "../ci/constitution-metrics";

export const PUBLISH_PH_RATE_FLOOR = 0.2;
export const REJECT_PH_RATE_FLOOR = 0.05;
export const MIN_JOBS_FOR_RATE = 3;
export const JEV_MIN_CONFIDENCE = 0.7;
export const WILSON_Z = 1.96;
/** Share ceilings are not meaningful on a tiny board. */
export const MIN_INVENTORY_FOR_CONCENTRATION = 100;

export type AdmissionVerdict = "ADMIT" | "SHADOW" | "REJECT";
export type PublishAction = "PUBLISH" | "HOLD" | "REJECT";

export interface InventorySnapshot {
  activeTotal: number;
  bySource: Array<{ sourceId: string; count: number }>;
}

export interface AutoPublishInput {
  sourceId: string;
  totalJobs: number;
  qualifiedReady: number;
  optOut?: boolean;
  jevChoice?: AdmissionVerdict | null;
  jevConfidence?: number | null;
  inventory: InventorySnapshot | null;
}

export interface AutoPublishDecision {
  action: PublishAction;
  publishCount: number;
  wilsonLower: number | null;
  concentration: "OK" | "RELIEVES" | "UNKNOWN" | "BLOCKED";
  reason: string;
}

export function wilsonLowerBound(successes: number, trials: number, z = WILSON_Z): number | null {
  if (!Number.isInteger(trials) || trials <= 0 || !Number.isInteger(successes) || successes < 0 || successes > trials) {
    return null;
  }
  const ph = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = ph + z2 / (2 * trials);
  const margin = z * Math.sqrt(ph * (1 - ph) / trials + z2 / (4 * trials * trials));
  return (center - margin) / denominator;
}

export function parseJevRaw(raw: string | null | undefined): { choice: AdmissionVerdict; confidence: number } | null {
  if (!raw) return null;
  const match = raw.match(/:(ADMIT|SHADOW|REJECT)@([0-9]*\.?[0-9]+)/);
  if (!match) return null;
  const confidence = Number(match[2]);
  if (!Number.isFinite(confidence)) return null;
  return { choice: match[1] as AdmissionVerdict, confidence };
}

function shareRoom(current: number, activeTotal: number, ceiling: number, qualifiedReady: number): number {
  if (!(ceiling > 0 && ceiling < 1)) return qualifiedReady;
  const room = (ceiling * activeTotal - current) / (1 - ceiling);
  if (!Number.isFinite(room)) return 0;
  return Math.max(0, Math.floor(room + 1e-9));
}

export function concentrationAllowance(
  sourceId: string,
  qualifiedReady: number,
  inventory: InventorySnapshot | null,
): { allowed: number; concentration: AutoPublishDecision["concentration"] } {
  if (!inventory || inventory.activeTotal < MIN_INVENTORY_FOR_CONCENTRATION) {
    return { allowed: qualifiedReady, concentration: "UNKNOWN" };
  }
  const family = providerFamily(sourceId);
  const sourceNow = inventory.bySource
    .filter((row) => row.sourceId === sourceId)
    .reduce((sum, row) => sum + row.count, 0);
  const familyNow = inventory.bySource
    .filter((row) => providerFamily(row.sourceId) === family)
    .reduce((sum, row) => sum + row.count, 0);
  const topBefore = inventory.bySource.reduce((top, row) => {
    const familyCount = inventory.bySource
      .filter((candidate) => providerFamily(candidate.sourceId) === providerFamily(row.sourceId))
      .reduce((sum, candidate) => sum + candidate.count, 0);
    return Math.max(top, familyCount);
  }, 0) / inventory.activeTotal;

  const allowed = Math.min(
    qualifiedReady,
    shareRoom(sourceNow, inventory.activeTotal, TOP_SOURCE_SHARE_MAX, qualifiedReady),
    shareRoom(familyNow, inventory.activeTotal, TOP_PROVIDER_FAMILY_SHARE_MAX, qualifiedReady),
  );
  if (allowed <= 0) return { allowed: 0, concentration: "BLOCKED" };

  const topAfterNumerator = Math.max(
    ...Array.from(new Set(inventory.bySource.map((row) => providerFamily(row.sourceId)).concat(family))).map((name) => {
      const count = inventory.bySource
        .filter((row) => providerFamily(row.sourceId) === name)
        .reduce((sum, row) => sum + row.count, 0);
      return count + (name === family ? allowed : 0);
    }),
  );
  const topAfter = topAfterNumerator / (inventory.activeTotal + allowed);
  return { allowed, concentration: topBefore > TOP_PROVIDER_FAMILY_SHARE_MAX && topAfter < topBefore ? "RELIEVES" : "OK" };
}

export function decideAutoPublish(input: AutoPublishInput): AutoPublishDecision {
  const qualifiedReady = Math.max(0, Math.floor(input.qualifiedReady));
  const totalJobs = Math.max(0, Math.floor(input.totalJobs));
  const wilsonLower = totalJobs > 0 ? wilsonLowerBound(Math.min(qualifiedReady, totalJobs), totalJobs) : null;

  if (input.optOut) {
    return { action: "REJECT", publishCount: 0, wilsonLower, concentration: "UNKNOWN", reason: "source is opted out" };
  }
  if (qualifiedReady <= 0 || totalJobs < MIN_JOBS_FOR_RATE) {
    return { action: "HOLD", publishCount: 0, wilsonLower, concentration: "UNKNOWN", reason: "qualified sample is too small to publish" };
  }
  const phRate = qualifiedReady / totalJobs;
  if (phRate < REJECT_PH_RATE_FLOOR) {
    return { action: "REJECT", publishCount: 0, wilsonLower, concentration: "UNKNOWN", reason: "PH rate is below the reject floor" };
  }

  const mathCleared = wilsonLower !== null && wilsonLower >= PUBLISH_PH_RATE_FLOOR;
  const jevConfident = (input.jevConfidence ?? 0) >= JEV_MIN_CONFIDENCE;
  let action: PublishAction = "HOLD";
  let reason = "ambiguous cohort stays in shadow until Jev returns a confident verdict";
  if (mathCleared) {
    action = "PUBLISH";
    reason = `Wilson lower bound ${(wilsonLower! * 100).toFixed(1)}% clears ${(PUBLISH_PH_RATE_FLOOR * 100).toFixed(0)}%. No human approval.`;
  } else if (jevConfident && input.jevChoice === "ADMIT") {
    action = "PUBLISH";
    reason = `Jev ADMIT at ${input.jevConfidence} executes the ambiguous band. No human approval.`;
  } else if (jevConfident && input.jevChoice === "REJECT") {
    action = "REJECT";
    reason = `Jev REJECT at ${input.jevConfidence} executes the ambiguous band.`;
  }

  if (action !== "PUBLISH") {
    return { action, publishCount: 0, wilsonLower, concentration: "UNKNOWN", reason };
  }

  const room = concentrationAllowance(input.sourceId, qualifiedReady, input.inventory);
  if (room.allowed <= 0) {
    return {
      action: "HOLD",
      publishCount: 0,
      wilsonLower,
      concentration: "BLOCKED",
      reason: `${reason} Concentration ceiling blocks another publish from this family.`,
    };
  }
  return {
    action: "PUBLISH",
    publishCount: room.allowed,
    wilsonLower,
    concentration: room.concentration,
    reason: `${reason} Publishing ${room.allowed} of ${qualifiedReady}. Concentration ${room.concentration}.`,
  };
}
