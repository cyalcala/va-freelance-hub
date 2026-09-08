import { expect, test } from "bun:test";
import { fetchPrimaryEvidence } from "./primary-evidence";

test("captures the original document with Workers-compatible redirect handling", async () => {
  const mock = (async (_url: unknown, init?: RequestInit) => {
    expect(init?.redirect).toBe("manual");
    return new Response("Official public API documentation");
  }) as typeof fetch;
  expect(await fetchPrimaryEvidence("https://example.com/docs", mock)).toBe("Official public API documentation");
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
