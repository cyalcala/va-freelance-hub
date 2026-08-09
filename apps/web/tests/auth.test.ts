import { expect, test } from "bun:test";
import { isAuthorized } from "../src/lib/auth";

test("protected routes share the same bearer and cron-secret contract", () => {
  expect(isAuthorized(new Request("https://app.test", { headers: { Authorization: "Bearer expected" } }), "expected")).toBeTrue();
  expect(isAuthorized(new Request("https://app.test", { headers: { "x-cron-secret": "expected" } }), "expected")).toBeTrue();
  expect(isAuthorized(new Request("https://app.test", { headers: { Authorization: "Bearer wrong" } }), "expected")).toBeFalse();
  expect(isAuthorized(new Request("https://app.test"), "expected")).toBeFalse();
  expect(isAuthorized(new Request("https://app.test", { headers: { Authorization: "Bearer expected" } }), undefined)).toBeFalse();
});
