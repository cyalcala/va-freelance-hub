import { describe, expect, test } from "bun:test";
import { sha256Hex } from "@va-hub/scraper";
import { parseLakeStageRequest } from "../src/lib/lake-publication-contract";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    lakeCandidateId: 1,
    lakeFingerprint: "legacy-fingerprint:1",
    title: "Remote technical writer",
    company: null,
    sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
    applicationUrl: null,
    sourcePlatform: "Greenhouse",
    locationType: "unknown" as const,
    locationRaw: null,
    postedAt: null,
    evidenceText: null,
    ...overrides,
  };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    operation: "lake-stage" as const, version: 1 as const, operationId: "lake:stage.1-abc",
    sourceId: "greenhouse:acme", candidates: [candidate()], ...overrides,
  };
}

async function invalid(value: unknown) {
  const result = await parseLakeStageRequest(value);
  expect(result).toMatchObject({ ok: false, code: "INVALID_LAKE_STAGE_REQUEST" });
  if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
}

describe("private lake staging contract", () => {
  test("preserves nulls and explicit unknown without publication defaults or client IDs", async () => {
    const result = await parseLakeStageRequest(body());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toEqual(body());
    expect(result.descriptors).toHaveLength(1);
    expect(Object.keys(result.descriptors[0])).toEqual(["lakeCandidateId", "lakeFingerprint", "sourceUrl", "materialSha256"]);
    expect(result.descriptors[0].materialSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.descriptors[0].materialSha256).toBe(await sha256Hex(JSON.stringify(result.request.candidates[0])));
    expect(JSON.parse(result.candidateDescriptorsJson)).toEqual(result.descriptors);
    expect(result.candidateDescriptorsJson).not.toContain("evidenceText");
    expect(result.candidateDescriptorsJson).not.toContain("Remote technical writer");
    expect(Object.keys(result.request.candidates[0])).not.toContain("id");
    const supplied = candidate({ lakeFingerprint: " opaque legacy token ", company: "", locationRaw: "", evidenceText: " evidence\n " });
    const preserved = await parseLakeStageRequest(body({ candidates: [supplied] }));
    expect(preserved.ok).toBe(true);
    if (preserved.ok) expect(preserved.request.candidates[0]).toMatchObject({
      lakeFingerprint: " opaque legacy token ", company: "", locationRaw: "", evidenceText: " evidence\n ",
    });
  });

  test("strictly rejects extra keys and omitted required nullable keys", async () => {
    for (const value of [null, [], "body", 1, {}, { ...body(), version: "1" }, { ...body(), operation: "publish" }]) await invalid(value);
    for (const key of ["manifestHash", "publishedIds", "isActive", "observedAt", "policy", "canaryMaxNewItemsPerTick"]) {
      await invalid(body({ [key]: "forged" }));
    }
    for (const key of ["id", "sourceId", "phEligibility", "geoScope", "isActive", "scrapedAt", "materialSha256", "description"]) {
      await invalid(body({ candidates: [candidate({ [key]: "forged" })] }));
    }
    for (const key of Object.keys(candidate())) {
      const missing = candidate();
      delete missing[key as keyof typeof missing];
      await invalid(body({ candidates: [missing] }));
    }
    for (const key of Object.keys(body())) {
      const missing = body();
      delete missing[key as keyof typeof missing];
      await invalid(missing);
    }
  });

  test("validates opaque fingerprint, IDs, text bounds, explicit location and types", async () => {
    const atLimits = candidate({ lakeCandidateId: Number.MAX_SAFE_INTEGER, lakeFingerprint: "f".repeat(128),
      title: "t".repeat(300), company: "c".repeat(200), sourcePlatform: "p".repeat(100),
      locationRaw: "l".repeat(500), evidenceText: "e".repeat(2000), locationType: "onsite" });
    expect((await parseLakeStageRequest(body({ candidates: [atLimits] }))).ok).toBe(true);
    for (const overrides of [
      { lakeCandidateId: 0 }, { lakeCandidateId: -1 }, { lakeCandidateId: 1.5 }, { lakeCandidateId: "1" },
      { lakeCandidateId: Number.MAX_SAFE_INTEGER + 1 }, { lakeCandidateId: NaN },
      { lakeFingerprint: "" }, { lakeFingerprint: "   " }, { lakeFingerprint: "f".repeat(129) }, { lakeFingerprint: "legacy\0fingerprint" },
      { title: " " }, { title: "t".repeat(301) }, { title: null },
      { company: "c".repeat(201) }, { company: false }, { sourcePlatform: "" },
      { sourcePlatform: "p".repeat(101) }, { locationRaw: "l".repeat(501) }, { locationRaw: [] },
      { evidenceText: "e".repeat(2001) }, { evidenceText: {} }, { locationType: null }, { locationType: "REMOTE" },
    ]) await invalid(body({ candidates: [candidate(overrides)] }));
    for (const locationType of ["remote", "hybrid", "onsite", "unknown"]) {
      expect((await parseLakeStageRequest(body({ candidates: [candidate({ locationType })] }))).ok).toBe(true);
    }
  });

  test("operation/source identifiers have exact grammar and bounded lengths", async () => {
    expect((await parseLakeStageRequest(body({ operationId: "a".repeat(128), sourceId: "s".repeat(200) }))).ok).toBe(true);
    for (const operationId of ["", " a", "a ", "a/b", "含", "a".repeat(129), null, 123]) await invalid(body({ operationId }));
    for (const sourceId of ["", "unattributed", "GREENHOUSE:acme", "greenhouse:Acme", "a/b", "a ", "s".repeat(201), null]) await invalid(body({ sourceId }));
  });

  test("uses URL sanitizers and errors on invalid provided application links without replacement", async () => {
    for (const sourceUrl of ["javascript:alert(1)", "file:///a", "https://localhost/a", "http://127.0.0.1/a",
      "https://[::1]/a", "https://user:pass@example.test/a", "mailto:jobs@example.test", "https://example.test/" + "x".repeat(2048)]) {
      await invalid(body({ candidates: [candidate({ sourceUrl })] }));
    }
    for (const applicationUrl of ["javascript:alert(1)", "mailto:jobs@example.test", "https://localhost/a",
      "https://user:pass@boards.greenhouse.io/acme/jobs/1", "https://unrelated.test/apply", "", false]) {
      await invalid(body({ candidates: [candidate({ applicationUrl })] }));
    }
    const result = await parseLakeStageRequest(body({ candidates: [candidate({
      title: "  Remote writer  ", sourcePlatform: "  Greenhouse  ",
      sourceUrl: "HTTPS://BOARDS.GREENHOUSE.IO/acme/jobs/1",
      applicationUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs/1",
    })] }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.candidates[0]).toMatchObject({
      title: "Remote writer", sourcePlatform: "Greenhouse", sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
      applicationUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs/1",
    });
  });

  test("bounds source and application URLs after Unicode percent encoding", async () => {
    const prefix = "https://example.com/";
    const expanded = prefix + "漢".repeat(230);
    expect(expanded.length).toBeLessThan(2048);
    expect(new URL(expanded).href.length).toBeGreaterThan(2048);
    await invalid(body({ candidates: [candidate({ sourceUrl: expanded })] }));
    await invalid(body({ candidates: [candidate({ sourceUrl: prefix + "job/1", applicationUrl: expanded })] }));
    const atLimit = prefix + "漢".repeat(225) + "x".repeat(2048 - new URL(prefix + "漢".repeat(225)).href.length);
    const result = await parseLakeStageRequest(body({ candidates: [candidate({ sourceUrl: atLimit, applicationUrl: atLimit })] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.candidates[0].sourceUrl.length).toBe(2048);
      expect(result.request.candidates[0].applicationUrl?.length).toBe(2048);
    }
  });

  test("postedAt is null or an exact valid canonical instant, while future dates remain staging data", async () => {
    for (const postedAt of ["2026-02-30T12:00:00.000Z", "2026-10-08", "2026-10-08T12:00:00Z",
      "2026-10-08T12:00:00.000+00:00", " 2026-10-08T12:00:00.000Z", 0, new Date(), ""]) {
      await invalid(body({ candidates: [candidate({ postedAt })] }));
    }
    const result = await parseLakeStageRequest(body({ candidates: [candidate({ postedAt: "2099-12-31T23:59:59.999Z" })] }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.candidates[0].postedAt).toBe("2099-12-31T23:59:59.999Z");
  });

  test("candidate count and duplicate IDs/normalized source URLs are strict", async () => {
    await invalid(body({ candidates: [] }));
    await invalid(body({ candidates: "items" }));
    await invalid(body({ candidates: [candidate(), candidate({ sourceUrl: "https://boards.greenhouse.io/acme/jobs/2" })] }));
    await invalid(body({ candidates: [candidate(), candidate({ lakeCandidateId: 2, sourceUrl: "HTTPS://BOARDS.GREENHOUSE.IO/acme/jobs/1" })] }));
    const candidates = Array.from({ length: 200 }, (_, i) => candidate({ lakeCandidateId: i + 1,
      sourceUrl: `https://boards.greenhouse.io/acme/jobs/${i + 1}` }));
    expect((await parseLakeStageRequest(body({ candidates }))).ok).toBe(true);
    await invalid(body({ candidates: [...candidates, candidate({ lakeCandidateId: 201 })] }));
  });

  test("canonical numeric ordering ignores request key/order and operation ID, but material/source changes bind hashes", async () => {
    const a = candidate({ lakeCandidateId: 10, evidenceText: "Raw independent evidence\nwith spacing" });
    const b = candidate({ lakeCandidateId: 2, sourceUrl: "https://boards.greenhouse.io/acme/jobs/2" });
    const first = await parseLakeStageRequest(body({ candidates: [a, b] }));
    const reordered = Object.fromEntries(Object.entries(body({ operationId: "another:retry", candidates: [
      Object.fromEntries(Object.entries(b).reverse()), Object.fromEntries(Object.entries(a).reverse()),
    ] })).reverse());
    const second = await parseLakeStageRequest(reordered);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.request.candidates.map((row) => row.lakeCandidateId)).toEqual([2, 10]);
    expect(first.manifestHash).toBe(second.manifestHash);
    expect(first.candidateDescriptorsJson).toBe(second.candidateDescriptorsJson);
    expect(first.manifestHash).toBe(await sha256Hex(JSON.stringify({ version: 1, sourceId: first.request.sourceId, descriptors: first.descriptors })));
    const changedSource = await parseLakeStageRequest(body({ sourceId: "greenhouse:other", candidates: [a, b] }));
    expect(changedSource.ok).toBe(true);
    if (changedSource.ok) expect(changedSource.manifestHash).not.toBe(first.manifestHash);
    for (const overrides of [
      { lakeCandidateId: 11 }, { lakeFingerprint: "different-opaque-fingerprint" }, { title: "Other role" },
      { company: "Acme" }, { sourceUrl: "https://boards.greenhouse.io/acme/jobs/3" },
      { applicationUrl: "https://boards.greenhouse.io/acme/jobs/10/apply" }, { sourcePlatform: "Other label" },
      { locationType: "hybrid" }, { locationRaw: "APAC" }, { postedAt: "2026-10-08T12:00:00.000Z" },
      { evidenceText: "Changed evidence" },
    ]) {
      const changed = await parseLakeStageRequest(body({ candidates: [candidate({ ...a, ...overrides }), b] }));
      expect(changed.ok).toBe(true);
      if (changed.ok) expect(changed.manifestHash).not.toBe(first.manifestHash);
    }
  });
});
