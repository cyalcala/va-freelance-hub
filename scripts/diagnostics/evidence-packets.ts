#!/usr/bin/env bun
/**
 * SP-08: Read-only evidence packets and review-debt alerts for
 * `source_registry` candidates.
 *
 * This is a MEASUREMENT/REPORT tool, same shape as `source-economics.ts` and
 * `source-registry.ts`: it contains only `SELECT` queries and performs no
 * writes of any kind. The fixture test executes these exact query strings
 * against an in-memory DB, so the tested query is the executed query.
 *
 * It joins every `source_registry` row still in `operational_state =
 * 'candidate'` to its `provider_profiles` row and runs each through
 * `buildEvidencePacket` (packages/scraper/evidence-packet.ts) — the same pure
 * builder proven by evidence-packet.test.ts.
 *
 * No shadow evidence is attached here: SP-07's candidate-shadow probe is a
 * bounded, on-demand, zero-write probe with no persisted result table (by
 * design — `diagnostic.mutations=0`, nothing written to D1). A candidate this
 * script has not separately been given a fresh probe result for therefore and
 * honestly reports "shadow probe not yet run" rather than fabricating a
 * healthy outcome. Piping a `candidate-shadow.ts` probe result into
 * `packets`/`report` is future wiring, not required for this unit's
 * acceptance criteria.
 *
 * CLI:
 *   bun scripts/diagnostics/evidence-packets.ts sql   -> stdout
 *   bun scripts/diagnostics/evidence-packets.ts meta  -> stdout
 *   bun scripts/diagnostics/evidence-packets.ts emit <outDir>
 *       writes queries/<name>.sql, evidence-packets.sql, evidence-packets-meta.json
 *   bun scripts/diagnostics/evidence-packets.ts collect <resultsDir> <meta.json> [combinedOut.json]
 *       reassembles per-query `--command --json` outputs into {meta,byName}
 *   bun scripts/diagnostics/evidence-packets.ts packets <combined.json> [--as-of ISO]
 *       prints the built EvidencePacket[] as JSON
 *   bun scripts/diagnostics/evidence-packets.ts report <combined.json> [--as-of ISO]
 *       renders the markdown review-debt report
 */

import {
  buildEvidencePacket,
  renderEvidenceReport,
  type EvidencePacket,
  type EvidencePacketInput,
} from "../../packages/scraper/evidence-packet";

// ─── Queries ────────────────────────────────────────────────────────────────

export interface PacketQuery {
  name: string;
  sql: string;
}

export const PACKET_QUERIES: PacketQuery[] = [
  {
    name: "candidates",
    sql: `SELECT source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance, compliance_state, operational_state, review_deadline, policy_expiry FROM source_registry WHERE operational_state = 'candidate' ORDER BY source_id;`,
  },
  {
    name: "providers",
    sql: `SELECT id, provider_family, mechanism, auth_class, allowed_hosts, evidence_url, evidence_lease_days, visibility_filter, content_scope, cadence_min_minutes, cadence_max_minutes, rate_guidance, removal_semantics, robots_handling FROM provider_profiles ORDER BY id;`,
  },
];

export function emitSql(): string {
  const header = `-- SP-08 read-only evidence-packet bundle\n-- Read-only: SELECT statements only, no mutations.\n`;
  return header + PACKET_QUERIES.map((q) => `-- [${q.name}]\n${q.sql}`).join("\n\n") + "\n";
}

export interface PacketMeta {
  unit: "SP-08";
  queryOrder: string[];
}

export function emitMeta(): PacketMeta {
  return { unit: "SP-08", queryOrder: PACKET_QUERIES.map((q) => q.name) };
}

type Row = Record<string, unknown>;

/**
 * Reassemble per-query single-statement `--command --json` outputs (each a
 * `[{results,success,meta}]` array) into name -> rows, in query order. Same
 * shape as `source-economics.ts`'s `collectByName`.
 */
export function collectByName(perQuery: Record<string, unknown>, meta: PacketMeta): Record<string, Row[]> {
  const byName: Record<string, Row[]> = {};
  for (const name of meta.queryOrder) {
    const wj = perQuery[name];
    const arr: unknown[] = Array.isArray(wj) ? wj : [];
    const first = arr[0] as Record<string, unknown> | undefined;
    const rows = (first && (first["results"] as Row[] | undefined)) ?? [];
    byName[name] = Array.isArray(rows) ? rows : [];
  }
  return byName;
}

// ─── Row -> EvidencePacketInput ─────────────────────────────────────────────

function str(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build one EvidencePacketInput per candidate row, joined to its provider
 * profile. A candidate whose provider row is missing from the `providers`
 * result (should not happen under the `source_registry.provider_id` FK, but
 * the join stays defensive) still produces a packet — with every
 * provider-sourced field null, so it is honestly reported as missing evidence
 * rather than silently dropped.
 */
export function buildPacketInputs(byName: Record<string, Row[]>, nowIso: string): EvidencePacketInput[] {
  const candidates = byName["candidates"] ?? [];
  const providers = byName["providers"] ?? [];
  const providerById = new Map(providers.map((p) => [String(p["id"]), p]));

  return candidates.map((c): EvidencePacketInput => {
    const providerId = String(c["provider_id"]);
    const p = providerById.get(providerId) ?? {};
    return {
      sourceId: String(c["source_id"]),
      providerId,
      displayName: str(c["display_name"]) ?? providerId,
      endpointUrl: str(c["endpoint_url"]) ?? "",
      companyToken: str(c["company_token"]),
      discoveryProvenance: str(c["discovery_provenance"]),
      complianceState: str(c["compliance_state"]) ?? "needs_review",
      operationalState: str(c["operational_state"]) ?? "candidate",
      reviewDeadline: str(c["review_deadline"]),
      policyExpiry: str(c["policy_expiry"]),
      provider: {
        id: providerId,
        providerFamily: str(p["provider_family"]) ?? providerId,
        mechanism: str(p["mechanism"]) ?? "unknown",
        authClass: str(p["auth_class"]) ?? "unknown",
        allowedHosts: str(p["allowed_hosts"]),
        evidenceUrl: str(p["evidence_url"]),
        evidenceLeaseDays: num(p["evidence_lease_days"]),
        visibilityFilter: str(p["visibility_filter"]),
        contentScope: str(p["content_scope"]),
        cadenceMinMinutes: num(p["cadence_min_minutes"]),
        cadenceMaxMinutes: num(p["cadence_max_minutes"]),
        rateGuidance: str(p["rate_guidance"]),
        removalSemantics: str(p["removal_semantics"]),
        robotsHandling: str(p["robots_handling"]),
      },
      shadow: null,
      nowIso,
    };
  });
}

export function buildPackets(byName: Record<string, Row[]>, nowIso: string): EvidencePacket[] {
  return buildPacketInputs(byName, nowIso).map(buildEvidencePacket);
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function parseAsOf(argv: string[]): string {
  const flagIdx = argv.indexOf("--as-of");
  const raw = flagIdx >= 0 ? argv[flagIdx + 1] : (process.env.SP08_AS_OF ?? undefined);
  if (raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid --as-of value: ${raw}`);
    return d.toISOString();
  }
  return new Date().toISOString();
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  const nowIso = parseAsOf(process.argv);

  switch (cmd) {
    case "sql":
      process.stdout.write(emitSql());
      return;
    case "meta":
      process.stdout.write(JSON.stringify(emitMeta(), null, 2) + "\n");
      return;
    case "emit": {
      const { writeFileSync, mkdirSync } = await import("fs");
      const { join } = await import("path");
      const outDir = rest[0];
      if (!outDir) throw new Error("emit requires an output directory argument");
      const queriesDir = join(outDir, "queries");
      mkdirSync(queriesDir, { recursive: true });
      for (const q of PACKET_QUERIES) {
        writeFileSync(join(queriesDir, `${q.name}.sql`), q.sql + "\n");
      }
      writeFileSync(join(outDir, "evidence-packets.sql"), emitSql());
      writeFileSync(join(outDir, "evidence-packets-meta.json"), JSON.stringify(emitMeta(), null, 2) + "\n");
      process.stdout.write(`Wrote queries/*.sql, evidence-packets.sql, evidence-packets-meta.json to ${outDir}\n`);
      return;
    }
    case "collect": {
      const { readFileSync, readdirSync, writeFileSync } = await import("fs");
      const { join } = await import("path");
      const [resultsDir, metaPath, combinedOut] = rest;
      if (!resultsDir || !metaPath) {
        throw new Error("collect requires <resultsDir> <meta.json> [combinedOut.json]");
      }
      const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as PacketMeta;
      const perQuery: Record<string, unknown> = {};
      const missing: string[] = [];
      const present = readdirSync(resultsDir);
      for (const name of meta.queryOrder) {
        if (!present.includes(`${name}.json`)) {
          missing.push(name);
          continue;
        }
        perQuery[name] = JSON.parse(readFileSync(join(resultsDir, `${name}.json`), "utf-8"));
      }
      if (missing.length) throw new Error(`Missing per-query result files: ${missing.join(", ")}`);
      const byName = collectByName(perQuery, meta);
      const combined = { meta, byName };
      const out = JSON.stringify(combined, null, 2) + "\n";
      if (combinedOut) writeFileSync(combinedOut, out);
      process.stdout.write(out);
      return;
    }
    case "packets": {
      const { readFileSync } = await import("fs");
      const combinedPath = rest[0];
      if (!combinedPath) throw new Error("packets requires <combined.json>");
      const parsed = JSON.parse(readFileSync(combinedPath, "utf-8")) as { byName: Record<string, Row[]> };
      const packets = buildPackets(parsed.byName, nowIso);
      process.stdout.write(JSON.stringify(packets, null, 2) + "\n");
      return;
    }
    case "report": {
      const { readFileSync } = await import("fs");
      const combinedPath = rest[0];
      if (!combinedPath) throw new Error("report requires <combined.json>");
      const parsed = JSON.parse(readFileSync(combinedPath, "utf-8")) as { byName: Record<string, Row[]> };
      const packets = buildPackets(parsed.byName, nowIso);
      process.stdout.write(renderEvidenceReport(packets, nowIso).replace(/\s*$/, "") + "\n");
      return;
    }
    default:
      process.stderr.write(
        "Usage: evidence-packets.ts <sql|meta|emit <dir>|collect <resultsDir> <meta.json> [out.json]|packets <combined.json>|report <combined.json>> [--as-of ISO]\n",
      );
      process.exit(2);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
}
