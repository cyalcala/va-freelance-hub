import { expect, test } from "bun:test";
import { fetchPrimaryEvidence } from "../src/lib/primary-evidence";

test("captures actual UTF-8 primary content with bounded request options", async () => {
  const mock = (async (_url, options) => {
    expect(options?.redirect).toBe("manual");
    expect(options?.signal).toBeDefined();
    return new Response("Primary documentation: café");
  }) as typeof fetch;
  expect(await fetchPrimaryEvidence("https://example.com/docs", mock)).toBe("Primary documentation: café");
});

test("rejects unsuccessful, empty, and oversized primary evidence", async () => {
  for (const response of [new Response("blocked", { status: 403 }), new Response("  "), new Response("x".repeat(2 * 1024 * 1024 + 1))]) {
    await expect(fetchPrimaryEvidence("https://example.com/docs", (async () => response) as unknown as typeof fetch)).rejects.toThrow();
  }
});

test("rejects redirects without fetching the destination", async () => {
  let calls = 0;
  const mock = (async () => {
    calls++;
    return new Response(null, { status: 302, headers: { Location: "https://elsewhere.example/docs" } });
  }) as typeof fetch;
  await expect(fetchPrimaryEvidence("https://example.com/docs", mock)).rejects.toThrow("HTTP 302");
  expect(calls).toBe(1);
});

