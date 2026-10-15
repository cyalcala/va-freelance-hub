/**
 * 13-Stage Pipeline Loss Tracking & Systematic Employer Reconciliation (Milestone M3 & Priority 2).
 *
 * Tracks every opening through the complete 13-stage ingestion lifecycle:
 *   1. SOURCE (Authoritative source enumerated)
 *   2. DISCOVERY (Endpoint / feed discovered)
 *   3. FETCH (HTTP request successful, non-429/5xx)
 *   4. PARSE (Structured payload decoded)
 *   5. NORMALIZE (Fields mapped to canonical schema)
 *   6. DEDUP (URL and cross-source deduplication)
 *   7. PH_ELIGIBILITY (geoGate evaluation)
 *   8. POLICY (Compliance, opt-outs, and registry policies)
 *   9. ROLE_GATES (Physical/logistics exclusion & tech title preservation)
 *  10. TRIAGE (AI / fast-path triage decision)
 *  11. SCORING (Confidence & freshness window evaluation)
 *  12. QUALIFICATION (Lake admission & publication readiness)
 *  13. PUBLICATION (D1 mart insert / update)
 *
 * Provides granular visibility into:
 *   Expected openings -> Discovered -> Accepted -> Published
 * eliminating silent false negatives.
 */

export const PIPELINE_STAGES = [
  "source",
  "discovery",
  "fetch",
  "parse",
  "normalize",
  "dedup",
  "ph_eligibility",
  "policy",
  "role_gates",
  "triage",
  "scoring",
  "qualification",
  "publication",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface PipelineLossItem {
  id: string;
  sourceId: string;
  company?: string | null;
  title?: string | null;
  droppedAtStage: PipelineStage;
  reasonCode: string;
  reasonDetail: string;
  timestamp: string;
}

export interface StageCounter {
  entered: number;
  passed: number;
  dropped: number;
  reasons: Record<string, number>;
}

export interface EmployerReconciliationRecord {
  employerId: string;
  companyName: string;
  authoritativeOpenings: number;
  discovered: number;
  accepted: number;
  published: number;
  recallRate: number; // published / authoritativeOpenings (0..1)
  dropoffsByStage: Record<PipelineStage, number>;
  losses: PipelineLossItem[];
  status: "HEALTHY" | "COVERAGE_DEFECT" | "CONSTITUTIONAL_ZERO";
}

export class PipelineLossTracker {
  private stageCounters: Map<PipelineStage, StageCounter> = new Map();
  private losses: PipelineLossItem[] = [];

  constructor() {
    for (const stage of PIPELINE_STAGES) {
      this.stageCounters.set(stage, {
        entered: 0,
        passed: 0,
        dropped: 0,
        reasons: {},
      });
    }
  }

  /**
   * Records an item successfully entering and passing a pipeline stage.
   */
  public recordPass(stage: PipelineStage, count = 1): void {
    const counter = this.stageCounters.get(stage);
    if (counter) {
      counter.entered += count;
      counter.passed += count;
    }
  }

  /**
   * Records an item dropped at a specific stage with a categorized reason.
   */
  public recordLoss(stage: PipelineStage, item: {
    id: string;
    sourceId: string;
    company?: string | null;
    title?: string | null;
    reasonCode: string;
    reasonDetail: string;
    timestamp?: string;
  }): void {
    const counter = this.stageCounters.get(stage);
    if (counter) {
      counter.entered += 1;
      counter.dropped += 1;
      counter.reasons[item.reasonCode] = (counter.reasons[item.reasonCode] || 0) + 1;
    }
    this.losses.push({
      ...item,
      droppedAtStage: stage,
      timestamp: item.timestamp ?? new Date().toISOString(),
    });
  }

  /**
   * Returns snapshot of counters across all 13 stages.
   */
  public getStageSummary(): Record<PipelineStage, StageCounter> {
    const summary = {} as Record<PipelineStage, StageCounter>;
    for (const stage of PIPELINE_STAGES) {
      summary[stage] = { ...(this.stageCounters.get(stage)!) };
    }
    return summary;
  }

  /**
   * Returns all recorded individual losses.
   */
  public getLosses(): readonly PipelineLossItem[] {
    return this.losses;
  }

  /**
   * Reconciles a specific employer's flow through the pipeline.
   */
  public reconcileEmployer(
    employerId: string,
    companyName: string,
    authoritativeOpenings: number,
    isConstitutionalZero = false,
  ): EmployerReconciliationRecord {
    const employerLosses = this.losses.filter(
      (l) => l.sourceId.includes(employerId) || (l.company && l.company.toLowerCase().includes(companyName.toLowerCase())),
    );

    const dropoffsByStage = {} as Record<PipelineStage, number>;
    for (const stage of PIPELINE_STAGES) {
      dropoffsByStage[stage] = employerLosses.filter((l) => l.droppedAtStage === stage).length;
    }

    const totalDropped = employerLosses.length;
    const published = isConstitutionalZero ? 0 : Math.max(0, authoritativeOpenings - totalDropped);
    const discovered = Math.max(0, authoritativeOpenings - (dropoffsByStage.source + dropoffsByStage.discovery + dropoffsByStage.fetch));
    const accepted = Math.max(0, discovered - (dropoffsByStage.parse + dropoffsByStage.normalize + dropoffsByStage.dedup + dropoffsByStage.ph_eligibility + dropoffsByStage.policy + dropoffsByStage.role_gates));

    let status: "HEALTHY" | "COVERAGE_DEFECT" | "CONSTITUTIONAL_ZERO";
    if (isConstitutionalZero) {
      status = "CONSTITUTIONAL_ZERO";
    } else if (authoritativeOpenings > 0 && published === 0) {
      status = "COVERAGE_DEFECT";
    } else if (published / Math.max(1, authoritativeOpenings) < 0.5) {
      status = "COVERAGE_DEFECT";
    } else {
      status = "HEALTHY";
    }

    return {
      employerId,
      companyName,
      authoritativeOpenings,
      discovered,
      accepted,
      published,
      recallRate: authoritativeOpenings > 0 ? published / authoritativeOpenings : 1,
      dropoffsByStage,
      losses: employerLosses,
      status,
    };
  }
}
