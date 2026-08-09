import { expect, test } from "bun:test";
import { isFeedRecoverableInactiveReason, RECOVERABLE_INACTIVE_REASONS } from "../src/lib/inactive-reason";

test("only transient, system-owned inactive reasons can be reactivated by a feed", () => {
  expect(RECOVERABLE_INACTIVE_REASONS).toEqual(["stale-feed", "link-unavailable"]);
  expect(isFeedRecoverableInactiveReason("stale-feed")).toBeTrue();
  expect(isFeedRecoverableInactiveReason("link-unavailable")).toBeTrue();
  expect(isFeedRecoverableInactiveReason("policy-rejected")).toBeFalse();
  expect(isFeedRecoverableInactiveReason(null)).toBeFalse();
});
