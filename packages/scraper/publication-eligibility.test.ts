import { describe, expect, test } from "bun:test";
import { PUBLIC_PH_ELIGIBILITIES, isPublicPhEligibility } from "./publication-eligibility";

describe("accepted public PH eligibility", () => {
  for (const value of ["eligible_verified", "eligible_likely"]) {
    test(`accepts the existing public state ${value}`, () => {
      expect(isPublicPhEligibility(value)).toBe(true);
    });
  }

  for (const [label, value] of [
    ["unclear", "unclear"], ["ineligible", "ineligible"], ["NULL", null],
    ["missing", undefined], ["unknown", "unknown"], ["empty", ""],
    ["uppercase", "ELIGIBLE_VERIFIED"], ["whitespace", "eligible_likely "],
    ["boolean", true], ["number", 1], ["array", ["eligible_verified"]],
    ["boxed string", new String("eligible_verified")],
  ] as const) {
    test(`keeps ${label} outside public eligibility without inference`, () => {
      expect(isPublicPhEligibility(value)).toBe(false);
    });
  }

  test("callers cannot mutate the shared accepted states to admit unclear", () => {
    expect(Reflect.set(PUBLIC_PH_ELIGIBILITIES, 1, "unclear")).toBe(false);
    expect(PUBLIC_PH_ELIGIBILITIES).toEqual(["eligible_verified", "eligible_likely"]);
    expect(isPublicPhEligibility("unclear")).toBe(false);
  });
});
