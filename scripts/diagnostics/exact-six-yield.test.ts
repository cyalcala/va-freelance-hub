import { describe, expect, test } from "bun:test";
import { classifyExactSixYield, EXACT_SIX_SOURCE_IDS } from "./exact-six-yield";

const PER_SOURCE = [
  { source_id: null, eligible_active: 719, first_storage_1d: 0, first_storage_7d: 0 },
  { source_id: "jobicy-supporting-apac", eligible_active: 7, first_storage_1d: 1, first_storage_7d: 7 },
  { source_id: "real-work-from-anywhere", eligible_active: 34, first_storage_1d: 0, first_storage_7d: 27 },
  { source_id: "remote-ok", eligible_active: 8, first_storage_1d: 1, first_storage_7d: 7 },
  { source_id: "we-work-remotely", eligible_active: 57, first_storage_1d: 5, first_storage_7d: 53 },
];

const OUTCOMES = [
  { source_id: "jobicy-supporting-apac", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 1 },
  { source_id: "jobicy-supporting-apac", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 6 },
  { source_id: "jobicy-supporting-apac", is_active: 1, ph_eligibility: "eligible_verified", inactive_reason: null, row_count: 1 },
  { source_id: "real-work-from-anywhere", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 1 },
  { source_id: "real-work-from-anywhere", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 2 },
  { source_id: "real-work-from-anywhere", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 26 },
  { source_id: "real-work-from-anywhere", is_active: 1, ph_eligibility: "eligible_verified", inactive_reason: null, row_count: 1 },
  { source_id: "remote-ok", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 17 },
  { source_id: "remote-ok", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 8 },
  { source_id: "remote-ok", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 7 },
  { source_id: "remotive", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 7 },
  { source_id: "we-work-remotely", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 8 },
  { source_id: "we-work-remotely", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 1 },
  { source_id: "we-work-remotely", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 53 },
];

describe("classifyExactSixYield", () => {
  test("names all six identities even when a source is absent from supply JSON", () => {
    const report = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES });
    expect(report.sources.map((s) => s.sourceId).sort()).toEqual([...EXACT_SIX_SOURCE_IDS].sort());
  });

  test("classifies Remotive as fetching-but-ineligible, not a silent fetch failure", () => {
    const remotive = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "remotive")!;
    expect(remotive.class).toBe("fetching_but_ineligible");
    expect(remotive.eligibleFirstStorage7d).toBe(0);
    expect(remotive.rejected7d).toBe(7);
    expect(remotive.repairable).toBe(false);
  });

  test("classifies Jobicy admin as silent zero storage", () => {
    const admin = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "jobicy-admin-support-apac")!;
    expect(admin.class).toBe("silent_zero_storage");
    expect(admin.repairable).toBe(true);
  });

  test("does not treat Remote OK rejects as a geo-gate bug", () => {
    const remoteOk = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "remote-ok")!;
    expect(remoteOk.class).toBe("eligible_with_high_reject");
    expect(remoteOk.repairable).toBe(false);
  });

  test("classifies RWFA as quiet 24h when 7d inflow exists", () => {
    const rwfa = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "real-work-from-anywhere")!;
    expect(rwfa.class).toBe("eligible_quiet_24h");
    expect(rwfa.repairable).toBe(false);
  });
});

/**
 * Characterization of an OPEN measurement defect, measured 2026-10-04 on live D1.
 *
 * `classifyExactSixYield` counts a rejection from `is_active` and `inactive_reason`
 * alone and never reads `ph_eligibility`, even though `FirstStorageOutcomeRow` carries
 * it. Live D1 holds rows where the two disagree: 33 rows across `greenhouse:gitlab`
 * (12 `eligible_likely`, 3 `eligible_verified` with `geo_scope = 'apac_incl_ph'`) and
 * `greenhouse:grafanalabs` (18 `eligible_likely`) sit at `is_active = 0` with
 * `inactive_reason = 'policy-rejected'`, all with `failed_verification_count = 0` and
 * `geo_checked_at` in Jul–Sep 2026. No current writer produces that combination —
 * `scrape.ts:2588-2610` (geo gate) and `:1319-1345` (AI re-triage) always write
 * `ineligible` or `unclear` alongside it, and `verify-links.ts:170` writes
 * `ineligible`. Migration `0047` lines 35-43 and 86-91 write `policy-rejected` *without*
 * touching `ph_eligibility`, which is how those rows got an eligible verdict and an
 * inactive row at the same time.
 *
 * The consequence is that an admission-state hold and a genuine PH ineligibility are
 * one indistinguishable bucket here, so a source whose eligible supply was suppressed
 * rather than denied is reported as `fetching_but_ineligible` and `repairable: false` —
 * telling the operator not to look for a fix. These two tests pin that behaviour so the
 * first change to discriminate on `ph_eligibility` fails loudly.
 */
describe("classifyExactSixYield rejection-cause blindness (OPEN defect)", () => {
  const NO_INFLOW = [
    { source_id: "remotive", eligible_active: 0, first_storage_1d: 0, first_storage_7d: 0 },
  ];

  test("an eligible_verified admission hold is counted as a rejection and reported not repairable", () => {
    const report = classifyExactSixYield({
      perSourceSupply: NO_INFLOW,
      firstStorageOutcomes7d: [
        {
          source_id: "remotive",
          is_active: 0,
          ph_eligibility: "eligible_verified",
          inactive_reason: "policy-rejected",
          row_count: 3,
        },
      ],
    });
    const remotive = report.sources.find((s) => s.sourceId === "remotive")!;
    expect(remotive.rejected7d).toBe(3);
    expect(remotive.class).toBe("fetching_but_ineligible");
    expect(remotive.repairable).toBe(false);
  });

  test("a country-locked ineligible cohort and an eligible admission hold produce an identical diagnosis", () => {
    const diagnose = (phEligibility: string) =>
      classifyExactSixYield({
        perSourceSupply: NO_INFLOW,
        firstStorageOutcomes7d: [
          {
            source_id: "remotive",
            is_active: 0,
            ph_eligibility: phEligibility,
            inactive_reason: "policy-rejected",
            row_count: 3,
          },
        ],
      });
    expect(diagnose("eligible_verified")).toEqual(diagnose("ineligible"));
  });
});
