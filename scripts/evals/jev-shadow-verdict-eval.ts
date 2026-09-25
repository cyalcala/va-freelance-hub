/**
 * Live-provider evaluation for the shadow-verdict adjudication boundary.
 *
 * Runs the REAL Jev 1.13 (OpenRouter System One) judgment against recorded
 * production anomaly evidence — the chronic `recruitee:myjewellery` payload
 * boundary (24 bytes over the 512 KiB shadow budget) and a transient
 * `workable:pineapple-staffing` 429 — and reports the typed recommendation,
 * confidence, and token usage. This is the live-provider counterpart to the
 * mocked enforcement tests in `packages/scraper/shadow-verdict.test.ts`;
 * it is not a substitute for them.
 *
 * Credentials: reads OPENROUTER_API_KEY from the process environment only.
 * Never hardcode, log, or print the key. Exit 0 = a typed Jev answer was
 * produced (whatever the recommendation); exit 1 = NO typed answer was
 * produced — Jev was unavailable, unconfigured, or the provider returned a
 * failed result — which is a conservative verdict failure at runtime and must
 * never be reported as a successful evaluation (finding #3).
 *
 * Usage: bun scripts/evals/jev-shadow-verdict-eval.ts
 */

import {
  buildJevAdjudicationPacket,
  classifyAnomalies,
  decideVerdict,
  SHADOW_VERDICT_VERSION,
  type AnomalyHistory,
  type DispatchAnomaly,
} from "../../packages/scraper/shadow-verdict";
import { judgeViaJev as judgeViaJevClient } from "../../packages/scraper/jev-client";

const OVERSIZE_STOP = "oversized payload 524312 bytes > budget 524288 — no alternate endpoint attempted";

// VERIFIED production telemetry (source_shadow_observations, 2026-09-24):
// myjewellery: 13 healthy parsed observations before Sep 22, then 14
// consecutive identical oversize anomalies (524312 vs 524288 bytes).
const anomalies: DispatchAnomaly[] = [
  {
    sourceId: "recruitee:myjewellery",
    providerId: "recruitee",
    outcome: "DEGRADED_ANOMALOUS",
    stopReason: OVERSIZE_STOP,
    bytesReceived: 524312,
    itemCount: 0,
    plausibleItems: 0,
  },
];

// VERIFIED production telemetry (source_shadow_observations, 2026-09-24):
// workable:pineapple-staffing recorded 2 RATE_LIMITED observations (Sep 21,
// Sep 24) among otherwise healthy runs — the Tier-2 case that reaches Jev.
const tier2Anomalies: DispatchAnomaly[] = [
  {
    sourceId: "workable:pineapple-staffing",
    providerId: "workable",
    outcome: "RATE_LIMITED",
    stopReason: null,
    bytesReceived: 0,
    itemCount: 0,
    plausibleItems: 0,
  },
];

const tier2History = new Map<string, AnomalyHistory>([
  ["workable:pineapple-staffing", {
    sourceId: "workable:pineapple-staffing",
    rows: [
      ...Array.from({ length: 22 }, (_, i) => ({
        observedAt: `2026-09-1${(i % 9) + 1}T12:20:00.000Z`,
        outcome: "HEALTHY_WITH_RESULTS" as const,
        plausibleItems: 3,
        stopReason: null,
      })),
      { observedAt: "2026-09-21T23:22:08.068Z", outcome: "RATE_LIMITED" as const, plausibleItems: 0, stopReason: null },
    ],
  }],
]);

const historyBySourceId = new Map<string, AnomalyHistory>([
  ["recruitee:myjewellery", {
    sourceId: "recruitee:myjewellery",
    rows: [
      ...Array.from({ length: 13 }, (_, i) => ({
        observedAt: `2026-09-0${(i % 9) + 1}T12:20:00.000Z`,
        outcome: "HEALTHY_WITH_RESULTS" as const,
        plausibleItems: 88,
        stopReason: null,
      })),
      ...Array.from({ length: 14 }, (_, i) => ({
        observedAt: `2026-09-2${(i % 4) + 1}T12:20:00.000Z`,
        outcome: "DEGRADED_ANOMALOUS" as const,
        plausibleItems: 0,
        stopReason: OVERSIZE_STOP,
      })),
    ],
  }],
]);

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Case 1 (production myjewellery): chronic known-limit — the deterministic
  // Tier 1 must resolve this WITHOUT any model call.
  const tier1Classifications = classifyAnomalies(anomalies, historyBySourceId);
  const tier1 = await decideVerdict({ anomalies, classifications: tier1Classifications, available: Boolean(apiKey), jev: null });
  console.log(JSON.stringify({ case: "myjewellery_chronic_oversize (Tier 1, deterministic)",
    classification: tier1.classifications[0]?.classification, verdictStatus: tier1.status,
    consulted: tier1.consultation.consulted }, null, 2));
  if (tier1.consultation.consulted || tier1.status !== "healthy_with_notes") {
    console.error("Tier-1 enforcement regressed: expected deterministic healthy_with_notes without consultation.");
    process.exit(1);
  }

  // Case 2 (production pineapple-staffing): transient rate limit — the real
  // live-provider Jev judgment the route would make.
  const tier2Classifications = classifyAnomalies(tier2Anomalies, tier2History);
  const packet = buildJevAdjudicationPacket({ dispatched: 12, classifications: tier2Classifications });
  let rawResult: Awaited<ReturnType<typeof judgeViaJevClient>> | null = null;
  const enforced = await decideVerdict({
    anomalies: tier2Anomalies,
    classifications: tier2Classifications,
    available: Boolean(apiKey),
    verdictVersion: SHADOW_VERDICT_VERSION,
    jev: apiKey
      ? () => judgeViaJevClient(apiKey, {
          task: packet.task,
          context: packet.context,
          state: packet.state,
          questions: { verdict: { instructions: packet.task, criteria: packet.criteria } },
          timeoutMs: 15_000,
        }).then((r) => {
          rawResult = r;
          const answer = r.answers?.verdict;
          if (!r.ok || !answer) {
            return { ok: false, recommendation: "ABSTAIN" as const, confidence: 0, model: r.model ?? "", error: r.error };
          }
          return { ok: true, recommendation: answer.choice as never, confidence: answer.confidence, model: r.model ?? "", usage: r.usage };
        })
      : null,
  });

  console.log(JSON.stringify({ case: "pineapple_rate_limited (Tier 2, live Jev)",
    classification: enforced.classifications[0]?.classification,
    verdictStatus: enforced.status,
    reasons: enforced.reasons,
    consultation: enforced.consultation,
    notes: enforced.acceptedNotes }, null, 2));

  // Finding #3: a failed provider result (HTTP error, timeout, malformed
  // response) produces no typed answer. The consultation is still recorded
  // (consulted=true, ok=false), so the exit code must distinguish it from a
  // successful evaluation — otherwise a provider failure reports success.
  if (rawResult && !rawResult.ok) {
    console.error(`Jev provider returned a failed result (status ${rawResult.status ?? "unknown"}): ${rawResult.error ?? "no diagnostics"}. No typed answer was produced; this evaluation FAILED.`);
    process.exit(1);
  }
  if (!enforced.consultation.consulted) {
    console.error("Jev was not consulted (unavailable or not needed); live-provider evidence was not produced.");
    process.exit(1);
  }
}

await main().catch((error) => {
  console.error("eval failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
