import { describe, expect, test } from "bun:test";
import { PIPELINE_STAGES, PipelineLossTracker } from "./pipelineLossTracker";

describe("13-Stage Pipeline Loss Tracking & Systematic Reconciliation (Milestone M3)", () => {
  test("an empty tracker cannot invent twenty published openings or a healthy funnel", () => {
    const rec = new PipelineLossTracker().reconcileEmployer("workable:hunt-st", "Hunt St", 20);
    expect(rec.discovered).toBeNull();
    expect(rec.accepted).toBeNull();
    expect(rec.published).toBeNull();
    expect(rec.recallRate).toBeNull();
    expect(rec.status).toBe("UNKNOWN");
  });

  test("aggregate stage passes cannot be attributed to one employer", () => {
    const tracker = new PipelineLossTracker();
    tracker.recordPass("publication", 20);
    const rec = tracker.reconcileEmployer("workable:hunt-st", "Hunt St", 20);
    expect(rec.published).toBeNull();
    expect(rec.status).toBe("UNKNOWN");
  });

  test("known rejections do not prove publication zero or a complete cohort", () => {
    const tracker = new PipelineLossTracker();
    for (let index = 0; index < 20; index++) {
      tracker.recordLoss("ph_eligibility", { id: "same-retried-opening", sourceId: "workable:hunt-st",
        reasonCode: "COUNTRY_LOCKED", reasonDetail: "Repeated rejection observation" });
    }
    const rec = tracker.reconcileEmployer("workable:hunt-st", "Hunt St", 20, true);
    expect(rec.dropoffsByStage.ph_eligibility).toBe(20);
    expect(rec.published).toBeNull();
    expect(rec.status).toBe("UNKNOWN");
  });

  test("counts only explicit distinct publication receipts for the exact source", () => {
    const tracker = new PipelineLossTracker();
    tracker.recordPublication({ id: "receipt-1", sourceId: "workable:hunt-st" });
    tracker.recordPublication({ id: "receipt-1", sourceId: "workable:hunt-st" });
    tracker.recordPublication({ id: "receipt-2", sourceId: "lever:hunt-st" });
    tracker.recordLoss("publication", { id: "unrelated", sourceId: "workable:hunt-st-other",
      company: "Hunt St", reasonCode: "WRITE_FAILED", reasonDetail: "Another tenant" });
    const rec = tracker.reconcileEmployer("workable:hunt-st", "Hunt St", 20);
    expect(rec.published).toBe(1);
    expect(rec.recallRate).toBeNull();
    expect(rec.discovered).toBeNull();
    expect(rec.accepted).toBeNull();
    expect(rec.losses).toHaveLength(0);
    expect(rec.status).toBe("UNKNOWN");
    expect(tracker.getStageSummary().publication.passed).toBe(2);
  });

  test("a claimed constitutional zero cannot erase a recorded publication", () => {
    const tracker = new PipelineLossTracker();
    tracker.recordPublication({ id: "receipt-1", sourceId: "workable:pineapple-staffing" });
    const rec = tracker.reconcileEmployer("workable:pineapple-staffing", "Pineapple Staffing", 3, true);
    expect(rec.published).toBe(1);
    expect(rec.status).toBe("COVERAGE_DEFECT");
  });

  test("zero or inconsistent declared counts cannot manufacture a recall ratio", () => {
    const tracker = new PipelineLossTracker();
    tracker.recordPublication({ id: "receipt-1", sourceId: "workable:hunt-st" });
    expect(tracker.reconcileEmployer("workable:hunt-st", "Hunt St", 0).recallRate).toBeNull();
    expect(tracker.reconcileEmployer("workable:hunt-st", "Hunt St", Number.NaN).recallRate).toBeNull();
  });

  test("initializes all 13 canonical stages", () => {
    expect(PIPELINE_STAGES.length).toBe(13);
    expect(PIPELINE_STAGES).toEqual([
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
    ]);

    const tracker = new PipelineLossTracker();
    const summary = tracker.getStageSummary();
    for (const stage of PIPELINE_STAGES) {
      expect(summary[stage].entered).toBe(0);
      expect(summary[stage].passed).toBe(0);
      expect(summary[stage].dropped).toBe(0);
    }
  });

  test("tracks successful passes through pipeline stages", () => {
    const tracker = new PipelineLossTracker();
    tracker.recordPass("source", 100);
    tracker.recordPass("discovery", 100);
    tracker.recordPass("fetch", 95);

    const summary = tracker.getStageSummary();
    expect(summary.source.entered).toBe(100);
    expect(summary.source.passed).toBe(100);
    expect(summary.fetch.passed).toBe(95);
  });

  test("records granular losses with reason codes and stage attribution", () => {
    const tracker = new PipelineLossTracker();

    // Stale date dropped at scoring
    tracker.recordLoss("scoring", {
      id: "job-stale-1",
      sourceId: "workable:hunt-st",
      company: "Hunt St",
      title: "Marketing Coordinator",
      reasonCode: "STALE_POSTING_DATE",
      reasonDetail: "Posted 65 days ago, exceeds 30d freshness window",
    });

    // Country lock dropped at ph_eligibility
    tracker.recordLoss("ph_eligibility", {
      id: "job-locked-1",
      sourceId: "workable:hunt-st",
      company: "Hunt St",
      title: "Sales Lead (London)",
      reasonCode: "COUNTRY_LOCKED",
      reasonDetail: "Location pinned to United Kingdom",
    });

    // Physical delivery dropped at role_gates
    tracker.recordLoss("role_gates", {
      id: "job-driver-1",
      sourceId: "rss:general",
      company: "Courier Co",
      title: "Parcel Delivery Driver",
      reasonCode: "PHYSICAL_LOGISTICS_EXCLUSION",
      reasonDetail: "Matches physical driver exclusion pattern",
    });

    const summary = tracker.getStageSummary();
    expect(summary.scoring.dropped).toBe(1);
    expect(summary.scoring.reasons["STALE_POSTING_DATE"]).toBe(1);
    expect(summary.ph_eligibility.dropped).toBe(1);
    expect(summary.ph_eligibility.reasons["COUNTRY_LOCKED"]).toBe(1);
    expect(summary.role_gates.dropped).toBe(1);
    expect(summary.role_gates.reasons["PHYSICAL_LOGISTICS_EXCLUSION"]).toBe(1);

    expect(tracker.getLosses().length).toBe(3);
  });

  describe("Systematic Employer Reconciliation", () => {
    test("reports observed Hunt St publications without inventing missing stage coverage", () => {
      const tracker = new PipelineLossTracker();

      // Record 56 stale openings dropped at scoring
      for (let i = 0; i < 56; i++) {
        tracker.recordLoss("scoring", {
          id: `hunt-stale-${i}`,
          sourceId: "workable:hunt-st",
          company: "Hunt St",
          title: `Stale Job ${i}`,
          reasonCode: "STALE_POSTING_DATE",
          reasonDetail: "Exceeds 30d window",
        });
      }

      for (let i = 0; i < 79; i++) {
        tracker.recordPublication({ id: `hunt-published-${i}`, sourceId: "workable:hunt-st" });
      }
      const rec = tracker.reconcileEmployer("workable:hunt-st", "Hunt St", 135, false);
      expect(rec.authoritativeOpenings).toBe(135);
      expect(rec.discovered).toBeNull();
      expect(rec.accepted).toBeNull();
      expect(rec.published).toBe(79);
      expect(rec.dropoffsByStage.scoring).toBe(56);
      expect(rec.dropoffsByStage.ph_eligibility).toBe(0);
      expect(rec.status).toBe("UNKNOWN");
      expect(rec.recallRate).toBeNull();
    });

    test("Pineapple rejection observations cannot certify zero publication", () => {
      const tracker = new PipelineLossTracker();

      // Pineapple has 3 US-pinned / stale roles
      for (let i = 0; i < 3; i++) {
        tracker.recordLoss("ph_eligibility", {
          id: `pineapple-${i}`,
          sourceId: "workable:pineapple-staffing",
          company: "Pineapple Staffing",
          title: `US VA Role ${i}`,
          reasonCode: "COUNTRY_LOCKED_US",
          reasonDetail: "Location pinned to United States",
        });
      }

      const rec = tracker.reconcileEmployer("workable:pineapple-staffing", "Pineapple Staffing", 3, true);
      expect(rec.authoritativeOpenings).toBe(3);
      expect(rec.published).toBeNull();
      expect(rec.recallRate).toBeNull();
      expect(rec.status).toBe("UNKNOWN");
      expect(rec.dropoffsByStage.ph_eligibility).toBe(3);
    });

    test("Affordable Staff onsite rejection leaves publication unobserved", () => {
      const tracker = new PipelineLossTracker();

      tracker.recordLoss("ph_eligibility", {
        id: "afford-1",
        sourceId: "direct:affordable-staff",
        company: "Affordable Staff",
        title: "Bacolod Office Assistant",
        reasonCode: "NOT_FULLY_REMOTE_ONSITE",
        reasonDetail: "Onsite Bacolod office requirement",
      });

      const rec = tracker.reconcileEmployer("direct:affordable-staff", "Affordable Staff", 1, true);
      expect(rec.published).toBeNull();
      expect(rec.status).toBe("UNKNOWN");
    });

    test("an unobserved cohort stays UNKNOWN and a measured empty set with expected openings alarms", () => {
      const unobserved = new PipelineLossTracker();
      const missing = unobserved.reconcileEmployer("workable:hunt-st", "Hunt St", 20, false, 16);
      expect(missing.published).toBeNull();
      expect(missing.recallRate).toBeNull();
      expect(missing.status).toBe("UNKNOWN");

      const observed = new PipelineLossTracker();
      observed.recordObservedPublications("workable:hunt-st", []);
      const alarm = observed.reconcileEmployer("workable:hunt-st", "Hunt St", 20, false, 16);
      expect(alarm.published).toBe(0);
      expect(alarm.recallRate).toBeNull();
      expect(alarm.status).toBe("ZERO_PUBLICATION");

      observed.recordPublication({ id: "receipt-1", sourceId: "workable:hunt-st" });
      const recovered = observed.reconcileEmployer("workable:hunt-st", "Hunt St", 20, false, 16);
      expect(recovered.published).toBe(1);
      expect(recovered.status).toBe("UNKNOWN");
    });

    test("policy losses expose their reasons without assuming publication completeness", () => {
      const tracker = new PipelineLossTracker();

      // 20 openings lost unexpectedly at intake or policy
      for (let i = 0; i < 20; i++) {
        tracker.recordLoss("policy", {
          id: `defect-${i}`,
          sourceId: "workable:defect-agency",
          company: "Defect Agency",
          title: `Role ${i}`,
          reasonCode: "UNREVIEWED_PAUSED",
          reasonDetail: "Agency token paused pending review",
        });
      }

      const rec = tracker.reconcileEmployer("workable:defect-agency", "Defect Agency", 20, false);
      expect(rec.authoritativeOpenings).toBe(20);
      expect(rec.published).toBeNull();
      expect(rec.recallRate).toBeNull();
      expect(rec.status).toBe("UNKNOWN");
      expect(rec.dropoffsByStage.policy).toBe(20);
    });
  });
});
