import { describe, expect, test } from "bun:test";

import {
  admittedButHeldQualifications,
  admissionVerdictFor,
  classifyCohort,
  effectiveFloorRate,
  floorUnreachableForExactRate,
  heldCohortWithVerdict,
  minQualifiedForWilsonFloor,
  phRateOf,
  publicationVerdictFor,
  qualifiedRange,
  statisticMismatchReceipt,
} from "./admission-publication-gap";
import { PUBLISH_PH_RATE_FLOOR, wilsonLowerBound } from "./auto-publish-policy";

/**
 * INCIDENT-0410 characterisation.
 *
 * Every expectation below is produced by the two REAL gates
 * (`mergeAdmissionDecision` in `domain-ats-discovery.ts` and `decideAutoPublish`
 * in `auto-publish-policy.ts`). No threshold is asserted against a copy of itself.
 *
 * The `HELD_*` pairs are dated measurements of real lake cohorts
 * (`lake_ats_discovery.qualified_ready / job_count`, read 2026-10-04) used as
 * INPUTS to the real functions. They are not live expectations about production:
 * a test here fails only if the two gate functions change, not if the lake moves.
 */
const HELD_COHORTS: Array<[sourceId: string, qualified: number, total: number]> = [
  ["lever:hso", 1, 5],
  ["lever:sofarsounds", 2, 10],
  ["lever:90seconds", 2, 7],
  ["lever:repurposeglobal", 3, 7],
  ["ashby:circulareconomysystems", 3, 8],
  ["lever:aethoshotels", 4, 17],
  ["lever:loadsmart", 4, 17],
  ["lever:lwolf", 4, 18],
  ["workable:hello-rache", 1, 3],
  ["lever:decilegroup", 5, 16],
  ["lever:deliverect", 10, 38],
  ["lever:brafton", 5, 24],
];

describe("phRateOf — the point estimate both literals share", () => {
  test("is null without a denominator instead of NaN", () => {
    expect(phRateOf({ qualifiedReady: 4, totalJobs: 0 })).toBeNull();
  });

  test("is the plain ratio", () => {
    expect(phRateOf({ qualifiedReady: 13, totalJobs: 17 })).toBeCloseTo(13 / 17, 12);
  });

  test("floors and clamps so a hostile counter cannot widen a cohort", () => {
    expect(phRateOf({ qualifiedReady: 13.9, totalJobs: 17 })).toBeCloseTo(13 / 17, 12);
    expect(phRateOf({ qualifiedReady: -5, totalJobs: 17 })).toBe(0);
  });
});

describe("admissionVerdictFor — the lake side with no Jev verdict", () => {
  test("admits a held cohort on the point estimate alone", () => {
    const decision = admissionVerdictFor({ qualifiedReady: 1, totalJobs: 5 });
    expect(decision.verdict).toBe("ADMIT");
    expect(decision.jevRaw).toBeUndefined();
  });

  test("admits the Wilson-clearing cohort as well", () => {
    expect(admissionVerdictFor({ qualifiedReady: 13, totalJobs: 17 }).verdict).toBe("ADMIT");
  });

  test("refuses a sub-floor rate deterministically", () => {
    expect(admissionVerdictFor({ qualifiedReady: 1, totalJobs: 100 }).verdict).toBe("REJECT");
  });

  test("parks a below-threshold rate in shadow rather than rejecting it", () => {
    expect(admissionVerdictFor({ qualifiedReady: 2, totalJobs: 20 }).verdict).toBe("SHADOW");
  });
});

describe("publicationVerdictFor — the D1 side", () => {
  test("publishes when the Wilson lower bound clears the floor", () => {
    const result = publicationVerdictFor({ qualifiedReady: 13, totalJobs: 17 });
    expect(result.action).toBe("PUBLISH");
    expect(result.wilsonLower).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);
  });

  test("holds the same-shaped cohort that admission approved", () => {
    const result = publicationVerdictFor({ qualifiedReady: 1, totalJobs: 5 });
    expect(result.action).toBe("HOLD");
    expect(result.reason).toContain("ambiguous");
  });

  test("holds a small sample before scoring any rate", () => {
    expect(publicationVerdictFor({ qualifiedReady: 1, totalJobs: 2 }).reason).toContain("too small");
  });

  test("rejects below the reject floor", () => {
    expect(publicationVerdictFor({ qualifiedReady: 1, totalJobs: 100 }).action).toBe("REJECT");
  });
});

describe("classifyCohort — the disagreement INCIDENT-0410 needs visible", () => {
  test("every measured held cohort is admitted and held at once", () => {
    for (const [sourceId, qualified, total] of HELD_COHORTS) {
      const row = classifyCohort({ qualifiedReady: qualified, totalJobs: total }, { sourceId });
      expect({ sourceId, kind: row.kind }).toEqual({ sourceId, kind: "admitted_but_held" });
      expect(row.admission).toBe("ADMIT");
      expect(row.publication).toBe("HOLD");
      expect(row.relief).toBe("confident_jev_admit_only");
    }
  });

  test("the point estimate is at or above admission while the bound is below the floor", () => {
    for (const [sourceId, qualified, total] of HELD_COHORTS) {
      const row = classifyCohort({ qualifiedReady: qualified, totalJobs: total }, { sourceId });
      expect(row.phRate!).toBeGreaterThanOrEqual(0.2);
      expect(row.wilsonLower!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    }
  });

  test("a Wilson-clearing cohort is aligned and needs no relief", () => {
    const row = classifyCohort({ qualifiedReady: 13, totalJobs: 17 }, { sourceId: "lever:snappr" });
    expect(row.kind).toBe("aligned_publish");
    expect(row.relief).toBe("none");
  });

  test("a rejected cohort is rejected on both sides", () => {
    const row = classifyCohort({ qualifiedReady: 1, totalJobs: 100 });
    expect(row.kind).toBe("aligned_reject");
  });

  test("a shadowed cohort is held without a disagreement", () => {
    const row = classifyCohort({ qualifiedReady: 2, totalJobs: 20 });
    expect(row.kind).toBe("aligned_shadow");
    expect(row.publication).toBe("HOLD");
  });

  test("a sub-minimum sample is a sample floor, not a statistic gap", () => {
    const row = classifyCohort({ qualifiedReady: 2, totalJobs: 2 });
    expect(row.kind).toBe("sample_floor");
  });

  test("an empty cohort produces no NaN anywhere", () => {
    const row = classifyCohort({ qualifiedReady: 0, totalJobs: 0 });
    expect(row.kind).toBe("sample_floor");
    expect(row.phRate).toBeNull();
    expect(row.wilsonLower).toBeNull();
    expect(row.admissionReason).not.toContain("NaN");
    expect(row.publicationReason).not.toContain("NaN");
  });

  test("is deterministic for the same input", () => {
    const sample = { qualifiedReady: 5, totalJobs: 16 };
    expect(classifyCohort(sample)).toEqual(classifyCohort(sample));
  });
});

describe("the Wilson lower bound never reaches its own rate", () => {
  test("is strictly below the point estimate for every non-empty cohort", () => {
    for (let total = 1; total <= 80; total += 1) {
      for (const qualified of qualifiedRange(total)) {
        if (qualified === 0) continue;
        const lower = wilsonLowerBound(qualified, total);
        expect(lower!).toBeLessThan(qualified / total);
      }
    }
  });

  test("makes a true rate exactly at the floor unreachable at any sample size", () => {
    expect(floorUnreachableForExactRate(200)).toBe(true);
  });

  test("finds the first clearing count and not an earlier one", () => {
    for (let total = 3; total <= 60; total += 1) {
      const minimum = minQualifiedForWilsonFloor(total);
      if (minimum === null || minimum === 0) continue;
      expect(wilsonLowerBound(minimum, total)!).toBeGreaterThanOrEqual(PUBLISH_PH_RATE_FLOOR);
      expect(wilsonLowerBound(minimum - 1, total)!).toBeLessThan(PUBLISH_PH_RATE_FLOOR);
    }
  });

  test("demands a true rate strictly above the published floor", () => {
    for (let total = 3; total <= 60; total += 1) {
      const rate = effectiveFloorRate(total);
      if (rate === null) continue;
      expect(rate).toBeGreaterThan(PUBLISH_PH_RATE_FLOOR);
    }
  });
});

describe("admittedButHeldQualifications — the width of the band", () => {
  test("is non-empty for every sample size that can admit anything", () => {
    expect(admittedButHeldQualifications(5).length).toBeGreaterThan(0);
    expect(admittedButHeldQualifications(50).length).toBeGreaterThan(0);
  });

  test("contains exactly the counts whose rate is admitted and whose bound is not", () => {
    for (let total = 3; total <= 40; total += 1) {
      const expected = qualifiedRange(total).filter((qualified) => {
        const admitted = qualified / total >= 0.2;
        const lower = wilsonLowerBound(qualified, total);
        const clears = lower !== null && lower >= PUBLISH_PH_RATE_FLOOR;
        return admitted && !clears;
      });
      expect(admittedButHeldQualifications(total)).toEqual(expected);
    }
  });

  test("never contains the first count that clears the floor", () => {
    for (let total = 3; total <= 40; total += 1) {
      const minimum = minQualifiedForWilsonFloor(total);
      if (minimum === null) continue;
      expect(admittedButHeldQualifications(total)).not.toContain(minimum);
    }
  });
});

describe("heldCohortWithVerdict — relief without lowering a floor", () => {
  const held = { qualifiedReady: 1, totalJobs: 5 };

  test("no recorded verdict stays held", () => {
    expect(heldCohortWithVerdict(held, null).action).toBe("HOLD");
  });

  test("a confident ADMIT at the accepted floor publishes", () => {
    const result = heldCohortWithVerdict(held, { choice: "ADMIT", confidence: 0.7 });
    expect(result.action).toBe("PUBLISH");
    expect(result.reason).toContain("0.7");
  });

  test("an ADMIT one thousandth below the floor stays held", () => {
    expect(heldCohortWithVerdict(held, { choice: "ADMIT", confidence: 0.699 }).action).toBe("HOLD");
  });

  test("a confident SHADOW does not publish", () => {
    expect(heldCohortWithVerdict(held, { choice: "SHADOW", confidence: 0.99 }).action).toBe("HOLD");
  });

  test("a confident REJECT closes the cohort", () => {
    expect(heldCohortWithVerdict(held, { choice: "REJECT", confidence: 0.99 }).action).toBe("REJECT");
  });

  test("Jev cannot veto a cohort the bound already cleared", () => {
    expect(heldCohortWithVerdict({ qualifiedReady: 13, totalJobs: 17 }, { choice: "SHADOW", confidence: 0.99 }).action).toBe(
      "PUBLISH",
    );
  });

  test("the held reason names the missing evidence rather than a score", () => {
    expect(heldCohortWithVerdict(held, null).reason).toContain("Jev");
  });
});

describe("statisticMismatchReceipt — the two thresholds, as applied", () => {
  const receipt = statisticMismatchReceipt();

  test("names the point estimate for admission and the bound for publication", () => {
    expect(receipt.admissionStatistic).toContain("point estimate");
    expect(receipt.publicationStatistic).toContain("Wilson lower bound");
  });

  test("the publication threshold it reports is the one the gate applies", () => {
    for (let total = 3; total <= 60; total += 1) {
      const minimum = minQualifiedForWilsonFloor(total);
      if (minimum === null || minimum === 0) continue;
      expect(wilsonLowerBound(minimum, total)!).toBeGreaterThanOrEqual(receipt.publicationThreshold);
      expect(wilsonLowerBound(minimum - 1, total)!).toBeLessThan(receipt.publicationThreshold);
    }
  });

  test("the admission threshold it reports is the one admission applies", () => {
    const total = 100;
    const atThreshold = qualifiedRange(total).filter((qualified) => admissionVerdictFor({
      qualifiedReady: qualified,
      totalJobs: total,
    }).verdict === "ADMIT");
    expect(atThreshold[0] / total).toBeGreaterThanOrEqual(receipt.admissionThreshold);
    expect((atThreshold[0] - 1) / total).toBeLessThan(receipt.admissionThreshold);
  });

  test("the reject thresholds it reports are the ones both sides apply", () => {
    expect(publicationVerdictFor({ qualifiedReady: 4, totalJobs: 100 }).action).toBe("REJECT");
    expect(admissionVerdictFor({ qualifiedReady: 4, totalJobs: 100 }).verdict).toBe("REJECT");
    expect(publicationVerdictFor({ qualifiedReady: 5, totalJobs: 100 }).action).not.toBe("REJECT");
  });

  test("the confidence floor it reports is the one the relief path enforces", () => {
    expect(heldCohortWithVerdict({ qualifiedReady: 1, totalJobs: 5 }, { choice: "ADMIT", confidence: receipt.jevConfidenceFloor - 0.001 }).action).toBe(
      "HOLD",
    );
    expect(heldCohortWithVerdict({ qualifiedReady: 1, totalJobs: 5 }, { choice: "ADMIT", confidence: receipt.jevConfidenceFloor }).action).toBe(
      "PUBLISH",
    );
  });
});
