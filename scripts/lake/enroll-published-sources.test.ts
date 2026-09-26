import { expect, test } from "bun:test";
import { enrollPublishedSources, interpretEnrollStatus } from "./enroll-published-sources";

test("classifies gateway responses", () => {
  expect(interpretEnrollStatus(200, "{\"outcome\":\"shadow\"}")).toBe("enrolled");
  expect(interpretEnrollStatus(409, "{\"outcome\":\"rejected\"}")).toBe("waiting");
  expect(interpretEnrollStatus(404, "{\"error\":\"not found\"}")).toBe("waiting");
  expect(interpretEnrollStatus(400, "source is not on the admission allowlist")).toBe("skipped");
  expect(interpretEnrollStatus(500, "boom")).toBe("failed");
});

test("asks for shadow admission and then canary promotion", async () => {
  const calls: Array<Record<string, string>> = [];
  const results = await enrollPublishedSources({
    admitUrl: "https://example.test/admit",
    promoteUrl: "https://example.test/promote",
    secret: "test-secret",
    sourceIds: ["greenhouse:canonical"],
    fetchImpl: async (url, _secret, body) => {
      calls.push({ url, ...body });
      return url.endsWith("/admit")
        ? { status: 200, text: "{\"outcome\":\"shadow\"}" }
        : { status: 409, text: "{\"reason\":\"insufficient shadow days\"}" };
    },
  });
  expect(calls.map((call) => call.url)).toEqual([
    "https://example.test/admit",
    "https://example.test/promote",
  ]);
  expect(calls[1]?.to).toBe("canary");
  expect(results.map((result) => result.disposition)).toEqual(["enrolled", "waiting"]);
});
