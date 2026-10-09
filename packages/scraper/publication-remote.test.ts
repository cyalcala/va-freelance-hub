import { describe, expect, test } from "bun:test";
import { hasExplicitNonRemoteLocationType } from "./publication-remote";

describe("explicit remote metadata contradiction", () => {
  for (const value of ["onsite", "hybrid"]) {
    test(`${value} is an explicit contradiction`, () => {
      expect(hasExplicitNonRemoteLocationType(value)).toBe(true);
    });
  }
  for (const value of ["remote", null, undefined, "unknown", 7, {}]) {
    test(`${JSON.stringify(value)} is not explicit onsite or hybrid proof`, () => {
      expect(hasExplicitNonRemoteLocationType(value)).toBe(false);
    });
  }
});
