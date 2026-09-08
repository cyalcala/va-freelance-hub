import { expect, test } from "bun:test";
import { fetchPrimaryEvidence, canonicalPrimaryContent } from "../src/lib/primary-evidence";

test("captures actual UTF-8 primary content with bounded request options", async () => {
  const mock = (async (_url: unknown, options?: RequestInit) => {
    expect(options?.redirect).toBe("manual");
    expect(options?.signal).toBeDefined();
    return new Response("Primary documentation: café");
  }) as unknown as typeof fetch;
  expect(await fetchPrimaryEvidence("https://example.com/docs", mock)).toBe("Primary documentation: café");
});

test("only the reviewed article CSP nonce is canonicalized; content changes remain significant", () => {
  const url = "https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide";
  const a = "A".repeat(43) + "=";
  const b = "B".repeat(43) + "=";
  const document = (nonce: string, text = "RSS metadata") => `<link nonce="${nonce}"><noscript data-n-css="${nonce}"></noscript><article>${text}</article>`;
  expect(canonicalPrimaryContent(url, document(a))).toBe(canonicalPrimaryContent(url, document(b)));
  expect(canonicalPrimaryContent(url, document(a))).not.toBe(canonicalPrimaryContent(url, document(a, "RSS prohibited")));
  expect(canonicalPrimaryContent("https://example.com", document(a))).toBe(document(a));
  expect(() => canonicalPrimaryContent(url, "missing nonce")).toThrow("schema changed");
  expect(() => canonicalPrimaryContent(url, document(a) + document(b))).toThrow("schema changed");
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
  }) as unknown as typeof fetch;
  await expect(fetchPrimaryEvidence("https://example.com/docs", mock)).rejects.toThrow("HTTP 302");
  expect(calls).toBe(1);
});



