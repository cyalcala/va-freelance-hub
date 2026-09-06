import { describe, expect, test } from "bun:test";
import { loadCurrentAdmissionEvidence, validateAdmissionPacket, validateAdmissionProbe, type AdmissionDatabase } from "./admission-evidence";
import { sha256Hex } from "./contentHash";
import { ADMISSION_TEST_NOW, admissionFixture } from "./test-fixtures/admission";

function reader(current: Awaited<ReturnType<typeof admissionFixture>>, optOut: unknown = null): AdmissionDatabase {
  return {
    prepare(query) {
      return {
        bind() { return this; },
        async first<T>() {
          return structuredClone(query.includes("FROM source_registry") ? current.source
            : query.includes("FROM provider_profiles") ? current.provider
            : query.includes("FROM source_admission_evidence") ? current.evidence : optOut) as T;
        },
        async run() { throw new Error("read-only validation attempted a write"); },
      };
    },
  };
}

describe("SP-23B current admission evidence", () => {
  test("loads an intact immutable current packet without writes", async () => {
    const fixture = await admissionFixture();
    const result = await loadCurrentAdmissionEvidence(reader(fixture), fixture.source.sourceId, ADMISSION_TEST_NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.evidence.packetSha256).toBe(await sha256Hex(result.evidence.packetJson));
  });

  for (const [name, mutate] of [
    ["wrong source", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.source.sourceId = "other:source"; }],
    ["source ABA revision", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.source.governanceRevision += 2; }],
    ["provider ABA revision", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.provider.governanceRevision += 2; }],
    ["changed endpoint", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.source.endpointUrl += "?different=1"; }],
    ["expired packet", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.expiresAt = ADMISSION_TEST_NOW; }],
    ["future packet", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.capturedAt = "2027-01-01T00:00:00.000Z"; }],
    ["missing recurring authority", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.authorityActions = []; }],
    ["duplicate official reference", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.primaryEvidence.push(f.packet.primaryEvidence[0]!); }],
    ["wrong official hash", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.primaryEvidence[0]!.contentSha256 = "b".repeat(64); }],
    ["unsupported policy", (f: Awaited<ReturnType<typeof admissionFixture>>) => { (f.packet as any).policyVersion = "caller-policy-one-observation"; }],
    ["booleans cannot hide wrong probe identity", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.probe.endpoint.url = "https://unrelated.example/jobs"; }],
    ["robots was not checked", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.probe.robots.checked = false; }],
    ["robots was not allowed", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.probe.robots.verdict = "unknown"; }],
    ["fabricated healthy count", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.probe.sampleFunnel.plausibleItems = 20; }],
    ["old parser version", (f: Awaited<ReturnType<typeof admissionFixture>>) => { f.packet.probe.version = "0.9.0"; }],
  ] as const) {
    test(`rejects ${name}`, async () => {
      const fixture = await admissionFixture();
      mutate(fixture);
      expect(validateAdmissionPacket(fixture.packet, fixture.source, fixture.provider, ADMISSION_TEST_NOW).ok).toBe(false);
    });
  }

  test("does not treat a supplied review_ready/status flag as authority over current unsupported scope", async () => {
    const fixture = await admissionFixture();
    fixture.provider.contentScope = "full";
    fixture.packet.provider.contentScope = "full";
    Object.assign(fixture.packet, { status: "review_ready", missingEvidence: [], approved: true });
    expect(validateAdmissionPacket(fixture.packet, fixture.source, fixture.provider, ADMISSION_TEST_NOW).ok).toBe(false);
  });

  test("rejects unsupported profile shape even if both persisted and packet projections agree", async () => {
    for (const property of ["mechanism", "visibilityFilter"] as const) {
      const fixture = await admissionFixture();
      fixture.provider[property] = "invented-profile-value";
      fixture.packet.provider[property] = "invented-profile-value";
      expect(validateAdmissionPacket(fixture.packet, fixture.source, fixture.provider, ADMISSION_TEST_NOW).ok).toBe(false);
    }
  });

  test("rejects credential endpoints and host suffix lookalikes despite optimistic stored flags", async () => {
    for (const endpoint of ["https://user:password@boards-api.greenhouse.io/jobs", "https://boards-api.greenhouse.io.attacker.example/jobs"]) {
      const fixture = await admissionFixture();
      fixture.source.endpointUrl = endpoint;
      fixture.packet.source.endpointUrl = endpoint;
      fixture.packet.probe.endpoint.url = endpoint;
      expect(validateAdmissionPacket(fixture.packet, fixture.source, fixture.provider, ADMISSION_TEST_NOW).ok).toBe(false);
    }
  });

  test("HEALTHY_EMPTY may contain recognized items with no plausible results", async () => {
    const fixture = await admissionFixture();
    fixture.packet.probe.sampleFunnel.plausibleItems = 0;
    fixture.packet.probe.diagnostic.outcome = "HEALTHY_EMPTY";
    expect(validateAdmissionProbe(fixture.packet.probe, fixture.source, fixture.provider, ADMISSION_TEST_NOW)).toEqual({ ok: true });
  });

  test("durable opt-out, corrupted immutable bytes, and unreadable storage fail closed", async () => {
    const fixture = await admissionFixture();
    expect((await loadCurrentAdmissionEvidence(reader(fixture, { source_id: fixture.source.sourceId }), fixture.source.sourceId, ADMISSION_TEST_NOW)).ok).toBe(false);
    fixture.evidence.packetJson += " ";
    expect((await loadCurrentAdmissionEvidence(reader(fixture), fixture.source.sourceId, ADMISSION_TEST_NOW)).ok).toBe(false);
    const db = { prepare() { throw new Error("D1 unavailable"); } };
    expect((await loadCurrentAdmissionEvidence(db, fixture.source.sourceId, ADMISSION_TEST_NOW)).ok).toBe(false);
  });
});
