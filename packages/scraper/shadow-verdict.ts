// Shadow dispatch verdict adjudication — pure, deterministic, Jev-assisted.
//
// Problem being solved (measured 2026-09-22..24, production D1 + EX-03 CI):
// `assessShadowResponse` treats any non-healthy probe outcome as a run
// failure. Three production modes resulted:
//   1. `recruitee:myjewellery` returned a 524,312-byte payload against the
//      524,288-byte shadow budget (24 bytes over, 0.005%) — 14 consecutive
//      DEGRADED_ANOMALOUS observations after 13 healthy, fully parsed ones.
//      The strict guard cannot separate this chronic boundary condition from
//      real degradation, so most hourly runs fail CI.
//   2. Transient `RATE_LIMITED` outcomes (workable 429 after the probe's own
//      polite single retry) also fail the whole run.
//   3. HTTP 503 storage failures (a separate defect, surfaced here via
//      errorClass hardening in the route, not adjudicated here).
//
// This module decides the RUN-LEVEL VERDICT only. It never changes source
// authority, never writes D1, never publishes, and never suppresses an
// observation — every anomalous probe is already stored truthfully by the
// dispatcher. It separates two tiers:
//
//   Tier 1 (deterministic): a chronic, provably-boundary oversize anomaly
//     (tiny margin over budget, identical stop reasons, healthy parsed
//     history, no policy/security signals) is classified WITHOUT any model.
//
//   Tier 2 (Jev-assisted): candidate-explainable transients (first-time
//     oversize, rate-limited probes) are compared by Jev against the
//     recorded evidence. Jev proposes; the enforcement below disposes —
//     an allowlisted ACCEPT is the only path to a passing verdict, and any
//     unavailability, malformed output, abstention, or low confidence
//     fails conservatively (today's behavior).
//
// Verdict taxonomy: `healthy` (all probes healthy), `healthy_with_notes`
// (every anomaly deterministically adjudicated or Jev-accepted), `failed`
// (any unresolved anomaly, rejected recommendation, or missing judge).

import type { DoctorOutcome } from "./source-doctor";
import { sha256Hex } from "./contentHash";

// 1.1.0: packet evidence now includes rate-limit frequency/recency (finding
// #1) and the consultation record carries verdict-version, token-usage, and
// later-outcome provenance (finding #4). Purely additive; enforcement unchanged.
export const SHADOW_VERDICT_VERSION = "1.1.0";

/** A non-healthy probe outcome captured by the dispatcher for this run. */
export interface DispatchAnomaly {
  sourceId: string;
  providerId: string;
  outcome: DoctorOutcome;
  stopReason: string | null;
  bytesReceived: number;
  itemCount: number;
  plausibleItems: number;
}

/** Bounded recent observation history for one anomalous source (≤14 days). */
export interface AnomalyHistoryRow {
  observedAt: string;
  outcome: DoctorOutcome;
  plausibleItems: number;
  stopReason: string | null;
}

export interface AnomalyHistory {
  sourceId: string;
  rows: AnomalyHistoryRow[];
}

export type AnomalyClassification =
  | "known_limit_over_budget"
  | "candidate_over_budget"
  | "transient_rate_limit"
  | "unresolved";

export const OVERSIZE_STOP_REASON_PATTERN = /^oversized payload (\d+) bytes > budget (\d+)/;

/** A provable chronic known-limit must stay within this margin of the budget. */
export const KNOWN_LIMIT_OVER_BUDGET_MARGIN = 0.05;
/** Minimum parsed-healthy observations in history for chronicity proof. */
export const KNOWN_LIMIT_MIN_HEALTHY_HISTORY = 3;
/** Historical window (days) the route loader must bound itself to. */
export const ANOMALY_HISTORY_WINDOW_DAYS = 14;
/** Outcomes that can never be adjudicated into a passing verdict. */
export const HARD_UNRESOLVABLE_OUTCOMES: ReadonlySet<DoctorOutcome> = new Set<DoctorOutcome>([
  "SCHEMA_BROKEN",
  "POLICY_BLOCKED",
  "INTERNAL_PIPELINE_FAILURE",
  "UNKNOWN",
  "UNREACHABLE",
]);

/** Token usage reported by the provider for one judgment call (finding #4). */
export interface JevUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/** Recommendations Jev is allowed to make. Anything else is malformed. */
export type JevRecommendation = "ACCEPT_NOTES" | "FAIL_CONSERVATIVE" | "ABSTAIN";
export const JEV_RECOMMENDATIONS: readonly JevRecommendation[] = ["ACCEPT_NOTES", "FAIL_CONSERVATIVE", "ABSTAIN"];

/** Jev is consulted only when at least one Tier-2 anomaly exists. */
export type JevConsultation =
  | { consulted: false; reason: "not_needed" | "unavailable" | "disabled" }
  | {
      consulted: true;
      model: string;
      recommendation: JevRecommendation;
      confidence: number;
      ok: boolean;
      error?: string;
      correlationId: string;
      recordedAt: string;
      /** Revision of the verdict/packet logic at decision time (finding #4). */
      verdictVersion?: string;
      /** Provider-reported token usage when the call succeeded (finding #4). */
      usage?: JevUsage;
      /**
       * Later observed outcome of this decision, linked by correlationId.
       * Null at decision time; filled only by evidence tooling (finding #4).
       */
      laterOutcome?: string | null;
    };

export interface AnomalyClassificationResult {
  sourceId: string;
  providerId: string;
  outcome: DoctorOutcome;
  classification: AnomalyClassification;
  evidence: {
    stopReason: string | null;
    bytesReceived: number;
    budgetBytes: number | null;
    overBudgetMargin: number | null;
    healthyParsedLast14d: number;
    hardUnresolvableLast14d: number;
    chronicIdenticalOversize: boolean | null;
    /** RATE_LIMITED observations in the bounded 14-day history (finding #1). */
    rateLimitedLast14d: number;
    /** Most recent RATE_LIMITED observation in history, or null (finding #1). */
    lastRateLimitedAt: string | null;
  };
}

export function classifyAnomaly(
  anomaly: DispatchAnomaly,
  history: AnomalyHistory | undefined,
): AnomalyClassificationResult {
  const oversize = OVERSIZE_STOP_REASON_PATTERN.exec(anomaly.stopReason ?? "");
  const rows = history?.rows ?? [];
  const healthyParsed = rows.filter(
    (r) => r.outcome === "HEALTHY_WITH_RESULTS" && r.plausibleItems > 0,
  ).length;
  const hardUnresolvable = rows.filter(
    (r) => HARD_UNRESOLVABLE_OUTCOMES.has(r.outcome),
  ).length;
  const rateLimitedRows = rows.filter((r) => r.outcome === "RATE_LIMITED");
  const lastRateLimitedAt = rateLimitedRows.reduce<string>(
    (max, r) => (r.observedAt > max ? r.observedAt : max),
    "",
  ) || null;

  const evidence = {
    stopReason: anomaly.stopReason,
    bytesReceived: anomaly.bytesReceived,
    budgetBytes: null as number | null,
    overBudgetMargin: null as number | null,
    healthyParsedLast14d: healthyParsed,
    hardUnresolvableLast14d: hardUnresolvable,
    chronicIdenticalOversize: null as boolean | null,
    rateLimitedLast14d: rateLimitedRows.length,
    lastRateLimitedAt,
  };

  if (anomaly.outcome === "RATE_LIMITED") {
    return { sourceId: anomaly.sourceId, providerId: anomaly.providerId, outcome: anomaly.outcome, classification: "transient_rate_limit", evidence };
  }

  if (anomaly.outcome !== "DEGRADED_ANOMALOUS" || !oversize) {
    return { sourceId: anomaly.sourceId, providerId: anomaly.providerId, outcome: anomaly.outcome, classification: "unresolved", evidence };
  }

  const bytes = Number(oversize[1]);
  const budget = Number(oversize[2]);
  evidence.budgetBytes = budget;
  evidence.overBudgetMargin = budget > 0 ? (bytes - budget) / budget : null;

  const degradedRows = rows.filter((r) => r.outcome === "DEGRADED_ANOMALOUS");
  const degradedOversize = degradedRows
    .map((r) => OVERSIZE_STOP_REASON_PATTERN.exec(r.stopReason ?? ""))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ bytes: Number(m[1]), budget: Number(m[2]) }));
  const allDegradedAreOversize = degradedRows.length === degradedOversize.length;
  evidence.chronicIdenticalOversize = allDegradedAreOversize
    ? degradedOversize.every(
        (d) =>
          d.budget === budget
          && Math.abs((d.bytes - bytes) / Math.max(bytes, 1)) <= KNOWN_LIMIT_OVER_BUDGET_MARGIN,
      )
    : false;

  const withinMargin =
    evidence.overBudgetMargin !== null
    && evidence.overBudgetMargin >= 0
    && evidence.overBudgetMargin <= KNOWN_LIMIT_OVER_BUDGET_MARGIN;

  // Tier 1 — provable chronic boundary condition. Every condition is a
  // directly measured fact; no model is consulted for this classification.
  // Chronicity requires at least one PRIOR identical oversize observation —
  // an empty history must never satisfy `every()` vacuously, so a first-time
  // oversize is always Tier 2 (Jev-assisted).
  const knownLimit =
    withinMargin
    && healthyParsed >= KNOWN_LIMIT_MIN_HEALTHY_HISTORY
    && hardUnresolvable === 0
    && allDegradedAreOversize
    && degradedRows.length >= 1
    && evidence.chronicIdenticalOversize === true;

  return {
    sourceId: anomaly.sourceId,
    providerId: anomaly.providerId,
    outcome: anomaly.outcome,
    classification: knownLimit ? "known_limit_over_budget" : "candidate_over_budget",
    evidence,
  };
}

export function classifyAnomalies(
  anomalies: DispatchAnomaly[],
  historyBySourceId: Map<string, AnomalyHistory>,
): AnomalyClassificationResult[] {
  return anomalies.map((a) => classifyAnomaly(a, historyBySourceId.get(a.sourceId)));
}

export interface VerdictResult {
  status: "healthy" | "healthy_with_notes" | "failed";
  reasons: string[];
  classifications: AnomalyClassificationResult[];
  acceptedNotes: Array<{ sourceId: string; outcome: DoctorOutcome; classification: AnomalyClassification }>;
  consultation: JevConsultation;
}

export interface JevAnswer {
  recommendation: JevRecommendation;
  confidence: number;
  model: string;
  ok: boolean;
  error?: string;
  usage?: JevUsage;
}

/**
 * Provisional calibration threshold (labeled): a Jev answer below this
 * self-reported confidence is treated as an abstention. Self-reported
 * confidence is diagnostic metadata, not proof; the deterministic
 * postconditions above still gate every acceptance.
 */
export const JEV_MIN_CONFIDENCE = 0.5;

export async function decideVerdict(input: {
  anomalies: DispatchAnomaly[];
  classifications: AnomalyClassificationResult[];
  jev: (() => Promise<JevAnswer>) | null;
  disabled?: boolean;
  available?: boolean;
  now?: () => Date;
  /** Verdict/packet revision at decision time, recorded on the consultation. */
  verdictVersion?: string;
}): Promise<VerdictResult> {
  const { anomalies, classifications } = input;
  if (anomalies.length === 0) {
    return { status: "healthy", reasons: [], classifications: [], acceptedNotes: [], consultation: { consulted: false, reason: "not_needed" } };
  }

  if (classifications.some((c) => c.classification === "unresolved")) {
    const unresolved = classifications.filter((c) => c.classification === "unresolved").map((c) => c.sourceId);
    return {
      status: "failed",
      reasons: [`unresolved anomaly outcome on: ${unresolved.join(", ")}`],
      classifications,
      acceptedNotes: [],
      consultation: { consulted: false, reason: "not_needed" },
    };
  }

  const acceptedNotes: VerdictResult["acceptedNotes"] = [];
  for (const c of classifications) {
    if (c.classification === "known_limit_over_budget") {
      acceptedNotes.push({ sourceId: c.sourceId, outcome: c.outcome, classification: c.classification });
    }
  }

  const tier2 = classifications.filter(
    (c) => c.classification === "transient_rate_limit" || c.classification === "candidate_over_budget",
  );
  if (tier2.length === 0) {
    return {
      status: "healthy_with_notes",
      reasons: [
        `all ${classifications.length} anomaly(ies) deterministically adjudicated as chronic known-limit boundary conditions`,
      ],
      classifications,
      acceptedNotes,
      consultation: { consulted: false, reason: "not_needed" },
    };
  }

  if (input.disabled) {
    return {
      status: "failed",
      reasons: ["Tier-2 anomaly adjudication disabled (JEV_ADJUDICATION_DISABLED); conservative fail"],
      classifications,
      acceptedNotes,
      consultation: { consulted: false, reason: "disabled" },
    };
  }
  if (!input.available || !input.jev) {
    return {
      status: "failed",
      reasons: ["Jev judge unavailable for Tier-2 anomalies; conservative fail"],
      classifications,
      acceptedNotes,
      consultation: { consulted: false, reason: "unavailable" },
    };
  }

  const now = input.now ?? (() => new Date());
  const correlationId = `sv-${(await sha256Hex(JSON.stringify(anomalies))).slice(0, 12)}-${now().getTime().toString(36)}`;
  let answer: JevAnswer;
  try {
    answer = await input.jev();
  } catch (error) {
    answer = { recommendation: "ABSTAIN", confidence: 0, model: "", ok: false, error: error instanceof Error ? "judge invocation failed" : "judge invocation failed" };
  }

  const valid = answer.ok && (JEV_RECOMMENDATIONS as readonly string[]).includes(answer.recommendation)
    && Number.isFinite(answer.confidence) && answer.confidence >= 0 && answer.confidence <= 1;
  const recommendation = valid ? answer.recommendation : "ABSTAIN";
  const belowConfidence = valid && answer.confidence < JEV_MIN_CONFIDENCE;

  const consultation: JevConsultation = {
    consulted: true,
    model: answer.model,
    recommendation: belowConfidence ? "ABSTAIN" : (recommendation as JevRecommendation),
    confidence: answer.confidence,
    ok: valid,
    error: answer.error,
    correlationId,
    recordedAt: now().toISOString(),
    verdictVersion: input.verdictVersion,
    usage: valid ? answer.usage : undefined,
    laterOutcome: null,
  };

  if (!valid || belowConfidence || recommendation !== "ACCEPT_NOTES") {
    const reason = !valid
      ? "Jev returned a malformed or failed answer; conservative fail"
      : belowConfidence
        ? `Jev confidence ${answer.confidence} below threshold ${JEV_MIN_CONFIDENCE}; treated as abstention`
        : `Jev recommended ${recommendation}`;
    return {
      status: "failed",
      reasons: [reason],
      classifications,
      acceptedNotes,
      consultation,
    };
  }

  for (const c of tier2) {
    acceptedNotes.push({ sourceId: c.sourceId, outcome: c.outcome, classification: c.classification });
  }
  return {
    status: "healthy_with_notes",
    reasons: [
      `${acceptedNotes.length} anomaly(ies) adjudicated: ${classifications.filter((c) => c.classification === "known_limit_over_budget").length} deterministic known-limit, ${tier2.length} Jev-accepted`,
    ],
    classifications,
    acceptedNotes,
    consultation,
  };
}

/** Compact, non-secret Jev packet for one dispatch run's anomalies. */
export function buildJevAdjudicationPacket(input: {
  dispatched: number;
  classifications: AnomalyClassificationResult[];
}): { task: string; context: string; state: string; criteria: Record<JevRecommendation, string> } {
  const anomalyLines = input.classifications.map((c) => {
    const ev = c.evidence;
    const oversize = ev.budgetBytes !== null
      ? ` oversize ${ev.bytesReceived}B vs budget ${ev.budgetBytes}B (over ${(100 * (ev.overBudgetMargin ?? 0)).toFixed(3)}%)`
      : "";
    // Rate-limit frequency/recency (finding #1): Jev's FAIL_CONSERVATIVE
    // criteria name "repeated rate-limit pressure", so the packet must show
    // how often rate limiting occurred in the bounded history and how recent
    // the last occurrence was — absent data must not read as absent pressure.
    const rateLimit = ` rateLimited14d: ${ev.rateLimitedLast14d}, lastRateLimitedAt: ${ev.lastRateLimitedAt ?? "none recorded"}`;
    const history = ` history14d: healthyParsed=${ev.healthyParsedLast14d}, hardUnresolvable=${ev.hardUnresolvableLast14d}, chronicIdenticalOversize=${String(ev.chronicIdenticalOversize)}.`;
    return `- ${c.sourceId} (provider ${c.providerId}): outcome=${c.outcome}, stop="${ev.stopReason ?? "none"}"${oversize}.${rateLimit}${history}`;
  }).join("\n");

  return {
    task: "Adjudicate the run verdict for a shadow job-source observation run with anomalous probe outcomes",
    context: [
      "Policy constraints: every anomalous probe observation is already stored truthfully and is non-public; no source authority, publication, or registry change is available to this decision.",
      "The verdict only controls the run-level monitoring signal. Anomalies that are chronic, bounded boundary conditions with healthy parsed history (e.g. a payload 0.005% over a fixed size budget) are known limits; isolated transient rate limits after a polite single retry with backoff are acceptable as notes; schema breakage, policy blocks, unreachability, or unexplained anomalies must fail conservatively.",
      "Untrusted source content is never included in this packet; only system telemetry is.",
    ].join("\n"),
    state: [
      `Dispatched probes this run: ${input.dispatched}.`,
      `Anomalous outcomes: ${input.classifications.length}.`,
      anomalyLines,
    ].join("\n"),
    criteria: {
      ACCEPT_NOTES: "Every listed anomaly is either a chronic bounded known-limit with healthy parsed history or an isolated transient rate limit after polite retry; the run should pass with recorded notes.",
      FAIL_CONSERVATIVE: "Any anomaly looks like real degradation, redesign, persistent blocking, or repeated rate-limit pressure; the run should fail for investigation.",
      ABSTAIN: "Evidence is insufficient to choose; treat the run as failed.",
    },
  };
}
