import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  PACKET_QUERIES,
  emitSql,
  emitMeta,
  collectByName,
  buildPacketInputs,
  buildPackets,
  type PacketMeta,
} from "./evidence-packets";
import { renderEvidenceReport, deduplicateAlerts } from "../../packages/scraper/evidence-packet";

const PROVIDER_DDL = `
CREATE TABLE provider_profiles (
  id TEXT PRIMARY KEY,
  provider_family TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  auth_class TEXT NOT NULL,
  allowed_hosts TEXT,
  evidence_url TEXT,
  evidence_lease_days INTEGER,
  visibility_filter TEXT,
  content_scope TEXT,
  cadence_min_minutes INTEGER,
  cadence_max_minutes INTEGER,
  rate_guidance TEXT,
  removal_semantics TEXT,
  robots_handling TEXT
);
`;

const REGISTRY_DDL = `
CREATE TABLE source_registry (
  source_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  company_token TEXT,
  discovery_provenance TEXT,
  compliance_state TEXT NOT NULL,
  operational_state TEXT NOT NULL,
  review_deadline TEXT,
  policy_expiry TEXT
);
`;

interface ProviderRow {
  id: string;
  provider_family: string;
  mechanism: string;
  auth_class: string;
  allowed_hosts: string | null;
  evidence_url: string | null;
  evidence_lease_days: number | null;
  visibility_filter: string | null;
  content_scope: string | null;
  cadence_min_minutes: number | null;
  cadence_max_minutes: number | null;
  rate_guidance: string | null;
  removal_semantics: string | null;
  robots_handling: string | null;
}

const PROVIDERS: ProviderRow[] = [
  {
    id: "greenhouse",
    provider_family: "greenhouse",
    mechanism: "ats_api",
    auth_class: "none",
    allowed_hosts: "boards-api.greenhouse.io,boards.greenhouse.io",
    evidence_url: "https://docs.greenhouse.io/job-board.html",
    evidence_lease_days: 180,
    visibility_filter: "published",
    content_scope: "minimal",
    cadence_min_minutes: 60,
    cadence_max_minutes: 1440,
    rate_guidance: "60 req/min",
    removal_semantics: "feed removal deactivates within one successful fetch",
    robots_handling: "observe",
  },
  {
    // Incomplete provider profile: no evidenceUrl, no visibilityFilter, no cadence.
    id: "breezy",
    provider_family: "breezy",
    mechanism: "public_json_api",
    auth_class: "api_key",
    allowed_hosts: null,
    evidence_url: null,
    evidence_lease_days: null,
    visibility_filter: null,
    content_scope: null,
    cadence_min_minutes: null,
    cadence_max_minutes: null,
    rate_guidance: null,
    removal_semantics: null,
    robots_handling: null,
  },
];

interface CandidateRow {
  source_id: string;
  provider_id: string;
  display_name: string;
  endpoint_url: string;
  company_token: string | null;
  discovery_provenance: string | null;
  compliance_state: string;
  operational_state: string;
  review_deadline: string | null;
  policy_expiry: string | null;
}

const CANDIDATES: CandidateRow[] = [
  {
    source_id: "greenhouse:acme",
    provider_id: "greenhouse",
    display_name: "ACME Corp",
    endpoint_url: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
    company_token: "acme",
    discovery_provenance: JSON.stringify({ provenance: "eligible-opportunity-sample" }),
    compliance_state: "needs_review",
    operational_state: "candidate",
    review_deadline: "2026-09-05T00:00:00.000Z",
    policy_expiry: null,
  },
  {
    source_id: "breezy:evil",
    provider_id: "breezy",
    display_name: "Evil Co",
    endpoint_url: "https://api.breezy.hr/v3/company/evil/positions",
    company_token: "evil",
    discovery_provenance: JSON.stringify({ provenance: "prospector" }),
    compliance_state: "needs_review",
    operational_state: "candidate",
    review_deadline: "2026-08-20T00:00:00.000Z", // overdue relative to the test's `now`
    policy_expiry: null,
  },
  {
    // Shadow/canary/active rows must never appear in the evidence-packet report:
    // this unit's query filters strictly to operational_state = 'candidate'.
    source_id: "we-work-remotely",
    provider_id: "greenhouse",
    display_name: "We Work Remotely",
    endpoint_url: "https://weworkremotely.com/remote-jobs.rss",
    company_token: null,
    discovery_provenance: null,
    compliance_state: "allowed",
    operational_state: "active",
    review_deadline: null,
    policy_expiry: "2027-01-01T00:00:00.000Z",
  },
];

function buildDb(): Database {
  const db = new Database(":memory:");
  db.exec(PROVIDER_DDL);
  db.exec(REGISTRY_DDL);
  const insProvider = db.prepare(
    `INSERT INTO provider_profiles (id, provider_family, mechanism, auth_class, allowed_hosts, evidence_url, evidence_lease_days, visibility_filter, content_scope, cadence_min_minutes, cadence_max_minutes, rate_guidance, removal_semantics, robots_handling)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of PROVIDERS) {
    insProvider.run(
      p.id, p.provider_family, p.mechanism, p.auth_class, p.allowed_hosts, p.evidence_url,
      p.evidence_lease_days, p.visibility_filter, p.content_scope, p.cadence_min_minutes,
      p.cadence_max_minutes, p.rate_guidance, p.removal_semantics, p.robots_handling,
    );
  }
  const insCandidate = db.prepare(
    `INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance, compliance_state, operational_state, review_deadline, policy_expiry)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of CANDIDATES) {
    insCandidate.run(
      c.source_id, c.provider_id, c.display_name, c.endpoint_url, c.company_token,
      c.discovery_provenance, c.compliance_state, c.operational_state, c.review_deadline, c.policy_expiry,
    );
  }
  return db;
}

function runQueries(db: Database): Record<string, Record<string, unknown>[]> {
  const byName: Record<string, Record<string, unknown>[]> = {};
  for (const q of PACKET_QUERIES) byName[q.name] = db.query(q.sql).all() as Record<string, unknown>[];
  return byName;
}

const NOW = "2026-08-29T12:00:00.000Z";

describe("SP-08 evidence-packets script", () => {
  test("every emitted query is read-only (SELECT only, no mutation keywords)", () => {
    for (const q of PACKET_QUERIES) {
      const upper = q.sql.toUpperCase();
      expect(upper.trim().startsWith("SELECT")).toBe(true);
      for (const forbidden of ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "REPLACE"]) {
        expect(upper).not.toContain(forbidden);
      }
    }
    expect(emitSql()).toContain("Read-only");
  });

  test("emitMeta reports the unit and query order", () => {
    const meta = emitMeta();
    expect(meta.unit).toBe("SP-08");
    expect(meta.queryOrder).toEqual(["candidates", "providers"]);
  });

  test("candidates query returns only operational_state='candidate' rows, excluding active/shadow/canary", () => {
    const db = buildDb();
    const byName = runQueries(db);
    const ids = byName["candidates"].map((r) => r["source_id"]);
    expect(ids).toEqual(["breezy:evil", "greenhouse:acme"]); // alphabetical, `we-work-remotely` (active) excluded
  });

  describe("real D1 rows -> EvidencePacketInput join", () => {
    let db: Database;
    let byName: Record<string, Record<string, unknown>[]>;

    beforeAll(() => {
      db = buildDb();
      byName = runQueries(db);
    });

    test("joins each candidate to its provider profile by provider_id", () => {
      const inputs = buildPacketInputs(byName, NOW);
      expect(inputs).toHaveLength(2);
      const acme = inputs.find((i) => i.sourceId === "greenhouse:acme")!;
      expect(acme.provider.providerFamily).toBe("greenhouse");
      expect(acme.provider.evidenceUrl).toBe("https://docs.greenhouse.io/job-board.html");
      expect(acme.provider.cadenceMinMinutes).toBe(60);
      expect(acme.shadow).toBeNull(); // this script never fabricates shadow evidence
    });

    test("a complete candidate is still 'candidate' (not review_ready) because shadow was never run — honest, not fabricated", () => {
      const packets = buildPackets(byName, NOW);
      const acme = packets.find((p) => p.sourceId === "greenhouse:acme")!;
      expect(acme.status).toBe("candidate");
      expect(acme.missingEvidence).toEqual(["shadow probe not yet run — no live evidence"]);
    });

    test("an incomplete provider profile (breezy: no evidenceUrl/visibility/cadence/unsupported auth) lists every gap", () => {
      const packets = buildPackets(byName, NOW);
      const evil = packets.find((p) => p.sourceId === "breezy:evil")!;
      expect(evil.status).toBe("candidate");
      expect(evil.missingEvidence.some((m) => m.includes("evidenceUrl"))).toBe(true);
      expect(evil.missingEvidence.some((m) => m.toLowerCase().includes("visibility"))).toBe(true);
      expect(evil.missingEvidence.some((m) => m.includes("authClass"))).toBe(true);
      expect(evil.missingEvidence.some((m) => m.includes("cadenceMin"))).toBe(true);
      expect(evil.missingEvidence.some((m) => m.includes("allowedHosts missing"))).toBe(true);
    });

    test("overdue reviewDeadline is reflected in the deduplicated alert list", () => {
      const packets = buildPackets(byName, NOW);
      const alerts = deduplicateAlerts(packets);
      expect(alerts).toHaveLength(2);
      const evilAlert = alerts.find((a) => a.sourceId === "breezy:evil")!;
      expect(evilAlert.bucket).toBe("overdue");
    });

    test("collectByName reassembles wrangler --command --json shaped output the same way", () => {
      const meta: PacketMeta = emitMeta();
      const perQuery: Record<string, unknown> = {
        candidates: [{ results: byName["candidates"], success: true, meta: { changed_db: false } }],
        providers: [{ results: byName["providers"], success: true, meta: { changed_db: false } }],
      };
      const reassembled = collectByName(perQuery, meta);
      expect(reassembled["candidates"]).toEqual(byName["candidates"]);
      expect(reassembled["providers"]).toEqual(byName["providers"]);
    });

    test("report includes both candidates, the overdue alert, and no active/shadow/canary rows", () => {
      const packets = buildPackets(byName, NOW);
      const report = renderEvidenceReport(packets, NOW);
      expect(report).toContain("| Total candidates | 2 |");
      expect(report).toContain("greenhouse:acme");
      expect(report).toContain("breezy:evil");
      expect(report).not.toContain("we-work-remotely");
      expect(report).toContain("## Alerts");
    });
  });

  test("empty registry (current production state) reports honestly, not as an error", () => {
    const byName = { candidates: [], providers: [] };
    const packets = buildPackets(byName, NOW);
    expect(packets).toEqual([]);
    const report = renderEvidenceReport(packets, NOW);
    expect(report).toContain("No candidate packets");
  });

  test("a candidate whose provider_id has no matching provider row still produces a packet with the gap listed, not a crash", () => {
    const byName = {
      candidates: [
        {
          source_id: "lever:orphan",
          provider_id: "lever-missing",
          display_name: "Orphan Co",
          endpoint_url: "https://api.lever.co/v0/postings/orphan",
          company_token: "orphan",
          discovery_provenance: null,
          compliance_state: "needs_review",
          operational_state: "candidate",
          review_deadline: "2026-09-10T00:00:00.000Z",
          policy_expiry: null,
        },
      ],
      providers: [],
    };
    const packets = buildPackets(byName, NOW);
    expect(packets).toHaveLength(1);
    expect(packets[0].status).toBe("candidate");
    expect(packets[0].missingEvidence.length).toBeGreaterThan(0);
  });
});
