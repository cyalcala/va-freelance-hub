import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createGreenhouseItemEvidence, replayGreenhouseItemEvidence } from "./greenhouse-item-evidence";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const completedAt = "2026-10-08T12:00:00.000Z";
const source = { sourceId: "greenhouse:fixture", tenantSlug: "fixture",
  endpointUrl: "https://boards-api.greenhouse.io/v1/boards/fixture/jobs", httpStatus: 200,
  startedAt: "2026-10-08T11:59:59.000Z", completedAt };
const posting = (id: number, overrides: Record<string, unknown> = {}) => ({
  id, internal_job_id: id + 1000, title: "Technical Writer",
  absolute_url: `https://boards.greenhouse.io/fixture/jobs/${id}`,
  location: { name: "Remote - Philippines" }, first_published: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-08T00:00:00Z", ...overrides,
});
const produce = (jobs: unknown[], overrides: Record<string, unknown> = {}) =>
  createGreenhouseItemEvidence({ ...source, responseBody: JSON.stringify({ jobs }), ...overrides });

describe("Greenhouse native item evidence", () => {
  test("retains every provider member, including a prospect after item twenty", () => {
    const jobs = Array.from({ length: 24 }, (_, i) => posting(i + 1));
    jobs[21] = posting(22, { internal_job_id: null });
    const result = produce(jobs);
    expect(result.itemCount).toBe(24);
    const envelope = JSON.parse(result.payload);
    expect(envelope.items).toHaveLength(24);
    expect(envelope.items[21].facts.postingId).toEqual({ state: "value", value: 22 });
    expect(envelope.items[21].facts.internalJobId).toEqual({ state: "null" });
    expect(envelope.items[21].assessment.disposition).toBe("REJECTED");
    expect(envelope.items[21].assessment.reasons).toContain("PROSPECT_POST");
    expect(envelope.complete).toBe(true);
    expect(result.data.jobs).toHaveLength(24);
  });

  test("binds transient response and exact retained bytes with separate digests", () => {
    const responseBody = JSON.stringify({ jobs: [posting(1)], metadata: { ignored: true } });
    const result = createGreenhouseItemEvidence({ ...source, responseBody });
    expect(result.responseSha256).toBe(sha(responseBody));
    expect(result.retainedSha256).toBe(sha(result.payload));
    expect(result.responseSha256).not.toBe(result.retainedSha256);
    expect(JSON.parse(result.payload).responseSha256).toBe(result.responseSha256);
  });

  test("omits content, custom metadata, questions and arbitrary nested values", () => {
    const result = produce([posting(1, { content: "private-description-marker",
      metadata: [{ name: "secret", value: "private-custom-marker" }],
      questions: [{ label: "private-question-marker" }],
      location: { name: "Philippines", nested: { secret: "private-location-marker" } } }),
      posting(2, { first_published: { private: "private-date-marker" },
        internal_job_id: { private: "private-identity-marker" } })]);
    for (const secret of ["private-description-marker", "private-custom-marker", "private-question-marker",
      "private-location-marker", "private-date-marker", "private-identity-marker"]) {
      expect(result.payload).not.toContain(secret);
    }
    expect(result.items[1].facts.firstPublished).toEqual({ state: "invalid", valueType: "object" });
    expect(result.items[1].facts.internalJobId).toEqual({ state: "invalid", valueType: "object" });
  });

  test("preserves missing, explicit null and invalid native fields without coercion", () => {
    const missing = posting(1); delete (missing as Record<string, unknown>).internal_job_id;
    const result = produce([missing, posting(2, { internal_job_id: null }),
      posting(3, { id: "3", internal_job_id: true, first_published: 1 }), null, "not-an-item"]);
    expect(result.items[0].facts.internalJobId).toEqual({ state: "missing" });
    expect(result.items[1].facts.internalJobId).toEqual({ state: "null" });
    expect(result.items[2].facts.postingId).toEqual({ state: "invalid", valueType: "string" });
    expect(result.items[2].facts.internalJobId).toEqual({ state: "invalid", valueType: "boolean" });
    expect(result.items[2].facts.firstPublished).toEqual({ state: "invalid", valueType: "number" });
    expect(result.items[3].itemShape).toBe("null");
    expect(result.items[4].itemShape).toBe("invalid");
    expect(result.itemCount).toBe(5);
  });

  test("rejects mismatched tenant identity, altered endpoint, status and clocks", () => {
    for (const overrides of [{ sourceId: "greenhouse:other" }, { tenantSlug: "fixture/other" },
      { endpointUrl: `${source.endpointUrl}?content=true` }, { endpointUrl: `${source.endpointUrl}/1` },
      { httpStatus: 304 }, { httpStatus: 0 }, { startedAt: "2026-02-30T00:00:00.000Z" },
      { completedAt: "2026-10-08T11:59:58.000Z" }]) {
      expect(() => produce([posting(1)], overrides)).toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
    }
    expect(produce([posting(1, { absolute_url: "https://boards.greenhouse.io/other/jobs/1" })])
      .items[0].assessment.reasons).toContain("SOURCE_URL_TENANT_MISMATCH");
    for (const tenantSlug of [".", ".."]) {
      expect(() => produce([posting(1)], { tenantSlug, sourceId: `greenhouse:${tenantSlug}`,
        endpointUrl: `https://boards-api.greenhouse.io/v1/boards/${tenantSlug}/jobs` }))
        .toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
    }
  });

  test("distinguishes original posting evidence from edit dates and never grants clearance", () => {
    const dates = [undefined, null, "not-a-date", "2026-02-30T00:00:00Z",
      "2026-10-08T12:00:00.001Z", "2026-09-08T11:59:59.999Z", "2026-09-08T12:00:00Z"];
    const result = produce(dates.map((date, i) => posting(i + 1, { first_published: date })));
    expect(result.items.map(item => item.assessment.freshness)).toEqual([
      "UNKNOWN", "UNKNOWN", "INVALID", "INVALID", "FUTURE", "STALE", "WITHIN_WINDOW",
    ]);
    expect(result.items[6].assessment.postedAt).toBe("2026-09-08T12:00:00.000Z");
    for (const item of result.items) {
      expect(item.assessment.publicationAuthorized).toBe(false);
      expect(item.assessment.collectionAuthority).toBe("UNVERIFIED");
      expect(item.assessment.fullRemote).toBe("UNKNOWN");
      expect(item.assessment.phExclusions).toBe("UNKNOWN");
      expect(item.assessment.safety).toBe("UNKNOWN");
      expect(item.assessment.applicationLiveness).toBe("UNKNOWN");
      expect(item.assessment.canonicalIdentity).toBe("UNKNOWN");
      expect(item.assessment.taxonomy).toBe("UNKNOWN");
    }
    expect(result.items[6].assessment.disposition).toBe("HELD");
    for (const gap of ["COLLECTION_PERMISSION_UNKNOWN", "CURRENT_ADMISSION_UNKNOWN", "ROBOTS_UNVERIFIED",
      "CADENCE_UNVERIFIED", "SHARED_BUDGET_UNVERIFIED", "SOURCE_ORIGIN_UNVERIFIED"]) {
      expect(result.items[6].assessment.reasons).toContain(gap);
    }
  });

  test("rejects duplicate native posting IDs without collapsing their membership", () => {
    const result = produce([posting(1), posting(1, { internal_job_id: 1002 })]);
    expect(result.itemCount).toBe(2);
    for (const item of result.items) {
      expect(item.assessment.disposition).toBe("REJECTED");
      expect(item.assessment.reasons).toContain("DUPLICATE_POSTING_ID");
    }
    expect(result.items[0].materialSha256).not.toBe(result.items[1].materialSha256);
    expect(replayGreenhouseItemEvidence(result.payload, result.retainedSha256).items).toEqual(result.items);
  });

  test("retains offset posting dates and distinct requisitions with identical role titles", () => {
    const result = produce([posting(1, { first_published: "2026-10-01T01:02:03-04:00" }), posting(2)]);
    expect(result.items[0].assessment.postedAt).toBe("2026-10-01T05:02:03.000Z");
    expect(result.items[0].assessment.providerPostingIdentity).toBe("greenhouse:fixture:posting:1");
    expect(result.items[0].assessment.providerRequisitionIdentity).toBe("greenhouse:fixture:requisition:1001");
    expect(result.items[1].assessment.providerRequisitionIdentity).not.toBe(result.items[0].assessment.providerRequisitionIdentity);
    expect(result.items[0].materialSha256).not.toBe(result.items[1].materialSha256);
  });

  test("rejects oversized response and oversized complete projection instead of truncating", () => {
    expect(() => createGreenhouseItemEvidence({ ...source, responseBody: JSON.stringify({ jobs: [],
      content: "x".repeat(1_048_576) }) })).toThrow("GREENHOUSE_ITEM_EVIDENCE_OVERSIZE");
    expect(() => produce(Array.from({ length: 1500 }, (_, i) => posting(i + 1))))
      .toThrow("GREENHOUSE_ITEM_EVIDENCE_OVERSIZE");
    // The response fits; the complete retained projection must honor UTF-8 bytes
    // as well as characters after its per-item evidence fields are added.
    const multiByteJobs = Array.from({ length: 600 }, (_, i) => posting(i + 1, { title: "界".repeat(300) }));
    expect(new TextEncoder().encode(JSON.stringify({ jobs: multiByteJobs })).byteLength).toBeLessThan(1_048_576);
    expect(() => produce(multiByteJobs)).toThrow("GREENHOUSE_ITEM_EVIDENCE_OVERSIZE");
    expect(() => createGreenhouseItemEvidence({ ...source, responseBody: "not-json" }))
      .toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
    expect(() => createGreenhouseItemEvidence({ ...source, responseBody: "{}" }))
      .toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
  });

  test("replays the same retained bytes and recomputes held assessments", () => {
    const result = produce([posting(1), posting(2, { internal_job_id: null })]);
    const replay = replayGreenhouseItemEvidence(result.payload, result.retainedSha256);
    expect(replay.payload).toBe(result.payload);
    expect(replay.items).toEqual(result.items);
    expect(replay.publicationAuthorized).toBe(false);
    expect(replay.items[0].assessment.collectionAuthority).toBe("UNVERIFIED");
  });

  for (const [name, initial, change] of [
    ["invalid value type", posting(1, { first_published: {} }),
      (e: any) => { e.items[0].facts.firstPublished.valueType = ["object"]; }],
    ["item shape", null, (e: any) => { e.items[0].itemShape = ["null"]; }],
  ] as const) {
    test(`requires an actual string ${name} even when all supplied digests are rebuilt`, () => {
      const envelope = JSON.parse(produce([initial]).payload);
      change(envelope);
      for (const item of envelope.items) {
        item.materialSha256 = sha(JSON.stringify({ index: item.index, itemShape: item.itemShape, facts: item.facts }));
      }
      envelope.membershipSha256 = sha(JSON.stringify(envelope.items.map((item: any) => ({
        index: item.index, materialSha256: item.materialSha256,
      }))));
      const payload = JSON.stringify(envelope);
      expect(() => replayGreenhouseItemEvidence(payload, sha(payload))).toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
    });
  }

  test("refuses changed facts, missing membership and forged clearance even with rehashed bytes", () => {
    const result = produce([posting(1), posting(2)]);
    expect(() => replayGreenhouseItemEvidence(`${result.payload} `, result.retainedSha256))
      .toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
    const changes = [
      (e: any) => { e.items[0].facts.title.value = "Changed role"; },
      (e: any) => { e.items.pop(); },
      (e: any) => { e.items.reverse(); },
      (e: any) => { e.items[0].index = 1; },
      (e: any) => { e.items[0].materialSha256 = "0".repeat(64); },
      (e: any) => { e.membershipSha256 = "0".repeat(64); },
      (e: any) => { e.items[0].assessment.fullRemote = "PASS"; },
      (e: any) => { e.collectionAuthority = "VERIFIED"; },
      (e: any) => { e.admissionSourceIdentity = "VERIFIED"; },
      (e: any) => { e.robotsVerified = true; },
    ];
    for (const change of changes) {
      const envelope = JSON.parse(result.payload); change(envelope);
      const payload = JSON.stringify(envelope);
      expect(() => replayGreenhouseItemEvidence(payload, sha(payload)))
        .toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
    }
  });
});
