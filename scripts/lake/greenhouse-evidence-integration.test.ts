import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  persistDiscoveryObservation, probeTemplateForFamily, probeTenantJobs,
} from "./domain-ats-discovery";
import { processAndRefineCandidate } from "./ingest-to-lake";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const endpoint = "https://boards-api.greenhouse.io/v1/boards/evidence-fixture/jobs";
const sourceId = "greenhouse:evidence-fixture";

function providerJobs(count = 24) {
  return Array.from({ length: count }, (_, index) => ({
    id: 1000 + index,
    internal_job_id: index === 22 ? null : 2000 + index,
    title: `Virtual Assistant ${index}`,
    absolute_url: `https://boards.greenhouse.io/evidence-fixture/jobs/${1000 + index}`,
    location: { name: "Philippines" },
    first_published: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-07T12:00:00.000Z",
    content: `FULL_DESCRIPTION_MUST_NOT_BE_RETAINED_${index}`,
    metadata: { arbitrary: `PRIVATE_CUSTOM_METADATA_${index}` },
    questions: [{ label: "PRIVATE_APPLICATION_QUESTION" }],
  }));
}

function fixture() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE lake_raw_observations (
      id INTEGER PRIMARY KEY, source_id TEXT, source_platform TEXT, fetch_url TEXT,
      http_status INTEGER, raw_payload TEXT, content_hash TEXT, processed INTEGER DEFAULT 0
    );
    CREATE TABLE lake_candidate_jobs (
      id INTEGER PRIMARY KEY, raw_observation_id INTEGER NOT NULL REFERENCES lake_raw_observations(id),
      source_id TEXT, source_platform TEXT, source_url TEXT UNIQUE, title TEXT, company TEXT,
      category TEXT, location_raw TEXT, description TEXT, application_url TEXT, posted_at TEXT,
      fingerprint_hash TEXT, status TEXT, geo_scope TEXT, ph_eligibility TEXT, geo_evidence TEXT,
      rejection_reason TEXT, sighting_count INTEGER, last_observed_at TEXT
    );
    CREATE TABLE lake_sightings (
      candidate_id INTEGER, raw_observation_id INTEGER, source_id TEXT, source_platform TEXT, source_url TEXT
    );
  `);
  const executed: string[] = [];
  const client = {
    async execute(query: { sql: string; args?: unknown[] }) {
      executed.push(query.sql);
      return { rows: sqlite.query(query.sql).all(...(query.args ?? []) as any[]) };
    },
  } as unknown as Parameters<typeof persistDiscoveryObservation>[0];
  return { sqlite, client, executed };
}

async function withResponse(body: string, run: (requests: string[]) => Promise<void>, status = 200) {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    if (String(input) !== endpoint && String(input) !== "https://sample.breezy.hr/json") {
      throw new Error("Unexpected integration-test network target");
    }
    return new Response(body, { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try { await run(requests); } finally { globalThis.fetch = originalFetch; }
}

describe("Greenhouse acquisition evidence reaches complete private lake storage", () => {
  test("one existing GET retains native facts for item21+ and prospects before candidate filtering", async () => {
    const f = fixture();
    const rawJobs = providerJobs();
    const body = JSON.stringify({ company: { name: "Evidence Fixture" }, jobs: rawJobs });
    try {
      await withResponse(body, async requests => {
        const probe = await probeTenantJobs(probeTemplateForFamily("Greenhouse")!, "evidence-fixture", new Set());
        expect(probe).not.toBeNull();
        if (!probe) throw new Error("Expected a probe result");
        expect(probe.status).toBe(200);
        expect(probe.jobs).toHaveLength(23); // The explicit prospect stays out of legacy candidates.
        const rawObsId = await persistDiscoveryObservation(f.client, {
          sourceId, sourcePlatform: "Greenhouse/evidence-fixture", probe,
        });
        const row = f.sqlite.query("SELECT * FROM lake_raw_observations WHERE id=?").get(rawObsId) as any;
        const retained = JSON.parse(row.raw_payload);
        expect(Array.isArray(retained)).toBe(false); // The old first20 normalized sample fails here.
        expect(retained).toMatchObject({ version: "greenhouse-item-evidence-v1", complete: true,
          itemCount: 24, collectionAuthority: "UNVERIFIED", admissionSourceIdentity: "UNKNOWN", publicationAuthorized: false });
        expect(retained.source).toMatchObject({ sourceId, tenantSlug: "evidence-fixture", endpointUrl: endpoint, httpStatus: 200 });
        expect(new Date(retained.source.startedAt).toISOString()).toBe(retained.source.startedAt);
        expect(new Date(retained.source.completedAt).toISOString()).toBe(retained.source.completedAt);
        expect(retained.source.startedAt <= retained.source.completedAt).toBe(true);
        expect(retained.items).toHaveLength(rawJobs.length);
        expect(retained.items[20].facts.postingId).toEqual({ state: "value", value: 1020 });
        expect(retained.items[22].facts.internalJobId).toEqual({ state: "null" });
        expect(retained.items[23].facts.internalJobId).toEqual({ state: "value", value: 2023 });
        expect(retained.responseSha256).toBe(sha256(body));
        expect(row.content_hash).toBe(sha256(row.raw_payload));
        expect(row.content_hash).not.toBe(retained.responseSha256);
        expect(row.http_status).toBe(200);
        expect(row.raw_payload).not.toContain("FULL_DESCRIPTION_MUST_NOT_BE_RETAINED");
        expect(row.raw_payload).not.toContain("PRIVATE_CUSTOM_METADATA");
        expect(row.raw_payload).not.toContain("PRIVATE_APPLICATION_QUESTION");
        expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_candidate_jobs").get()).toEqual({ count: 0 });

        const stats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
        for (const job of probe.jobs) await processAndRefineCandidate(f.client, rawObsId, {
          sourceId, sourcePlatform: "Greenhouse/evidence-fixture", sourceUrl: job.url, title: job.title,
          company: "Evidence Fixture", category: "other", locationRaw: job.locationRaw,
          description: job.description, applicationUrl: job.url, postedAt: job.postedAt, tags: job.tags,
        }, stats);
        expect(stats.totalExtracted).toBe(23);
        expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_candidate_jobs WHERE raw_observation_id=?").get(rawObsId))
          .toEqual({ count: 23 });
        expect(f.sqlite.query("SELECT raw_observation_id FROM lake_candidate_jobs WHERE source_url=?").get(rawJobs[23]!.absolute_url))
          .toEqual({ raw_observation_id: rawObsId });
        expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_candidate_jobs WHERE description LIKE '%FULL_DESCRIPTION_MUST_NOT_BE_RETAINED%'").get())
          .toEqual({ count: 0 });
        expect(f.executed[0]).toContain("INSERT INTO lake_raw_observations");
        expect(f.executed.some(sql => /publication_ledger|opportunities|source_registry/i.test(sql))).toBe(false);
        expect(requests).toEqual([endpoint]);
      });
    } finally { f.sqlite.close(); }
  });

  for (const [name, body] of [["malformed", "{not-json"], ["oversize", JSON.stringify({ jobs: providerJobs(2000) })]] as const) {
    test(`${name} acquisition cannot create a falsely complete observation or candidate binding`, async () => {
      const f = fixture();
      try {
        await withResponse(body, async requests => {
          const probe = await probeTenantJobs(probeTemplateForFamily("Greenhouse")!, "evidence-fixture", new Set());
          expect(probe).not.toBeNull();
          if (!probe) throw new Error("Expected a failed probe result");
          await expect(persistDiscoveryObservation(f.client, {
            sourceId, sourcePlatform: "Greenhouse/evidence-fixture", probe,
          })).rejects.toThrow();
          expect(f.executed).toEqual([]);
          expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_raw_observations").get()).toEqual({ count: 0 });
          expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_candidate_jobs").get()).toEqual({ count: 0 });
          expect(requests).toEqual([endpoint]);
        });
      } finally { f.sqlite.close(); }
    });
  }

  test("unexpected full Greenhouse content is not passed to candidate storage", async () => {
    await withResponse(JSON.stringify({ jobs: providerJobs() }), async requests => {
      const probe = await probeTenantJobs(probeTemplateForFamily("Greenhouse")!, "evidence-fixture", new Set());
      if (!probe) throw new Error("Expected a probe result");
      expect(probe.jobs).toHaveLength(23);
      expect(probe.jobs.every(job => !job.description.includes("FULL_DESCRIPTION_MUST_NOT_BE_RETAINED"))).toBe(true);
      expect(requests).toEqual([endpoint]);
    });
  });

  test("source mismatch and a storage acknowledgement without a native ID stop association", async () => {
    const f = fixture();
    try {
      await withResponse(JSON.stringify({ jobs: providerJobs() }), async requests => {
        const probe = await probeTenantJobs(probeTemplateForFamily("Greenhouse")!, "evidence-fixture", new Set());
        if (!probe) throw new Error("Expected a probe result");
        await expect(persistDiscoveryObservation(f.client, {
          sourceId: "greenhouse:another-tenant", sourcePlatform: "Greenhouse/evidence-fixture", probe,
        })).rejects.toThrow("source binding");
        expect(f.executed).toEqual([]);
        const corruptAcknowledgement = { execute: async (query: { sql: string; args?: unknown[] }) => {
          await f.client.execute(query as any);
          return { rows: [{ id: "1" }] };
        } } as unknown as typeof f.client;
        await expect(persistDiscoveryObservation(corruptAcknowledgement, {
          sourceId, sourcePlatform: "Greenhouse/evidence-fixture", probe,
        })).rejects.toThrow("acknowledgement");
        // The raw INSERT can be durable despite an unusable acknowledgement.
        expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_raw_observations").get()).toEqual({ count: 1 });
        expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_candidate_jobs").get()).toEqual({ count: 0 });
        expect(f.executed).toHaveLength(1);
        expect(f.executed.some(sql => /publication_ledger|opportunities|source_registry/i.test(sql))).toBe(false);
        expect(requests).toEqual([endpoint]);
      });
    } finally { f.sqlite.close(); }
  });

  test("rehashed authority upgrades and broken membership fail replay before private storage", async () => {
    const mutations = [
      (envelope: any) => { envelope.items[0].assessment.fullRemote = "PASS"; },
      (envelope: any) => { envelope.collectionAuthority = "VERIFIED"; },
      (envelope: any) => { envelope.items.pop(); envelope.itemCount--; },
    ];
    for (const mutate of mutations) {
      const f = fixture();
      try {
        await withResponse(JSON.stringify({ jobs: providerJobs() }), async requests => {
          const probe = await probeTenantJobs(probeTemplateForFamily("Greenhouse")!, "evidence-fixture", new Set());
          if (!probe?.greenhouseEvidence) throw new Error("Expected produced native evidence");
          const envelope = JSON.parse(probe.greenhouseEvidence.payload);
          mutate(envelope);
          const payload = JSON.stringify(envelope);
          const changedProbe = { ...probe, greenhouseEvidence: { ...probe.greenhouseEvidence,
            payload, retainedSha256: sha256(payload) } };
          await expect(persistDiscoveryObservation(f.client, {
            sourceId, sourcePlatform: "Greenhouse/evidence-fixture", probe: changedProbe,
          })).rejects.toThrow("GREENHOUSE_ITEM_EVIDENCE_INVALID");
          expect(f.executed).toEqual([]);
          expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_raw_observations").get()).toEqual({ count: 0 });
          expect(f.sqlite.query("SELECT COUNT(*) AS count FROM lake_candidate_jobs").get()).toEqual({ count: 0 });
          expect(requests).toEqual([endpoint]);
        });
      } finally { f.sqlite.close(); }
    }
  });

  test("raw invalid scalar fields remain native evidence and cannot leak into safe candidate mapping", async () => {
    const base = providerJobs()[0]!;
    const jobs = [
      { ...base, title: "a".repeat(300), absolute_url: `${base.absolute_url}?${"x".repeat(2048 - base.absolute_url.length - 1)}`,
        location: { name: "l".repeat(500) }, departments: [{ name: "Admin" }, { name: { private: "PRIVATE_DEPARTMENT" } }] },
      { ...base, id: 2, title: { private: "PRIVATE_TITLE" } },
      { ...base, id: 3, title: "a".repeat(301) },
      { ...base, id: 4, title: "Virtual Assistant\0PRIVATE_TITLE" },
      { ...base, id: 5, absolute_url: ["PRIVATE_URL"] },
      { ...base, id: 6, absolute_url: "x".repeat(2049) },
      { ...base, id: 7, absolute_url: `${base.absolute_url}\0PRIVATE_URL` },
      { ...base, id: 8, title: "Virtual Assistant 8", absolute_url: `${base.absolute_url}?case=8`, location: { name: { private: "PRIVATE_LOCATION" } } },
      { ...base, id: 9, title: "Virtual Assistant 9", absolute_url: `${base.absolute_url}?case=9`, location: { name: "PRIVATE_LOCATION".repeat(1000) } },
      { ...base, id: 10, title: "Virtual Assistant 10", absolute_url: `${base.absolute_url}?case=10`, location: { name: "Philippines\0PRIVATE_LOCATION" } },
    ];
    const f = fixture();
    try {
      await withResponse(JSON.stringify({ company: { name: { private: "PRIVATE_COMPANY" } }, jobs }), async requests => {
        const probe = await probeTenantJobs(probeTemplateForFamily("Greenhouse")!, "evidence-fixture", new Set());
        if (!probe?.greenhouseEvidence) throw new Error("Expected produced native evidence");
        expect(probe.jobs).toHaveLength(4);
        expect(probe.jobs[0]).toMatchObject({ title: "a".repeat(300), locationRaw: "l".repeat(500), company: "", tags: ["Admin"] });
        expect(probe.jobs[0]!.url).toHaveLength(2048);
        for (const job of probe.jobs.slice(1)) {
          expect(job.locationRaw).toBe("");
          expect(job.description).toBe("");
        }
        expect(probe.greenhouseEvidence.items).toHaveLength(jobs.length);
        expect(probe.greenhouseEvidence.items[1]!.facts.title.state).toBe("invalid");
        expect(probe.greenhouseEvidence.items[8]!.facts.locationName.state).toBe("invalid");
        const rawObsId = await persistDiscoveryObservation(f.client, { sourceId, sourcePlatform: "Greenhouse/evidence-fixture", probe });
        const stats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
        for (const job of probe.jobs) await processAndRefineCandidate(f.client, rawObsId, {
          sourceId, sourcePlatform: "Greenhouse/evidence-fixture", sourceUrl: job.url, title: job.title,
          company: job.company, category: job.tags[0] || "other", locationRaw: job.locationRaw,
          description: job.description, applicationUrl: job.url, postedAt: job.postedAt, tags: job.tags,
        }, stats);
        expect(stats.totalExtracted).toBe(4);
        const rows = f.sqlite.query("SELECT title,source_url,location_raw,description,company,category FROM lake_candidate_jobs").all();
        expect(rows).toHaveLength(4);
        expect(JSON.stringify(rows)).not.toContain("PRIVATE_");
        expect(rows.every((row: any) => row.title.length <= 300 && row.source_url.length <= 2048 && row.location_raw.length <= 500)).toBe(true);
        expect(requests).toEqual([endpoint]);
      });
    } finally { f.sqlite.close(); }
  });

  test("other providers retain the existing normalized first20 sample behavior", async () => {
    const f = fixture();
    const jobs = Array.from({ length: 24 }, (_, i) => ({ name: `Support Agent ${i}`, url: `https://sample.breezy.hr/job/${i}` }));
    try {
      await withResponse(JSON.stringify(jobs), async requests => {
        const probe = await probeTenantJobs(probeTemplateForFamily("Breezy")!, "sample", new Set());
        if (!probe) throw new Error("Expected a probe result");
        const id = await persistDiscoveryObservation(f.client, { sourceId: "breezy:sample", sourcePlatform: "Breezy/sample", probe });
        const row = f.sqlite.query("SELECT raw_payload,content_hash FROM lake_raw_observations WHERE id=?").get(id) as any;
        expect(JSON.parse(row.raw_payload)).toEqual(probe.jobs.slice(0, 20));
        expect(row.content_hash).toBe(sha256(row.raw_payload));
        expect(requests).toEqual(["https://sample.breezy.hr/json"]);
      });
    } finally { f.sqlite.close(); }
  });
});
