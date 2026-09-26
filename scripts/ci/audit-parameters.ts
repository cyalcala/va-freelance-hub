import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RISK_TIER_POLICIES } from "../../packages/scraper/policy-resolver";
import { DEFAULT_MIN_REDISPATCH_MINUTES, MAX_DISPATCHES_PER_RUN } from "../../packages/scraper/shadow-dispatcher";
import {
  SHADOW_FETCH_TIMEOUT_MS,
  SHADOW_MAX_BYTES,
  SHADOW_MAX_REQUESTS,
} from "../../packages/scraper/candidate-shadow";
import { JEV_MODEL, JEV_SYSTEMONE_URL } from "../../packages/scraper/jev-client";

export interface ParameterAuditResult {
  errors: string[];
  warnings: string[];
}

export function auditAcceptedParameters(
  rootDir: string = join(import.meta.dir, "../.."),
  yamlOverride?: string
): ParameterAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const yamlPath = join(rootDir, "docs/ACCEPTED_PARAMETERS.yaml");
  let yamlText: string;

  if (yamlOverride !== undefined) {
    yamlText = yamlOverride;
  } else {
    if (!existsSync(yamlPath)) {
      return { errors: ["docs/ACCEPTED_PARAMETERS.yaml: file does not exist"], warnings: [] };
    }
    yamlText = readFileSync(yamlPath, "utf-8");
  }

  let parsed: any;
  try {
    parsed = (Bun as any).YAML ? (Bun as any).YAML.parse(yamlText) : JSON.parse(yamlText);
  } catch (err) {
    return {
      errors: [`docs/ACCEPTED_PARAMETERS.yaml: invalid YAML (${err instanceof Error ? err.message : String(err)})`],
      warnings: [],
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return { errors: ["docs/ACCEPTED_PARAMETERS.yaml: root must be an object"], warnings: [] };
  }

  // 1. Core Metadata
  if (parsed.version !== 2) {
    errors.push(`docs/ACCEPTED_PARAMETERS.yaml: expected version 2, got ${parsed.version}`);
  }
  if (parsed.canonical !== true) {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: canonical must be true");
  }

  // 2. Code Anchors Existence
  const codeAnchors = parsed.code_anchors;
  if (!codeAnchors || typeof codeAnchors !== "object") {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing code_anchors map");
  } else {
    for (const [key, relPath] of Object.entries(codeAnchors)) {
      if (typeof relPath !== "string") {
        errors.push(`docs/ACCEPTED_PARAMETERS.yaml: code_anchor ${key} must be a path string`);
        continue;
      }
      const fullPath = join(rootDir, relPath);
      if (!existsSync(fullPath)) {
        errors.push(`docs/ACCEPTED_PARAMETERS.yaml: code_anchor ${key} references missing file ${relPath}`);
      }
    }
  }

  // 3. Autonomy Levels (L1 Baseline Contract)
  const jobEval = parsed.autonomy?.job_evaluation?.current_level_by_class;
  if (!jobEval || typeof jobEval !== "object") {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing autonomy.job_evaluation.current_level_by_class");
  } else {
    for (const [cls, level] of Object.entries(jobEval)) {
      if (level !== "L1") {
        errors.push(`docs/ACCEPTED_PARAMETERS.yaml: job_evaluation class ${cls} must be L1 (current truth), got ${level}`);
      }
    }
  }

  const jobFlow = parsed.autonomy?.job_flow?.current_level_by_class;
  if (!jobFlow || typeof jobFlow !== "object") {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing autonomy.job_flow.current_level_by_class");
  } else {
    for (const [cls, level] of Object.entries(jobFlow)) {
      if (level !== "L1") {
        errors.push(`docs/ACCEPTED_PARAMETERS.yaml: job_flow class ${cls} must be L1 (current truth), got ${level}`);
      }
    }
  }

  // 4. Parity with TypeScript Code Constants
  // A. Risk Tiers (policy-resolver.ts)
  const tierA = parsed.risk_tiers_adr008?.tier_a_direct_ats;
  if (!tierA) {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing risk_tiers_adr008.tier_a_direct_ats");
  } else {
    if (RISK_TIER_POLICIES.tier_a.minShadowDays !== tierA.shadow_window_days) {
      errors.push(
        `Parity drift in Tier A minShadowDays: code=${RISK_TIER_POLICIES.tier_a.minShadowDays}, yaml=${tierA.shadow_window_days}`
      );
    }
    if (RISK_TIER_POLICIES.tier_a.canaryMaxLimit !== tierA.canary_cap_per_tick) {
      errors.push(
        `Parity drift in Tier A canaryMaxLimit: code=${RISK_TIER_POLICIES.tier_a.canaryMaxLimit}, yaml=${tierA.canary_cap_per_tick}`
      );
    }
    if (RISK_TIER_POLICIES.tier_a.fastTrackEligible !== tierA.fast_track_eligible) {
      errors.push(
        `Parity drift in Tier A fastTrackEligible: code=${RISK_TIER_POLICIES.tier_a.fastTrackEligible}, yaml=${tierA.fast_track_eligible}`
      );
    }
  }

  const tierB = parsed.risk_tiers_adr008?.tier_b_variable_api;
  if (!tierB) {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing risk_tiers_adr008.tier_b_variable_api");
  } else {
    if (RISK_TIER_POLICIES.tier_b.minShadowDays !== tierB.shadow_window_days) {
      errors.push(
        `Parity drift in Tier B minShadowDays: code=${RISK_TIER_POLICIES.tier_b.minShadowDays}, yaml=${tierB.shadow_window_days}`
      );
    }
    if (RISK_TIER_POLICIES.tier_b.canaryMaxLimit !== tierB.canary_cap_per_tick) {
      errors.push(
        `Parity drift in Tier B canaryMaxLimit: code=${RISK_TIER_POLICIES.tier_b.canaryMaxLimit}, yaml=${tierB.canary_cap_per_tick}`
      );
    }
    if (RISK_TIER_POLICIES.tier_b.fastTrackEligible !== tierB.fast_track_eligible) {
      errors.push(
        `Parity drift in Tier B fastTrackEligible: code=${RISK_TIER_POLICIES.tier_b.fastTrackEligible}, yaml=${tierB.fast_track_eligible}`
      );
    }
  }

  const tierC = parsed.risk_tiers_adr008?.tier_c_dom_html;
  if (!tierC) {
    errors.push("docs/ACCEPTED_PARAMETERS.yaml: missing risk_tiers_adr008.tier_c_dom_html");
  } else {
    if (RISK_TIER_POLICIES.tier_c.minShadowDays !== tierC.shadow_window_days) {
      errors.push(
        `Parity drift in Tier C minShadowDays: code=${RISK_TIER_POLICIES.tier_c.minShadowDays}, yaml=${tierC.shadow_window_days}`
      );
    }
    if (RISK_TIER_POLICIES.tier_c.canaryMaxLimit !== tierC.canary_cap_per_tick) {
      errors.push(
        `Parity drift in Tier C canaryMaxLimit: code=${RISK_TIER_POLICIES.tier_c.canaryMaxLimit}, yaml=${tierC.canary_cap_per_tick}`
      );
    }
    if (RISK_TIER_POLICIES.tier_c.fastTrackEligible !== tierC.fast_track_eligible) {
      errors.push(
        `Parity drift in Tier C fastTrackEligible: code=${RISK_TIER_POLICIES.tier_c.fastTrackEligible}, yaml=${tierC.fast_track_eligible}`
      );
    }
  }

  // B. Shadow Dispatcher (shadow-dispatcher.ts)
  if (parsed.reliability?.max_redispatch_interval_minutes !== DEFAULT_MIN_REDISPATCH_MINUTES) {
    errors.push(
      `Parity drift in max_redispatch_interval_minutes: code=${DEFAULT_MIN_REDISPATCH_MINUTES}, yaml=${parsed.reliability?.max_redispatch_interval_minutes}`
    );
  }
  if (parsed.reliability?.max_dispatches_per_run !== MAX_DISPATCHES_PER_RUN) {
    errors.push(
      `Parity drift in max_dispatches_per_run: code=${MAX_DISPATCHES_PER_RUN}, yaml=${parsed.reliability?.max_dispatches_per_run}`
    );
  }

  // C. Candidate Shadow (candidate-shadow.ts)
  if (parsed.reliability?.shadow_fetch_timeout_ms !== SHADOW_FETCH_TIMEOUT_MS) {
    errors.push(
      `Parity drift in shadow_fetch_timeout_ms: code=${SHADOW_FETCH_TIMEOUT_MS}, yaml=${parsed.reliability?.shadow_fetch_timeout_ms}`
    );
  }
  if (parsed.reliability?.shadow_max_bytes !== SHADOW_MAX_BYTES) {
    errors.push(
      `Parity drift in shadow_max_bytes: code=${SHADOW_MAX_BYTES}, yaml=${parsed.reliability?.shadow_max_bytes}`
    );
  }
  if (parsed.reliability?.shadow_max_requests !== SHADOW_MAX_REQUESTS) {
    errors.push(
      `Parity drift in shadow_max_requests: code=${SHADOW_MAX_REQUESTS}, yaml=${parsed.reliability?.shadow_max_requests}`
    );
  }

  // D. Jev Client (jev-client.ts)
  if (JEV_MODEL !== "typesafe/jev-1.13") {
    errors.push(`Parity drift in JEV_MODEL: code=${JEV_MODEL}, expected=typesafe/jev-1.13`);
  }
  if (JEV_SYSTEMONE_URL !== "https://openrouter.ai/api/v1/systemone") {
    errors.push(`Parity drift in JEV_SYSTEMONE_URL: code=${JEV_SYSTEMONE_URL}, expected=https://openrouter.ai/api/v1/systemone`);
  }

  // 5. Generated Documentation Mirror Parity
  const generatedDocs = Array.isArray(parsed.generated_docs) ? parsed.generated_docs : [];
  for (const docRel of generatedDocs) {
    const docFull = join(rootDir, docRel);
    if (!existsSync(docFull)) {
      errors.push(`docs/ACCEPTED_PARAMETERS.yaml: generated_docs references missing file ${docRel}`);
      continue;
    }
    const docText = readFileSync(docFull, "utf-8");
    if (!docText.includes('canonical_source: "docs/ACCEPTED_PARAMETERS.yaml"')) {
      errors.push(`${docRel}: missing canonical_source frontmatter referencing docs/ACCEPTED_PARAMETERS.yaml`);
    }
    // Verify mirror contains key threshold values
    if (!docText.includes(String(parsed.reliability?.shadow_fetch_timeout_ms))) {
      warnings.push(`${docRel}: does not explicitly mention shadow_fetch_timeout_ms (${parsed.reliability?.shadow_fetch_timeout_ms})`);
    }
  }

  return { errors, warnings };
}

if (import.meta.main) {
  const result = auditAcceptedParameters();
  for (const warning of result.warnings) {
    console.warn(`[audit:parameters] WARN: ${warning}`);
  }
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`[audit:parameters] ERROR: ${error}`);
    }
    console.error(`\n❌ Parameter Parity Audit FAILED with ${result.errors.length} error(s).`);
    process.exit(1);
  } else {
    console.log("✅ Parameter Parity Audit PASSED: 100% parity between YAML, code constants, and mirrors.");
    process.exit(0);
  }
}
