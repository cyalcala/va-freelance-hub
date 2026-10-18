/**
 * In-memory pipeline observation helper. No production caller is wired here.
 *
 * Callers may record aggregate counters and individual losses at these stages:
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
 * Missing observations remain unknown. A declared opening count and absence
 * of recorded losses cannot prove discovery, acceptance, or publication.
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
  discovered: number | null;
  accepted: number | null;
  /** Distinct explicitly observed publications, not a complete cohort total. */
  published: number | null;
  /** Unknown until publications and expected openings share a complete named cohort. */
  recallRate: number | null;
  dropoffsByStage: Record<PipelineStage, number>;
  losses: PipelineLossItem[];
  status: "UNKNOWN" | "COVERAGE_DEFECT";
}

export class PipelineLossTracker {
  private stageCounters: Map<PipelineStage, StageCounter> = new Map();
  private losses: PipelineLossItem[] = [];
  private publications: Map<string, { id: string; sourceId: string }> = new Map();

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
   * Records aggregate stage activity, without employer or vacancy attribution.
   */
  public recordPass(stage: PipelineStage, count = 1): void {
    const counter = this.stageCounters.get(stage);
    if (counter) {
      counter.entered += count;
      counter.passed += count;
    }
  }

  /** Records a publication observation by exact source and vacancy identity.
   * Call only from a confirmed publication receipt; retries do not add jobs. */
  public recordPublication(item: { id: string; sourceId: string }): void {
    if (!item.id.trim() || !item.sourceId.trim()) throw new Error("publication observation requires source and vacancy identities");
    const key = JSON.stringify([item.sourceId, item.id]);
    if (this.publications.has(key)) return;
    this.publications.set(key, { id: item.id, sourceId: item.sourceId });
    this.recordPass("publication");
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
   * Summarizes one exact canonical source identity. Company display names and
   * token substrings cannot attribute observations. This helper has no complete
   * cohort membership or employer-scoped stage successes, so it cannot certify
   * HEALTHY, constitutional zero, or an end-to-end funnel.
   */
  public reconcileEmployer(
    employerId: string,
    companyName: string,
    authoritativeOpenings: number,
    isConstitutionalZero = false,
  ): EmployerReconciliationRecord {
    const employerLosses = this.losses.filter(
      (l) => l.sourceId === employerId,
    );

    const dropoffsByStage = {} as Record<PipelineStage, number>;
    for (const stage of PIPELINE_STAGES) {
      dropoffsByStage[stage] = employerLosses.filter((l) => l.droppedAtStage === stage).length;
    }

    const observations = [...this.publications.values()].filter(item => item.sourceId === employerId);
    const published = observations.length > 0 ? observations.length : null;
    // A zero expectation cannot erase a real publication. Without complete
    // cohort observations all other health/zero claims remain unproven.
    const status = isConstitutionalZero && published !== null ? "COVERAGE_DEFECT" : "UNKNOWN";

    return {
      employerId,
      companyName,
      authoritativeOpenings,
      discovered: null,
      accepted: null,
      published,
      recallRate: null,
      dropoffsByStage,
      losses: employerLosses,
      status,
    };
  }
}
