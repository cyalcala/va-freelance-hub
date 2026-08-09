import { expect, test } from "bun:test";
import { sanitizeSourceUrl } from "./urls";

test("accepts normalized public http and https source URLs", () => {
  expect(sanitizeSourceUrl(" https://jobs.example.com/openings?id=42 "))
    .toBe("https://jobs.example.com/openings?id=42");
  expect(sanitizeSourceUrl("http://example.com/job")).toBe("http://example.com/job");
});

test("rejects non-web, credential-bearing, and local source URLs", () => {
  expect(sanitizeSourceUrl("javascript:alert(1)")).toBeNull();
  expect(sanitizeSourceUrl("data:text/html,boom")).toBeNull();
  expect(sanitizeSourceUrl("https://user:pass@example.com/job")).toBeNull();
  expect(sanitizeSourceUrl("https://localhost/job")).toBeNull();
  expect(sanitizeSourceUrl("https://127.0.0.1/job")).toBeNull();
});
