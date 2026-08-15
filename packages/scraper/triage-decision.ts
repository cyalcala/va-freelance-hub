import {
  triageJob,
  skepticEligibilityCheck,
  type TriageResult,
  type SkepticVerdict,
  type TriageContext,
} from "./triage";
import type { GeoScope } from "./geoGate";

// ─── Shared per-listing triage verdict ───────────────────────────────────────
//
// This is the single source of truth for "given a gate-passed listing, what is
// the AI verdict?" It is factored out of the scrape route so two callers cannot
// drift apart:
//   1. the inline scrape loop (apps/web/.../cron/scrape.ts), and
//   2. the Inngest durable-triage worker (apps/web/src/lib/inngest/...).
//
// The verdict runs the model ladder (triageJob, up to 4 `env.AI.run` calls) and,
// for gate-`unknown` positives, the adversarial skeptic (another 1-4 calls).
// That ladder is exactly what exhausts Cloudflare's 50-subrequest-per-invocation
// cap when ~50 listings share ONE Pages Function request (the 2026-08-07 freeze).
// Running one decision per Inngest step puts each in its own invocation with its
// own fresh budget, so the cap is never approached.

export type TriageDecision =
  /** triageJob threw — transient; caller should leave the item for a later run. */
  | { kind: "error"; error: string }
  /** AI binding missing / every model failed — FAIL CLOSED, retry next run. */
  | { kind: "ai-unavailable" }
  /** AI judged the listing not open to Filipinos — persist inactive, never publish. */
  | { kind: "ineligible"; reason: string; triage: TriageResult }
  /** First pass approved but the skeptic refuted it — quarantine, never publish. */
  | { kind: "consensus-split"; reason: string; triage: TriageResult; skeptic: SkepticVerdict }
  /** Approved — publish. `skeptic` is present only when a second vote was taken. */
  | { kind: "eligible"; triage: TriageResult; skeptic: SkepticVerdict | null };

export interface TriageDecisionInput {
  title: string;
  description?: string | null;
  company?: string | null;
  tags?: string[] | null;
  locationRaw?: string | null;
}

/**
 * Compute the AI triage verdict for one gate-passed listing.
 *
 * Mirrors the inline scrape ordering exactly: model ladder first; fail closed on
 * unavailability; reject on ineligibility; then — only for gate-`unknown`
 * positives — a second adversarial skeptic vote whose disagreement quarantines
 * the listing. `env` carries the Workers AI binding (`env.AI`).
 */
export async function decideTriage(
  input: TriageDecisionInput,
  gate: { geoScope: GeoScope },
  env: any,
): Promise<TriageDecision> {
  const context: TriageContext = {
    locationRaw: input.locationRaw ?? null,
    tags: input.tags ?? undefined,
    company: input.company ?? undefined,
  };

  let triage: TriageResult;
  try {
    triage = await triageJob(input.title, input.description || "", env, context);
  } catch (err) {
    return { kind: "error", error: err instanceof Error ? err.message : String(err) };
  }

  // FAIL CLOSED: an item the AI never actually classified is not published; it
  // is left to retry when AI recovers. An AI outage must never fill the board.
  if (triage.aiUnavailable) {
    return { kind: "ai-unavailable" };
  }

  if (!triage.eligibleForFilipinos) {
    return { kind: "ineligible", reason: triage.reason || "ineligible", triage };
  }

  // Consensus (L2): a gate-verified positive already has a structured signal, so
  // it skips the second vote. A gate-`unknown` positive rests on one AI pass and
  // must survive an adversarial skeptic before publishing.
  let skeptic: SkepticVerdict | null = null;
  if (gate.geoScope === "unknown") {
    skeptic = await skepticEligibilityCheck(input.title, input.description || "", env, context);
    if (skeptic && !skeptic.aiUnavailable && !skeptic.eligible) {
      return { kind: "consensus-split", reason: skeptic.reason || "refuted", triage, skeptic };
    }
  }

  return { kind: "eligible", triage, skeptic };
}

/**
 * Map the AI triage category to the UI category taxonomy the board renders.
 * Kept beside `decideTriage` so any consumer of the verdict maps categories the
 * same way. (The scrape route carries an identical private copy for its inline
 * path; both must agree — this is the canonical version for new callers.)
 */
export function mapTriageCategoryToUiCategory(cat: string): string {
  switch (cat) {
    case "admin":
      return "admin";
    case "design":
    case "creative":
      return "design";
    case "tech":
      return "tech";
    case "marketing":
    case "social-media":
      return "marketing";
    case "customer-service":
    case "customer-support":
      return "customer-service";
    case "finance":
      return "finance";
    default:
      return "other";
  }
}
