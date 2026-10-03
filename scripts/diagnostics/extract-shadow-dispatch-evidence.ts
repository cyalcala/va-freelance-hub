/**
 * EX-03 shadow-dispatch observation evidence extractor (MATH-12).
 *
 * Pure, local-only helper: given the HTTP status and raw response body text
 * from one EX-03 `POST /api/cron/shadow-dispatch` invocation (as printed by
 * the `gha-shadow-dispatch.yml` workflow into `dispatch.json`), produce a
 * bounded evidence record with exactly one outcome and the next diagnostic
 * action. No I/O, no network, no production writes.
 *
 * Outcome vocabulary (mirrors docs/SYSTEM_SAVEPOINT.md NEXT SINGLE ACTION):
 * - "success_observed": HTTP 200 with at least one persisted observation.
 * - "no_observation": HTTP 200 with zero dispatches; transport worked but
 *   this run provides no observation or storage-recovery evidence.
 * - "specific_class_with_fingerprint": HTTP 503 with a specific D1 class and
 *   an 8-hex errorFingerprint; proceed to Pages-log correlation filtered by
 *   the fingerprint within the run window.
 * - "generic_class_with_fingerprint": HTTP 503 still d1_quota_or_limit (or
 *   unclassified) but WITH a fingerprint on new code; reopens MATH-12
 *   diagnosis (falsification path).
 * - "legacy_generic_without_fingerprint": HTTP 503 d1_quota_or_limit with NO
 *   fingerprint; the run executed pre-251c776 code (deploy lag), not evidence
 *   about the fix. Re-observe the next run; do not reopen diagnosis.
 * - "unparseable": body is not a recognized dispatch payload; record the
 *   raw limitation, do not infer health.
 */

export const SHADOW_SPECIFIC_ERROR_CLASSES = [
  "d1_bind_limit",
  "d1_observation_write_rejected",
  "d1_host_backoff_write_rejected",
  "d1_constraint_violation",
  "d1_schema_mismatch",
  "d1_busy_or_locked",
  "d1_probe_contract_violation",
] as const;

export const SHADOW_GENERIC_ERROR_CLASSES = [
  "d1_quota_or_limit",
  "evidence_or_revision_guard",
  "missing_d1_binding",
  "unclassified_storage_or_pipeline_error",
] as const;

export type ShadowDispatchOutcome =
  | "success_observed"
  | "no_observation"
  | "specific_class_with_fingerprint"
  | "generic_class_with_fingerprint"
  | "legacy_generic_without_fingerprint"
  | "unparseable";

export interface ShadowDispatchEvidence {
  outcome: ShadowDispatchOutcome;
  httpStatus: number | null;
  errorClass: string | null;
  failureStage: string | null;
  sourceId: string | null;
  errorFingerprint: string | null;
  hasFingerprint: boolean;
  totalRegistryRows: number | null;
  dispatched: number | null;
  eligible: number | null;
  skippedIneligible: number | null;
  skippedStaleContext: number | null;
  /** Bounded next action; a human-readable operational instruction. */
  nextAction: string;
  /**
   * Suggested Pages-log correlation filter when a fingerprint exists,
   * otherwise null. Names the fingerprint and the run instant only.
   */
  pagesTailFilterHint: string | null;
}

const FINGERPRINT_RE = /^[0-9a-f]{8}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Parse one EX-03 dispatch observation into a bounded evidence record. Never throws on malformed input. */
export function extractShadowDispatchEvidence(
  httpStatus: number | null,
  bodyText: string,
  runInstantIso: string = new Date().toISOString(),
): ShadowDispatchEvidence {
  const base = {
    httpStatus,
    errorClass: null,
    failureStage: null,
    sourceId: null,
    errorFingerprint: null,
    hasFingerprint: false,
    totalRegistryRows: null,
    dispatched: null,
    eligible: null,
    skippedIneligible: null,
    skippedStaleContext: null,
    pagesTailFilterHint: null,
  };
  let body: unknown = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return {
      ...base,
      outcome: "unparseable",
      nextAction:
        "Body is not JSON; record the raw run log excerpt and re-observe the next scheduled EX-03 run. Do not infer health or code version.",
    };
  }
  if (!isRecord(body)) {
    return {
      ...base,
      outcome: "unparseable",
      nextAction:
        "Body is valid JSON but not a dispatch object; record the raw shape and re-observe. Do not infer health.",
    };
  }

  const failureStage = typeof body["failureStage"] === "string" ? body["failureStage"] : null;
  const sourceId = typeof body["sourceId"] === "string" ? body["sourceId"] : null;
  const skippedStaleContext = asNonNegativeInt(body["skippedStaleContext"]);
  const skippedIneligible = asNonNegativeInt(body["skippedIneligible"]);

  if (httpStatus === 200) {
    const totalRegistryRows = asNonNegativeInt(body["totalRegistryRows"]);
    const dispatched = asNonNegativeInt(body["dispatched"]);
    const eligible = asNonNegativeInt(body["eligible"]);
    if (totalRegistryRows === null || dispatched === null || eligible === null
      || dispatched > eligible || eligible > totalRegistryRows) {
      return { ...base, outcome: "unparseable",
        nextAction: "HTTP 200 lacks reconciled dispatch counters; inspect the run payload. Do not infer an observation or storage recovery." };
    }
    return {
      ...base,
      outcome: dispatched > 0 ? "success_observed" : "no_observation",
      totalRegistryRows,
      dispatched,
      eligible,
      skippedIneligible,
      skippedStaleContext,
      nextAction: dispatched > 0
        ? "At least one observation was reported persisted. Verify per-source coverage and current authority before closing the incident or counting clean days."
        : "No observation was persisted in this run. Inspect eligibility and cadence for the skipped sources; storage recovery and clean-day evidence remain unobserved.",
    };
  }

  const errorClass = typeof body["errorClass"] === "string" ? body["errorClass"] : null;
  const rawFingerprint = typeof body["errorFingerprint"] === "string" ? body["errorFingerprint"] : null;
  const fingerprint = rawFingerprint !== null && FINGERPRINT_RE.test(rawFingerprint) ? rawFingerprint : null;
  const hasFingerprint = fingerprint !== null;

  if (errorClass === null && !hasFingerprint) {
    return {
      ...base,
      outcome: "unparseable",
      nextAction:
        "No errorClass and no errorFingerprint present; record the raw body keys and re-observe. Do not infer health or code version.",
    };
  }

  const record = {
    ...base,
    errorClass,
    failureStage,
    sourceId,
    errorFingerprint: fingerprint,
    hasFingerprint,
    skippedStaleContext,
  };

  if (!hasFingerprint) {
    return {
      ...record,
      outcome: "legacy_generic_without_fingerprint",
      nextAction: `Run executed pre-enrichment code (no errorFingerprint; class ${errorClass ?? "unknown"}). The 251c776 fix is still UNOBSERVED. Re-observe the next scheduled EX-03 run; do not reopen MATH-12 diagnosis.`,
    };
  }

  const hint =
    `wrangler pages deployment tail remotejobs-ph --format json --search shadow-dispatch ` +
    `(window around ${runInstantIso}, correlate errorFingerprint=${fingerprint})`;

  if (errorClass !== null && (SHADOW_SPECIFIC_ERROR_CLASSES as readonly string[]).includes(errorClass)) {
    return {
      ...record,
      outcome: "specific_class_with_fingerprint",
      pagesTailFilterHint: hint,
      nextAction: `Specific class ${errorClass} at stage ${failureStage ?? "unknown"}${sourceId ? ` for source ${sourceId}` : ""} with fingerprint ${fingerprint}. Correlate in the Pages log within the run window, then remediate by class. Rollback: revert 251c776; shadow stays fail-safe.`,
    };
  }

  // Enhanced MATH-12 diagnostics: provide stage-specific correlation guidance without asserting quota exhaustion
  let specificNextAction = `FALSIFICATION: still ${errorClass ?? "unknown"} at stage ${failureStage ?? "unknown"}${sourceId ? ` for source ${sourceId}` : ""} WITH a fingerprint on enriched code. Reopen MATH-12 diagnosis via Pages-log correlation; do not assume quota exhaustion.`;

  if (errorClass === "d1_quota_or_limit" && failureStage !== null) {
    // Provide correlation guidance based on failure stage without asserting quota exhaustion
    const d1OperationStages = [
      "load_host_backoff",
      "persist_host_backoff",
      "enumerate_registry",
      "load_admission_context",
      "load_observation_history",
      "persist_observation",
      "load_anomaly_history"
    ];

    // Pages resource issues typically occur during probe execution or API calls
    const pagesResourceStages = [
      "run_probe",
      "jev_adjudication"
    ];

    if (d1OperationStages.includes(failureStage)) {
      specificNextAction = `D1 operation stage "${failureStage}" detected with fingerprint. Correlate in Pages log within the run window to determine if related to D1 resource limits or other causes.`;
    } else if (pagesResourceStages.includes(failureStage)) {
      specificNextAction = `Pages resource stage "${failureStage}" detected with fingerprint. Correlate in Pages log within the run window to determine if related to Pages resource limits or other causes.`;
    }
  }

  return {
    ...record,
    outcome: "generic_class_with_fingerprint",
    pagesTailFilterHint: hint,
    nextAction: specificNextAction,
  };
}

if (import.meta.main) {
  const filePath = process.argv[2];
  const httpArg = process.argv[3];
  if (!filePath) {
    console.error("Usage: bun extract-shadow-dispatch-evidence.ts <path-to-dispatch.json> [http-status]");
    process.exit(1);
  }
  const status = httpArg ? parseInt(httpArg, 10) : null;
  let text = "";
  try {
    const fs = await import("fs");
    text = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`Failed to read file ${filePath}:`, err);
    process.exit(1);
  }
  const evidence = extractShadowDispatchEvidence(status, text);
  console.log(JSON.stringify(evidence, null, 2));

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const fs = await import("fs");
    let md = `\n### EX-03 Shadow Dispatch Diagnostics\n\n`;
    md += `- **Outcome:** \`${evidence.outcome}\`\n`;
    md += `- **HTTP Status:** \`${evidence.httpStatus ?? "unknown"}\`\n`;
    if (evidence.errorClass) md += `- **Error Class:** \`${evidence.errorClass}\`\n`;
    if (evidence.failureStage) md += `- **Failure Stage:** \`${evidence.failureStage}\`\n`;
    if (evidence.sourceId) md += `- **Source ID:** \`${evidence.sourceId}\`\n`;
    if (evidence.errorFingerprint) md += `- **Error Fingerprint:** \`${evidence.errorFingerprint}\`\n`;
    if (evidence.totalRegistryRows !== null) md += `- **Total Registry Rows:** \`${evidence.totalRegistryRows}\`\n`;
    if (evidence.dispatched !== null) md += `- **Dispatched:** \`${evidence.dispatched}\`\n`;
    if (evidence.eligible !== null) md += `- **Eligible:** \`${evidence.eligible}\`\n`;
    if (evidence.skippedIneligible !== null) md += `- **Skipped Ineligible:** \`${evidence.skippedIneligible}\`\n`;
    if (evidence.skippedStaleContext !== null) md += `- **Skipped Stale Context:** \`${evidence.skippedStaleContext}\`\n`;
    md += `- **Next Action:** ${evidence.nextAction}\n`;
    if (evidence.pagesTailFilterHint) md += `- **Pages Tail Hint:** \`${evidence.pagesTailFilterHint}\`\n`;
    md += `\n`;
    fs.appendFileSync(summaryFile, md, "utf-8");
  }
}
